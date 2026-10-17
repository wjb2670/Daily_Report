import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Plus, BookOpen, FolderOpen, ExternalLink } from 'lucide-react';
import { getProjectRecord } from '@/field/projectsData';
import { listSubcontracts, getPrices } from '@/field/scopesData';
import { can } from '@/field/roles';

const money = n => (n == null ? '' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' }));

const STATUS_STYLE = {
  Draft: 'bg-gray-100 text-gray-700',
  'PM approved': 'bg-blue-100 text-blue-800',
  'Contract sent': 'bg-amber-100 text-amber-800',
  Signed: 'bg-green-100 text-green-800',
};
export function SubStatus({ status }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap ${STATUS_STYLE[status] || STATUS_STYLE.Draft}`}>{status}</span>;
}

export default function SubcontractsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [subs, setSubs] = useState(null);
  const [prices, setPrices] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getProjectRecord(id), listSubcontracts(id)])
      .then(async ([p, s]) => {
        setProject(p); setSubs(s);
        if (s.length) setPrices(await getPrices(s.map(x => x.id)).catch(() => ({})));
      })
      .catch(err => setError(err.code === 'not_set_up' ? 'The subcontract lists aren’t set up yet. Ask Wendy to run Site setup.' : err.message));
  }, [id]);

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!project || !subs) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading subcontracts…</div>;

  const total = subs.reduce((t, s) => t + (Number(prices[s.id]) || 0), 0);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> {project.jobNumber} {project.name}</Link>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Subcontracts</h1>
          <p className="text-gray-500 mt-1">Each sub’s scope of work. The PM ticks the lines that apply; the approved scope becomes Exhibit A of the subcontract.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/scope-library" className="inline-flex items-center gap-2 h-12 px-4 rounded-md border border-[#0f2a5e] bg-white text-[#0f2a5e] font-semibold"><BookOpen className="w-5 h-5" /> Scope library</Link>
          {can('scopesEdit') && (
            <Link to={`/projects/${id}/subs/new`} className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold"><Plus className="w-5 h-5" /> Add subcontract</Link>
          )}
        </div>
      </div>

      {!project.folderId && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">This job has no folder linked yet. Scopes can be written now; link the folder on the project page before creating contract files.</p>
      )}

      {subs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No subcontracts yet.{can('scopesEdit') ? ' Tap “Add subcontract” to write the first scope.' : ' The PM adds them here.'}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {subs.map(s => (
              <li key={s.id}>
                <Link to={`/projects/${id}/subs/${s.id}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-[#0f2a5e]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#0f2a5e]">{s.contractNumber}</span>
                        <span className="font-bold text-[#0f2a5e] text-lg leading-tight">{s.company || '(no company yet)'}</span>
                        <SubStatus status={s.status} />
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">Cost code {s.costCode || '—'} · {s.tradeName || 'No trade picked'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-gray-900 tabular-nums">{money(prices[s.id])}</div>
                      {s.folderUrl && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><FolderOpen className="w-3.5 h-3.5" /> Contract files</span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-3 text-sm text-gray-600">Total subcontracted: <strong className="ml-1 tabular-nums text-gray-900">{money(total)}</strong></div>
        </>
      )}
      {project.folderUrl && (
        <a href={project.folderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#1e3a8a] font-semibold mt-4">Open the job folder <ExternalLink className="w-4 h-4" /></a>
      )}
    </div>
  );
}
