import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2, Phone, Search, Handshake, ClipboardList, Receipt, FolderOpen, HardHat, CalendarPlus, ChevronRight, AlertTriangle, CheckCircle2, Megaphone, CalendarDays, Trash2, X, Camera,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { todayStr, readDraft, draftKey, findServerReport, LAST_PROJECT_KEY } from '@/lib/dailyReportStore';
import { preparePhoto } from '@/lib/photos';
import { currentAccount } from '@/field/auth';
import {
  findLookahead, readLookahead, listEvents, addEvent, deleteEvent, saveReceipt, sendPendingReceipts, pendingReceipts, receiptsThisWeek, RECEIPTS_DUE_DAY,
} from '@/field/jobData';
import { noDollars, fieldSubcontracts } from '@/field/scopesData';
import { getTurnover } from '@/field/turnoverData';

const input = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]';
const DAY = 86_400_000;
const parseDay = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => todayStr(new Date(parseDay(s).getTime() + n * DAY));
const dayLabel = (s, today) => {
  const diff = Math.round((parseDay(s) - parseDay(today)) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return parseDay(s).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
};
const timeOf = iso => (iso && iso.length > 10 ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');
const isWeekday = s => { const d = parseDay(s).getDay(); return d > 0 && d < 6; };
const KIND_STYLE = { Meeting: 'bg-blue-100 text-blue-800', Inspection: 'bg-amber-100 text-amber-800', Delivery: 'bg-purple-100 text-purple-800', Other: 'bg-gray-100 text-gray-700', Work: 'bg-green-100 text-green-800' };

function Card({ children, className = '' }) {
  return <section className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 ${className}`}>{children}</section>;
}
function Tile({ to, onClick, icon: Icon, title, sub }) {
  const cls = 'flex items-center gap-3 bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white rounded-xl p-4 min-h-[76px] text-left w-full';
  const body = (<><Icon className="w-7 h-7 shrink-0" /><span className="min-w-0"><span className="block font-bold text-lg leading-tight">{title}</span>{sub && <span className="block text-sm text-blue-100">{sub}</span>}</span></>);
  return to ? <Link to={to} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

// ---- Snap receipt -------------------------------------------------------------

function ReceiptSheet({ project, onClose, onSaved }) {
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState({ vendor: '', amount: '', date: todayStr() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try { const p = await preparePhoto(file, { projectName: project.name }); setPhoto({ ...p, preview: URL.createObjectURL(p.blob) }); } catch { setError('Couldn’t read that photo. Try again.'); }
    setBusy(false);
  };
  const save = async () => {
    setBusy(true); setError('');
    try { const r = await saveReceipt(project, photo.blob, form); onSaved(r); } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-label="Snap receipt">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-[#0f2a5e]">Snap receipt</h2><button type="button" aria-label="Close" onClick={onClose} className="p-2 text-gray-500"><X className="w-5 h-5" /></button></div>
        <label className="block">
          {photo ? <img src={photo.preview} alt="Receipt" className="w-full max-h-64 object-contain rounded-lg border border-gray-200" />
            : <span className="flex flex-col items-center justify-center gap-2 h-40 rounded-lg border-2 border-dashed border-[#1e3a8a] text-[#1e3a8a] font-semibold"><Camera className="w-8 h-8" /> Take a photo of the receipt</span>}
          <input type="file" accept="image/*" capture="environment" onChange={pick} className="sr-only" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><label htmlFor="rc-vendor" className="text-sm font-semibold text-gray-700">Where from</label><input id="rc-vendor" className={input} value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Lowe's" /></div>
          <div className="space-y-1"><label htmlFor="rc-amount" className="text-sm font-semibold text-gray-700">Amount</label><input id="rc-amount" inputMode="decimal" className={input} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0.00" /></div>
          <div className="space-y-1"><label htmlFor="rc-date" className="text-sm font-semibold text-gray-700">Date</label><input id="rc-date" type="date" className={input} value={form.date} onChange={e => e.target.value && setForm(f => ({ ...f, date: e.target.value }))} /></div>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="button" onClick={save} disabled={!photo || busy} className="w-full h-12 rounded-md bg-[#0f2a5e] text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Send to Weekly Receipts
        </button>
        <p className="text-xs text-gray-500">Saved to the job’s Weekly Receipts folder. With no signal it waits on this device and sends later.</p>
      </div>
    </div>
  );
}

// ---- Add meeting / inspection -------------------------------------------------

function EventSheet({ project, onClose, onAdded }) {
  const [form, setForm] = useState({ kind: 'Inspection', title: '', date: todayStr(), time: '09:00', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true); setError('');
    try {
      const when = new Date(`${form.date}T${form.time || '08:00'}:00`).toISOString();
      const ev = await addEvent(project.id, { title: form.title.trim(), kind: form.kind, when, notes: form.notes, addedBy: currentAccount()?.name || '' });
      onAdded(ev);
    } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-label="Add to the schedule">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-[#0f2a5e]">Add meeting or inspection</h2><button type="button" aria-label="Close" onClick={onClose} className="p-2 text-gray-500"><X className="w-5 h-5" /></button></div>
        <div className="grid grid-cols-4 gap-1.5">
          {['Inspection', 'Meeting', 'Delivery', 'Other'].map(k => (
            <button key={k} type="button" onClick={() => setForm(f => ({ ...f, kind: k }))} className={`h-10 rounded-md text-sm font-semibold border ${form.kind === k ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>{k}</button>
          ))}
        </div>
        <div className="space-y-1"><label htmlFor="ev-title" className="text-sm font-semibold text-gray-700">What</label><input id="ev-title" className={input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={form.kind === 'Inspection' ? 'e.g. Footing inspection – county' : 'e.g. OAC meeting'} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label htmlFor="ev-date" className="text-sm font-semibold text-gray-700">Date</label><input id="ev-date" type="date" className={input} value={form.date} onChange={e => e.target.value && setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="space-y-1"><label htmlFor="ev-time" className="text-sm font-semibold text-gray-700">Time</label><input id="ev-time" type="time" className={input} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
        </div>
        <div className="space-y-1"><label htmlFor="ev-notes" className="text-sm font-semibold text-gray-700">Notes <span className="font-normal text-gray-400">(optional)</span></label><input id="ev-notes" className={input} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="button" onClick={save} disabled={busy || !form.title.trim()} className="w-full h-12 rounded-md bg-[#0f2a5e] text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">{busy && <Loader2 className="w-5 h-5 animate-spin" />} Add</button>
      </div>
    </div>
  );
}

// ---- Dashboard ------------------------------------------------------------------

export default function JobDashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [report, setReport] = useState({ loading: true });
  const [lookahead, setLookahead] = useState({ loading: true });
  const [events, setEvents] = useState([]);
  const [receipts, setReceipts] = useState({ count: null, waiting: 0 });
  const [sheet, setSheet] = useState('');
  const [flash, setFlash] = useState('');
  const [subs, setSubs] = useState(null);
  const [scopeQ, setScopeQ] = useState('');
  const [turnover, setTurnover] = useState(null);
  const today = todayStr();

  useEffect(() => {
    base44.entities.Project.list()
      .then(all => setProjects(all.filter(p => p.status !== 'complete')))
      .catch(err => setError(err.message || 'Couldn’t load your projects.'));
  }, []);

  const project = useMemo(() => {
    if (!projects?.length) return null;
    const want = params.get('project') || (() => { try { return localStorage.getItem(LAST_PROJECT_KEY); } catch { return ''; } })();
    return projects.find(p => String(p.id) === String(want)) || projects[0];
  }, [projects, params]);

  useEffect(() => {
    if (!project) return;
    try { localStorage.setItem(LAST_PROJECT_KEY, project.id); } catch { /* ignore */ }
    // Today's report and yesterday's
    (async () => {
      const local = readDraft(draftKey(project.id, today));
      let server = null;
      try { server = await findServerReport(project.id, today); } catch { /* offline */ }
      const r = server || local?.data || null;
      let missedYesterday = false;
      let prev = addDays(today, -1);
      while (!isWeekday(prev)) prev = addDays(prev, -1);
      try { missedYesterday = !(await findServerReport(project.id, prev)) && !readDraft(draftKey(project.id, prev)); } catch { /* offline */ }
      setReport({ loading: false, status: r?.status || 'none', signedAt: r?.signed_at, prev, missedYesterday });
    })();
    // Look-ahead
    setLookahead({ loading: true });
    (async () => {
      try {
        const file = await findLookahead(project.field_folders);
        if (!file) { setLookahead({ loading: false, none: true }); return; }
        const { items, error: perr } = await readLookahead(project.field_folders, file);
        setLookahead({ loading: false, file, items, error: perr });
      } catch (err) { setLookahead({ loading: false, error: err.status === 403 ? 'You don’t have access to the Schedule folder yet. Ask the office.' : 'Couldn’t read the look-ahead.' }); }
    })();
    listEvents(project.id).then(setEvents).catch(() => setEvents([]));
    setSubs(null);
    fieldSubcontracts(project.id).then(setSubs).catch(() => setSubs([]));
    setTurnover(null);
    getTurnover(project.id).then(t => setTurnover(t.id ? t : null)).catch(() => {});
    const refreshReceipts = () => {
      sendPendingReceipts().finally(() => {
        receiptsThisWeek(project.field_folders)
          .then(list => setReceipts({ count: list.length, waiting: pendingReceipts(project.id).length }))
          .catch(() => setReceipts({ count: null, waiting: pendingReceipts(project.id).length }));
      });
    };
    refreshReceipts();
    window.addEventListener('online', refreshReceipts);
    return () => window.removeEventListener('online', refreshReceipts);
  }, [project, today]);

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!projects) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading your job…</div>;
  if (!project) {
    return (
      <div className="max-w-xl mx-auto text-center bg-white rounded-xl border border-gray-200 px-4 py-10 mt-6">
        <p className="font-semibold text-[#0f2a5e] text-lg">You’re not assigned to a job yet.</p>
        <p className="text-gray-500 mt-1">Ask the office to add you as the Superintendent or under Crew Access on your project.</p>
      </div>
    );
  }

  const now = new Date();
  const lateHour = now.getHours() >= 17;
  const reportDone = ['submitted', 'sent'].includes(report.status);
  const reportLabel = report.loading ? 'Checking…'
    : reportDone ? `Sent${report.signedAt ? ` at ${timeOf(report.signedAt)}` : ''}`
      : report.status === 'draft' ? 'Started – finish and sign before 7 PM' : 'Not started';
  const reportUrgent = !report.loading && !reportDone && lateHour && isWeekday(today);

  // Coming up: look-ahead work + job events over the next 14 days.
  const horizon = addDays(today, 14);
  const work = (lookahead.items || []).filter(i => i.end >= today && i.start <= horizon);
  const onSiteToday = work.filter(i => i.start <= today && i.end >= today && !i.approx);
  const starting = work.filter(i => i.start > today).map(i => ({ kind: 'Work', day: i.start, title: `${i.trade ? `${i.trade}: ` : ''}${i.task}`, approx: i.approx }));
  const upcomingEvents = events.filter(e => e.when.slice(0, 10) >= today && e.when.slice(0, 10) <= horizon)
    .map(e => ({ kind: e.kind, day: todayStr(new Date(e.when)), title: e.title, time: timeOf(e.when), id: e.id, notes: e.notes }));
  const timeline = [...upcomingEvents, ...starting].sort((a, b) => a.day.localeCompare(b.day) || (a.time || '').localeCompare(b.time || ''));
  const byDay = timeline.reduce((m, x) => { (m[x.day] = m[x.day] || []).push(x); return m; }, {});
  const staleLookahead = lookahead.file && (parseDay(today) - parseDay(lookahead.file.asOf)) / DAY > 14;

  // Reminders
  const reminders = [];
  if (report.missedYesterday) reminders.push({ urgent: true, text: `No daily report for ${dayLabel(report.prev, today)}.`, action: () => navigate(`/report?project=${project.id}&date=${report.prev}`), actionLabel: 'Fill it in' });
  const daysToFriday = (RECEIPTS_DUE_DAY - now.getDay() + 7) % 7;
  if (receipts.count === 0 && now.getDay() >= 3 && now.getDay() <= RECEIPTS_DUE_DAY) {
    reminders.push({ urgent: daysToFriday === 0, text: daysToFriday === 0 ? 'Weekly receipts are due today.' : `Send this week’s receipts by Friday (${daysToFriday} day${daysToFriday === 1 ? '' : 's'}).`, action: () => setSheet('receipt'), actionLabel: 'Snap receipt' });
  }
  if (receipts.waiting) reminders.push({ text: `${receipts.waiting} receipt${receipts.waiting === 1 ? ' is' : 's are'} waiting for signal to send.` });
  const tomorrow = addDays(today, 1);
  upcomingEvents.filter(e => e.day === today || e.day === tomorrow).forEach(e => reminders.push({ text: `${e.kind} ${e.day === today ? 'today' : 'tomorrow'}${e.time ? ` at ${e.time}` : ''}: ${noDollars(e.title)}` }));

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-4">
      {flash && <p className="flex items-center gap-2 text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2"><CheckCircle2 className="w-5 h-5" />{flash}</p>}

      <section className="bg-[#0f2a5e] text-white rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-mono font-black text-xl tracking-wide">{project.job_number}</div>
            <h1 className="text-2xl font-bold leading-tight">{project.name}</h1>
            <p className="text-blue-100 text-sm mt-1">{[project.address, [project.city, project.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
          </div>
          {projects.length > 1 && (
            <select aria-label="Switch job" value={project.id} onChange={e => setParams({ project: e.target.value })} className="h-10 rounded-md text-[#0f2a5e] px-2 text-sm max-w-[12rem]">
              {projects.map(p => <option key={p.id} value={p.id}>{p.job_number} {p.name}</option>)}
            </select>
          )}
        </div>
        <p className="text-blue-100 text-sm mt-2">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </section>

      <Link to={`/report?project=${project.id}`}
        className={`flex items-center justify-between gap-3 rounded-xl p-5 shadow-sm border-2 ${reportDone ? 'bg-green-50 border-green-500' : reportUrgent ? 'bg-red-50 border-red-500' : 'bg-white border-[#0f2a5e]'}`}>
        <span className="flex items-center gap-3 min-w-0">
          <ClipboardList className={`w-9 h-9 shrink-0 ${reportDone ? 'text-green-700' : reportUrgent ? 'text-red-600' : 'text-[#0f2a5e]'}`} />
          <span className="min-w-0">
            <span className="block text-xl font-bold text-[#0f2a5e]">Today’s Daily Report</span>
            <span className={`block font-semibold ${reportDone ? 'text-green-700' : reportUrgent ? 'text-red-700' : 'text-gray-600'}`}>{reportLabel}</span>
          </span>
        </span>
        <ChevronRight className="w-7 h-7 text-[#0f2a5e] shrink-0" />
      </Link>

      {project.field_note && (
        <Card className="border-amber-300 bg-amber-50">
          <div className="flex gap-3"><Megaphone className="w-6 h-6 text-amber-700 shrink-0" /><div><div className="text-sm font-bold uppercase tracking-wide text-amber-800">From the office</div><p className="text-gray-900 whitespace-pre-wrap">{noDollars(project.field_note)}</p></div></div>
        </Card>
      )}

      {reminders.length > 0 && (
        <Card>
          <h2 className="font-bold text-[#0f2a5e] text-lg mb-2">Reminders</h2>
          <ul className="space-y-2">
            {reminders.map((r, i) => (
              <li key={i} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${r.urgent ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'}`}>
                <span className="flex items-center gap-2">{r.urgent && <AlertTriangle className="w-4 h-4 shrink-0" />}{r.text}</span>
                {r.action && <button type="button" onClick={r.action} className="text-sm font-semibold text-[#1e3a8a] underline shrink-0">{r.actionLabel}</button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h2 className="font-bold text-[#0f2a5e] text-lg">Coming up · next 2 weeks</h2>
          {lookahead.file && <a href={lookahead.file.webUrl} target="_blank" rel="noreferrer" className="text-xs text-[#1e3a8a] underline">Look-ahead {parseDay(lookahead.file.asOf).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</a>}
        </div>
        {staleLookahead && <p className="text-sm text-amber-800 bg-amber-50 rounded-md px-3 py-2 mb-2">The newest 3-week look-ahead is from {parseDay(lookahead.file.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Dates below may be out of date.</p>}
        {lookahead.loading ? <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Reading the look-ahead…</div> : (
          <>
            {onSiteToday.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-700 mb-1">On site today</div>
                <div className="flex flex-wrap gap-1.5">{onSiteToday.map((i, k) => <span key={k} className="rounded-full bg-green-100 text-green-800 text-sm px-3 py-1">{i.trade ? `${i.trade}: ` : ''}{i.task}</span>)}</div>
              </div>
            )}
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500">{lookahead.none ? 'No 3-week look-ahead in the Schedule folder yet, and nothing scheduled.' : lookahead.error || 'Nothing scheduled in the next 2 weeks.'}</p>
            ) : (
              <ol className="space-y-3">
                {Object.entries(byDay).map(([day, list]) => (
                  <li key={day} className="flex gap-3">
                    <div className="w-20 shrink-0 text-sm font-bold text-[#0f2a5e] pt-0.5">{list.every(x => x.approx) ? `Wk of ${parseDay(day).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}` : dayLabel(day, today)}</div>
                    <ul className="flex-1 min-w-0 space-y-1.5">
                      {list.map((x, k) => (
                        <li key={k} className="flex items-start gap-2">
                          <span className={`shrink-0 rounded-full text-[11px] font-bold uppercase px-2 py-0.5 ${KIND_STYLE[x.kind] || KIND_STYLE.Other}`}>{x.kind === 'Work' ? 'Starts' : x.kind}</span>
                          <span className="min-w-0 text-gray-900">{x.time && <span className="font-semibold">{x.time} </span>}{noDollars(x.title)}{x.notes ? <span className="text-gray-500"> – {noDollars(x.notes)}</span> : null}</span>
                          {x.id && <button type="button" aria-label="Remove" onClick={async () => { await deleteEvent(x.id).catch(() => {}); setEvents(ev => ev.filter(e => e.id !== x.id)); }} className="ml-auto p-1 text-gray-300 hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="font-bold text-[#0f2a5e] text-lg mb-2">Subs on this job</h2>
        <form onSubmit={e => { e.preventDefault(); navigate(`/scopes/${project.id}${scopeQ.trim() ? `?q=${encodeURIComponent(scopeQ.trim())}` : ''}`); }} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input aria-label="Search the scopes" value={scopeQ} onChange={e => setScopeQ(e.target.value)} placeholder="Search scopes"
              className="w-full h-11 rounded-md border border-gray-300 bg-white pl-10 pr-3 text-base md:text-sm" />
          </div>
          <button type="submit" className="h-11 px-4 rounded-md bg-[#0f2a5e] text-white font-semibold">Search</button>
        </form>
        {!subs ? <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading subs…</div>
          : subs.length === 0 ? <p className="text-sm text-gray-500">No approved subcontracts on this job yet.</p> : (
            <ul className="divide-y divide-gray-100">
              {subs.map(s => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Link to={`/scopes/${project.id}?sub=${s.id}`} className="flex-1 min-w-0">
                    <span className="block font-semibold text-gray-900 truncate">{s.company}</span>
                    <span className="block text-sm text-gray-500 truncate">{[s.tradeName, s.companyContact].filter(Boolean).join(' · ')}</span>
                  </Link>
                  {s.companyPhone && <a href={`tel:${s.companyPhone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${s.company}`} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[#0f2a5e] text-[#0f2a5e] font-semibold text-sm shrink-0"><Phone className="w-4 h-4" /> Call</a>}
                  <Link to={`/scopes/${project.id}?sub=${s.id}`} className="h-10 px-3 inline-flex items-center rounded-lg bg-blue-50 text-[#1e3a8a] font-semibold text-sm shrink-0">Scope</Link>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Tile onClick={() => setSheet('receipt')} icon={Receipt} title="Snap receipt" sub={receipts.count == null ? 'Weekly Receipts' : `${receipts.count} sent this week`} />
        <Tile to={`/docs/${project.id}`} icon={FolderOpen} title="Job documents" sub="Drawings, specs, submittals, RFIs…" />
        <Tile to={`/scopes/${project.id}`} icon={HardHat} title="Sub scopes" sub="What each sub agreed to do" />
        {turnover && <Tile to={`/turnover/${project.id}`} icon={Handshake} title="Turnover notes" sub={turnover.signoffs?.Superintendent ? 'From the turnover meeting' : 'Review and sign off'} />}
        <Tile onClick={() => setSheet('event')} icon={CalendarPlus} title="Add meeting / inspection" sub="Shows here for the whole crew" />
      </div>
      <Link to={`/report?project=${project.id}`} className="flex items-center justify-center gap-2 text-sm text-[#1e3a8a] font-semibold py-2"><CalendarDays className="w-4 h-4" /> Earlier reports and other days</Link>

      {sheet === 'receipt' && <ReceiptSheet project={project} onClose={() => setSheet('')} onSaved={r => { setSheet(''); setFlash(r.waiting ? 'Receipt saved. It will send when you have signal.' : 'Receipt sent to Weekly Receipts.'); setReceipts(x => ({ count: (x.count || 0) + (r.waiting ? 0 : 1), waiting: r.waiting })); }} />}
      {sheet === 'event' && <EventSheet project={project} onClose={() => setSheet('')} onAdded={ev => { setSheet(''); setEvents(list => [...list, ev].sort((a, b) => a.when.localeCompare(b.when))); setFlash('Added to the schedule.'); }} />}
    </div>
  );
}
