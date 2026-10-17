import React, { useEffect, useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { listAccess, addAccess, updateAccess, removeAccess } from '@/field/accessData';
import { ROLES, ROLE_HELP, OWNERS } from '@/field/roles';
import { CONFIG, currentAccount } from '@/field/auth';

const input = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]';

function RolePicker({ value, onChange, disabled, idPrefix }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="radiogroup">
      {ROLES.map(r => (
        <button key={r} id={`${idPrefix}-${r}`} type="button" role="radio" aria-checked={value === r} disabled={disabled}
          onClick={() => onChange(r)}
          className={`h-10 px-2 rounded-md text-sm font-semibold border whitespace-nowrap disabled:opacity-60 ${value === r ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300 hover:border-[#0f2a5e]'}`}>
          {r}
        </button>
      ))}
    </div>
  );
}

export default function AccessPage() {
  const me = (currentAccount()?.email || '').toLowerCase();
  const [people, setPeople] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'Office' });
  const [confirmRemove, setConfirmRemove] = useState(null);

  const load = () => listAccess().then(setPeople).catch(err => setError(err.code === 'not_set_up'
    ? 'The App Access list isn’t set up yet. Run Site setup (link at the bottom of the Daily Report screen), then come back.'
    : err.message || 'Could not load the access list.'));
  useEffect(() => { load(); }, []);

  const locked = p => OWNERS.includes(p.email) || p.email === me;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const already = people?.some(p => p.email === form.email.trim().toLowerCase());

  const add = async () => {
    setBusy('add'); setError('');
    try {
      const entry = await addAccess(form);
      setPeople(list => [...list, entry]);
      setForm({ name: '', email: '', role: 'Office' });
    } catch (err) { setError(err.message || 'Could not add that person.'); }
    setBusy('');
  };
  const change = async (p, role) => {
    setBusy(p.id); setError('');
    try {
      await updateAccess(p.id, { role });
      setPeople(list => list.map(x => (x.id === p.id ? { ...x, role } : x)));
    } catch (err) { setError(err.message || 'Could not change the role.'); }
    setBusy('');
  };
  const remove = async p => {
    setBusy(p.id); setError(''); setConfirmRemove(null);
    try {
      await removeAccess(p.id);
      setPeople(list => list.filter(x => x.id !== p.id));
    } catch (err) { setError(err.message || 'Could not remove that person.'); }
    setBusy('');
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">Access</h1>
      <p className="text-gray-500 mb-5">Choose who can see reports and projects. Anyone not listed here is <strong>Field</strong>: they only see the projects they’re assigned to.</p>

      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <h2 className="font-bold text-[#0f2a5e] mb-2">What each role can do</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-1.5 text-sm">
          {ROLES.map(r => (
            <React.Fragment key={r}>
              <dt className="font-semibold text-[#0f2a5e]">{r}</dt>
              <dd className="text-gray-600 mb-1 sm:mb-0">{ROLE_HELP[r]}</dd>
            </React.Fragment>
          ))}
        </dl>
      </section>

      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {!people && !error ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : people && (
        <>
          <ul className="space-y-3 mb-6">
            {people.map(p => (
              <li key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-bold text-[#0f2a5e] text-lg leading-tight">{p.name || p.email}</div>
                    <div className="text-sm text-gray-500 break-all">{p.email}</div>
                  </div>
                  {busy === p.id ? <Loader2 className="w-5 h-5 animate-spin text-gray-400 shrink-0" /> : !locked(p) && (
                    confirmRemove === p.id ? (
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => remove(p)} className="h-9 px-3 rounded-md bg-red-600 text-white text-sm font-semibold">Remove</button>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="h-9 px-3 rounded-md border border-gray-300 text-sm font-semibold text-gray-700">Keep</button>
                      </div>
                    ) : (
                      <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setConfirmRemove(p.id)} className="p-2 text-gray-400 hover:text-red-600 shrink-0"><Trash2 className="w-5 h-5" /></button>
                    )
                  )}
                </div>
                <RolePicker idPrefix={`role-${p.id}`} value={p.role} onChange={r => change(p, r)} disabled={busy === p.id || locked(p)} />
                {locked(p) && <p className="text-xs text-gray-400 mt-2">You can’t change your own access, so you can’t lock yourself out.</p>}
              </li>
            ))}
          </ul>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-[#0f2a5e] flex items-center gap-2"><UserPlus className="w-5 h-5" /> Add a person</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="acc-name" className="block text-sm font-semibold text-gray-700">Name</label>
                <input id="acc-name" className={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First and last name" />
              </div>
              <div className="space-y-1">
                <label htmlFor="acc-email" className="block text-sm font-semibold text-gray-700">Work email</label>
                <input id="acc-email" type="email" autoCapitalize="none" className={input} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@whayland.com" />
              </div>
            </div>
            <RolePicker idPrefix="acc-role" value={form.role} onChange={r => setForm(f => ({ ...f, role: r }))} />
            {already && <p className="text-sm text-amber-700">That person is already on the list. Change their role above.</p>}
            <button type="button" onClick={add} disabled={busy === 'add' || !form.name.trim() || !emailOk || already}
              className="w-full h-12 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {busy === 'add' ? <><Loader2 className="w-5 h-5 animate-spin" /> Adding…</> : 'Add person'}
            </button>
          </section>

          <p className="text-sm text-gray-500 mt-5">
            Everyone also needs to be a member of the <a className="text-[#1e3a8a] font-semibold underline" href={`https://${CONFIG.siteHost}${CONFIG.sitePath}`} target="_blank" rel="noreferrer">Field Reports site</a> in SharePoint, or the app can’t load anything for them.
            Changes take effect the next time that person opens the app.
          </p>
        </>
      )}
    </div>
  );
}
