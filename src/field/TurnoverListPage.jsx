import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import { listProjectRecords } from '@/field/projectsData';
import { listTurnovers, SIGNOFF_SLOTS } from '@/field/turnoverData';

const STYLE = { 'Not started': 'bg-gray-100 text-gray-700', 'In progress': 'bg-amber-100 text-amber-900', 'Signed off': 'bg-green-100 text-green-800' };

// Every open job and where its turnover meeting stands.
export default function TurnoverListPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listProjectRecords(), listTurnovers()]).then(([projects, turnovers]) => {
      setRows(projects.filter(p => p.status !== 'Complete').map(p => {
        const t = turnovers.find(x => String(x.projectId) === String(p.id));
        return { p, t, status: t ? t.status : 'Not started' };
      }).sort((a, b) => b.p.jobNumber.localeCompare(a.p.jobNumber, undefined, { numeric: true })));
    }).catch(err => setError(err.code === 'not_set_up' ? 'Turnovers aren’t set up yet. An admin needs to run Site setup once (Home → Site setup).' : err.message));
  }, []);

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!rows) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Home</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Turnover</h1>
      <p className="text-gray-500 mb-4">The estimating → PM and super hand-off for each job. Attendees: {SIGNOFF_SLOTS.join(', ')}.</p>
      <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {rows.map(({ p, t, status }) => (
          <li key={p.id}>
            <Link to={`/projects/${p.id}/turnover`} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-gray-900 truncate">{p.jobNumber} {p.name}</span>
                <span className="block text-sm text-gray-500">{t ? `${t.items.filter(i => i.done).length} of ${t.items.length} items · ${SIGNOFF_SLOTS.filter(s => t.signoffs[s]).length} of ${SIGNOFF_SLOTS.length} signed` : 'No meeting yet'}</span>
              </span>
              <span className={`rounded-full text-xs font-bold px-2 py-0.5 shrink-0 ${STYLE[status]}`}>{status}</span>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
