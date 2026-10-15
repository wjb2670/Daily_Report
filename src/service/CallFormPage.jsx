import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, Field, NavyButton, PlainButton, inputClass } from './ui';
import { createCall, listCalls, updateCall } from './data';
import { locate } from './routing';
import { currentAccount } from '@/field/auth';

const EMPTY = { farm: '', contact: '', address: '', city: '', state: 'NJ', zip: '', phone: '', email: '', brand: '', equipment: '', reason: '' };
const REQUIRED = ['farm', 'contact', 'address', 'city', 'state', 'zip', 'phone', 'reason'];

const formatPhone = v => {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

// Take a new call, or edit one (/call/:id).
export default function CallFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [calls, setCalls] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);
  const [loadingCall, setLoadingCall] = useState(!!id);

  useEffect(() => {
    listCalls().then(all => {
      setCalls(all);
      if (id) {
        const c = all.find(x => x.id === id);
        if (c) setForm(Object.fromEntries(Object.keys(EMPTY).map(k => [k, c[k] || ''])));
        setLoadingCall(false);
      }
    }).catch(err => { setError(err.message); setLoadingCall(false); });
  }, [id]);

  // Farms already on file, newest details first, for autofill.
  const farms = useMemo(() => {
    const map = new Map();
    [...calls].reverse().forEach(c => { if (c.farm && !map.has(c.farm.toLowerCase())) map.set(c.farm.toLowerCase(), c); });
    return map;
  }, [calls]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onFarm = value => {
    const prior = !id && farms.get(value.trim().toLowerCase());
    if (prior) {
      setForm(f => ({
        ...f, farm: value,
        contact: f.contact || prior.contact, address: f.address || prior.address, city: f.city || prior.city,
        state: prior.state || f.state, zip: f.zip || prior.zip, phone: f.phone || prior.phone, email: f.email || prior.email,
      }));
    } else set('farm', value);
  };

  const missing = REQUIRED.filter(k => !String(form[k]).trim());
  const emailBad = form.email && !/^\S+@\S+\.\S+$/.test(form.email);

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()]));
      clean.state = clean.state.toUpperCase();
      const original = id && calls.find(x => x.id === id);
      const moved = !original || ['address', 'city', 'state', 'zip'].some(k => clean[k] !== (original[k] || ''));
      const where = moved ? await locate(clean) : null;
      const loc = where ? { lat: where.lat, lon: where.lon, locationNote: where.note } : {};
      if (id) {
        await updateCall(id, { ...clean, ...loc });
        navigate('/calls');
        return;
      }
      const call = await createCall({ ...clean, ...loc, received: new Date().toISOString(), takenBy: currentAccount()?.name || '' });
      const openAhead = calls.filter(c => c.status === 'Open').length;
      setSaved({ ...call, place: openAhead + 1 });
      setCalls(cs => [...cs, call]);
      setForm(EMPTY);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message || 'Could not save the call.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold text-[#0f2a5e]">Call saved</h1>
            <p className="text-gray-600"><strong>{saved.farm}</strong> is number <strong>{saved.place}</strong> in line for service.</p>
            {saved.locationNote && (
              <p className="inline-flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 text-left">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{saved.locationNote}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <NavyButton onClick={() => setSaved(null)}>Take another call</NavyButton>
              <PlainButton onClick={() => navigate('/calls')}>See open calls</PlainButton>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">{id ? 'Edit call' : 'Take a call'}</h1>
      <p className="text-gray-500 mb-5">{id ? 'Change anything that was taken down wrong.' : 'Ask the caller each question below. The time of the call is saved automatically.'}</p>

      {loadingCall ? (
        <div className="flex items-center gap-2 text-gray-500 py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-4">
          <Card title="Who is calling">
            <div className="space-y-4">
              <Field id="farm" label="Name of farm" required hint={!id && farms.size ? 'Start typing — farms we’ve served before fill in their details.' : null}>
                <input id="farm" className={inputClass} list="farm-list" value={form.farm} onChange={e => onFarm(e.target.value)} placeholder="e.g. Hickory Hill Farm" autoComplete="off" />
                <datalist id="farm-list">{[...farms.values()].map(f => <option key={f.id} value={f.farm} />)}</datalist>
              </Field>
              <Field id="contact" label="Contact person" required>
                <input id="contact" className={inputClass} value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="e.g. John Smith" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="phone" label="Contact phone" required>
                  <input id="phone" type="tel" inputMode="tel" className={inputClass} value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(856) 555-0100" />
                </Field>
                <Field id="email" label="Contact email">
                  <input id="email" type="email" inputMode="email" className={`${inputClass} ${emailBad ? 'border-red-400' : ''}`} value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@example.com" />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Where is the service">
            <div className="space-y-4">
              <Field id="address" label="Location of service" required hint="Street address of the field or pivot, as exact as the caller can give.">
                <input id="address" className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. 1234 Old Deerfield Pike" />
              </Field>
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-6 sm:col-span-3">
                  <Field id="city" label="City" required>
                    <input id="city" className={inputClass} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Bridgeton" />
                  </Field>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Field id="state" label="State" required>
                    <input id="state" className={`${inputClass} uppercase`} maxLength={2} value={form.state} onChange={e => set('state', e.target.value)} />
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Field id="zip" label="ZIP" required>
                    <input id="zip" inputMode="numeric" maxLength={5} className={inputClass} value={form.zip} onChange={e => set('zip', e.target.value.replace(/\D/g, ''))} placeholder="08302" />
                  </Field>
                </div>
              </div>
            </div>
          </Card>

          <Card title="What needs service">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="brand" label="Equipment brand">
                  <input id="brand" className={inputClass} list="brand-list" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Valley, Reinke, Zimmatic" />
                  <datalist id="brand-list">{['Valley', 'Reinke', 'Zimmatic', 'T-L', 'Lockwood', 'Pierce'].map(b => <option key={b} value={b} />)}</datalist>
                </Field>
                <Field id="equipment" label="Equipment type">
                  <input id="equipment" className={inputClass} list="type-list" value={form.equipment} onChange={e => set('equipment', e.target.value)} placeholder="e.g. Center pivot, pump, panel" />
                  <datalist id="type-list">{['Center pivot', 'Linear', 'Pump', 'Control panel', 'Well', 'Drip system', 'Traveler / reel'].map(b => <option key={b} value={b} />)}</datalist>
                </Field>
              </div>
              <Field id="reason" label="Reason for call" required hint="What's wrong, when it started, and anything the caller already tried.">
                <textarea id="reason" rows={4} className={`${inputClass} h-auto py-2`} value={form.reason} onChange={e => set('reason', e.target.value)}
                  placeholder="e.g. Pivot stops at tower 3 with safety alarm. Started yesterday after the storm." />
              </Field>
            </div>
          </Card>

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          {missing.length > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Still needed: {missing.map(k => ({ farm: 'farm name', contact: 'contact person', address: 'location', city: 'city', state: 'state', zip: 'ZIP', phone: 'phone', reason: 'reason for call' }[k])).join(', ')}.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <NavyButton onClick={save} disabled={saving || missing.length > 0 || emailBad} className="h-12 text-base sm:flex-1">
              {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : id ? 'Save changes' : 'Save call'}
            </NavyButton>
            {id && <PlainButton onClick={() => navigate('/calls')} className="h-12">Cancel</PlainButton>}
          </div>
        </div>
      )}
    </div>
  );
}
