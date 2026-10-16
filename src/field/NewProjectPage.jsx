import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, Pencil } from 'lucide-react';
import { todayStr } from '@/lib/dailyReportStore';
import { nextJobNumber, jobNumberInUse, createProjectFolder, createProjectRecord, PROJECT_SUBFOLDERS } from '@/field/projectsData';

const input = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]';

function Field({ id, label, required, hint, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {label}{required ? <span className="text-red-600"> *</span> : <span className="font-normal text-gray-400"> (optional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const EMPTY = { name: '', owner: '', contractType: 'GC', contractAmount: '', address: '', city: '', state: 'DE', zip: '', projectManager: '', awardDate: todayStr(), notes: '' };

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [number, setNumber] = useState('');
  const [numberLoading, setNumberLoading] = useState(true);
  const [editingNumber, setEditingNumber] = useState(false);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState('');

  const year = form.awardDate.slice(0, 4);

  // The number comes from the year the job was awarded.
  useEffect(() => {
    if (editingNumber || !/^\d{4}$/.test(year)) return undefined;
    let cancelled = false;
    setNumberLoading(true);
    nextJobNumber(year)
      .then(n => { if (!cancelled) setNumber(n); })
      .catch(err => { if (!cancelled) setError(`Couldn’t read the ${year} Project Files folder: ${err.message}`); })
      .finally(() => { if (!cancelled) setNumberLoading(false); });
    return () => { cancelled = true; };
  }, [year, editingNumber]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const missing = ['name', 'owner', 'address', 'city', 'state', 'awardDate'].filter(k => !String(form[k]).trim());
  const numberOk = /^\d{4}-\d{2,3}$/.test(number);

  const create = async () => {
    setError('');
    setSteps([]);
    setBusy(true);
    const log = s => setSteps(x => [...x, s]);
    try {
      if (await jobNumberInUse(number)) {
        throw new Error(`${number} is already used by a project folder. Pick the next number.`);
      }
      log(`Job number ${number} is available`);
      const folder = await createProjectFolder(number, form.name.trim(), log);
      const amount = form.contractAmount ? Number(String(form.contractAmount).replace(/[^\d.]/g, '')) : null;
      const id = await createProjectRecord({
        name: form.name.trim(), jobNumber: number, status: 'Awarded', owner: form.owner.trim(), contractType: form.contractType,
        contractAmount: Number.isFinite(amount) ? amount : null, address: form.address.trim(), city: form.city.trim(),
        state: form.state.trim().toUpperCase(), zip: form.zip.trim(), projectManager: form.projectManager.trim(),
        awardDate: form.awardDate, notes: form.notes.trim(), folderUrl: folder.webUrl, folderId: folder.id,
        bondsRequired: 'Not yet known', paymentBond: 'Not started', performanceBond: 'Not started', ownerContract: 'Not started',
      });
      log('Added to the Projects list');
      setTimeout(() => navigate(`/projects/${id}`), 900);
    } catch (err) {
      setError(err.message || 'Could not create the project.');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">New project</h1>
      <p className="text-gray-500 mb-5">For a job we’ve been awarded. Creating it assigns the job number, builds the project folder on the PM Team site and starts the startup checklist.</p>

      <div className="space-y-4">
        <section className="bg-[#0f2a5e] text-white rounded-xl p-5">
          <div className="text-sm text-blue-200 font-semibold uppercase tracking-wide">Job number</div>
          {editingNumber ? (
            <div className="flex gap-2 mt-2">
              <input aria-label="Job number" className={`${input} text-gray-900 font-mono text-lg`} value={number} onChange={e => setNumber(e.target.value.trim())} placeholder={`${year}-01`} />
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-4xl font-black font-mono tracking-wide">{numberLoading ? '····' : number || '—'}</span>
              {!numberLoading && <button type="button" onClick={() => setEditingNumber(true)} className="text-sm text-blue-200 hover:text-white inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Change</button>}
            </div>
          )}
          <p className="text-sm text-blue-100 mt-2">
            {editingNumber ? 'Type the number to use (YYYY-NN). It’s checked against existing folders before anything is created.' : `Next number for ${year}, after the highest one already used in ${year} Project Files.`}
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <Field id="np-name" label="Project name" required hint="This becomes the folder name after the job number.">
            <input id="np-name" className={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sundance Club Clubhouse" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="np-owner" label="Owner / client" required>
              <input id="np-owner" className={input} value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="e.g. Schell Brothers" />
            </Field>
            <Field id="np-award" label="Award date" required hint="The job number uses this year.">
              <input id="np-award" type="date" className={input} value={form.awardDate} onChange={e => e.target.value && set('awardDate', e.target.value)} />
            </Field>
            <Field id="np-type" label="Contract type" required>
              <div className="grid grid-cols-2 gap-2">
                {['GC', 'CM'].map(t => (
                  <button key={t} type="button" onClick={() => set('contractType', t)}
                    className={`h-11 rounded-md font-semibold border ${form.contractType === t ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>
                    {t === 'GC' ? 'GC' : 'CM'}
                  </button>
                ))}
              </div>
            </Field>
            <Field id="np-amount" label="Contract amount">
              <input id="np-amount" inputMode="decimal" className={input} value={form.contractAmount} onChange={e => set('contractAmount', e.target.value)} placeholder="$" />
            </Field>
          </div>
          <Field id="np-address" label="Job site address" required hint="Used for weather in daily reports.">
            <input id="np-address" className={input} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </Field>
          <div className="grid grid-cols-6 gap-3">
            <Field id="np-city" label="City" required className="col-span-6 sm:col-span-3">
              <input id="np-city" className={input} value={form.city} onChange={e => set('city', e.target.value)} />
            </Field>
            <Field id="np-state" label="State" required className="col-span-2 sm:col-span-1">
              <input id="np-state" maxLength={2} className={`${input} uppercase`} value={form.state} onChange={e => set('state', e.target.value)} />
            </Field>
            <Field id="np-zip" label="ZIP" className="col-span-4 sm:col-span-2">
              <input id="np-zip" inputMode="numeric" maxLength={5} className={input} value={form.zip} onChange={e => set('zip', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
          <Field id="np-pm" label="Project manager">
            <input id="np-pm" className={input} value={form.projectManager} onChange={e => set('projectManager', e.target.value)} />
          </Field>
          <Field id="np-notes" label="Notes">
            <textarea id="np-notes" rows={3} className={`${input} h-auto py-2`} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-sm text-gray-600">
          <div className="font-semibold text-[#0f2a5e] mb-1">This creates</div>
          <p>PM Team › {year} Project Files › <strong>{number || `${year}-__`} {form.name || 'Project name'}</strong>, with the {PROJECT_SUBFOLDERS.length} standard subfolders (Owner Contract, Drawings, Submittals, RFI, Permits, Sub Contract Agreements…).</p>
        </section>

        {steps.length > 0 && (
          <ul className="space-y-1 text-sm">
            {steps.map(s => <li key={s} className="flex items-start gap-2 text-green-800"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{s}</li>)}
          </ul>
        )}
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        {missing.length > 0 && !busy && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Still needed: {missing.map(k => ({ name: 'project name', owner: 'owner', address: 'address', city: 'city', state: 'state', awardDate: 'award date' }[k])).join(', ')}.
          </p>
        )}
        <button type="button" onClick={create} disabled={busy || numberLoading || !numberOk || missing.length > 0}
          className="w-full h-12 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold text-base disabled:opacity-50 inline-flex items-center justify-center gap-2">
          {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating {number}…</> : `Create project ${numberOk ? number : ''}`}
        </button>
      </div>
    </div>
  );
}
