import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2, Circle, PenLine } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getTurnover, fieldSignOff, SIGNOFF_SLOTS } from '@/field/turnoverData';
import { currentAccount } from '@/field/auth';

const when = at => new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// What the turnover meeting said, for the super. Office-only items and any
// dollar amounts are left out.
export default function FieldTurnoverPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [t, setT] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const mine = await base44.entities.Project.list();
      const p = mine.find(x => String(x.id) === String(projectId));
      if (!p) { setError('You’re not assigned to this job.'); return; }
      setProject(p);
      setT(await getTurnover(projectId));
    })().catch(err => setError(err.code === 'not_set_up' ? 'Turnover isn’t set up yet.' : err.message));
  }, [projectId]);

  const back = <Link to={`/job?project=${projectId}`} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Job dashboard</Link>;
  if (error) return <div className="max-w-3xl mx-auto">{back}<p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!t) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;
  if (!t.id) return <div className="max-w-3xl mx-auto">{back}<p className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">The turnover meeting for this job hasn’t been held yet.</p></div>;

  const items = t.items.filter(i => !i.office);
  const superSigned = t.signoffs.Superintendent;
  const sign = async () => {
    setBusy(true);
    const me = currentAccount() || {};
    try { setT(await fieldSignOff(t, 'Superintendent', { name: me.name || me.email, email: me.email, at: new Date().toISOString() })); } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {back}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Turnover notes</h1>
      <p className="text-gray-500 mb-4">{project.job_number} {project.name}{t.meetingDate ? ` · meeting ${new Date(`${t.meetingDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</p>
      <ol className="space-y-3">
        {items.map(i => (
          <li key={i.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-2">
              {i.done ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">{i.text}</div>
                {i.notes ? <p className="text-gray-800 whitespace-pre-wrap mt-1">{i.notes}</p> : <p className="text-sm text-gray-400 mt-1">No notes.</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <section className="bg-white rounded-xl border border-gray-200 p-4 mt-5">
        <h2 className="font-bold text-[#0f2a5e] text-lg mb-2">Sign-offs</h2>
        <ul className="space-y-1.5 text-sm">
          {SIGNOFF_SLOTS.map(slot => (
            <li key={slot} className="flex gap-2"><span className="w-32 font-semibold text-gray-700">{slot}</span>
              {t.signoffs[slot] ? <span className="text-green-800">{t.signoffs[slot].name} · {when(t.signoffs[slot].at)}</span> : <span className="text-gray-400">Not signed</span>}</li>
          ))}
        </ul>
        {!superSigned && (
          <button type="button" disabled={busy} onClick={sign} className="mt-3 w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-[#0f2a5e] text-white font-bold disabled:opacity-50">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />} I’ve reviewed this. Sign as Superintendent
          </button>
        )}
      </section>
    </div>
  );
}
