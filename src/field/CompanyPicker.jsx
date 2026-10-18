import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, BookUser, X } from 'lucide-react';
import { loadDirectory, searchCompanies, divisionOf, inDivision, cityLine } from '@/field/subDirectory';

const input = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]';

// Search the subcontractor list, pick a company, then the contact for this
// contract. onPick(company, contact) fills the subcontract fields.
export default function CompanyPicker({ costCode, onPick, onClose, initialQuery = '' }) {
  const [dir, setDir] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [chosen, setChosen] = useState(null);
  const division = divisionOf(costCode);

  useEffect(() => { loadDirectory().then(setDir).catch(err => setError(err.message)); }, []);

  const shown = useMemo(() => {
    if (!dir) return [];
    if (!query.trim() && division) return dir.companies.filter(c => inDivision(c, division)).slice(0, 30);
    return searchCompanies(dir.companies, query, division).slice(0, 30);
  }, [dir, query, division]);

  return (
    <div className="rounded-xl border border-[#1e3a8a] bg-blue-50/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-[#0f2a5e] inline-flex items-center gap-2"><BookUser className="w-5 h-5" /> Subcontractor list</div>
        {onClose && <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800"><X className="w-5 h-5" /></button>}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : !dir ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Reading the subcontractor list…</div>
      ) : chosen ? (
        <div className="space-y-2">
          <div className="text-sm"><span className="font-bold text-[#0f2a5e]">{chosen.company}</span>{cityLine(chosen) ? <span className="text-gray-500"> · {cityLine(chosen)}</span> : null}</div>
          <div className="text-sm font-semibold text-gray-700">Who is the contact for this contract?</div>
          <ul className="bg-white rounded-md border border-gray-200 divide-y divide-gray-100">
            {(chosen.contacts.length ? chosen.contacts : [{ name: '', email: '' }]).map((p, i) => (
              <li key={i}>
                <button type="button" onClick={() => onPick(chosen, p)} className="w-full text-left px-3 py-2.5 hover:bg-blue-50">
                  <div className="font-semibold text-gray-900">{p.name || 'No contact name'}</div>
                  <div className="text-xs text-gray-500 break-all">{[p.email, p.phone, p.cell].filter(Boolean).join(' · ') || 'No email or phone listed'}</div>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setChosen(null)} className="text-sm text-[#1e3a8a] underline">Pick a different company</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input autoFocus aria-label="Search subcontractors" className={`${input} pl-10`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Company or contact name" />
          </div>
          {division && !query.trim() && <p className="text-xs text-gray-500">Showing division {division} subs first. Type to search all {dir.companies.length} companies.</p>}
          {shown.length === 0 ? <p className="text-sm text-gray-500 py-2">No match. You can type the company in yourself.</p> : (
            <ul className="bg-white rounded-md border border-gray-200 divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {shown.map(c => (
                <li key={c.key}>
                  <button type="button" onClick={() => (c.contacts.length > 1 ? setChosen(c) : onPick(c, c.contacts[0]))} className="w-full text-left px-3 py-2.5 hover:bg-blue-50">
                    <div className="font-semibold text-gray-900">{c.company}</div>
                    <div className="text-xs text-gray-500">{[c.trades[0], cityLine(c), c.contacts.length > 1 ? `${c.contacts.length} contacts` : c.contacts[0]?.name].filter(Boolean).join(' · ')}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
