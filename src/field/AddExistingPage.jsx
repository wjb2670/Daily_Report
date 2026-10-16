import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, FolderOpen, ArrowLeft, ExternalLink } from 'lucide-react';
import { listExistingProjectFolders, listProjectRecords, createProjectRecord } from '@/field/projectsData';

const input = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]';

function Field({ id, label, required, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {label}{required ? <span className="text-red-600"> *</span> : <span className="font-normal text-gray-400"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

// Adds a job that already has a folder on the PM Team site: links the folder,
// keeps its number and name, creates nothing new in SharePoint documents.
export default function AddExistingPage() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listExistingProjectFolders(), listProjectRecords().catch(() => [])])
      .then(([all, projects]) => {
        const inApp = new Set(projects.map(p => p.jobNumber));
        setFolders(all.map(f => ({ ...f, inApp: inApp.has(f.number) })));
      })
      .catch(err => setError(err.message || 'Could not read the PM Team project folders.'));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (folders || []).filter(f => !q || `${f.number} ${f.name}`.toLowerCase().includes(q));
  }, [folders, query]);

  const pick = f => {
    setPicked(f);
    setForm({ name: f.name, owner: '', contractType: 'GC', address: '', city: '', state: 'DE', zip: '', projectManager: '', status: 'Active' });
    window.scrollTo({ top: 0 });
  };
  const set = (k, v) => setForm(x => ({ ...x, [k]: v }));
  const missing = ['name', 'address', 'city', 'state'].filter(k => !String(form[k] || '').trim());

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const id = await createProjectRecord({
        name: form.name.trim(), jobNumber: picked.number, status: form.status, owner: form.owner.trim(),
        contractType: form.contractType, address: form.address.trim(), city: form.city.trim(),
        state: form.state.trim().toUpperCase(), zip: form.zip.trim(), projectManager: form.projectManager.trim(),
        folderUrl: picked.webUrl, folderId: picked.id, existing: true,
      });
      navigate(`/projects/${id}`);
    } catch (err) {
      setError(err.message || 'Could not add the project.');
      setSaving(false);
    }
  };

  if (picked) {
    return (
      <div className="max-w-2xl mx-auto pb-10">
        <button type="button" onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Pick a different folder</button>
        <section className="bg-[#0f2a5e] text-white rounded-xl p-5 mb-4">
          <div className="text-sm text-blue-200 font-semibold uppercase tracking-wide">Existing job</div>
          <div className="text-3xl font-black font-mono tracking-wide mt-1">{picked.number}</div>
          <a href={picked.webUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white mt-1">
            <FolderOpen className="w-4 h-4" /> {picked.number} {picked.name} <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <p className="text-sm text-blue-100 mt-2">The job keeps this number and folder. Nothing is copied or renamed.</p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <Field id="ex-name" label="Project name" required>
            <input id="ex-name" className={input} value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="ex-owner" label="Owner / client">
              <input id="ex-owner" className={input} value={form.owner} onChange={e => set('owner', e.target.value)} />
            </Field>
            <Field id="ex-type" label="Contract type" required>
              <div className="grid grid-cols-2 gap-2">
                {['GC', 'CM'].map(t => (
                  <button key={t} type="button" onClick={() => set('contractType', t)}
                    className={`h-11 rounded-md font-semibold border ${form.contractType === t ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>{t}</button>
                ))}
              </div>
            </Field>
          </div>
          <Field id="ex-address" label="Job site address" required>
            <input id="ex-address" className={input} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Used for weather in daily reports" />
          </Field>
          <div className="grid grid-cols-6 gap-3">
            <Field id="ex-city" label="City" required className="col-span-6 sm:col-span-3">
              <input id="ex-city" className={input} value={form.city} onChange={e => set('city', e.target.value)} />
            </Field>
            <Field id="ex-state" label="State" required className="col-span-2 sm:col-span-1">
              <input id="ex-state" maxLength={2} className={`${input} uppercase`} value={form.state} onChange={e => set('state', e.target.value)} />
            </Field>
            <Field id="ex-zip" label="ZIP" className="col-span-4 sm:col-span-2">
              <input id="ex-zip" inputMode="numeric" maxLength={5} className={input} value={form.zip} onChange={e => set('zip', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
          <Field id="ex-pm" label="Project manager">
            <input id="ex-pm" className={input} value={form.projectManager} onChange={e => set('projectManager', e.target.value)} />
          </Field>
          <Field id="ex-status" label="Status" required>
            <div className="grid grid-cols-3 gap-2">
              {['Active', 'On Hold', 'Awarded'].map(s => (
                <button key={s} type="button" onClick={() => set('status', s)}
                  className={`h-11 rounded-md font-semibold border ${form.status === s ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>{s}</button>
              ))}
            </div>
          </Field>
        </section>

        {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        <button type="button" onClick={save} disabled={saving || missing.length > 0}
          className="mt-4 w-full h-12 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold text-base disabled:opacity-50 inline-flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Adding…</> : `Add ${picked.number} to the app`}
        </button>
        <p className="text-sm text-gray-500 mt-3">Next, assign the superintendent on the project page so it shows up in their daily reports.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <button type="button" onClick={() => navigate('/projects')} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> All projects</button>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">Add an existing project</h1>
      <p className="text-gray-500 mb-5">For jobs that already have a folder on the PM Team site. Pick the folder; the job keeps its number and folder.</p>

      <div className="relative mb-4">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
        <input aria-label="Search folders" className={`${input} pl-10`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by job number or name" />
      </div>

      {error ? (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p>
      ) : !folders ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Reading project folders…</div>
      ) : shown.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No matching project folders.</p>
      ) : (
        <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {shown.map(f => (
            <li key={f.id}>
              {f.inApp ? (
                <div className="flex items-center gap-3 px-4 py-3 text-gray-400">
                  <span className="font-mono font-bold w-20 shrink-0">{f.number}</span>
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs font-semibold uppercase">Already in app</span>
                </div>
              ) : (
                <button type="button" onClick={() => pick(f)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50">
                  <span className="font-mono font-bold text-[#0f2a5e] w-20 shrink-0">{f.number}</span>
                  <span className="flex-1 truncate text-gray-800">{f.name}</span>
                  <span className="text-sm font-semibold text-[#1e3a8a] shrink-0">Add</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
