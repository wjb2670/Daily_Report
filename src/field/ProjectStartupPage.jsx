import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, ExternalLink, Paperclip, CheckCircle2, Circle, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { todayStr } from '@/lib/dailyReportStore';
import {
  getProjectRecord, updateProjectRecord, startupSteps, listContractTemplates, copyContractTemplate,
  uploadStartupDoc, listStartupDocs, projectsListUrl,
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
        <div className="flex gap-1 mt-4">{steps.map(s => <div key={s.key} title={s.label} className={`h-2 flex-1 rounded-full ${s.done ? 'bg-green-400' : 'bg-white/25'}`} />)}</div>
        <p className="text-sm text-blue-100 mt-2">{doneCount} of {steps.length} startup steps done</p>
      </section>

      <div className="space-y-3">
        <Step n={1} title="Job number & project folder" done={stepDone('number')}>
          {p.folderUrl ? (
            <a href={p.folderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold">
              Open {p.jobNumber} folder on PM Team <ExternalLink className="w-4 h-4" />
            </a>
          ) : <p className="text-sm text-amber-800">No project folder is linked.</p>}
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
