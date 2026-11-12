import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, ChevronRight, Download, Receipt } from 'lucide-react';
import { listReceipts, isMyJob, codingCsv, money } from '@/field/receiptsData';
import { weekStart } from '@/field/jobData';
import { currentRole } from '@/field/roles';

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nice = d => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
const input = 'h-10 rounded-md border border-gray-300 bg-white px-2 text-sm';

// Receipts the field sent in, waiting for the PM to code them to the budget.
export default function ReceiptsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [show, setShow] = useState('todo');
  const [mine, setMine] = useState(currentRole() === 'PM');
  const mon = weekStart();
  const [range, setRange] = useState({ from: ymd(new Date(mon.getTime() - 7 * 864e5)), to: ymd(new Date(mon.getTime() - 864e5)) });

  useEffect(() => {
    listReceipts().then(setRows).catch(err => setError(err.code === 'not_set_up' ? 'Receipt coding isn’t set up yet. An admin needs to run Site setup once.' : err.message));
  }, []);

  const scoped = useMemo(() => (rows || []).filter(r => !mine || isMyJob(r.project)), [rows, mine]);
  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!rows) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading receipts…</div>;

  const todo = scoped.filter(r => !r.coding);
  const done = scoped.filter(r => r.coding);
  const list = show === 'todo' ? todo : done;
  const inRange = done.filter(r => r.date >= range.from && r.date <= range.to);
  const exportCsv = () => {
    const blob = new Blob([codingCsv(inRange)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `Coded receipts ${range.from} to ${range.to}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Home</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Receipts</h1>
      <p className="text-gray-500 mb-4">Receipts the field sends in land here. The job’s PM codes each one to cost codes from the job’s budget.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[['todo', 'Needs coding', todo.length], ['done', 'Coded', done.length]].map(([k, label, n]) => (
          <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}
            className={`rounded-full px-4 h-10 font-semibold text-sm border ${show === k ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>{label} <span className="opacity-70">({n})</span></button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" className="w-4 h-4" checked={mine} onChange={e => setMine(e.target.checked)} /> Only jobs where I’m the PM</label>
      </div>
      {list.length === 0 ? <p className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">{show === 'todo' ? 'Nothing waiting to be coded.' : 'No coded receipts yet.'}</p> : (
        <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {list.map(r => (
            <li key={r.id}>
              <Link to={`/receipts/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50">
                <Receipt className="w-5 h-5 text-[#0f2a5e] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900 truncate">{r.store} · {money(r.total) || 'no total'}</span>
                  <span className="block text-sm text-gray-500 truncate">{[`${r.jobNumber} ${r.project?.name || ''}`.trim(), nice(r.date), r.by && `sent by ${r.by}`, r.project?.projectManager && `PM ${r.project.projectManager}`].filter(Boolean).join(' · ')}</span>
                </span>
                {r.coding ? <span className="rounded-full text-xs font-bold px-2 py-0.5 bg-green-100 text-green-800 shrink-0">Coded</span>
                  : <span className="rounded-full text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-900 shrink-0">Needs coding</span>}
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mt-6">
        <h2 className="font-bold text-[#0f2a5e] text-lg">For accounting</h2>
        <p className="text-sm text-gray-500 mb-3">Download the coded receipts for a week as a spreadsheet: one row per cost code line.{mine ? ' Only your jobs are included while “Only jobs where I’m the PM” is ticked.' : ''}</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold text-gray-700">From<input type="date" className={`${input} block mt-1`} value={range.from} onChange={e => e.target.value && setRange(v => ({ ...v, from: e.target.value }))} /></label>
          <label className="text-sm font-semibold text-gray-700">To<input type="date" className={`${input} block mt-1`} value={range.to} onChange={e => e.target.value && setRange(v => ({ ...v, to: e.target.value }))} /></label>
          <button type="button" onClick={exportCsv} disabled={!inRange.length} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[#0f2a5e] text-white font-semibold text-sm disabled:opacity-40"><Download className="w-4 h-4" /> Download ({inRange.length} receipt{inRange.length === 1 ? '' : 's'})</button>
        </div>
      </section>
    </div>
  );
}
