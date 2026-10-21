import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Folder, FileText, ChevronRight, ExternalLink, Search, Camera, Upload, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { listFolder, uploadToFolder, FIELD_FOLDERS, FIELD_UPLOAD_FOLDERS } from '@/field/jobData';

const kb = n => (n == null ? '' : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const when = d => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

// The job folders a crew may open: Drawings, Specifications, Submittals, etc.
// Files open in Microsoft's viewer (PDFs, drawings, Word, Excel).
export default function JobDocsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [trail, setTrail] = useState([]); // [{id, name}]
  const [items, setItems] = useState(null);
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);
  const [upload, setUpload] = useState(null); // { name, pct } while sending; { done: n } after
  const [uploadErr, setUploadErr] = useState('');

  useEffect(() => {
    base44.entities.Project.list().then(all => {
      const p = all.find(x => String(x.id) === String(projectId));
      if (!p) setError('You’re not assigned to this job.');
      else if (!p.field_folders?.folders) setError('The office hasn’t opened this job’s folders to the field crew yet.');
      else setProject(p);
    }).catch(err => setError(err.message));
  }, [projectId]);

  const here = trail[trail.length - 1];
  useEffect(() => {
    if (!project || !here) return;
    setItems(null); setQuery('');
    setUploadErr('');
    listFolder(project.field_folders.driveId, here.id).then(setItems).catch(err => setError(err.status === 403 || err.status === 404 ? 'You don’t have access to this folder. Ask the office to update field access for the job.' : err.message));
  }, [project, here, reload]);
  useEffect(() => { setUpload(null); }, [here]);

  const send = async files => {
    const list = [...(files || [])];
    if (!list.length) return;
    setUploadErr('');
    try {
      for (const [n, f] of list.entries()) {
        setUpload({ name: f.name, pct: 0, n: n + 1, of: list.length });
        await uploadToFolder(project.field_folders.driveId, here.id, f, pct => setUpload(u => ({ ...u, pct })));
      }
      setUpload({ done: list.length });
      setReload(r => r + 1);
    } catch (err) {
      setUpload(null);
      setUploadErr(err.status === 403 ? 'You can’t add files here yet. Ask the office to update field access for the job.' : err.message);
    }
  };

  const back = <Link to="/" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Job dashboard</Link>;
  if (error) return <div className="max-w-3xl mx-auto">{back}<p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!project) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;

  const folders = FIELD_FOLDERS.filter(n => project.field_folders.folders[n]);
  const q = query.trim().toLowerCase();
  const shown = (items || []).filter(i => !q || i.name.toLowerCase().includes(q));
  const canAdd = !!here && FIELD_UPLOAD_FOLDERS.includes(trail[0]?.name);
  const pick = 'flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-lg font-semibold cursor-pointer';

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {back}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Job documents</h1>
      <p className="text-gray-500 mb-4">{project.job_number} {project.name}</p>

      {!here ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {folders.map(n => (
            <li key={n}>
              <button type="button" onClick={() => setTrail([{ id: project.field_folders.folders[n].id, name: n }])}
                className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-[#0f2a5e] text-left">
                <Folder className="w-7 h-7 text-[#0f2a5e] shrink-0" />
                <span className="flex-1"><span className="block font-bold text-[#0f2a5e] text-lg">{n}</span>{FIELD_UPLOAD_FOLDERS.includes(n) && <span className="block text-xs text-gray-500">You can add files</span>}</span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <nav className="flex flex-wrap items-center gap-1 text-sm mb-3" aria-label="Folder path">
            <button type="button" onClick={() => setTrail([])} className="text-[#1e3a8a] font-semibold underline">All folders</button>
            {trail.map((t, i) => (
              <React.Fragment key={t.id}>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {i === trail.length - 1 ? <span className="font-semibold text-gray-900">{t.name}</span>
                  : <button type="button" onClick={() => setTrail(trail.slice(0, i + 1))} className="text-[#1e3a8a] underline">{t.name}</button>}
              </React.Fragment>
            ))}
          </nav>
          {canAdd && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
              <div className="flex gap-2">
                <label className={`${pick} bg-[#0f2a5e] text-white`}><Camera className="w-5 h-5" /> Take a photo
                  <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={!!upload && !upload.done} onChange={e => { send(e.target.files); e.target.value = ''; }} /></label>
                <label className={`${pick} border border-[#0f2a5e] text-[#0f2a5e]`}><Upload className="w-5 h-5" /> Add a file
                  <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="sr-only" disabled={!!upload && !upload.done} onChange={e => { send(e.target.files); e.target.value = ''; }} /></label>
              </div>
              {upload && !upload.done && <p className="mt-2 text-sm text-gray-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending {upload.of > 1 ? `${upload.n} of ${upload.of}` : upload.name}… {Math.round(upload.pct * 100)}%</p>}
              {upload?.done && <p className="mt-2 text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {upload.done === 1 ? 'File added' : `${upload.done} files added`} to {here.name}.</p>}
              {uploadErr && <p className="mt-2 text-sm text-red-700">{uploadErr}</p>}
            </div>
          )}
          <div className="relative mb-3">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input aria-label="Search this folder" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search this folder"
              className="w-full h-11 rounded-md border border-gray-300 bg-white pl-10 pr-3 text-base md:text-sm" />
          </div>
          {!items ? <div className="flex items-center gap-2 text-gray-500 py-6"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
            : shown.length === 0 ? <p className="text-gray-500 py-6 text-center">{items.length ? 'Nothing matches.' : 'This folder is empty.'}</p> : (
              <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {shown.map(i => (
                  <li key={i.id}>
                    {i.isFolder ? (
                      <button type="button" onClick={() => setTrail([...trail, { id: i.id, name: i.name }])} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left">
                        <Folder className="w-5 h-5 text-[#0f2a5e] shrink-0" /><span className="flex-1 min-w-0 truncate font-medium text-gray-900">{i.name}</span><ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ) : (
                      <a href={i.webUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50">
                        <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                        <span className="flex-1 min-w-0"><span className="block truncate text-gray-900">{i.name}</span><span className="block text-xs text-gray-500">{[when(i.modified), kb(i.size)].filter(Boolean).join(' · ')}</span></span>
                        <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </>
      )}
    </div>
  );
}
