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
} from 'lucide-react';
import Section from '@/components/report/Section';
import ListSection from '@/components/report/ListSection';
import ReportHeader from '@/components/report/ReportHeader';
import WeatherCard from '@/components/report/WeatherCard';
import PhotoGalleryCard from '@/components/report/PhotoGalleryCard';
import FooterActions from '@/components/report/FooterActions';
import {
  ReportSyncer, LAST_PROJECT_KEY, draftKey, loadReport, pendingDraftKeys, readDraft, todayStr, writeDraft,
} from '@/lib/dailyReportStore';

const REPORT_STATUSES = ['awarded', 'active', 'on_hold'];
const AUTOSAVE_DELAY_MS = 1200;
const RETRY_EVERY_MS = 30_000;

const DELAY_CAUSES = ['Weather', 'Owner', 'Material', 'Design / RFI', 'Subcontractor', 'Inspection', 'Other'];
const INSPECTION_RESULTS = ['Passed', 'Failed', 'Partial', 'Rescheduled'];

function TextSection({ icon, tone, title, subtitle, field, placeholder, report, onField, disabled, rows = 4 }) {
  return (
    <Section icon={icon} tone={tone} title={title} subtitle={subtitle}>
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

  const submit = signer => {
    const hasWork = report.work_performed?.trim() || report.manpower?.length;
    if (!hasWork && !window.confirm('No crew or work performed is listed. Submit anyway?')) return;
    const now = new Date().toISOString();
    change(prev => ({ ...prev, status: 'submitted', signed_by: signer, signed_at: now, submitted_at: now }), { system: true });
    setTimeout(sendNow, 0);
    toast({ title: 'Report submitted', description: 'It will be filed to SharePoint at 7:00 PM.' });
  };

  const disabled = report?.status === 'sent';
  const manHours = (report?.manpower || []).reduce((sum, m) => sum + (Number(m.workers) || 0) * (Number(m.hours) || 0), 0);
  const headcount = (report?.manpower || []).reduce((sum, m) => sum + (Number(m.workers) || 0), 0);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Daily Report</h1>
        <p className="text-gray-500 mt-1">Saves as you go. Weather records at 7:00 AM and 2:00 PM; the report is filed at 7:00 PM.</p>
      </div>

      <div className="space-y-4 sm:space-y-5">
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
          <p className="text-center text-gray-500 py-6">Choose a project to start today&apos;s report.</p>
        )}
        {projectId && projectsLoaded && !project && (
          <p className="text-center text-gray-500 py-6">That project isn&apos;t available. Choose another project above.</p>
        )}
        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-500 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading report…</div>
        )}

        {report && !loading && (
          <>
            <WeatherCard project={project} date={date} report={report} onReading={onReading} onField={onField} onCoordinates={onCoordinates} disabled={disabled} />

            <ListSection
              icon={HardHat}
              tone="blue"
              title="Manpower"
              subtitle={headcount ? `${headcount} on site · ${manHours} man-hours` : 'Whayland crew and subcontractors on site'}
              addLabel="Add crew"
              emptyText="No crews listed yet."
              disabled={disabled}
              fields={[
                { key: 'company', label: 'Company', required: true, suggestions: ['Whayland', ...subcontractorNames] },
                { key: 'trade', label: 'Trade' },
                { key: 'workers', label: '# of workers', type: 'number' },
                { key: 'hours', label: 'Hours each', type: 'number', step: '0.5' },
                { key: 'work_performed', label: 'Work performed', full: true },
              ]}
              summary={m => ({
                title: m.company,
                detail: [m.trade, m.workers && `${m.workers} workers`, m.hours && `${m.hours} hrs`, m.work_performed].filter(Boolean).join(' · '),
              })}
              {...listProps('manpower')}
            />

            <TextSection icon={Hammer} tone="green" title="Work Performed" subtitle="By area or cost code" field="work_performed"
              placeholder="e.g. Area B: poured footings F1–F6. 03-300: set rebar for grade beams." report={report} onField={onField} disabled={disabled} rows={5} />

            <ListSection
              icon={Wrench}
              tone="slate"
              title="Equipment"
              addLabel="Add equipment"
              emptyText="No equipment listed."
              disabled={disabled}
              fields={[
                { key: 'equipment', label: 'Equipment', required: true },
                { key: 'company', label: 'Owned / rented by' },
                { key: 'hours', label: 'Hours used', type: 'number', step: '0.5', suffixLabel: 'hrs' },
                { key: 'notes', label: 'Notes' },
              ]}
              {...listProps('equipment')}
            />

            <ListSection
              icon={Truck}
              tone="amber"
              title="Deliveries"
              addLabel="Add delivery"
              emptyText="No deliveries today."
              disabled={disabled}
              fields={[
                { key: 'material', label: 'Material', required: true },
                { key: 'supplier', label: 'Supplier' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'notes', label: 'Notes' },
              ]}
              {...listProps('deliveries')}
            />

            <ListSection
              icon={ClipboardCheck}
              tone="green"
              title="Inspections"
              addLabel="Add inspection"
              emptyText="No inspections today."
              disabled={disabled}
              fields={[
                { key: 'type', label: 'Inspection type', required: true },
                { key: 'inspector', label: 'Inspector / agency' },
                { key: 'result', label: 'Result', type: 'select', options: INSPECTION_RESULTS },
                { key: 'notes', label: 'Notes' },
              ]}
              {...listProps('inspections')}
            />

            <ListSection
              icon={Users}
              tone="purple"
              title="Visitors & Meetings"
              addLabel="Add visitor"
              emptyText="No visitors today."
              disabled={disabled}
              fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'company', label: 'Company' },
                { key: 'purpose', label: 'Purpose / meeting', full: true },
              ]}
              {...listProps('visitors')}
            />

            <Section icon={ShieldCheck} tone="red" title="Safety">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="toolbox_talk">Toolbox talk topic</Label>
                  <Input id="toolbox_talk" placeholder="e.g. Trench safety" value={report.toolbox_talk || ''}
                    onChange={e => onField('toolbox_talk', e.target.value)} disabled={disabled} className="h-11 sm:h-9" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="safety_incidents">Incidents, injuries, or near-misses</Label>
                    {!disabled && !report.safety_incidents && (
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onField('safety_incidents', 'None')}>None today</Button>
                    )}
                  </div>
                  <Textarea id="safety_incidents" placeholder="Describe what happened, who was involved, and what was done." rows={3}
                    value={report.safety_incidents || ''} onChange={e => onField('safety_incidents', e.target.value)} disabled={disabled} className="text-base md:text-sm" />
                </div>
              </div>
            </Section>

            <ListSection
              icon={Clock}
              tone="red"
              title="Delays"
              subtitle="Record the cause and hours lost — this supports time extensions and claims"
              addLabel="Add delay"
              emptyText="No delays today."
              disabled={disabled}
              fields={[
                { key: 'cause', label: 'Cause', required: true, type: 'select', options: DELAY_CAUSES },
                { key: 'hours_lost', label: 'Hours lost', type: 'number', step: '0.5', suffixLabel: 'hrs lost' },
                { key: 'description', label: 'What happened', full: true },
              ]}
              {...listProps('delays')}
            />

            <Section icon={Zap} tone="amber" title="Utilities">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="utilities_installed">Installed</Label>
                  <Textarea id="utilities_installed" rows={3} value={report.utilities_installed || ''} placeholder="Utilities installed today…"
                    onChange={e => onField('utilities_installed', e.target.value)} disabled={disabled} className="text-base md:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="utilities_removed">Removed</Label>
                  <Textarea id="utilities_removed" rows={3} value={report.utilities_removed || ''} placeholder="Utilities removed today…"
                    onChange={e => onField('utilities_removed', e.target.value)} disabled={disabled} className="text-base md:text-sm" />
                </div>
              </div>
            </Section>

            <PhotoGalleryCard report={report} onChangePhotos={onChangePhotos} syncStatus={status} disabled={disabled} toast={toast} />

            <TextSection icon={FileText} tone="slate" title="General Notes" field="notes"
              placeholder="Anything else from today: issues, owner requests, RFIs, schedule notes…" report={report} onField={onField} disabled={disabled} />

            <FooterActions report={report} status={status} lastSaved={lastSaved} pending={pending} onSubmit={submit} disabled={disabled} />
          </>
        )}
      </div>
    </div>
  );
}
