import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, ArrowLeft, ArrowUp, ArrowDown, Pencil, Trash2, Plus, Copy, CheckCircle2, FileText, FolderOpen, ExternalLink, RotateCcw,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getProjectRecord } from '@/field/projectsData';
import {
  loadLibrary, buildScope, newLine, lineBlanks, missingBlanks, exhibitLines, exhibitIntro, exhibitPlainText,
  listSubcontracts, getSubcontract, createSubcontract, updateSubcontract, deleteSubcontract, getPrices, setPrice,
  nextContractNumber, createContractFiles, SECTION_TITLES, SUB_STATUS,
} from '@/field/scopesData';
import { currentAccount } from '@/field/auth';
import { can } from '@/field/roles';
import { SubStatus } from '@/field/SubcontractsPage';
import CompanyPicker from '@/field/CompanyPicker';
import { detailsFrom } from '@/field/subDirectory';

const input = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:bg-gray-50 disabled:text-gray-600';
const letter = i => String.fromCharCode(97 + (i % 26));

function Field({ id, label, children, className = '' }) {
  return (
    <div className={`space-y-1 min-w-0 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}

// Splits typed text into the line and its a./b. sub-points (lines starting with "-").
function parseTyped(raw) {
  const rows = raw.split('\n').map(r => r.trimEnd()).filter(r => r.trim());
  const text = (rows[0] || '').replace(/^\s*-\s*/, '');
  const sub = rows.slice(1).map(r => r.replace(/^\s*[-•a-z][.)]?\s+/i, '').trim()).filter(Boolean);
  return { text, sub };
}
const toTyped = line => [line.text, ...(line.sub || []).map(s => `- ${s}`)].join('\n');

function LineRow({ line, number, editable, first, last, onChange, onMove, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const blanks = lineBlanks(line);

  return (
    <li className={`rounded-lg border p-3 ${line.on ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={line.on} disabled={!editable} onChange={e => onChange({ ...line, on: e.target.checked })}
          aria-label={line.on ? 'Included' : 'Not included'} className="mt-0.5 w-6 h-6 shrink-0 accent-[#0f2a5e]" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={Math.max(3, draft.split('\n').length + 1)}
                className="w-full rounded-md border border-gray-300 p-2 text-base md:text-sm" aria-label="Line text" />
              <p className="text-xs text-gray-500">Put a blank in [square brackets]. Start a new line with “-” for an a./b. sub-point.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { const p = parseTyped(draft); if (p.text) onChange({ ...line, ...p, fills: {} }); setEditing(false); }}
                  className="h-9 px-3 rounded-md bg-[#0f2a5e] text-white text-sm font-semibold">Done</button>
                <button type="button" onClick={() => setEditing(false)} className="h-9 px-3 rounded-md border border-gray-300 text-sm font-semibold text-gray-700">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-sm leading-snug ${line.on ? 'text-gray-900' : 'text-gray-500'}`}>
                {line.on && number ? <span className="font-bold text-[#0f2a5e] mr-1">{number}.</span> : null}{line.text}
              </p>
              {line.sub?.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {line.sub.map((s, i) => <li key={i} className={`text-sm pl-5 ${line.on ? 'text-gray-800' : 'text-gray-500'}`}><span className="font-semibold mr-1">{letter(i)}.</span>{s}</li>)}
                </ul>
              )}
              {line.on && blanks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {blanks.map((label, i) => (
                    <input key={i} aria-label={label} placeholder={label} disabled={!editable} value={line.fills?.[`${i}`] || ''}
                      onChange={e => onChange({ ...line, fills: { ...(line.fills || {}), [`${i}`]: e.target.value } })}
                      className={`${input} h-10 ${!(line.fills?.[`${i}`] || '').trim() ? 'border-red-400 bg-red-50/40' : ''}`} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {editable && !editing && (
          <div className="flex flex-col sm:flex-row gap-0.5 shrink-0 -mr-1">
            <button type="button" aria-label="Move up" disabled={first} onClick={() => onMove(-1)} className="p-1.5 text-gray-400 hover:text-[#0f2a5e] disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
            <button type="button" aria-label="Move down" disabled={last} onClick={() => onMove(1)} className="p-1.5 text-gray-400 hover:text-[#0f2a5e] disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
            <button type="button" aria-label="Edit wording" onClick={() => { setDraft(toTyped(line)); setEditing(true); }} className="p-1.5 text-gray-400 hover:text-[#0f2a5e]"><Pencil className="w-4 h-4" /></button>
            {line.custom && <button type="button" aria-label="Delete line" onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
          </div>
        )}
      </div>
    </li>
  );
}

function AddLine({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a8a] py-2"><Plus className="w-4 h-4" /> Add a line</button>;
  }
  return (
    <div className="rounded-lg border border-dashed border-[#1e3a8a] bg-blue-50/40 p-3 space-y-2">
      <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={3} aria-label="New line"
        placeholder={'Includes installation of ...\n- sub-point (optional)'} className="w-full rounded-md border border-gray-300 p-2 text-base md:text-sm" />
      <p className="text-xs text-gray-500">Put a blank in [square brackets]. Start a new line with “-” for an a./b. sub-point.</p>
      <div className="flex gap-2">
        <button type="button" disabled={!text.trim()} onClick={() => { const p = parseTyped(text); onAdd({ ...newLine(p.text), sub: p.sub }); setText(''); setOpen(false); }}
          className="h-9 px-3 rounded-md bg-[#0f2a5e] text-white text-sm font-semibold disabled:opacity-50">Add line</button>
        <button type="button" onClick={() => { setText(''); setOpen(false); }} className="h-9 px-3 rounded-md border border-gray-300 text-sm font-semibold text-gray-700">Cancel</button>
      </div>
    </div>
  );
}

function Preview({ sub, project }) {
  const lines = exhibitLines(sub.scope, { project: project.name, company: sub.company });
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-[15px] leading-relaxed text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <div className="text-center font-bold text-lg">EXHIBIT A</div>
      <div className="text-center font-bold mb-3">Scope of Work</div>
      <p className="mb-3">{exhibitIntro(sub.workName)}</p>
      <ol className="space-y-1.5">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-7 shrink-0 text-right">{i + 1}.</span>
            <div className="min-w-0">
              <div>{l.text}</div>
              {l.sub.map((x, j) => <div key={j} className="flex gap-2 pl-2"><span className="w-5 shrink-0">{letter(j)}.</span><span>{x}</span></div>)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---- New subcontract: pick the trade and company, then the scope opens ----

function NewSub({ project, library, onCreated }) {
  const [form, setForm] = useState({ company: '', tradeId: '', amount: '' });
  const [details, setDetails] = useState(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trade = library.trades.find(t => t.id === form.tradeId);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const existing = await listSubcontracts(project.id).catch(() => []);
      const contractNumber = await nextContractNumber(project, existing);
      const data = {
        ...(details || {}),
        company: form.company.trim(), projectId: String(project.id), jobNumber: project.jobNumber, contractNumber,
        costCode: trade?.costCode || '', tradeName: trade?.name || '', workName: trade?.workName || '',
        status: 'Draft', scope: buildScope(library, trade),
      };
      const id = await createSubcontract(data);
      if (form.amount !== '') await setPrice(id, contractNumber, form.amount);
      onCreated(id);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <h1 className="text-2xl font-bold text-[#0f2a5e]">New subcontract</h1>
      <Field id="ns-trade" label="Trade">
        <select id="ns-trade" className={input} value={form.tradeId} onChange={e => setForm(f => ({ ...f, tradeId: e.target.value }))}>
          <option value="">Pick a trade…</option>
          {library.trades.map(t => <option key={t.id} value={t.id}>{t.costCode} · {t.name}</option>)}
          <option value="__none">Other (start with only the standard lines)</option>
        </select>
      </Field>
      <Field id="ns-company" label="Subcontractor (company)">
        <div className="flex gap-2">
          <input id="ns-company" className={input} value={form.company} onChange={e => { setForm(f => ({ ...f, company: e.target.value })); setDetails(null); }} placeholder="e.g. Harkins Concrete Construction, Inc" />
          <button type="button" onClick={() => setPicking(true)} className="h-11 px-3 rounded-md border border-[#0f2a5e] text-[#0f2a5e] text-sm font-semibold shrink-0 whitespace-nowrap">From sub list</button>
        </div>
      </Field>
      {picking && (
        <CompanyPicker costCode={trade?.costCode} initialQuery={form.company} onClose={() => setPicking(false)}
          onPick={(c, p) => { const d = detailsFrom(c, p); setDetails(d); setForm(f => ({ ...f, company: d.company })); setPicking(false); }} />
      )}
      {details && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2">
          From the sub list: {[details.companyContact, details.companyEmail, details.companyPhone, details.companyCity].filter(Boolean).join(' · ') || 'no contact details listed'}
        </p>
      )}
      <Field id="ns-amount" label="Contract amount (office only)">
        <input id="ns-amount" inputMode="decimal" className={input} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0.00" />
      </Field>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      <button type="button" onClick={start} disabled={busy || !form.company.trim() || !form.tradeId}
        className="w-full h-12 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
        {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Setting up…</> : 'Start the scope'}
      </button>
      <p className="text-sm text-gray-500">The contract number is assigned automatically ({project.jobNumber}-NN, next after the subs already on this job).</p>
    </section>
  );
}

// ---- Editor ----

export default function SubcontractEditor() {
  const { id, subId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [library, setLibrary] = useState(null);
  const [sub, setSub] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [busy, setBusy] = useState('');
  const [steps, setSteps] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picking, setPicking] = useState(false);
  const dirty = useRef(false);
  const isNew = subId === 'new';

  useEffect(() => {
    Promise.all([getProjectRecord(id), loadLibrary()])
      .then(([p, lib]) => { setProject(p); setLibrary(lib); })
      .catch(err => setError(err.code === 'not_set_up' ? 'The subcontract lists aren’t set up yet. Ask Wendy to run Site setup.' : err.message));
  }, [id]);

  useEffect(() => {
    if (isNew) return;
    getSubcontract(subId).then(s => {
      setSub(s);
      getPrices([s.id]).then(p => setAmount(p[s.id] ?? '')).catch(() => {});
    }).catch(err => setError(err.message));
  }, [subId, isNew]);

  const locked = sub && sub.status !== 'Draft';
  const editable = can('scopesEdit') && !locked;

  // Saves a moment after the PM stops typing.
  useEffect(() => {
    if (!sub || !dirty.current) return undefined;
    setSaveState('saving');
    const t = setTimeout(async () => {
      try {
        await updateSubcontract(sub.id, {
          company: sub.company, costCode: sub.costCode, tradeName: sub.tradeName, workName: sub.workName, contractNumber: sub.contractNumber,
          companyContact: sub.companyContact, companyAddress: sub.companyAddress, companyCity: sub.companyCity, companyPhone: sub.companyPhone, companyEmail: sub.companyEmail, scope: sub.scope,
        });
        dirty.current = false;
        setSaveState('saved');
      } catch (err) { setSaveState('error'); toast({ title: 'Couldn’t save', description: err.message, variant: 'destructive' }); }
    }, 1200);
    return () => clearTimeout(t);
  }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = patch => { dirty.current = true; setSub(s => ({ ...s, ...patch })); };
  const changeSection = (key, fn) => change({ scope: { ...sub.scope, sections: sub.scope.sections.map(s => (s.key === key ? { ...s, lines: fn(s.lines) } : s)) } });

  const numbers = useMemo(() => {
    const out = {};
    let n = 0;
    for (const s of sub?.scope?.sections || []) for (const l of s.lines) if (l.on && l.text.trim()) out[l.id] = ++n;
    return out;
  }, [sub]);
  const missing = useMemo(() => (sub ? missingBlanks(sub.scope) : []), [sub]);

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!project || !library || (!isNew && !sub)) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;

  const back = <Link to={`/projects/${id}/subs`} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Subcontracts · {project.jobNumber}</Link>;

  if (isNew) {
    if (!can('scopesEdit')) return <div className="max-w-2xl mx-auto">{back}<p className="text-gray-600">Only PMs can start a subcontract scope.</p></div>;
    return <div className="max-w-2xl mx-auto pb-10">{back}<NewSub project={project} library={library} onCreated={newId => navigate(`/projects/${id}/subs/${newId}`, { replace: true })} /></div>;
  }

  const saveAmount = async () => {
    try { await setPrice(sub.id, sub.contractNumber, amount); toast({ title: 'Amount saved' }); } catch (err) { toast({ title: 'Couldn’t save the amount', description: err.message, variant: 'destructive' }); }
  };

  const setStatus = async (status, extra = {}) => {
    setBusy(status);
    try {
      await updateSubcontract(sub.id, { status, ...extra });
      setSub(s => ({ ...s, status, ...extra }));
    } catch (err) { toast({ title: 'Couldn’t update', description: err.message, variant: 'destructive' }); }
    setBusy('');
  };

  const approve = () => {
    const me = currentAccount();
    setStatus('PM approved', { approvedBy: me?.name || me?.email || '', approvedAt: new Date().toISOString() });
  };

  const copy = async () => {
    const text = exhibitPlainText(sub, project);
    try { await navigator.clipboard.writeText(text); toast({ title: 'Scope copied', description: 'Paste it into Word or an email.' }); } catch {
      toast({ title: 'Couldn’t copy automatically', description: 'Select the preview text and copy it instead.', variant: 'destructive' });
    }
  };

  const makeFiles = async () => {
    setBusy('files'); setSteps([]);
    try {
      const res = await createContractFiles(project, sub, s => setSteps(x => [...x, s]));
      await updateSubcontract(sub.id, { folderUrl: res.folderUrl, folderId: res.folderId });
      setSub(s => ({ ...s, folderUrl: res.folderUrl, folderId: res.folderId }));
      toast({ title: 'Contract files created', description: [res.exhibit, res.contract].filter(Boolean).join(' and ') });
      if (!res.contract) toast({ title: 'Master contract not found', description: 'Exhibit A was created. Copy the master subcontract into the folder by hand.', variant: 'destructive' });
    } catch (err) { toast({ title: 'Couldn’t create the files', description: err.message, variant: 'destructive' }); }
    setBusy('');
  };

  const remove = async () => {
    setBusy('delete');
    try { await deleteSubcontract(sub.id); navigate(`/projects/${id}/subs`, { replace: true }); } catch (err) { toast({ title: 'Couldn’t delete', description: err.message, variant: 'destructive' }); setBusy(''); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {back}
      <section className="bg-[#0f2a5e] text-white rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-mono font-black text-2xl tracking-wide">{sub.contractNumber}</div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{sub.company || 'New subcontract'}</h1>
            <p className="text-blue-100 text-sm mt-1">Cost code {sub.costCode || '—'} · {sub.tradeName || '—'} · {project.jobNumber} {project.name}</p>
          </div>
          <div className="bg-white rounded-md px-1 py-0.5"><SubStatus status={sub.status} /></div>
        </div>
        {sub.approvedBy && sub.status !== 'Draft' && <p className="text-sm text-blue-100 mt-2">Approved by {sub.approvedBy}{sub.approvedAt ? ` on ${new Date(sub.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
        <div className="space-y-4 min-w-0">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-[#0f2a5e] text-lg">Subcontractor</h2>
              {editable && <button type="button" onClick={() => setPicking(p => !p)} className="h-9 px-3 rounded-md border border-[#0f2a5e] text-[#0f2a5e] text-sm font-semibold">Fill from sub list</button>}
            </div>
            {picking && (
              <CompanyPicker costCode={sub.costCode} initialQuery={sub.company} onClose={() => setPicking(false)}
                onPick={(c, p) => { change(detailsFrom(c, p)); setPicking(false); }} />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="sc-company" label="Company" className="sm:col-span-2"><input id="sc-company" className={input} disabled={!editable} value={sub.company} onChange={e => change({ company: e.target.value })} /></Field>
              <Field id="sc-contact" label="Contact person" className="sm:col-span-2"><input id="sc-contact" className={input} disabled={!editable} value={sub.companyContact || ''} onChange={e => change({ companyContact: e.target.value })} /></Field>
              <Field id="sc-address" label="Address"><input id="sc-address" className={input} disabled={!editable} value={sub.companyAddress} onChange={e => change({ companyAddress: e.target.value })} /></Field>
              <Field id="sc-city" label="City, ST ZIP"><input id="sc-city" className={input} disabled={!editable} value={sub.companyCity} onChange={e => change({ companyCity: e.target.value })} /></Field>
              <Field id="sc-phone" label="Phone"><input id="sc-phone" type="tel" className={input} disabled={!editable} value={sub.companyPhone} onChange={e => change({ companyPhone: e.target.value })} /></Field>
              <Field id="sc-email" label="Email"><input id="sc-email" type="email" autoCapitalize="none" className={input} disabled={!editable} value={sub.companyEmail} onChange={e => change({ companyEmail: e.target.value })} /></Field>
              <Field id="sc-cost" label="Cost code(s)"><input id="sc-cost" className={input} disabled={!editable} value={sub.costCode} onChange={e => change({ costCode: e.target.value })} /></Field>
              <Field id="sc-work" label="Work name in Exhibit A"><input id="sc-work" className={input} disabled={!editable} value={sub.workName} onChange={e => change({ workName: e.target.value })} placeholder="e.g. EXTERIOR FINISH" /></Field>
              <Field id="sc-number" label="Contract number"><input id="sc-number" className={input} disabled={!editable} value={sub.contractNumber} onChange={e => change({ contractNumber: e.target.value })} /></Field>
              {can('subsView') && (
                <Field id="sc-amount" label="Contract amount (office only)">
                  <div className="flex gap-2">
                    <input id="sc-amount" inputMode="decimal" className={input} disabled={!can('subsContract')} value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                    {can('subsContract') && <button type="button" onClick={saveAmount} className="h-11 px-3 rounded-md border border-gray-300 text-sm font-semibold text-[#0f2a5e] shrink-0">Save</button>}
                  </div>
                </Field>
              )}
            </div>
          </section>

          {locked && can('scopesEdit') && (
            <div className="flex items-start justify-between gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">This scope is approved, so it’s locked. Reopen it to make changes; it goes back to Draft and needs approving again.</p>
              <button type="button" onClick={() => setStatus('Draft', { approvedBy: '', approvedAt: '' })} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-blue-300 bg-white text-sm font-semibold text-[#0f2a5e] shrink-0"><RotateCcw className="w-4 h-4" /> Reopen</button>
            </div>
          )}

          {sub.scope.sections.map(section => (
            <section key={section.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <h2 className="font-bold text-[#0f2a5e] text-lg">{SECTION_TITLES[section.key]}</h2>
                <span className="text-xs text-gray-500">{section.lines.filter(l => l.on).length} of {section.lines.length} ticked</span>
              </div>
              <ul className="space-y-2">
                {section.lines.map((line, i) => (
                  <LineRow key={line.id} line={line} number={numbers[line.id]} editable={editable} first={i === 0} last={i === section.lines.length - 1}
                    onChange={l => changeSection(section.key, lines => lines.map(x => (x.id === l.id ? l : x)))}
                    onMove={d => changeSection(section.key, lines => { const a = [...lines]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); return a; })}
                    onDelete={() => changeSection(section.key, lines => lines.filter(x => x.id !== line.id))} />
                ))}
              </ul>
              {editable && <div className="mt-2"><AddLine onAdd={l => changeSection(section.key, lines => [...lines, l])} /></div>}
            </section>
          ))}
        </div>

        <div className="min-w-0">
          <div className="lg:sticky lg:top-20 space-y-3">
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500">{editable ? (saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved – check your signal' : 'All changes saved') : 'View only'}</span>
                <span className="text-gray-500">{Object.keys(numbers).length} lines</span>
              </div>
              {missing.length > 0 && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-300 rounded-lg px-3 py-2">Fill in {missing.length} blank{missing.length === 1 ? '' : 's'}: {[...new Set(missing)].join(', ')}.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {sub.status === 'Draft' && can('scopesEdit') && (
                  <button type="button" onClick={approve} disabled={!!busy || missing.length > 0 || !sub.company.trim()}
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-green-700 hover:bg-green-800 text-white font-semibold disabled:opacity-50">
                    {busy === 'PM approved' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Approve scope
                  </button>
                )}
                <button type="button" onClick={copy} className="inline-flex items-center gap-2 h-11 px-4 rounded-md border border-gray-300 bg-white text-[#0f2a5e] font-semibold"><Copy className="w-5 h-5" /> Copy scope</button>
                {sub.status !== 'Draft' && can('subsContract') && (
                  <button type="button" onClick={makeFiles} disabled={!!busy}
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold disabled:opacity-50">
                    {busy === 'files' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} {sub.folderUrl ? 'Re-create contract files' : 'Create contract files'}
                  </button>
                )}
              </div>
              {sub.status === 'Draft' && !can('scopesEdit') && <p className="text-sm text-gray-500">Waiting for the PM to approve this scope. Contract files can be created once it’s approved.</p>}
              {steps.length > 0 && busy === 'files' && <ul className="text-sm text-gray-600 space-y-0.5">{steps.map(s => <li key={s}>• {s}</li>)}</ul>}
              {sub.folderUrl && (
                <a href={sub.folderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold text-sm"><FolderOpen className="w-4 h-4" /> Open contract folder <ExternalLink className="w-3.5 h-3.5" /></a>
              )}
              {sub.status !== 'Draft' && can('subsContract') && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1.5">Contract status</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SUB_STATUS.slice(1).map(st => (
                      <button key={st} type="button" disabled={!!busy} onClick={() => setStatus(st)}
                        className={`h-10 rounded-md text-sm font-semibold border ${sub.status === st ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>{st}</button>
                    ))}
                  </div>
                </div>
              )}
            </section>
            <h2 className="font-bold text-[#0f2a5e]">Exhibit A preview</h2>
            <Preview sub={sub} project={project} />
            {can('scopesEdit') && sub.status === 'Draft' && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={remove} className="h-9 px-3 rounded-md bg-red-600 text-white text-sm font-semibold">Delete this subcontract</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 px-3 rounded-md border border-gray-300 text-sm font-semibold text-gray-700">Keep it</button>
                </div>
              ) : <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-gray-500 underline">Delete this subcontract</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
