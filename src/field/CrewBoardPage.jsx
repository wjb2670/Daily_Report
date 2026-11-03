import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, UserPlus, MoreHorizontal, X, HardHat, Users, AlertTriangle } from 'lucide-react';
import { loadBoard, movePerson, addToRoster, removeFromRoster } from '@/field/crewData';
import { useToast } from '@/components/ui/use-toast';

const NONE = 'none';
const input = 'h-10 rounded-md border border-gray-300 bg-white px-2 text-sm';

function Card({ person, column, projects, busy, onMove, onRemoveRoster }) {
  const [open, setOpen] = useState(false);
  const others = person.jobs.filter(j => j.projectId !== column).map(j => projects.find(p => String(p.id) === j.projectId)?.jobNumber).filter(Boolean);
  const isSuper = person.role === 'Superintendent';
  return (
    <li draggable={!busy} onDragStart={e => { e.dataTransfer.setData('text/plain', JSON.stringify({ key: person.key, from: column })); e.dataTransfer.effectAllowed = 'move'; }}
      className={`bg-white rounded-lg border shadow-sm p-3 ${busy ? 'opacity-50' : 'cursor-grab active:cursor-grabbing'} ${isSuper ? 'border-l-4 border-l-[#0f2a5e] border-gray-200' : 'border-gray-200'}`}>
      <div className="flex items-start gap-2">
        {isSuper ? <HardHat className="w-4 h-4 text-[#0f2a5e] mt-0.5 shrink-0" /> : <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 leading-tight truncate">{person.name}</div>
          <div className="text-xs text-gray-500">{isSuper ? 'Superintendent' : 'Crew'}{others.length ? ` · also on ${others.join(', ')}` : ''}</div>
          {!person.userId && <div className="text-xs text-amber-700 mt-0.5">Needs to open the app once before they can be assigned</div>}
        </div>
        <button type="button" aria-label={`Options for ${person.name}`} onClick={() => setOpen(o => !o)} disabled={busy} className="p-1 text-gray-400 hover:text-[#0f2a5e] shrink-0">
          {open ? <X className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
          <label className="block text-xs font-semibold text-gray-600">Move to
            <select aria-label={`Move ${person.name} to`} className={`${input} w-full mt-0.5`} value="" onChange={e => { setOpen(false); onMove(person, column, e.target.value, false); }}>
              <option value="" disabled>Choose a job…</option>
              {projects.filter(p => String(p.id) !== column).map(p => <option key={p.id} value={p.id}>{p.jobNumber} {p.name}</option>)}
              {column !== NONE && <option value={NONE}>Not on a job</option>}
            </select>
          </label>
          <label className="block text-xs font-semibold text-gray-600">Also put on (stays here too)
            <select aria-label={`Also put ${person.name} on`} className={`${input} w-full mt-0.5`} value="" onChange={e => { setOpen(false); onMove(person, column, e.target.value, true); }}>
              <option value="" disabled>Choose a job…</option>
              {projects.filter(p => String(p.id) !== column && !person.jobs.some(j => j.projectId === String(p.id))).map(p => <option key={p.id} value={p.id}>{p.jobNumber} {p.name}</option>)}
            </select>
          </label>
          {column === NONE && person.rosterId && !person.jobs.length && (
            <button type="button" onClick={() => { setOpen(false); onRemoveRoster(person); }} className="text-xs text-red-700 underline">Remove from the board</button>
          )}
        </div>
      )}
    </li>
  );
}

// Drag a person to another job (or use the … menu on a phone or iPad).
// Moving someone updates the job's Superintendent / Crew Access and their
// folder access, so their dashboard shows the new job next time they open it.
export default function CrewBoardPage() {
  const { toast } = useToast();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null); // { key, steps: [] }
  const [over, setOver] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Superintendent' });

  const reload = () => loadBoard().then(setBoard).catch(err => setError(err.code === 'not_set_up' ? 'The Crew Board isn’t set up yet. An admin needs to run Site setup once.' : err.message));
  useEffect(() => { reload(); }, []);

  const move = async (person, from, to, keep) => {
    if (!to || to === from) return;
    const label = to === NONE ? 'Not on a job' : board.projects.find(p => String(p.id) === String(to))?.jobNumber;
    setWorking({ key: person.key, steps: [] });
    try {
      const { notes } = await movePerson(board, person, { from: from === NONE ? null : from, to: to === NONE ? null : to, keepFrom: keep }, s => setWorking(w => ({ ...w, steps: [...w.steps, s] })));
      toast({ title: `${person.name} ${keep ? 'added to' : 'moved to'} ${label}`, description: notes.length ? notes.join(' ') : to === NONE ? 'Their folder access to the old job was removed.' : 'Folder access is updated. Their dashboard shows the job next time they open the app.' });
      await reload();
    } catch (err) {
      toast({ title: `Couldn’t move ${person.name}`, description: err.message, variant: 'destructive' });
    }
    setWorking(null);
  };

  const drop = (e, column) => {
    e.preventDefault(); setOver(null);
    try {
      const { key, from } = JSON.parse(e.dataTransfer.getData('text/plain'));
      const person = board.people.find(p => p.key === key);
      if (person && from !== column) move(person, from, column, false);
    } catch { /* not a card */ }
  };

  const add = async e => {
    e.preventDefault();
    setAdding('saving');
    try {
      const { userId } = await addToRoster(form);
      toast({ title: `${form.name} added to the board`, description: userId ? 'Drag them onto a job.' : 'They need to sign in to the app once before they can be put on a job.' });
      setForm({ name: '', email: '', role: 'Superintendent' }); setAdding(false);
      await reload();
    } catch (err) { toast({ title: 'Couldn’t add', description: err.message, variant: 'destructive' }); setAdding(true); }
  };

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!board) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading the board…</div>;

  const columns = [{ id: NONE, title: 'Not on a job', sub: 'Available' }, ...board.projects.map(p => ({ id: String(p.id), title: p.jobNumber, sub: p.name, status: p.status, noFolder: !p.folderId }))];
  const inColumn = col => board.people.filter(p => (col === NONE ? p.jobs.length === 0 : p.jobs.some(j => j.projectId === col)));

  return (
    <div className="pb-10">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Home</Link>
        <div className="flex flex-wrap items-end gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] flex-1">Crew Board</h1>
          <button type="button" onClick={() => setAdding(a => (a ? false : true))} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[#0f2a5e] text-white font-semibold text-sm"><UserPlus className="w-4 h-4" /> Add a person</button>
        </div>
        <p className="text-gray-500 mb-4">Drag a person to another job, or use the ••• on their card. Their folder access moves with them, and their dashboard opens to the new job.</p>
        {adding && (
          <form onSubmit={add} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold text-gray-700">Name<input required className={`${input} block w-48 mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="text-sm font-semibold text-gray-700">Whayland email<input required type="email" className={`${input} block w-60 mt-1`} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@whayland.com" /></label>
            <label className="text-sm font-semibold text-gray-700">Role<select className={`${input} block mt-1`} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}><option>Superintendent</option><option>Crew</option></select></label>
            <button type="submit" disabled={adding === 'saving'} className="h-10 px-4 rounded-md bg-[#0f2a5e] text-white font-semibold text-sm disabled:opacity-50">{adding === 'saving' ? 'Adding…' : 'Add'}</button>
          </form>
        )}
        {working && (
          <p className="flex items-center gap-2 text-sm text-[#0f2a5e] bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3"><Loader2 className="w-4 h-4 animate-spin" /> {working.steps.at(-1) || 'Working…'}</p>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 px-1 snap-x">
        {columns.map(col => {
          const cards = inColumn(col.id);
          return (
            <section key={col.id} aria-label={`${col.title} ${col.sub}`}
              onDragOver={e => { e.preventDefault(); setOver(col.id); }} onDragLeave={() => setOver(o => (o === col.id ? null : o))} onDrop={e => drop(e, col.id)}
              className={`snap-start shrink-0 w-64 rounded-xl p-3 ${over === col.id ? 'bg-blue-100 ring-2 ring-[#0f2a5e]' : col.id === NONE ? 'bg-gray-100' : 'bg-white/70 border border-gray-200'}`}>
              <div className="mb-2">
                <div className="flex items-center gap-2"><span className={`${col.id === NONE ? "font-bold" : "font-mono font-black"} text-[#0f2a5e]`}>{col.title}</span><span className="ml-auto text-xs font-bold text-gray-500 bg-white rounded-full px-2">{cards.length}</span></div>
                <div className="text-sm text-gray-700 leading-tight truncate" title={col.sub}>{col.sub}</div>
                {col.status === 'Awarded' && <div className="text-[11px] font-bold uppercase text-amber-700 mt-0.5">Awarded · not started</div>}
                {col.noFolder && <div className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No job folder linked</div>}
              </div>
              <ul className="space-y-2 min-h-[64px]">
                {cards.map(p => <Card key={p.key} person={p} column={col.id} projects={board.projects} busy={!!working} onMove={move}
                  onRemoveRoster={async person => { try { await removeFromRoster(person.rosterId); await reload(); } catch (err) { toast({ title: 'Couldn’t remove', description: err.message, variant: 'destructive' }); } }} />)}
                {cards.length === 0 && <li className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">Drop someone here</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
