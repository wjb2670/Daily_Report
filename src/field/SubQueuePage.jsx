import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import { listAllProjects } from '@/field/spAdapter';
import { listAllSubcontracts, SUB_STATUS } from '@/field/scopesData';

const ORDER = ['PM approved', 'Draft', 'Contract sent', 'Signed'];
const NOTE = {
  'PM approved': 'Ready for a contract',
  Draft: 'PM still writing the scope',
  'Contract sent': 'Waiting on the sub’s signature',
  Signed: 'Done',
};
const STYLE = { 'PM approved': 'bg-amber-100 text-amber-900', Draft: 'bg-gray-100 text-gray-700', 'Contract sent': 'bg-blue-100 text-blue-800', Signed: 'bg-green-100 text-green-800' };

// Every subcontract on every job, by where it stands. Approved scopes come
// first: that's Kendra's list of contracts to write.
export default function SubQueuePage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [show, setShow] = useState('PM approved');

  useEffect(() => {
    Promise.all([listAllSubcontracts(), listAllProjects()]).then(([subs, projects]) => {
      const byId = Object.fromEntries(projects.map(p => [String(p.id), p]));
      setRows(subs.map(s => ({ ...s, project: byId[String(s.projectId)] })).filter(s => s.project));
    }).catch(err => setError(err.code === 'not_set_up' ? 'Subcontracts aren’t set up yet. Run Site setup.' : err.message));
  }, []);

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!rows) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading subcontracts…</div>;

  const count = st => rows.filter(r => r.status === st).length;
  const list = rows.filter(r => r.status === show)
    .sort((a, b) => `${a.project.job_number}${a.contractNumber}`.localeCompare(`${b.project.job_number}${b.contractNumber}`, undefined, { numeric: true }));

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Home</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Subcontracts</h1>
      <p className="text-gray-500 mb-4">Every job’s subcontracts by where they stand. To start a new one, open the job under Project Startup.</p>
      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {ORDER.filter(st => SUB_STATUS.includes(st)).map(st => (
          <button key={st} type="button" role="tab" aria-selected={show === st} onClick={() => setShow(st)}
            className={`rounded-full px-4 h-10 font-semibold text-sm border ${show === st ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>
            {st} <span className="opacity-70">({count(st)})</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 mb-2">{NOTE[show]}</p>
      {list.length === 0 ? <p className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Nothing here.</p> : (
        <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {list.map(s => (
            <li key={s.id}>
              <Link to={`/projects/${s.project.id}/subs/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900 truncate">{s.company}</span>
                  <span className="block text-sm text-gray-500 truncate">{[s.contractNumber, `${s.costCode} ${s.tradeName}`.trim(), `${s.project.job_number} ${s.project.name}`].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`rounded-full text-xs font-bold px-2 py-0.5 shrink-0 ${STYLE[s.status]}`}>{s.status}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
