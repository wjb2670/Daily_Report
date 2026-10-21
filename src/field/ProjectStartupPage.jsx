import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, ExternalLink, Paperclip, CheckCircle2, Circle, FileText, RefreshCw, FolderOpen, Search } from 'lucide-react';
import { can } from '@/field/roles';
import { syncFieldAccess, FIELD_FOLDERS, RECEIPTS_FOLDER } from '@/field/jobData';
import { useToast } from '@/components/ui/use-toast';
import { todayStr } from '@/lib/dailyReportStore';
import {
  getProjectRecord, updateProjectRecord, startupSteps, listContractTemplates, copyContractTemplate,
  uploadStartupDoc, listStartupDocs, projectsListUrl, listExistingProjectFolders,
} from '@/field/projectsData';
import { BOND_STATUS, CONTRACT_STATUS, BONDS_REQUIRED } from '@/field/schema';
import { ProjectStatus } from '@/field/ProjectsPage';

const input = 'h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm';
const fmt = d => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

function Step({ n, title, done, children, hint }) {
  return (
    <section className={`bg-white rounded-xl shadow-sm border p-4 sm:p-5 ${done ? 'border-green-200' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${done ? 'bg-green-600 text-white' : 'bg-[#0f2a5e] text-white'}`}>
          {done ? <CheckCircle2 className="w-5 h-5" /> : n}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-[#0f2a5e] text-lg leading-tight">{title}</h2>
          {hint && <p className="text-sm text-gray-500 mt-0.5">{hint}</p>}
          <div className="mt-3 space-y-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Choice({ value, options, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" disabled={disabled} onClick={() => onChange(o)}
          className={`h-10 px-3 rounded-md text-sm font-semibold border ${value === o ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Attach({ label, project, onUploaded }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const pick = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const saved = await uploadStartupDoc(project, label, file);
      toast({ title: 'Saved to Owner Contract folder', description: saved.name });
      onUploaded?.();
    } catch (err) {
      toast({ title: 'Couldn’t save the file', description: err.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return (
    <>
      <input ref={ref} type="file" className="hidden" accept=".pdf,.doc,.docx,image/*" onChange={pick} />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy || !project.folderId}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#0f2a5e] disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />} Attach {label.toLowerCase()}
      </button>
    </>
  );
}

function DateDone({ id, label, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>
      <input id={id} type="date" className={input} value={value || ''} onChange={e => onChange(e.target.value)} />
      {!value && <button type="button" onClick={() => onChange(todayStr())} className="h-10 px-3 rounded-md bg-[#0f2a5e] text-white text-sm font-semibold">Received today</button>}
      {value && <button type="button" onClick={() => onChange('')} className="text-sm text-gray-500 underline">Clear</button>}
    </div>
  );
}

// Office only: link (or change) the job's folder on the PM Team site.
function FolderLink({ project, onLink }) {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const start = () => {
    setOpen(true);
    setQuery(project.jobNumber || '');
    if (!folders) listExistingProjectFolders().then(setFolders).catch(err => setError(err.message || 'Could not read the PM Team project folders.'));
  };
  const q = query.trim().toLowerCase();
  const shown = (folders || []).filter(f => !q || `${f.number} ${f.name}`.toLowerCase().includes(q)).slice(0, 40);

  if (!open) {
    return (
      <button type="button" onClick={start}
        className={`inline-flex items-center gap-2 h-11 px-4 rounded-md font-semibold ${project.folderId ? 'border border-gray-300 bg-white text-[#0f2a5e] text-sm' : 'bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white'}`}>
        <FolderOpen className="w-5 h-5" /> {project.folderId ? 'Change folder' : 'Link job folder'}
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="text-sm font-semibold text-gray-700">Pick this job’s folder on the PM Team site</div>
      <div className="relative">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
        <input aria-label="Search folders" className={`${input} w-full pl-10`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by job number or name" />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p>
        : !folders ? <div className="flex items-center gap-2 text-sm text-gray-500 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Reading project folders…</div>
        : shown.length === 0 ? <p className="text-sm text-gray-500 py-2">No matching folders. Clear the search to see them all.</p>
        : (
          <ul className="bg-white rounded-md border border-gray-200 divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {shown.map(f => (
              <li key={f.id}>
                <button type="button" onClick={() => { onLink(f); setOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50">
                  <span className="font-mono font-bold text-[#0f2a5e] w-20 shrink-0">{f.number}</span>
                  <span className="flex-1 truncate text-gray-800">{f.name}</span>
                  {f.id === project.folderId ? <span className="text-xs font-semibold text-green-700 uppercase">Linked</span> : <span className="text-sm font-semibold text-[#1e3a8a]">Link</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600 underline">Cancel</button>
    </div>
  );
}

// Office: the job's field folders and the note shown on the crew's dashboard.
function FieldAccessCard({ project, onSaved }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState([]);
  const [note, setNote] = useState(project.fieldNote || '');
  const [savingNote, setSavingNote] = useState(false);
  const access = project.fieldAccess;

  const sync = async () => {
    setBusy(true); setSteps([]);
    try {
      const res = await syncFieldAccess(project, s => setSteps(x => [...x, s]));
      await updateProjectRecord(project.id, { fieldFolders: res.fieldFolders, fieldAccess: res.fieldAccess });
      onSaved({ fieldFolders: res.fieldFolders, fieldAccess: res.fieldAccess });
      toast({ title: 'Field access updated', description: res.fieldAccess.emails.length ? `${res.fieldAccess.names.join(', ')} can open the job folders.` : 'No superintendent or crew is assigned yet.' });
    } catch (err) {
      toast({ title: 'Couldn’t update field access', description: err.message, variant: 'destructive' });
    }
    setBusy(false);
  };
  const saveNote = async () => {
    setSavingNote(true);
    try { await updateProjectRecord(project.id, { fieldNote: note }); onSaved({ fieldNote: note }); toast({ title: note ? 'Note posted to the field' : 'Note removed' }); } catch (err) { toast({ title: 'Couldn’t save', description: err.message, variant: 'destructive' }); }
    setSavingNote(false);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-3 space-y-3">
      <h2 className="font-bold text-[#0f2a5e] text-lg">Field crew access</h2>
      <p className="text-sm text-gray-600">The assigned superintendent and crew can view {FIELD_FOLDERS.join(', ')}, and add files to {RECEIPTS_FOLDER}. Nothing else in the job folder.</p>
      {access ? (
        <p className="text-sm text-gray-700">Last updated {new Date(access.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} for: <strong>{access.names?.join(', ') || 'nobody assigned'}</strong>
          {access.missing?.length ? <span className="block text-amber-700 mt-1">Not found in the job folder: {access.missing.join(', ')}</span> : null}</p>
      ) : <p className="text-sm text-amber-800">Not set up yet. The crew won’t see job documents or receipts until you do this.</p>}
      <button type="button" onClick={sync} disabled={busy || !project.folderId}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold disabled:opacity-50">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {access ? 'Update field access' : 'Give field crew access'}
      </button>
      {!project.folderId && <p className="text-xs text-gray-500">Link the job folder first (step 1).</p>}
      <p className="text-xs text-gray-500">Run this again after changing the Superintendent or Crew Access, so people taken off the job lose access.</p>
      <Link to={`/job?project=${project.id}`} className="inline-block text-sm text-[#1e3a8a] font-semibold underline">See the crew’s job dashboard</Link>
      {busy && steps.length > 0 && <ul className="text-sm text-gray-600">{steps.map(x => <li key={x}>• {x}</li>)}</ul>}
      <div className="pt-2 border-t border-gray-100 space-y-1.5">
        <label htmlFor="field-note" className="text-sm font-semibold text-gray-700">Note to the field <span className="font-normal text-gray-400">(shows at the top of their dashboard)</span></label>
        <textarea id="field-note" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Owner walkthrough Thursday at 10 – site must be clean."
          className="w-full rounded-md border border-gray-300 p-2 text-base md:text-sm" />
        <button type="button" onClick={saveNote} disabled={savingNote || note === (project.fieldNote || '')} className="h-9 px-3 rounded-md border border-gray-300 text-sm font-semibold text-[#0f2a5e] disabled:opacity-50">{savingNote ? 'Saving…' : 'Post note'}</button>
      </div>
    </section>
  );
}

export default function ProjectStartupPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [docs, setDocs] = useState([]);
  const [templates, setTemplates] = useState(null);
  const [template, setTemplate] = useState('');
  const [copying, setCopying] = useState(false);
  const [listUrl, setListUrl] = useState('');

  const loadDocs = proj => listStartupDocs(proj).then(setDocs).catch(() => {});
  const load = () => getProjectRecord(id).then(proj => { setP(proj); loadDocs(proj); }).catch(err => setError(err.message));

  useEffect(() => {
    load();
    listContractTemplates().then(t => { setTemplates(t); if (t[0]) setTemplate(t[0].id); }).catch(() => setTemplates([]));
    projectsListUrl().then(setListUrl).catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Saves one change right away; the page updates first so it feels instant.
  const save = async changes => {
    const before = p;
    setP(prev => ({ ...prev, ...changes }));
    try { await updateProjectRecord(id, changes); } catch (err) {
      setP(before);
      toast({ title: 'Couldn’t save', description: err.message, variant: 'destructive' });
    }
  };

  const makeContract = async () => {
    const t = templates.find(x => x.id === template);
    if (!t) return;
    setCopying(true);
    try {
      const name = await copyContractTemplate(p, t);
      await save({ ownerContract: 'Drafted' });
      toast({ title: 'Contract created', description: `${name} is in the Owner Contract folder.` });
      setTimeout(() => loadDocs(p), 2500);
    } catch (err) {
      toast({ title: 'Couldn’t copy the template', description: err.message, variant: 'destructive' });
    } finally { setCopying(false); }
  };

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!p) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading project…</div>;

  const steps = startupSteps(p);
  const stepDone = key => steps.find(s => s.key === key).done;
  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;
  const ownerFolder = p.folderUrl ? `${p.folderUrl}/Owner Contract` : '';

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> All projects</Link>

      <section className="bg-[#0f2a5e] text-white rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-mono font-black text-2xl tracking-wide">{p.jobNumber}</div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{p.name}</h1>
            <p className="text-blue-100 text-sm mt-1">{[p.owner, p.contractType, p.contractAmount != null ? p.contractAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '', `Awarded ${fmt(p.awardDate)}`].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="bg-white rounded-md px-1 py-0.5"><ProjectStatus status={p.status} /></div>
        </div>
        {p.existing ? (
          <p className="text-sm text-blue-100 mt-3">Existing job, linked to its folder. The startup steps below are optional; fill in any that help.</p>
        ) : (
          <>
            <div className="flex gap-1 mt-4">{steps.map(s => <div key={s.key} title={s.label} className={`h-2 flex-1 rounded-full ${s.done ? 'bg-green-400' : 'bg-white/25'}`} />)}</div>
            <p className="text-sm text-blue-100 mt-2">{doneCount} of {steps.length} startup steps done</p>
          </>
        )}
      </section>

      {can('projectsEdit') && <FieldAccessCard project={p} onSaved={changes => setP(prev => ({ ...prev, ...changes }))} />}

      <Link to={`/projects/${p.id}/turnover`} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 mb-3 hover:border-[#0f2a5e]">
        <span><span className="font-bold text-[#0f2a5e]">Turnover meeting</span><span className="text-gray-500 text-sm"> · checklist and sign-offs with the estimator, PM, super and Keith</span></span>
        <span aria-hidden="true" className="text-[#0f2a5e] font-bold text-xl">›</span>
      </Link>

      {can('subsView') && (
        <Link to={`/projects/${p.id}/subs`} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 mb-3 hover:border-[#0f2a5e]">
          <span><span className="font-bold text-[#0f2a5e]">Subcontracts &amp; scopes</span><span className="text-gray-500 text-sm"> · PM scopes, Exhibit A and contract files</span></span>
          <span aria-hidden="true" className="text-[#0f2a5e] font-bold text-xl">›</span>
        </Link>
      )}

      <div className="space-y-3">
        <Step n={1} title="Job number & project folder" done={stepDone('number')}>
          {p.folderUrl ? (
            <a href={p.folderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold">
              Open {p.jobNumber} folder on PM Team <ExternalLink className="w-4 h-4" />
            </a>
          ) : <p className="text-sm text-amber-800">No project folder is linked.</p>}
          {can('projectsEdit') && (
            <FolderLink project={p} onLink={f => {
              save({ folderUrl: f.webUrl, folderId: f.id });
              loadDocs({ ...p, folderUrl: f.webUrl, folderId: f.id });
              toast({ title: 'Folder linked', description: `${f.number} ${f.name}` });
            }} />
          )}
          <p className="text-xs text-gray-500">Office only. Field crews see only the job’s field folders, once you give them access below.</p>
        </Step>

        <Step n={2} title="Award letter" done={stepDone('award')} hint="Date the award letter came in. Attach it to file it in Owner Contract.">
          <DateDone id="award-date" label="Received" value={p.awardLetterDate} onChange={v => save({ awardLetterDate: v })} />
          <Attach label="Award Letter" project={p} onUploaded={() => { loadDocs(p); if (!p.awardLetterDate) save({ awardLetterDate: todayStr() }); }} />
        </Step>

        <Step n={3} title="Notice to proceed" done={stepDone('ntp')}>
          <DateDone id="ntp-date" label="Received" value={p.ntpDate} onChange={v => save({ ntpDate: v })} />
          <Attach label="Notice to Proceed" project={p} onUploaded={() => { loadDocs(p); if (!p.ntpDate) save({ ntpDate: todayStr() }); }} />
        </Step>

        <Step n={4} title="Payment & performance bonds" done={stepDone('bonds')}>
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-1.5">Are bonds required?</div>
            <Choice value={p.bondsRequired} options={BONDS_REQUIRED} onChange={v => save({ bondsRequired: v })} />
          </div>
          {p.bondsRequired === 'Yes' && (
            <div className="grid grid-cols-1 gap-3">
              {[['paymentBond', 'Payment bond', 'Payment Bond'], ['performanceBond', 'Performance bond', 'Performance Bond']].map(([k, label, file]) => (
                <div key={k} className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
                  <div className="text-sm font-semibold text-gray-700">{label}</div>
                  <Choice value={p[k]} options={BOND_STATUS} onChange={v => save({ [k]: v })} />
                  <Attach label={file} project={p} onUploaded={() => { loadDocs(p); save({ [k]: 'Received' }); }} />
                </div>
              ))}
            </div>
          )}
        </Step>

        <Step n={5} title="Owner contract" done={stepDone('contract')} hint="Start from one of the samples in Master Template Files, then track it until it’s signed.">
          {p.ownerContract === 'Not started' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <select aria-label="Contract template" className={`${input} flex-1`} value={template} onChange={e => setTemplate(e.target.value)} disabled={!templates?.length}>
                {templates === null && <option>Loading templates…</option>}
                {templates?.length === 0 && <option>No contract templates found in Master Template Files</option>}
                {templates?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button type="button" onClick={makeContract} disabled={copying || !template || !p.folderId}
                className="h-11 px-4 rounded-md bg-[#0f2a5e] text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Create contract from template
              </button>
            </div>
          )}
          <Choice value={p.ownerContract} options={CONTRACT_STATUS} onChange={v => save({ ownerContract: v })} />
          <Attach label="Signed Owner Contract" project={p} onUploaded={() => { loadDocs(p); save({ ownerContract: 'Signed' }); }} />
        </Step>

        <Step n={6} title="Superintendent" done={stepDone('super')} hint="Once a superintendent is named, the job shows up for them in the field app.">
          {p.superintendents.length ? (
            <p className="text-sm"><strong>{p.superintendents.join(', ')}</strong>{p.crew.length ? <span className="text-gray-500"> · Crew access: {p.crew.join(', ')}</span> : null}</p>
          ) : <p className="text-sm text-gray-600">No superintendent assigned yet.</p>}
          <div className="flex flex-wrap gap-2">
            {listUrl && (
              <a href={`${listUrl}/EditForm.aspx?ID=${p.id}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md bg-[#0f2a5e] text-white text-sm font-semibold">
                Assign in SharePoint <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button type="button" onClick={load} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#0f2a5e]">
              <RefreshCw className="w-4 h-4" /> Check again
            </button>
          </div>
        </Step>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-[#0f2a5e] text-lg">Project status</h2>
              <p className="text-sm text-gray-500">{allDone ? 'All startup steps are done.' : 'Set to Active when the job is underway.'}</p>
            </div>
            <Choice value={p.status} options={['Awarded', 'Active', 'On Hold', 'Complete']} onChange={v => save({ status: v })} />
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-[#0f2a5e] text-lg">Owner Contract folder</h2>
            {ownerFolder && <a href={ownerFolder} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#1e3a8a] inline-flex items-center gap-1">Open <ExternalLink className="w-3.5 h-3.5" /></a>}
          </div>
          {docs.length ? (
            <ul className="mt-3 divide-y divide-gray-100 text-sm">
              {docs.map(d => (
                <li key={d.id} className="py-2 flex items-center gap-2">
                  {d.webUrl ? <a href={d.webUrl} target="_blank" rel="noreferrer" className="text-[#1e3a8a] font-medium break-all">{d.name}</a> : <span>{d.name}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500 mt-2 flex items-center gap-2"><Circle className="w-3 h-3" /> No documents yet.</p>}
        </section>
      </div>
    </div>
  );
}
