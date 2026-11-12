import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Plus, Trash2, CheckCircle2, ExternalLink, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { getReceipt, saveCoding, getBudgetCodes, findBudgetFiles, loadBudgetCodes, cents, money, BUDGET_FOLDER } from '@/field/receiptsData';
import { resolvePhoto } from '@/field/spAdapter';
import { can } from '@/field/roles';

const input = 'h-11 w-full rounded-md border border-gray-300 bg-white px-2 text-base md:text-sm';
const nice = d => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '');
const when = at => (at ? new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const blankLine = amount => ({ code: '', description: '', note: '', amount: amount ?? '' });

// Loads the job's cost codes from the budget Excel in the Estimating Turnover Folder.
function BudgetLoader({ project, onLoaded, again }) {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const look = () => { setError(''); setBusy('Looking in the job folder…'); findBudgetFiles(project).then(f => { setFiles(f); setBusy(''); }).catch(err => { setError(err.message); setBusy(''); }); };
  useEffect(() => { if (!again) look(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const load = async f => {
    setError(''); setBusy(`Reading ${f.name}…`);
    try { onLoaded(await loadBudgetCodes(project, f)); } catch (err) { setError(err.message); }
    setBusy('');
  };
  if (again && !files && !busy && !error) return <button type="button" onClick={look} className="text-sm font-semibold text-[#1e3a8a] underline">Reload from the budget file</button>;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
      {!again && <p className="text-sm text-amber-900 font-semibold">This job’s budget cost codes aren’t loaded yet.</p>}
      <p className="text-sm text-amber-900">They come from the budget Excel file in the job’s <b>{BUDGET_FOLDER}</b>. Only the codes and their names are kept, no amounts.</p>
      {busy && <p className="text-sm text-gray-700 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {busy}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {files && !files.length && <p className="text-sm text-red-700">No Excel files in the {BUDGET_FOLDER}. Save the budget there, then try again.</p>}
      {files && files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={f.id} className="flex items-center gap-2 bg-white rounded-md border border-gray-200 px-3 py-2">
              <FileSpreadsheet className="w-4 h-4 text-green-700 shrink-0" />
              <span className="flex-1 min-w-0 text-sm truncate">{f.name}{i === 0 && <span className="ml-2 text-xs font-bold text-green-800">Most likely</span>}</span>
              <button type="button" disabled={!!busy} onClick={() => load(f)} className="h-9 px-3 rounded-md bg-[#0f2a5e] text-white text-sm font-semibold disabled:opacity-40">Use this file</button>
            </li>
          ))}
        </ul>
      )}
      {(error || files) && <button type="button" onClick={look} className="text-sm font-semibold text-[#1e3a8a] underline">Look again</button>}
    </div>
  );
}

export default function ReceiptCodePage() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [budget, setBudget] = useState(undefined);
  const [img, setImg] = useState('');
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState(null);
  const canCode = can('receiptsCode');

  useEffect(() => {
    getReceipt(id).then(rec => {
      setR(rec);
      setLines(rec.coding?.lines?.length ? rec.coding.lines.map(l => ({ ...l, amount: Number(l.amount).toFixed(2) })) : [blankLine(rec.total != null ? Number(rec.total).toFixed(2) : '')]);
      if (rec.coding) setSaved({ by: rec.coding.by, at: rec.coding.at });
      if (rec.driveId && rec.fileId) resolvePhoto(`sp:${rec.driveId}/${rec.fileId}`, 'c1600x1600').then(u => setImg(u || '')).catch(() => {});
      getBudgetCodes(rec.projectId).then(b => setBudget(b)).catch(() => setBudget(null));
    }).catch(err => setError(err.code === 'not_set_up' ? 'Receipt coding isn’t set up yet. An admin needs to run Site setup once.' : err.message));
  }, [id]);

  if (error && !r) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!r) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading the receipt…</div>;

  const codes = budget?.codes || [];
  const sum = lines.reduce((t, l) => t + cents(l.amount), 0);
  const left = r.total != null ? cents(r.total) - sum : 0;
  const set = (i, patch) => { setSaved(null); setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l))); };
  const save = async () => {
    setError(''); setSaving('Saving…');
    try { const s = await saveCoding(r, lines); setSaved(s); setR(cur => ({ ...cur, coding: { ...(cur.coding || {}), id: cur.coding?.id, lines } })); getReceipt(id).then(setR).catch(() => {}); }
    catch (err) { setError(err.message); }
    setSaving('');
  };
  const ready = canCode && codes.length && lines.length && lines.every(l => l.code && cents(l.amount) > 0) && (r.total == null || left === 0);

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <Link to="/receipts" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> All receipts</Link>
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <section className="bg-white rounded-xl border border-gray-200 p-3 self-start">
          {img ? <img src={img} alt={`Receipt from ${r.store}`} className="w-full rounded-lg object-contain max-h-[70vh] bg-gray-50" />
            : <div className="h-64 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 text-sm">{r.fileId ? 'Loading the photo…' : 'No photo'}</div>}
          {r.fileUrl && <a href={r.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a8a] underline">Open in Weekly Receipts <ExternalLink className="w-4 h-4" /></a>}
        </section>

        <section className="space-y-4">
          <div className="bg-[#0f2a5e] text-white rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-200">{r.jobNumber} {r.project?.name}</div>
            <h1 className="text-2xl font-bold leading-tight mt-1">{r.store}</h1>
            <div className="text-3xl font-black mt-1">{money(r.total) || 'No total entered'}</div>
            <p className="text-sm text-blue-100 mt-1">{[nice(r.date), r.by && `sent by ${r.by}`, r.project?.projectManager && `PM ${r.project.projectManager}`].filter(Boolean).join(' · ')}</p>
          </div>

          {budget === undefined ? <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading the budget’s cost codes…</p>
            : !codes.length ? (canCode ? <BudgetLoader project={r.project} onLoaded={setBudget} /> : <p className="text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-3">The job’s PM needs to load the budget’s cost codes before this receipt can be coded.</p>)
              : (
                <p className="text-sm text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <FileSpreadsheet className="w-4 h-4 text-green-700" /> {codes.length} cost codes from{' '}
                  {budget.url ? <a href={budget.url} target="_blank" rel="noreferrer" className="underline">{budget.file}</a> : budget.file}
                  {canCode && <BudgetLoader project={r.project} onLoaded={setBudget} again />}
                </p>
              )}

          {codes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-bold text-[#0f2a5e] text-lg mb-1">Cost codes</h2>
              <p className="text-sm text-gray-500 mb-3">Split the receipt across the job’s budget cost codes. Add a line for each code; the lines must add up to the receipt total.</p>
              <ol className="space-y-3">
                {lines.map((l, i) => (
                  <li key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
                      <label className="text-xs font-semibold text-gray-600">Cost code
                        <select aria-label={`Cost code for line ${i + 1}`} className={`${input} mt-0.5`} value={l.code} disabled={!canCode}
                          onChange={e => { const c = codes.find(x => x.code === e.target.value); set(i, { code: e.target.value, description: c?.description || '' }); }}>
                          <option value="">Choose from the budget…</option>
                          {codes.map(c => <option key={c.code} value={c.code}>{c.code}{c.description ? ` ${c.description}` : ''}</option>)}
                          {l.code && !codes.some(c => c.code === l.code) && <option value={l.code}>{l.code} (no longer in the budget)</option>}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-gray-600">Amount
                        <input aria-label={`Amount for line ${i + 1}`} inputMode="decimal" className={`${input} mt-0.5 text-right`} value={l.amount} disabled={!canCode}
                          onChange={e => set(i, { amount: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="0.00" />
                      </label>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex-1 text-xs font-semibold text-gray-600">What it was for <span className="font-normal text-gray-400">(optional)</span>
                        <input aria-label={`Note for line ${i + 1}`} className={`${input} mt-0.5`} value={l.note} disabled={!canCode} onChange={e => set(i, { note: e.target.value })} placeholder="e.g. caulk and screws" />
                      </label>
                      {canCode && lines.length > 1 && <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => { setSaved(null); setLines(ls => ls.filter((_, j) => j !== i)); }} className="h-11 w-11 flex items-center justify-center rounded-md border border-gray-300 text-gray-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </li>
                ))}
              </ol>
              {canCode && <button type="button" onClick={() => { setSaved(null); setLines(ls => [...ls, blankLine(left > 0 ? (left / 100).toFixed(2) : '')]); }} className="mt-3 inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-[#0f2a5e] text-[#0f2a5e] font-semibold text-sm"><Plus className="w-4 h-4" /> Add a cost code</button>}

              {r.total != null && (
                <p className={`mt-3 text-sm font-semibold ${left === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                  {left === 0 ? `Lines add up to ${money(r.total)}.` : left > 0 ? `${money(left / 100)} still to code.` : `Lines are ${money(-left / 100)} over the receipt total.`}
                </p>
              )}
              {error && <p className="mt-2 text-sm text-red-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {error}</p>}
              {canCode && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={save} disabled={!ready || !!saving} className="h-11 px-5 rounded-md bg-[#0f2a5e] text-white font-semibold disabled:opacity-40 inline-flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} {r.coding ? 'Save changes' : 'Save coding'}</button>
                  {saved && <span className="text-sm text-green-800 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Coded by {saved.by} · {when(saved.at)}</span>}
                </div>
              )}
              {!canCode && saved && <p className="mt-3 text-sm text-green-800 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Coded by {saved.by} · {when(saved.at)}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
