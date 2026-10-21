import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2, Lock, Plus, FileDown, ExternalLink, RotateCcw, PenLine } from 'lucide-react';
import { getProjectRecord } from '@/field/projectsData';
import { getTurnover, saveTurnover, savePacket, allSigned, SIGNOFF_SLOTS } from '@/field/turnoverData';
import { currentAccount } from '@/field/auth';
import { can } from '@/field/roles';

const input = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base md:text-sm';
const when = at => new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// The turnover meeting for one job: checklist, notes, sign-offs, packet PDF.
export default function TurnoverPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [t, setT] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [newItem, setNewItem] = useState({ text: '', office: false });
  const [packet, setPacket] = useState('');
  const timer = useRef(null);
  const latest = useRef(null);
  const editable = can('projectsEdit');

  useEffect(() => {
    Promise.all([getProjectRecord(id), getTurnover(id, { office: true })])
      .then(([p, tt]) => { setProject(p); setT(tt); latest.current = tt; })
      .catch(err => setError(err.code === 'not_set_up' ? 'Turnovers aren’t set up yet. An admin needs to run Site setup once.' : err.message));
  }, [id]);

  const persist = async next => {
    setSaving('Saving…');
    try {
      const saved = await saveTurnover(project, next);
      latest.current = { ...latest.current, id: saved.id, moneyId: saved.moneyId, status: saved.status };
      setT(cur => ({ ...cur, id: saved.id, moneyId: saved.moneyId, status: saved.status }));
      setSaving('Saved');
      return saved;
    } catch (err) {
      setSaving(`Not saved: ${err.message}`);
      throw err;
    }
  };
  // Typing saves itself a moment after you stop.
  const change = fn => {
    setT(cur => {
      const next = fn(cur);
      latest.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => persist(latest.current), 1200);
      return next;
    });
    setSaving('Unsaved changes');
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  // The super may sign last from the field; the office copy of the packet is
  // saved the next time someone in the office opens the turnover.
  const needsPacket = !!t && !!project && editable && allSigned(t) && !t.packetUrl;
  useEffect(() => { if (needsPacket) makePacket(latest.current); }, [needsPacket]); // eslint-disable-line react-hooks/exhaustive-deps

  const sign = async slot => {
    clearTimeout(timer.current);
    const me = currentAccount() || {};
    const next = { ...latest.current, signoffs: { ...latest.current.signoffs, [slot]: { name: me.name || me.email, email: me.email, at: new Date().toISOString() } } };
    setT(next); latest.current = next;
    const saved = await persist(next);
    if (allSigned(next)) await makePacket({ ...next, id: saved.id });
  };
  const reopen = async () => {
    const next = { ...latest.current, signoffs: {} };
    setT(next); latest.current = next;
    await persist(next);
  };
  const makePacket = async tt => {
    setPacket('Saving the Turnover Packet PDF…');
    try {
      const url = await savePacket(project, tt);
      const next = { ...latest.current, packetUrl: url };
      latest.current = next; setT(next);
      await persist(next);
      setPacket('');
    } catch (err) { setPacket(`Couldn’t save the PDF: ${err.message}`); }
  };

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!t) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading the turnover…</div>;

  const locked = allSigned(t) || !editable;
  const done = t.items.filter(i => i.done).length;

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/turnover" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> All turnovers</Link>
      <section className="bg-[#0f2a5e] text-white rounded-xl p-5 mb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-200">Turnover meeting</div>
        <div className="font-mono font-black text-2xl tracking-wide">{project.jobNumber}</div>
        <h1 className="text-xl sm:text-2xl font-bold leading-tight">{project.name}</h1>
        <div className="h-2 rounded-full bg-white/20 mt-4"><div className="h-2 rounded-full bg-green-400" style={{ width: `${(done / t.items.length) * 100}%` }} /></div>
        <p className="text-sm text-blue-100 mt-2">{done} of {t.items.length} items covered · {allSigned(t) ? 'Signed off' : `${SIGNOFF_SLOTS.filter(s => t.signoffs[s]).length} of ${SIGNOFF_SLOTS.length} signed`}</p>
      </section>

      <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4">
        Items marked <span className="font-semibold text-amber-800">Office only</span> keep their notes from the field. Everything else shows on the super’s dashboard, with any dollar amount hidden.
      </p>

      {allSigned(t) && (
        <div className="flex flex-wrap items-center gap-3 bg-green-50 border border-green-300 rounded-xl p-4 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-700" />
          <span className="flex-1 font-semibold text-green-900">Signed off. The checklist is locked.</span>
          {t.packetUrl && <a href={t.packetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#1e3a8a] underline">Turnover Packet PDF <ExternalLink className="w-4 h-4" /></a>}
          {editable && <button type="button" onClick={reopen} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-md px-3 h-9 bg-white"><RotateCcw className="w-4 h-4" /> Reopen (clears sign-offs)</button>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1"><label htmlFor="to-date" className="text-sm font-semibold text-gray-700">Meeting date</label>
          <input id="to-date" type="date" className={`${input} h-11`} value={t.meetingDate} disabled={locked} onChange={e => change(c => ({ ...c, meetingDate: e.target.value }))} /></div>
        <span className="text-sm text-gray-500 ml-auto">{saving}</span>
      </div>

      <ol className="space-y-3">
        {t.items.map((i, n) => (
          <li key={i.id} className={`bg-white rounded-xl border p-4 ${i.done ? 'border-green-300' : 'border-gray-200'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 w-5 h-5 accent-[#0f2a5e]" checked={i.done} disabled={locked}
                onChange={e => change(c => ({ ...c, items: c.items.map(x => (x.id === i.id ? { ...x, done: e.target.checked } : x)) }))} />
              <span className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900">{n + 1}. {i.text}</span>
                {i.office && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 align-middle"><Lock className="w-3 h-3" /> Office only</span>}
              </span>
            </label>
            <textarea aria-label={`Notes: ${i.text}`} rows={2} className={`${input} mt-2`} placeholder="Notes from the meeting" value={i.notes} disabled={locked}
              onChange={e => change(c => ({ ...c, items: c.items.map(x => (x.id === i.id ? { ...x, notes: e.target.value } : x)) }))} />
          </li>
        ))}
      </ol>

      {!locked && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4 mt-3 space-y-2">
          <label htmlFor="to-new" className="text-sm font-semibold text-gray-700">Add an item for this job</label>
          <input id="to-new" className={`${input} h-11`} value={newItem.text} onChange={e => setNewItem(v => ({ ...v, text: e.target.value }))} placeholder="e.g. Owner-furnished equipment and who sets it" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="w-4 h-4" checked={newItem.office} onChange={e => setNewItem(v => ({ ...v, office: e.target.checked }))} /> Has dollar amounts (office only)</label>
            <button type="button" disabled={!newItem.text.trim()} onClick={() => { change(c => ({ ...c, items: [...c.items, { id: `c${Date.now().toString(36)}`, text: newItem.text.trim(), office: newItem.office, done: false, notes: '', custom: true }] })); setNewItem({ text: '', office: false }); }}
              className="ml-auto inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[#0f2a5e] text-white font-semibold disabled:opacity-40"><Plus className="w-4 h-4" /> Add item</button>
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-4 mt-6">
        <h2 className="font-bold text-[#0f2a5e] text-lg mb-1">Sign-offs</h2>
        <p className="text-sm text-gray-500 mb-3">Each person signs in the app under their own name. The super can also sign from their phone. When everyone has signed, the Turnover Packet PDF is saved to the job folder.</p>
        <ul className="divide-y divide-gray-100">
          {SIGNOFF_SLOTS.map(slot => {
            const s = t.signoffs[slot];
            return (
              <li key={slot} className="flex items-center gap-3 py-2.5">
                <span className="w-36 shrink-0 font-semibold text-gray-800">{slot}</span>
                {s ? <span className="flex-1 text-green-800 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {s.name} · {when(s.at)}</span>
                  : <span className="flex-1 text-gray-400">Not signed</span>}
                {!s && editable && <button type="button" onClick={() => sign(slot)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#0f2a5e] text-[#0f2a5e] font-semibold text-sm"><PenLine className="w-4 h-4" /> Sign as {slot}</button>}
              </li>
            );
          })}
        </ul>
        {editable && (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button type="button" onClick={() => makePacket(latest.current)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-gray-300 font-semibold text-sm text-gray-800"><FileDown className="w-4 h-4" /> Save Turnover Packet PDF now</button>
            {packet && <span className="text-sm text-gray-600">{packet}</span>}
            {!packet && t.packetUrl && !allSigned(t) && <a href={t.packetUrl} target="_blank" rel="noreferrer" className="text-sm text-[#1e3a8a] underline">Last saved packet</a>}
          </div>
        )}
      </section>
    </div>
  );
}
