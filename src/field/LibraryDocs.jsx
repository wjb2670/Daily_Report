import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, FileText, ChevronRight, ExternalLink, Search, Camera, Upload, CheckCircle2, PenLine, Layers } from 'lucide-react';
import { uploadToFolder } from '@/field/jobData';
import { listTyped, tagFile, LIBRARIES } from '@/field/libraries';
import { canMarkUp } from '@/field/MarkupPage';

const kb = n => (n == null ? '' : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const when = d => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const ADDABLE = ['Permits', 'Inspection Reports'];
const ALWAYS = ['Drawings', 'Permits', 'Inspection Reports'];

// TEST library layout: a job's Job Documents folder, grouped by Document Type
// instead of subfolders. The crew adds permits and inspection reports; those
// files go to the job's Field Uploads folder, tagged with their type.
export default function LibraryDocs({ project }) {
  const ff = project.field_folders;
  const [files, setFiles] = useState(null);
  const [error, setError] = useState('');
  const [type, setType] = useState(null);
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);
  const [upload, setUpload] = useState(null);
  const [uploadErr, setUploadErr] = useState('');

  useEffect(() => {
    setFiles(null);
    listTyped(ff.driveId, ff.root.id).then(setFiles)
      .catch(err => setError(err.status === 403 || err.status === 404 ? 'You don’t have access to this job’s documents. Ask the office to update field access for the job.' : err.message));
  }, [ff.driveId, ff.root.id, reload]);
  useEffect(() => { setUpload(null); setUploadErr(''); setQuery(''); }, [type]);

  const send = async picked => {
    const list = [...(picked || [])];
    if (!list.length) return;
    setUploadErr('');
    try {
      for (const [n, f] of list.entries()) {
        setUpload({ name: f.name, pct: 0, n: n + 1, of: list.length });
        const item = await uploadToFolder(ff.driveId, ff.uploads.id, f, pct => setUpload(u => ({ ...u, pct })));
        await tagFile(ff.driveId, item.id, { DocumentType: type, Job: ff.job }).catch(() => {});
      }
      setUpload({ done: list.length });
      setReload(r => r + 1);
    } catch (err) {
      setUpload(null);
      setUploadErr(err.status === 403 ? 'You can’t add files yet. Ask the office to update field access for the job.' : err.message);
    }
  };

  if (error) return <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p>;
  if (!files) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;

  const typeOf = f => f.type || 'Other';
  const counts = files.reduce((m, f) => ({ ...m, [typeOf(f)]: (m[typeOf(f)] || 0) + 1 }), {});
  const types = LIBRARIES.jobDocuments.types.filter(t => ALWAYS.includes(t) || counts[t]);
  const pick = 'flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-lg font-semibold cursor-pointer';

  if (!type) {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 mb-3 inline-block">Test project · new library layout</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {types.map(t => (
            <li key={t}>
              <button type="button" onClick={() => setType(t)} className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-[#0f2a5e] text-left">
                <Layers className="w-7 h-7 text-[#0f2a5e] shrink-0" />
                <span className="flex-1"><span className="block font-bold text-[#0f2a5e] text-lg">{t}</span>
                  <span className="block text-xs text-gray-500">{counts[t] || 0} file{counts[t] === 1 ? '' : 's'}{ADDABLE.includes(t) ? ' · you can add files' : t === 'Drawings' ? ' · view, or mark up a sheet' : ''}</span></span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = files.filter(f => typeOf(f) === type && (!q || f.name.toLowerCase().includes(q)))
    .sort((a, b) => b.modified.localeCompare(a.modified));
  return (
    <>
      <nav className="flex flex-wrap items-center gap-1 text-sm mb-3" aria-label="Document type">
        <button type="button" onClick={() => setType(null)} className="text-[#1e3a8a] font-semibold underline">All types</button>
        <ChevronRight className="w-4 h-4 text-gray-400" /><span className="font-semibold text-gray-900">{type}</span>
      </nav>
      {ADDABLE.includes(type) && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
          <div className="flex gap-2">
            <label className={`${pick} bg-[#0f2a5e] text-white`}><Camera className="w-5 h-5" /> Take a photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={!!upload && !upload.done} onChange={e => { send(e.target.files); e.target.value = ''; }} /></label>
            <label className={`${pick} border border-[#0f2a5e] text-[#0f2a5e]`}><Upload className="w-5 h-5" /> Add a file
              <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="sr-only" disabled={!!upload && !upload.done} onChange={e => { send(e.target.files); e.target.value = ''; }} /></label>
          </div>
          {upload && !upload.done && <p className="mt-2 text-sm text-gray-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending {upload.of > 1 ? `${upload.n} of ${upload.of}` : upload.name}… {Math.round(upload.pct * 100)}%</p>}
          {upload?.done && <p className="mt-2 text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {upload.done === 1 ? 'File added' : `${upload.done} files added`} as {type}.</p>}
          {uploadErr && <p className="mt-2 text-sm text-red-700">{uploadErr}</p>}
        </div>
      )}
      <div className="relative mb-3">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
        <input aria-label={`Search ${type}`} value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${type}`} className="w-full h-11 rounded-md border border-gray-300 bg-white pl-10 pr-3 text-base md:text-sm" />
      </div>
      {shown.length === 0 ? <p className="text-gray-500 py-6 text-center">{q ? 'Nothing matches.' : `No ${type} yet.`}</p> : (
        <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {shown.map(i => (
            <li key={i.id} className="flex items-center">
              <a href={i.webUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 hover:bg-blue-50">
                <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="flex-1 min-w-0"><span className="block truncate text-gray-900">{i.name}</span><span className="block text-xs text-gray-500">{[when(i.modified), kb(i.size)].filter(Boolean).join(' · ')}</span></span>
                <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
              </a>
              {type === 'Drawings' && canMarkUp(i.name) && (
                <Link to={`/docs/${project.id}/markup/${i.id}`} aria-label={`Mark up ${i.name}`} className="mr-3 inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[#0f2a5e] text-[#0f2a5e] font-semibold text-sm shrink-0"><PenLine className="w-4 h-4" /> Mark up</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
