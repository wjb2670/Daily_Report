import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { base44, resolvePhoto } from '@/field/spAdapter';
import { todayStr } from '@/lib/dailyReportStore';
import PrintableReport, { sitePhotos, shortDate } from '@/field/PrintableReport';

// Date-range shortcuts, Monday-based weeks.
function ranges() {
  const t = new Date();
  const d = (y, m, day) => todayStr(new Date(y, m, day));
  const y = t.getFullYear(), m = t.getMonth(), dd = t.getDate();
  const dow = (t.getDay() + 6) % 7; // 0 = Monday
  return [
    { key: 'week', label: 'This week', from: d(y, m, dd - dow), to: todayStr(t) },
    { key: 'lastweek', label: 'Last week', from: d(y, m, dd - dow - 7), to: d(y, m, dd - dow - 1) },
    { key: 'month', label: 'This month', from: d(y, m, 1), to: todayStr(t) },
    { key: 'lastmonth', label: 'Last month', from: d(y, m - 1, 1), to: d(y, m, 0) },
  ];
}

// Runs `fn` over items a few at a time.
async function pool(items, size, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const item = items[i++]; await fn(item); }
  });
  await Promise.all(workers);
}

export default function ReportsPage() {
  const quick = ranges();
  const [projects, setProjects] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [projectId, setProjectId] = useState('');
  const [from, setFrom] = useState(quick[0].from);
  const [to, setTo] = useState(quick[0].to);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [imagesReady, setImagesReady] = useState(false);
  const [me, setMe] = useState('');
  const reportRef = useRef(null);

  useEffect(() => {
    base44.entities.AllProjects.list()
      .then(list => { setProjects(list); if (list.length === 1) setProjectId(list[0].id); })
      .catch(err => setLoadError(err.message || 'Could not load projects.'));
    base44.auth.me().then(u => setMe(u?.full_name || '')).catch(() => {});
  }, []);

  const project = projects?.find(p => p.id === projectId);
  const activeQuick = quick.find(q => q.from === from && q.to === to)?.key;

  const generate = async () => {
    setError('');
    setResult(null);
    setImagesReady(false);
    if (from > to) { setError('The start date is after the end date.'); return; }
    try {
      setBusy('Finding daily reports…');
      const all = await base44.entities.DailyReport.filter({ project_id: projectId });
      const reports = all
        .filter(r => r.report_date >= from && r.report_date <= to)
        .filter(r => includeDrafts || r.status !== 'draft')
        .sort((a, b) => a.report_date.localeCompare(b.report_date));

      const srcs = {};
      if (includePhotos) {
        const photos = reports.flatMap(sitePhotos);
        let done = 0;
        setBusy(`Loading photos 0 of ${photos.length}…`);
        await pool(photos, 6, async p => {
          try { srcs[p.id] = await resolvePhoto(p.url, 'large'); } catch { /* shown as unavailable */ }
          done += 1;
          setBusy(`Loading photos ${done} of ${photos.length}…`);
        });
      }
      setResult({ project, from, to, reports, srcs, includePhotos });
    } catch (err) {
      setError(err.message || 'Could not build the report.');
    } finally {
      setBusy('');
    }
  };

  // Print only once every photo has finished loading.
  useEffect(() => {
    if (!result) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      const imgs = Array.from(reportRef.current?.querySelectorAll('img') || []);
      await Promise.all(imgs.map(img => (img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r; }))));
      if (!cancelled) setImagesReady(true);
    }, 50);
    return () => { cancelled = true; clearTimeout(t); };
  }, [result]);

  if (result) {
    const photoCount = result.includePhotos ? result.reports.reduce((n, r) => n + sitePhotos(r).length, 0) : 0;
    return (
      <div className="-m-4 md:-m-6 print:m-0">
        <div className="print:hidden sticky top-14 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setResult(null)} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold py-2 pr-2">
              <ArrowLeft className="w-5 h-5" /> Change
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[#0f2a5e] truncate">{result.project.name}</div>
              <div className="text-sm text-gray-500">
                {shortDate(result.from)} – {shortDate(result.to)} · {result.reports.length} day{result.reports.length === 1 ? '' : 's'}
                {result.includePhotos ? ` · ${photoCount} photo${photoCount === 1 ? '' : 's'}` : ''}
              </div>
            </div>
            <Button onClick={() => window.print()} disabled={!imagesReady}
              className="h-11 bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold px-5">
              {imagesReady ? <><Printer className="w-4 h-4 mr-2" /> Print / Save as PDF</> : <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing…</>}
            </Button>
          </div>
        </div>
        <div ref={reportRef}>
          <PrintableReport {...result} preparedBy={me} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">Generate Reports</h1>
      <p className="text-gray-500 mb-6">Choose a job and dates. You get one printable report with every daily report and photo in that period.</p>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
        <div className="space-y-1">
          <Label htmlFor="rp-project" className="text-sm font-semibold text-gray-700">Project</Label>
          {loadError ? (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{loadError}</p>
          ) : (
            <select id="rp-project" value={projectId} onChange={e => setProjectId(e.target.value)} disabled={!projects}
              className="w-full h-11 rounded-md border border-input bg-white px-3 text-base md:text-sm">
              <option value="">{projects ? 'Choose a project…' : 'Loading projects…'}</option>
              {(projects || []).map(p => (
                <option key={p.id} value={p.id}>{p.job_number ? `${p.job_number} · ` : ''}{p.name}{p.status === 'complete' ? ' (complete)' : ''}</option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700">Dates</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quick.map(q => (
              <button key={q.key} type="button" onClick={() => { setFrom(q.from); setTo(q.to); }}
                className={`h-11 rounded-md text-sm font-semibold border ${activeQuick === q.key ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rp-from" className="text-sm text-gray-600">From</Label>
              <Input id="rp-from" type="date" value={from} onChange={e => e.target.value && setFrom(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-to" className="text-sm text-gray-600">To</Label>
              <Input id="rp-to" type="date" value={to} onChange={e => e.target.value && setTo(e.target.value)} className="h-11" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3 text-base">
            <input type="checkbox" className="w-5 h-5 accent-[#0f2a5e]" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} />
            Include photos
          </label>
          <label className="flex items-center gap-3 text-base">
            <input type="checkbox" className="w-5 h-5 accent-[#0f2a5e]" checked={includeDrafts} onChange={e => setIncludeDrafts(e.target.checked)} />
            Include reports not yet signed off
          </label>
        </div>

        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

        <Button onClick={generate} disabled={!projectId || !!busy}
          className="w-full h-12 bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold text-base">
          {busy ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {busy}</> : 'Generate report'}
        </Button>
      </section>
    </div>
  );
}
