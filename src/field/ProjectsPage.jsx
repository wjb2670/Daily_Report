import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { listProjectRecords, startupSteps } from '@/field/projectsData';

const STATUS_STYLE = {
  Awarded: 'bg-amber-100 text-amber-800',
  Active: 'bg-green-100 text-green-800',
  'On Hold': 'bg-gray-100 text-gray-700',
  Complete: 'bg-purple-100 text-purple-800',
};

export function ProjectStatus({ status }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[status] || STATUS_STYLE.Awarded}`}>{status}</span>;
}

const money = n => (n == null ? '' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));

export default function ProjectsPage() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Starting up');

  useEffect(() => {
    listProjectRecords().then(setProjects).catch(err => setError(err.message || 'Could not load projects.'));
  }, []);

  const filters = ['Starting up', 'Active', 'All'];
  const shown = (projects || []).filter(p => {
    if (filter === 'All') return true;
    if (filter === 'Active') return p.status === 'Active';
    return startupSteps(p).some(s => !s.done) && p.status !== 'Complete';
  });

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Projects</h1>
          <p className="text-gray-500 mt-1">Start every newly awarded job here. It gets its job number, folder and startup checklist.</p>
        </div>
        <Link to="/projects/new" className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold">
          <Plus className="w-5 h-5" /> New project
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {filters.map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`h-11 rounded-md text-sm font-semibold border ${filter === f ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p>
      ) : !projects ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading projects…</div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          {filter === 'Starting up' ? 'No projects are waiting on startup steps.' : 'No projects yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map(p => {
            const steps = startupSteps(p);
            const done = steps.filter(s => s.done).length;
            return (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-[#0f2a5e]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#0f2a5e]">{p.jobNumber}</span>
                        <span className="font-bold text-[#0f2a5e] text-lg leading-tight">{p.name}</span>
                        <ProjectStatus status={p.status} />
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {[p.owner, p.contractType, money(p.contractAmount), [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${done === steps.length ? 'text-green-700' : 'text-amber-700'}`}>{done} of {steps.length}</div>
                      <div className="text-xs text-gray-500">startup steps</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {steps.map(s => (
                      <div key={s.key} title={s.label} className={`h-2 flex-1 rounded-full ${s.done ? 'bg-green-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
