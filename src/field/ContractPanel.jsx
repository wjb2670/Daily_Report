import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mail, Upload, CheckCircle2, Circle, AlertTriangle, ExternalLink, PenLine, Send, History, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { can } from '@/field/roles';
import { currentAccount } from '@/field/auth';
import { updateProjectRecord } from '@/field/projectsData';
import { SUB_STATUS } from '@/field/scopesData';
import {
  contractEmail, executedEmail, sendMail, contractFiles, findPaymentProcedures, saveToContract, saveCompanyDoc,
  logStep, setCompliance, paperwork, findCompany, saveCompany, stateName,
} from '@/field/contractsData';

const input = 'w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]';
const btn = 'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md font-semibold disabled:opacity-50';
const when = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const yr = String(new Date().getFullYear());

function UploadButton({ label, onFile, busy, small, accept = '.pdf,.doc,.docx,image/*' }) {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" aria-label={label}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()}
        className={small ? 'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#0f2a5e] disabled:opacity-50'
          : `${btn} border border-[#0f2a5e] text-[#0f2a5e] bg-white`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {label}
      </button>
    </>
  );
}

// ---- Email composer -------------------------------------------------------------

function Composer({ project, sub, company, onClose, onSent }) {
  const base = contractEmail(project, sub, company || {});
  const [to, setTo] = useState(sub.companyEmail || company?.email || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(base.subject);
  const [note, setNote] = useState('');
  const [files, setFiles] = useState(null);
  const [pick, setPick] = useState({});
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([contractFiles(project, sub).catch(() => []), findPaymentProcedures()]).then(([list, proc]) => {
      const all = [...list, ...(proc ? [{ ...proc, procedures: true }] : [])];
      setFiles(all);
      // The contract and Exhibit A go by default; working copies of signed versions don't.
      setPick(Object.fromEntries(all.map(f => [f.id, f.procedures || (!/signed|executed|coi|insurance|w-?9|license/i.test(f.name))])));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const html = note.trim()
    ? base.html.replace(/(<p[^>]*>[^<]*,<\/p>)/, `$1\n<p style="margin:0 0 12px">${note.trim().replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')}</p>`)
    : base.html;
  const chosen = (files || []).filter(f => pick[f.id]);

  const send = async () => {
    setStep('Starting'); setError('');
    try {
      const split = s => s.split(/[;,\s]+/).map(x => x.trim()).filter(Boolean);
      await sendMail({ to: split(to), cc: split(cc), subject, html, attachments: chosen }, setStep);
      onSent({ to, attachments: chosen.map(f => f.name) });
    } catch (err) {
      setError(`Couldn’t send: ${err.message}`);
      setStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto" role="dialog" aria-label="Email contract to sub">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-[#0f2a5e] text-lg">Email contract to sub</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block text-sm font-semibold text-gray-700">To<input className={input} value={to} onChange={e => setTo(e.target.value)} placeholder="sub@company.com" /></label>
          <label className="block text-sm font-semibold text-gray-700">Cc (optional)<input className={input} value={cc} onChange={e => setCc(e.target.value)} placeholder="pm@whayland.com" /></label>
          <label className="block text-sm font-semibold text-gray-700">Subject<input className={input} value={subject} onChange={e => setSubject(e.target.value)} /></label>
          <label className="block text-sm font-semibold text-gray-700">Add a note (optional)
            <textarea rows={2} className="w-full rounded-md border border-gray-300 p-2 text-base md:text-sm" value={note} onChange={e => setNote(e.target.value)} placeholder="Goes just under the greeting" />
          </label>
          <div className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">Attachments</div>
            {!files ? <p className="text-gray-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Looking in the contract folder…</p>
              : files.length === 0 ? <p className="text-red-700">Nothing in the contract folder yet. Create the contract files first.</p>
              : (
                <ul className="space-y-1">
                  {files.map(f => (
                    <li key={f.id}><label className="inline-flex items-center gap-2"><input type="checkbox" className="w-5 h-5 accent-[#0f2a5e]" checked={!!pick[f.id]} onChange={e => setPick(p => ({ ...p, [f.id]: e.target.checked }))} />{f.name}{f.procedures && <span className="text-xs text-gray-500">(Master Template Files)</span>}</label></li>
                  ))}
                </ul>
              )}
            {files && !files.some(f => f.procedures) && <p className="text-xs text-amber-700 mt-1">No “Invoicing & Payment Procedures” file found in Master Template Files – attach it by hand or add it there.</p>}
          </div>
          {!project.ownerAddress && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">The owner’s address isn’t on the job yet, so the insurance instructions show “[Owner address]”. Add it above the checklist first.</p>}
          <div className="text-sm font-semibold text-gray-700">What the sub will read</div>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50" dangerouslySetInnerHTML={{ __html: html }} />
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          <p className="text-xs text-gray-500">Sent from your own mailbox, so it shows in your Sent Items and their reply comes back to you. The first time, Microsoft asks you to allow the app to send mail.</p>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className={`${btn} border border-gray-300 text-gray-700`}>Cancel</button>
          <button type="button" onClick={send} disabled={!!step || !to.trim() || !chosen.length} className={`${btn} bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white`}>
            {step ? <><Loader2 className="w-5 h-5 animate-spin" /> {step}…</> : <><Send className="w-5 h-5" /> Send</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Company information confirm / update ---------------------------------------

function CompanyForm({ company, sub, onSave, onCancel, busy }) {
  const [f, setF] = useState({
    contact: company?.contact || sub.companyContact || '', email: company?.email || sub.companyEmail || '', phone: company?.phone || sub.companyPhone || '',
    address: company?.address || sub.companyAddress || '', city: company?.city || '', state: company?.state || '', zip: company?.zip || '',
    remitName: company?.remitName || '', remitAddress: company?.remitAddress || '', remitCity: company?.remitCity || '', businessType: company?.businessType || '',
  });
  const row = (k, label, cls = '') => <label key={k} className={`block text-xs font-semibold text-gray-600 ${cls}`}>{label}<input className={input} value={f[k]} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} /></label>;
  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {row('contact', 'Contact')}{row('phone', 'Phone')}{row('email', 'Email', 'col-span-2')}{row('address', 'Address', 'col-span-2')}
        {row('city', 'City')}<div className="grid grid-cols-2 gap-2">{row('state', 'State')}{row('zip', 'ZIP')}</div>
        {row('remitName', 'Remit-to name', 'col-span-2')}{row('remitAddress', 'Remit-to address')}{row('remitCity', 'Remit-to city, ST ZIP')}
        <label className="block text-xs font-semibold text-gray-600 col-span-2">Business type
          <select className={input} value={f.businessType} onChange={e => setF(x => ({ ...x, businessType: e.target.value }))}>
            <option value="">—</option>{['Corporation', 'S Corporation', 'LLC', 'Partnership', 'Sole proprietor', 'Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-gray-500">Tax ID numbers aren’t kept here – they stay on the W-9.</p>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => onSave(f)} className="h-9 px-3 rounded-md bg-[#0f2a5e] text-white text-sm font-semibold disabled:opacity-50">Save to company directory</button>
        <button type="button" onClick={onCancel} className="h-9 px-3 rounded-md border border-gray-300 text-sm font-semibold text-gray-700">Cancel</button>
      </div>
    </div>
  );
}

// ---- The panel ------------------------------------------------------------------

export default function ContractPanel({ project, setProject, sub, setSub }) {
  const { toast } = useToast();
  const [company, setCompany] = useState(undefined);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState('');
  const [editCo, setEditCo] = useState(false);
  const [coi, setCoi] = useState({ expires: sub.compliance?.coi?.expires || '', checks: false });
  const [licExp, setLicExp] = useState('');
  const [owner, setOwner] = useState(project.ownerAddress || '');
  const [showLog, setShowLog] = useState(false);
  const office = can('subsContract');
  const signer = can('contractsSign');
  const st = stateName(project.state);

  useEffect(() => { findCompany(sub.company).then(c => setCompany(c)).catch(() => setCompany(null)); }, [sub.company]);

  const run = async (key, fn, done) => {
    setBusy(key);
    try { await fn(); if (done) toast({ title: done }); } catch (err) { toast({ title: 'Something went wrong', description: err.message, variant: 'destructive' }); }
    setBusy('');
  };
  const step = async (what, extra) => { const s = await logStep(sub, what, extra); setSub(s); return s; };
  const s0name = () => { const a = currentAccount() || {}; return a.name || a.email || ''; };
  const contractName = suffix => `${sub.contractNumber} Contract - ${suffix}`;

  const sent = async ({ to, attachments }) => {
    setComposing(false);
    await run('sent', () => step(`Contract emailed to ${to}`, { status: 'Contract sent', attachments }), 'Contract sent');
  };

  const subSigned = file => run('subSigned', async () => {
    const saved = await saveToContract(project, sub, file, contractName(`Signed by ${sub.company}`), 'Sub Agreement');
    await step('Signed contract received from sub', { status: 'Signed by sub', file: saved.name, url: saved.url });
  }, 'Saved – waiting for Whayland’s signature');

  const executed = file => run('executed', async () => {
    const saved = await saveToContract(project, sub, file, contractName('Executed'), 'Sub Agreement');
    let s = await step('Signed for The Whayland Company – contract executed', { status: 'Executed', file: saved.name, url: saved.url });
    const to = sub.companyEmail || company?.email;
    if (to) {
      const mail = executedEmail(project, s);
      await sendMail({ to: [to], subject: mail.subject, html: mail.html, attachments: [{ name: saved.name, blob: file }] });
      s = await logStep(s, `Executed copy emailed to ${to}`); setSub(s);
    } else {
      toast({ title: 'No email for this sub', description: 'Executed copy saved. Add their email and send it by hand.', variant: 'destructive' });
    }
  }, 'Executed and sent to the sub');

  const saveCoi = file => run('coi', async () => {
    if (!coi.expires) throw new Error('Enter the earliest expiration date on the certificate first.');
    const saved = await saveToContract(project, sub, file, `${sub.contractNumber} Certificate of Insurance ${coi.expires}`, 'Insurance Certificate');
    const s = await setCompliance(sub, { coi: { url: saved.url, name: saved.name, expires: coi.expires, checkedBy: '', at: new Date().toISOString() } });
    setSub(await logStep(s, `Certificate of insurance received (expires ${coi.expires})`, { url: saved.url }));
  }, 'Certificate saved – now check it');

  const checkCoi = () => run('coiCheck', async () => {
    const s = await setCompliance(sub, { coi: { ...sub.compliance.coi, checkedBy: s0name(), checkedAt: new Date().toISOString() } });
    setSub(await logStep(s, 'Certificate of insurance checked'));
  }, 'Marked as checked');

  const saveLicense = file => run('license', async () => {
    if (!licExp) throw new Error('Enter the license expiration date first.');
    const saved = await saveCompanyDoc(sub.company, file, `${st} Business License`, { expires: licExp });
    const key = st === 'Maryland' ? 'md' : 'de';
    setCompany(await saveCompany(company, { name: sub.company, [`${key}LicenseUrl`]: saved.url, [`${key}LicenseExpires`]: licExp }));
    setSub(await logStep(sub, `${st} business license on file (expires ${licExp})`, { url: saved.url }));
  }, 'License saved to Company Documents');

  const saveW9 = file => run('w9', async () => {
    const saved = await saveCompanyDoc(sub.company, file, 'W-9', { year: yr });
    setCompany(await saveCompany(company, { name: sub.company, w9Year: yr, w9Url: saved.url }));
    setSub(await logStep(sub, `${yr} W-9 on file`, { url: saved.url }));
  }, 'W-9 saved to Company Documents');

  const confirmStatus = (how, changes) => run('status', async () => {
    const on = new Date().toISOString().slice(0, 10);
    setCompany(await saveCompany(company, { name: sub.company, ...(changes || {}), statusConfirmedOn: on }));
    const s = await setCompliance(sub, { status: { how, by: s0name(), at: new Date().toISOString() } });
    setSub(await logStep(s, `Company information ${how === 'No changes' ? 'confirmed – no changes' : 'updated'}`));
    setEditCo(false);
  }, 'Company information confirmed');

  const savePayProc = file => run('payProc', async () => {
    const saved = await saveToContract(project, sub, file, `${sub.contractNumber} Invoicing & Payment Procedures - Signed`, 'Sub Agreement');
    const s = await setCompliance(sub, { payProc: { url: saved.url, at: new Date().toISOString() } });
    setSub(await logStep(s, 'Signed Invoicing & Payment Procedures received', { url: saved.url }));
  }, 'Saved');

  const saveOwner = () => run('owner', async () => {
    await updateProjectRecord(project.id, { ownerAddress: owner.trim() });
    setProject(p => ({ ...p, ownerAddress: owner.trim() }));
  }, 'Owner address saved to the job');

  const setByHand = status => run('hand', () => step(`Status set by hand to “${status}”`, { status }));

  if (!office) return null;
  const pw = company === undefined ? null : paperwork(project, sub, company);

  const waitingSign = sub.status === 'Signed by sub';
  return (
    <>
      <div className="space-y-3 border-t border-gray-100 pt-3">
        <div className="text-sm font-semibold text-gray-700">Contract</div>
        <ol className="grid grid-cols-4 gap-1 text-[11px] sm:text-xs font-semibold text-center" aria-label="Contract progress">
          {SUB_STATUS.slice(1).map((s, i) => {
            const at = SUB_STATUS.indexOf(sub.status);
            const done = at >= i + 1;
            return <li key={s} className={`rounded-md px-1 py-1.5 border ${done ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-gray-500 border-gray-200'}`}>{s}</li>;
          })}
        </ol>

        {(sub.status === 'PM approved' || sub.status === 'Contract sent') && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setComposing(true)} disabled={!!busy || !sub.folderId} className={`${btn} bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white`}>
              <Mail className="w-5 h-5" /> {sub.status === 'Contract sent' ? 'Send again' : 'Email contract to sub'}
            </button>
            {sub.status === 'Contract sent' && <UploadButton label="Upload sub-signed copy" busy={busy === 'subSigned'} onFile={subSigned} />}
          </div>
        )}
        {!sub.folderId && sub.status === 'PM approved' && <p className="text-sm text-gray-500">Create the contract files first – the email attaches them.</p>}

        {waitingSign && (
          signer ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
              <p className="text-sm text-amber-900 font-semibold inline-flex items-center gap-1.5"><PenLine className="w-4 h-4" /> Ready for Whayland’s signature</p>
              {sub.log?.slice().reverse().find(l => l.url && /from sub/.test(l.what)) && (
                <a className="text-sm text-[#1e3a8a] font-semibold inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={sub.log.slice().reverse().find(l => l.url && /from sub/.test(l.what)).url}>Open the sub-signed copy <ExternalLink className="w-3.5 h-3.5" /></a>
              )}
              <p className="text-xs text-amber-900">Sign it, then upload the signed copy. It’s saved as the executed contract and emailed to the sub automatically.</p>
              <UploadButton label="Upload executed copy" busy={busy === 'executed'} onFile={executed} />
            </div>
          ) : <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Signed by the sub – waiting for Whayland’s signature.</p>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500">Set the status by hand</summary>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SUB_STATUS.slice(1).map(s => (
              <button key={s} type="button" disabled={!!busy || sub.status === s} onClick={() => setByHand(s)}
                className={`h-9 px-3 rounded-md text-xs font-semibold border ${sub.status === s ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>{s}</button>
            ))}
          </div>
        </details>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold text-gray-700">Ready to pay</div>
            {pw && <span className={`text-xs font-bold ${pw.ready ? 'text-green-700' : 'text-gray-500'}`}>{pw.ready ? 'All paperwork in' : `${pw.done} of ${pw.items.length} in`}</span>}
          </div>
          <label className="block text-xs font-semibold text-gray-600 mt-2">Owner name &amp; address for the insurance certificate ({project.owner || 'no owner on the job'})
            <div className="flex gap-2"><input className={input} value={owner} onChange={e => setOwner(e.target.value)} placeholder="123 Main St, Ocean City, MD 21842" />
              <button type="button" disabled={busy === 'owner' || owner.trim() === (project.ownerAddress || '')} onClick={saveOwner} className="h-10 px-3 rounded-md border border-gray-300 text-sm font-semibold text-[#0f2a5e] shrink-0 disabled:opacity-40">Save</button></div>
          </label>
          {!pw ? <p className="text-sm text-gray-500 inline-flex items-center gap-2 mt-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking paperwork…</p> : (
            <ul className="mt-2 space-y-2">
              {pw.items.map(it => (
                <li key={it.key} className="rounded-lg border border-gray-200 p-2.5">
                  <div className="flex items-start gap-2">
                    {it.done ? <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0" /> : it.warn ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">{it.label}{it.company && <span className="ml-1 text-[11px] font-normal text-gray-500">(kept yearly in Company Documents)</span>}</div>
                      <div className="text-xs text-gray-600">{it.note}{it.url && <> · <a href={it.url} target="_blank" rel="noreferrer" className="text-[#1e3a8a] font-semibold">open</a></>}</div>
                      {it.key === 'coi' && (
                        <div className="mt-2 space-y-2">
                          {!it.done && sub.compliance?.coi?.url && !sub.compliance.coi.checkedBy && (
                            <div className="rounded-md bg-gray-50 p-2 text-xs text-gray-700 space-y-1">
                              <label className="flex items-start gap-2"><input type="checkbox" className="w-4 h-4 mt-0.5 accent-[#0f2a5e]" checked={coi.checks} onChange={e => setCoi(c => ({ ...c, checks: e.target.checked }))} />
                                <span>Shows this project; General Liability, Auto and Workers’ Comp; Whayland and the Owner as additional insured and certificate holders</span></label>
                              <button type="button" disabled={!coi.checks || busy === 'coiCheck'} onClick={checkCoi} className="h-8 px-3 rounded-md bg-green-700 text-white text-xs font-semibold disabled:opacity-40">Mark checked</button>
                            </div>
                          )}
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="text-xs text-gray-600">Earliest expiration<input type="date" className={`${input} h-9 w-40`} value={coi.expires} onChange={e => setCoi(c => ({ ...c, expires: e.target.value }))} /></label>
                            <UploadButton small label={sub.compliance?.coi?.url ? 'Replace' : 'Upload certificate'} busy={busy === 'coi'} onFile={saveCoi} />
                          </div>
                        </div>
                      )}
                      {it.key === 'license' && !it.done && (
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <label className="text-xs text-gray-600">Expires<input type="date" className={`${input} h-9 w-40`} value={licExp} onChange={e => setLicExp(e.target.value)} /></label>
                          <UploadButton small label="Upload license" busy={busy === 'license'} onFile={saveLicense} />
                        </div>
                      )}
                      {it.key === 'w9' && !it.done && <div className="mt-2"><UploadButton small label={`Upload ${yr} W-9`} busy={busy === 'w9'} onFile={saveW9} /></div>}
                      {it.key === 'payProc' && !it.done && <div className="mt-2"><UploadButton small label="Upload signed copy" busy={busy === 'payProc'} onFile={savePayProc} /></div>}
                      {it.key === 'status' && (
                        <>
                          {!editCo && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button type="button" disabled={busy === 'status'} onClick={() => confirmStatus('No changes')} className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#0f2a5e]">No changes</button>
                              <button type="button" onClick={() => setEditCo(true)} className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#0f2a5e]">Update information</button>
                            </div>
                          )}
                          {editCo && <CompanyForm company={company} sub={sub} busy={busy === 'status'} onCancel={() => setEditCo(false)} onSave={f => confirmStatus('Updated', f)} />}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-2">Schedule of Values is optional and isn’t counted.</p>
        </div>

        {sub.log?.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <button type="button" onClick={() => setShowLog(v => !v)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700"><History className="w-4 h-4" /> History ({sub.log.length})</button>
            {showLog && (
              <ol className="mt-2 space-y-1.5">
                {sub.log.slice().reverse().map((l, i) => (
                  <li key={i} className="text-xs text-gray-700"><span className="text-gray-500">{when(l.at)} · {l.by}</span><br />{l.what}{l.url && <> · <a href={l.url} target="_blank" rel="noreferrer" className="text-[#1e3a8a] font-semibold">file</a></>}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
      {composing && createPortal(<Composer project={project} sub={sub} company={company} onClose={() => setComposing(false)} onSent={sent} />, document.body)}
    </>
  );
}
