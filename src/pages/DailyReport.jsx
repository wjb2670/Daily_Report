import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  HardHat, Hammer, Truck, Users, ShieldCheck, ClipboardCheck, Clock, Zap, FileText, Wrench, Loader2,
  CloudSun, Camera, ArrowLeft, Check,
} from 'lucide-react';
import Section from '@/components/report/Section';
import ListSection from '@/components/report/ListSection';
import ReportHeader from '@/components/report/ReportHeader';
import WeatherCard, { useReportWeather } from '@/components/report/WeatherCard';
import PhotoGalleryCard from '@/components/report/PhotoGalleryCard';
import FooterActions from '@/components/report/FooterActions';
import SectionTiles from '@/components/report/SectionTiles';
import {
  ReportSyncer, LAST_PROJECT_KEY, draftKey, loadReport, pendingDraftKeys, readDraft, todayStr, writeDraft,
} from '@/lib/dailyReportStore';

const REPORT_STATUSES = ['awarded', 'active', 'on_hold'];
const AUTOSAVE_DELAY_MS = 1200;
const RETRY_EVERY_MS = 30_000;

const DELAY_CAUSES = ['Weather', 'Owner', 'Material', 'Design / RFI', 'Subcontractor', 'Inspection', 'Other'];
const INSPECTION_RESULTS = ['Passed', 'Failed', 'Partial', 'Rescheduled'];

function TextSection({ icon, tone, title, subtitle, instruction, field, placeholder, report, onField, disabled, rows = 4 }) {
  return (
    <Section icon={icon} tone={tone} title={title} subtitle={subtitle} instruction={disabled ? null : instruction}>
      <Textarea
        aria-label={title}
        placeholder={placeholder}
        value={report?.[field] || ''}
        onChange={e => onField(field, e.target.value)}
        disabled={!report || disabled}
        rows={rows}
        className="text-base md:text-sm"
      />
    </Section>
  );
}

// Sends reports saved on this device while offline (other projects or days).
async function flushOtherDrafts(currentKey) {
  for (const key of pendingDraftKeys()) {
    if (key === currentKey) continue;
    const draft = readDraft(key);
    if (!draft?.data?.project_id) continue;
    const syncer = new ReportSyncer({});
    syncer.setId(draft.data.id);
    try {
      const saved = await syncer.push(draft.data);
      const latest = readDraft(key);
      if (latest?.data?.client_updated_at === draft.data.client_updated_at) {
        writeDraft(key, { ...draft.data, id: saved.id, photos: saved.photos }, false);
      }
    } catch {
      return; // still offline; try again later
    }
  }
}

export default function DailyReport() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [subcontractorNames, setSubcontractorNames] = useState([]);
  const [userName, setUserName] = useState('');

  const [projectId, setProjectId] = useState(() => params.get('project') || localStorage.getItem(LAST_PROJECT_KEY) || '');
  const [date, setDate] = useState(() => params.get('date') || todayStr());

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle');
  const [pending, setPending] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const syncerRef = useRef(null);
  const reportRef = useRef(null);
  const dirtyRef = useRef(false);
  const revisedRef = useRef(false);
  const timerRef = useRef(null);
  const openedHereRef = useRef(false);

  const project = useMemo(() => projects.find(p => p.id === projectId) || null, [projects, projectId]);
  const key = projectId ? draftKey(projectId, date) : null;
  reportRef.current = report;

  // ---- Reference data ----------------------------------------------------------
  useEffect(() => {
    base44.entities.Project.list('name')
      .then(all => setProjects(all.filter(p => REPORT_STATUSES.includes(p.status) || p.id === projectId)))
      .catch(() => toast({ title: 'Could not load projects', description: 'Check the connection and reopen the page.', variant: 'destructive' }))
      .finally(() => setProjectsLoaded(true));
    base44.entities.Subcontractor.list('company_name')
      .then(all => setSubcontractorNames(all.map(s => s.company_name).filter(Boolean)))
      .catch(() => {});
    base44.auth.me()
      .then(u => setUserName(u?.full_name || u?.email || ''))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the address bar in step so a report can be bookmarked or shared.
  useEffect(() => {
    const next = new URLSearchParams();
    if (projectId) next.set('project', projectId);
    next.set('date', date);
    if (params.get('section')) next.set('section', params.get('section'));
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    if (projectId) localStorage.setItem(LAST_PROJECT_KEY, projectId);
  }, [projectId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Saving ----------------------------------------------------------------------
  const sendNow = useCallback(() => {
    clearTimeout(timerRef.current);
    if (reportRef.current && syncerRef.current && (dirtyRef.current || pendingDraftKeys().includes(key))) {
      dirtyRef.current = false;
      syncerRef.current.queue(reportRef.current);
    }
  }, [key]);

  // Load the report for the chosen project and day.
  useEffect(() => {
    if (!project) { setReport(null); return undefined; }
    let cancelled = false;
    const reportKey = draftKey(project.id, date);
    setLoading(true);
    setReport(null);
    setStatus('idle');
    setLastSaved(null);
    dirtyRef.current = false;
    revisedRef.current = false;

    const syncer = new ReportSyncer({
      onStatus: s => !cancelled && setStatus(s),
      onPhotoUploaded: (id, url) => {
        if (cancelled) return;
        setReport(prev => prev && {
          ...prev,
          photos: url
            ? prev.photos.map(p => (p.id === id ? { ...p, url, pending: false, uploaded_at: new Date().toISOString() } : p))
            : prev.photos.filter(p => p.id !== id),
        });
      },
      onSaved: (saved, sent) => {
        if (cancelled) return;
        const latest = reportRef.current;
        const merged = { ...(latest || sent), id: saved.id };
        const caughtUp = latest?.client_updated_at === sent.client_updated_at && !merged.photos?.some(p => p.pending);
        writeDraft(reportKey, merged, !caughtUp);
        setPending(!caughtUp);
        setLastSaved(new Date());
        setReport(prev => (prev && !prev.id ? { ...prev, id: saved.id } : prev));
      },
    });
    syncerRef.current = syncer;

    loadReport(project, date).then(({ data, pending: isPending }) => {
      if (cancelled) return;
      syncer.setId(data.id);
      setReport(data);
      setPending(isPending);
      setLoading(false);
      if (isPending) syncer.queue(data);
    });

    return () => {
      cancelled = true;
      // Send anything typed in the last second before switching away.
      clearTimeout(timerRef.current);
      if (dirtyRef.current && reportRef.current) syncer.queue(reportRef.current);
    };
  }, [project?.id, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every change: save on the device now, send to the server after a short pause.
  useEffect(() => {
    if (!report || !key || !dirtyRef.current) return;
    writeDraft(key, report, true);
    setPending(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(sendNow, AUTOSAVE_DELAY_MS);
  }, [report, key, sendNow]);

  // Retry when signal returns, every 30 seconds while anything is waiting,
  // and send immediately when the phone is locked or the app is put away.
  useEffect(() => {
    const retry = () => {
      if (pending && syncerRef.current && reportRef.current) syncerRef.current.queue(reportRef.current);
      flushOtherDrafts(key);
    };
    const onHide = () => document.visibilityState === 'hidden' && sendNow();
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', onHide);
    const t = setInterval(() => { if (pending || status === 'error' || status === 'offline') retry(); }, RETRY_EVERY_MS);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', onHide);
      clearInterval(t);
    };
  }, [pending, status, key, sendNow]);

  useEffect(() => { flushOtherDrafts(key); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Editing -----------------------------------------------------------------------
  // `system` changes (automatic weather, sign-off itself) are not logged as edits.
  const change = useCallback((updater, { system = false } = {}) => {
    setReport(prev => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const now = new Date().toISOString();
      const out = { ...next, client_updated_at: now };
      if (!system) {
        out.prepared_by = userName || prev.prepared_by || '';
        // Changes after sign-off are allowed but logged (once per editing session).
        if ((prev.status === 'submitted' || prev.status === 'sent') && !revisedRef.current) {
          revisedRef.current = true;
          out.revisions = [...(prev.revisions || []), { at: now, by: userName || 'unknown' }];
        }
      }
      return out;
    });
    dirtyRef.current = true;
  }, [userName]);

  const onField = useCallback((field, value) => change({ [field]: value }), [change]);
  const listProps = field => ({ items: report?.[field] || [], onChange: items => onField(field, items) });

  const onReading = useCallback((slot, reading) => change(prev => ({ ...prev, [`weather_${slot}`]: reading }), { system: true }), [change]);

  const onCoordinates = useCallback(coords => {
    if (!project) return;
    setProjects(list => list.map(p => (p.id === project.id ? { ...p, ...coords } : p)));
    base44.entities.Project.update(project.id, coords).catch(() => {});
  }, [project]);

  const onChangePhotos = useCallback(fn => change(prev => ({ ...prev, photos: fn(prev.photos || []) })), [change]);

  const disabled = report?.status === 'sent';
  const weather = useReportWeather({ project, date, report, onReading, onCoordinates, disabled });
  const manpower = report?.manpower || [];
  const manHours = manpower.reduce((sum, m) => sum + (Number(m.workers) || 0) * (Number(m.hours) || 0), 0);
  const headcount = manpower.reduce((sum, m) => sum + (Number(m.workers) || 0), 0);

  // ---- Sections: one tile each on the report's home screen -----------------------
  const openKey = params.get('section');
  const openSection = useCallback(sectionKey => {
    const next = new URLSearchParams(params);
    if (sectionKey) next.set('section', sectionKey);
    else next.delete('section');
    // A new history entry for each section, so the phone's Back button returns to the tiles.
    openedHereRef.current = !!sectionKey;
    setParams(next, { replace: !sectionKey });
    window.scrollTo({ top: 0 });
  }, [params, setParams]);

  // Return to the tiles. Uses the browser's Back when the section was opened
  // from the tiles, so the phone's own Back button and this one agree.
  const closeSection = () => {
    if (openedHereRef.current) {
      openedHereRef.current = false;
      window.history.back();
      setTimeout(() => window.scrollTo({ top: 0 }), 0);
    } else {
      openSection(null);
    }
  };

  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const optional = (n, one, many) => ({
    value: n ? count(n, one, many) : 'None',
    status: n ? 'Added' : 'Optional — tap if any',
    done: n > 0,
  });

  const sections = !report ? [] : [
    {
      key: 'weather', title: 'Weather', icon: CloudSun, tone: 'amber',
      value: report.weather_am || report.weather_pm
        ? [report.weather_am, report.weather_pm].filter(Boolean).map(w => `${w.temperature_f ?? '—'}°`).join(' / ')
        : 'Automatic',
      status: report.weather_am && report.weather_pm ? 'AM & PM recorded' : report.weather_am ? 'AM recorded' : 'Records itself',
      done: !!(report.weather_am || report.weather_pm),
      render: () => (
        <WeatherCard report={report} onField={onField} disabled={disabled} weather={weather}
          instruction="Nothing to enter here — weather records itself at 7:00 AM and 2:00 PM. Only add site conditions if the ground is wet, muddy, frozen or flooded." />
      ),
    },
    {
      key: 'crew', title: 'Crew on Site', icon: HardHat, tone: 'blue', required: true,
      value: headcount ? `${headcount} on site` : 'No crew yet',
      status: headcount ? `${manHours} man-hours` : 'Required',
      done: manpower.length > 0,
      render: () => (
        <ListSection
          icon={HardHat} tone="blue" title="Crew on Site"
          subtitle={headcount ? `${headcount} on site · ${manHours} man-hours` : null}
          instruction="Add one line for each company on site today, including Whayland's own crew. Enter how many workers they had and how many hours each worked."
          addLabel="Add this crew" emptyText="No crews added yet." disabled={disabled}
          fields={[
            { key: 'company', label: 'Company', required: true, hint: 'e.g. Whayland', suggestions: ['Whayland', ...subcontractorNames] },
            { key: 'trade', label: 'Trade', hint: 'e.g. Carpentry, Concrete, Electrical' },
            { key: 'workers', label: 'Number of workers', type: 'number', hint: 'e.g. 4', required: true },
            { key: 'hours', label: 'Hours each worked', type: 'number', step: '0.5', hint: 'e.g. 8', required: true },
            { key: 'work_performed', label: 'What they worked on', hint: 'e.g. Framing east wall, Building B', full: true },
          ]}
          summary={m => ({
            title: m.company,
            detail: [m.trade, m.workers && `${m.workers} workers`, m.hours && `${m.hours} hrs each`, m.work_performed].filter(Boolean).join(' · '),
          })}
          {...listProps('manpower')}
        />
      ),
    },
    {
      key: 'work', title: 'Work Performed', icon: Hammer, tone: 'green', required: true,
      value: report.work_performed?.trim() ? 'Entered' : 'Not yet',
      status: report.work_performed?.trim() ? 'Done' : 'Required',
      done: !!report.work_performed?.trim(),
      render: () => (
        <TextSection icon={Hammer} tone="green" title="Work Performed" field="work_performed" rows={7}
          instruction="Describe what got done today. Say where (area, building, floor or cost code) so the office knows exactly what moved forward."
          placeholder={'e.g.\nArea B: framed east wall, gridlines 4–7.\nMain entry: storefront frames set.'}
          report={report} onField={onField} disabled={disabled} />
      ),
    },
    {
      key: 'photos', title: 'Photos', icon: Camera, tone: 'purple',
      value: report.photos?.length ? count(report.photos.length, 'photo', 'photos') : 'None yet',
      status: report.photos?.length ? (report.photos.some(p => p.pending) ? 'Some waiting for signal' : 'Uploaded') : 'Take a few',
      done: (report.photos?.length || 0) > 0,
      render: () => (
        <PhotoGalleryCard report={report} onChangePhotos={onChangePhotos} syncStatus={status} disabled={disabled} toast={toast}
          instruction="Take photos of today's progress, any problems, and deliveries. Add a short caption under each photo so others know what they're looking at." />
      ),
    },
    {
      key: 'safety', title: 'Safety', icon: ShieldCheck, tone: 'red', required: true,
      value: report.safety_incidents?.trim()
        ? (report.safety_incidents.trim().toLowerCase() === 'none' ? 'No incidents' : 'Incident noted')
        : 'Not yet',
      status: report.safety_incidents?.trim() ? (report.toolbox_talk?.trim() ? 'Done' : 'Add toolbox talk') : 'Required',
      done: !!report.safety_incidents?.trim(),
      render: () => (
        <Section icon={ShieldCheck} tone="red" title="Safety"
          instruction={disabled ? null : "Enter today's toolbox talk topic. If anyone was hurt or there was a close call, describe it. If nothing happened, tap “No incidents today.”"}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="toolbox_talk" className="text-sm font-semibold text-gray-700">Toolbox talk topic</Label>
              <Input id="toolbox_talk" placeholder="e.g. Ladder safety" value={report.toolbox_talk || ''}
                onChange={e => onField('toolbox_talk', e.target.value)} disabled={disabled} className="h-11 sm:h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safety_incidents" className="text-sm font-semibold text-gray-700">Injuries, incidents or close calls <span className="text-red-600">*</span></Label>
              {!disabled && !report.safety_incidents && (
                <Button type="button" onClick={() => onField('safety_incidents', 'None')}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base">
                  <Check className="w-5 h-5 mr-2" /> No incidents today
                </Button>
              )}
              <Textarea id="safety_incidents" rows={3}
                placeholder="If something happened: what happened, who was involved, and what was done about it."
                value={report.safety_incidents || ''} onChange={e => onField('safety_incidents', e.target.value)} disabled={disabled} className="text-base md:text-sm" />
            </div>
          </div>
        </Section>
      ),
    },
    {
      key: 'deliveries', title: 'Deliveries', icon: Truck, tone: 'amber',
      ...optional(report.deliveries?.length || 0, 'delivery', 'deliveries'),
      render: () => (
        <ListSection icon={Truck} tone="amber" title="Deliveries"
          instruction="Add one line for each delivery that arrived today."
          addLabel="Add this delivery" emptyText="No deliveries added." disabled={disabled}
          fields={[
            { key: 'material', label: 'What was delivered', required: true, hint: 'e.g. Drywall, 2x6 studs, rebar' },
            { key: 'supplier', label: 'Supplier', hint: 'e.g. 84 Lumber' },
            { key: 'quantity', label: 'Quantity', hint: 'e.g. 120 sheets' },
            { key: 'notes', label: 'Notes', hint: 'e.g. 3 sheets damaged' },
          ]}
          {...listProps('deliveries')}
        />
      ),
    },
    {
      key: 'equipment', title: 'Equipment', icon: Wrench, tone: 'slate',
      ...optional(report.equipment?.length || 0, 'machine', 'machines'),
      render: () => (
        <ListSection icon={Wrench} tone="slate" title="Equipment"
          instruction="List the equipment used on site today, such as an excavator, lift, loader or roller."
          addLabel="Add this equipment" emptyText="No equipment added." disabled={disabled}
          fields={[
            { key: 'equipment', label: 'Equipment', required: true, hint: 'e.g. Mini excavator' },
            { key: 'company', label: 'Owned or rented by', hint: 'e.g. Whayland, United Rentals' },
            { key: 'hours', label: 'Hours used', type: 'number', step: '0.5', hint: 'e.g. 6', suffixLabel: 'hrs' },
            { key: 'notes', label: 'Notes', hint: 'e.g. Down 1 hr for repair' },
          ]}
          {...listProps('equipment')}
        />
      ),
    },
    {
      key: 'inspections', title: 'Inspections', icon: ClipboardCheck, tone: 'green',
      ...optional(report.inspections?.length || 0, 'inspection', 'inspections'),
      render: () => (
        <ListSection icon={ClipboardCheck} tone="green" title="Inspections"
          instruction="Add any inspection that happened today and its result."
          addLabel="Add this inspection" emptyText="No inspections added." disabled={disabled}
          fields={[
            { key: 'type', label: 'What was inspected', required: true, hint: 'e.g. Footing, Framing, Electrical rough-in' },
            { key: 'inspector', label: 'Inspector or agency', hint: 'e.g. Sussex County' },
            { key: 'result', label: 'Result', type: 'select', options: INSPECTION_RESULTS },
            { key: 'notes', label: 'Notes', hint: 'e.g. Re-inspect Friday' },
          ]}
          {...listProps('inspections')}
        />
      ),
    },
    {
      key: 'visitors', title: 'Visitors', icon: Users, tone: 'purple',
      ...optional(report.visitors?.length || 0, 'visitor', 'visitors'),
      render: () => (
        <ListSection icon={Users} tone="purple" title="Visitors & Meetings"
          instruction="Add anyone who came to the site today, such as the owner, architect, engineer or a supplier rep."
          addLabel="Add this visitor" emptyText="No visitors added." disabled={disabled}
          fields={[
            { key: 'name', label: 'Name', required: true, hint: 'e.g. John Smith' },
            { key: 'company', label: 'Company', hint: 'e.g. Owner, ABC Architects' },
            { key: 'purpose', label: 'Why they came', hint: 'e.g. Weekly OAC meeting', full: true },
          ]}
          {...listProps('visitors')}
        />
      ),
    },
    {
      key: 'delays', title: 'Delays', icon: Clock, tone: 'red',
      ...optional(report.delays?.length || 0, 'delay', 'delays'),
      render: () => (
        <ListSection icon={Clock} tone="red" title="Delays"
          instruction="If work stopped or slowed today, add why and about how many hours were lost. This protects us if we need more time on the schedule."
          addLabel="Add this delay" emptyText="No delays added." disabled={disabled}
          fields={[
            { key: 'cause', label: 'Cause', required: true, type: 'select', options: DELAY_CAUSES },
            { key: 'hours_lost', label: 'Hours lost', type: 'number', step: '0.5', hint: 'e.g. 2', suffixLabel: 'hrs lost' },
            { key: 'description', label: 'What happened', hint: 'e.g. Rain stopped roofing from 1–3 PM', full: true },
          ]}
          {...listProps('delays')}
        />
      ),
    },
    {
      key: 'utilities', title: 'Utilities', icon: Zap, tone: 'amber',
      value: report.utilities_installed?.trim() || report.utilities_removed?.trim() ? 'Entered' : 'None',
      status: report.utilities_installed?.trim() || report.utilities_removed?.trim() ? 'Added' : 'Optional — tap if any',
      done: !!(report.utilities_installed?.trim() || report.utilities_removed?.trim()),
      render: () => (
        <Section icon={Zap} tone="amber" title="Utilities"
          instruction={disabled ? null : 'Describe any utilities installed or removed today, such as water, sewer, power or gas lines.'}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="utilities_installed" className="text-sm font-semibold text-gray-700">Installed today</Label>
              <Textarea id="utilities_installed" rows={3} value={report.utilities_installed || ''} placeholder="e.g. 60 ft of 4&quot; sewer line, manhole MH-2 to building"
                onChange={e => onField('utilities_installed', e.target.value)} disabled={disabled} className="text-base md:text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="utilities_removed" className="text-sm font-semibold text-gray-700">Removed today</Label>
              <Textarea id="utilities_removed" rows={3} value={report.utilities_removed || ''} placeholder="e.g. Temporary power pole removed"
                onChange={e => onField('utilities_removed', e.target.value)} disabled={disabled} className="text-base md:text-sm" />
            </div>
          </div>
        </Section>
      ),
    },
    {
      key: 'notes', title: 'Notes', icon: FileText, tone: 'slate',
      value: report.notes?.trim() ? 'Entered' : 'None',
      status: report.notes?.trim() ? 'Added' : 'Optional',
      done: !!report.notes?.trim(),
      render: () => (
        <TextSection icon={FileText} tone="slate" title="General Notes" field="notes"
          instruction="Anything else the office should know about today: problems, owner requests, questions for the architect, schedule concerns."
          placeholder="Type your notes here…" report={report} onField={onField} disabled={disabled} />
      ),
    },
  ];

  const current = sections.find(s => s.key === openKey);
  const missing = sections.filter(s => s.required && !s.done).map(s => s.title);

  const submit = signer => {
    if (missing.length && !window.confirm(`Still missing: ${missing.join(', ')}.\n\nSubmit anyway?`)) return;
    const now = new Date().toISOString();
    change(prev => ({ ...prev, status: 'submitted', signed_by: signer, signed_at: now, submitted_at: now }), { system: true });
    setTimeout(sendNow, 0);
    toast({ title: 'Report submitted', description: 'It will be filed to SharePoint at 7:00 PM.' });
  };

  // ---- One section open ---------------------------------------------------------------
  if (report && !loading && current) {
    return (
      <div className="max-w-3xl mx-auto pb-10">
        <button type="button" onClick={closeSection}
          className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2 pr-3">
          <ArrowLeft className="w-5 h-5" /> Back to report
        </button>
        <p className="text-sm text-gray-500 mb-3 truncate">{report.project_name} · {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        {current.render()}
        <Button onClick={closeSection} className="w-full h-12 mt-4 bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold text-base">
          <Check className="w-5 h-5 mr-2" /> Done — back to report
        </Button>
      </div>
    );
  }

  // ---- Report home: project, tiles, sign-off ----------------------------------------
  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Daily Report</h1>
        <p className="text-gray-500 mt-1">Tap a tile to fill it in. Everything saves as you go.</p>
      </div>

      <div className="space-y-5">
        <ReportHeader
          projects={projects}
          projectId={projectId}
          date={date}
          onProjectChange={id => { sendNow(); setProjectId(id); }}
          onDateChange={d => { sendNow(); setDate(d); }}
          report={report}
          onField={onField}
          disabled={disabled}
        />

        {!projectId && projectsLoaded && (
          <p className="text-center text-gray-500 py-6">Choose your project above to start today&apos;s report.</p>
        )}
        {projectId && projectsLoaded && !project && (
          <p className="text-center text-gray-500 py-6">That project isn&apos;t available. Choose another project above.</p>
        )}
        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-500 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading report…</div>
        )}

        {report && !loading && (
          <>
            <SectionTiles sections={sections} onOpen={openSection} />
            {missing.length > 0 && report.status === 'draft' && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                Before you sign off, fill in: <strong>{missing.join(', ')}</strong>.
              </p>
            )}
            <FooterActions report={report} status={status} lastSaved={lastSaved} pending={pending} onSubmit={submit} disabled={disabled} />
          </>
        )}
      </div>
    </div>
  );
}
