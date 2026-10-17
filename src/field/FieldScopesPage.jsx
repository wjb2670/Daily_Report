import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Search } from 'lucide-react';
import base44 from '@/field/spAdapter';
import { listSubcontracts, exhibitLines } from '@/field/scopesData';
import { can } from '@/field/roles';

const letter = i => String.fromCharCode(97 + (i % 26));

// What each sub is on the hook for, for the superintendent on site.
// Approved scopes only, and never the contract amount.
export default function FieldScopesPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    (async () => {
      const mine = await base44.entities.Project.list();
      const p = mine.find(x => String(x.id) === String(projectId));
      if (!p) { setError(can('allProjects') ? 'Project not found.' : 'You’re not assigned to this project.'); return; }
      setProject(p);
      const all = await listSubcontracts(projectId);
      setSubs(all.filter(s => s.status !== 'Draft'));
    })().catch(err => setError(err.code === 'not_set_up' ? 'Scopes aren’t set up yet.' : err.message));
  }, [projectId]);

  if (error) return <div className="max-w-3xl mx-auto"><Link to="/" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Daily Report</Link><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!subs) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading scopes…</div>;

  const q = query.trim().toLowerCase();
  const withLines = subs.map(s => ({ ...s, lines: exhibitLines(s.scope, { project: project.name, company: s.company }) }));
  const shown = withLines.filter(s => !q || `${s.company} ${s.tradeName} ${s.costCode} ${s.lines.map(l => [l.text, ...l.sub].join(' ')).join(' ')}`.toLowerCase().includes(q));

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Daily Report</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Sub scopes</h1>
      <p className="text-gray-500 mb-4">{project.job_number} {project.name}. What each subcontractor agreed to do, as approved by the PM.</p>
      <div className="relative mb-4">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
        <input aria-label="Search scopes" className="w-full h-11 rounded-md border border-gray-300 bg-white pl-10 pr-3 text-base md:text-sm" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a company or a word, e.g. bollards" />
      </div>
      {shown.length === 0 ? (
        <p className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">{subs.length ? 'Nothing matches that search.' : 'No approved scopes for this job yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map(s => {
            const isOpen = open === s.id || !!q;
            return (
              <li key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <button type="button" onClick={() => setOpen(isOpen && !q ? null : s.id)} className="w-full text-left p-4" aria-expanded={isOpen}>
                  <div className="font-bold text-[#0f2a5e] text-lg leading-tight">{s.company}</div>
                  <div className="text-sm text-gray-600">{s.tradeName} · cost code {s.costCode} · {s.lines.length} items</div>
                </button>
                {isOpen && (
                  <ol className="px-4 pb-4 space-y-1.5 text-[15px] text-gray-900">
                    {s.lines.map((l, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="w-6 shrink-0 text-right font-semibold text-[#0f2a5e]">{i + 1}.</span>
                        <div className="min-w-0">{l.text}{l.sub.map((x, j) => <div key={j} className="pl-1"><span className="font-semibold mr-1">{letter(j)}.</span>{x}</div>)}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
