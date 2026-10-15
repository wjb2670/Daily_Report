import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ExternalLink, AlertTriangle, Printer, Plus } from 'lucide-react';
import { Card, Field, NavyButton, PlainButton, inputClass, waitText, fullAddress } from './ui';
import { listCalls, listTechs, addTech, getShop, saveShop, updateCall } from './data';
import { locateText, planDay, withTotals, orderStops, mapsLink } from './routing';
import RouteMap, { TECH_COLORS } from './RouteMap';
import { todayStr } from '@/lib/dailyReportStore';

const longDate = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); };

function nextWorkday() {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + (t.getHours() >= 12 ? 1 : 0));
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return todayStr(d);
}

function ShopSetup({ shop, onSaved }) {
  const [address, setAddress] = useState(shop?.address || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const save = async () => {
    setBusy(true); setMsg('');
    const where = await locateText(address);
    if (!where) { setMsg('Couldn’t find that address. Use: street, city, state ZIP.'); setBusy(false); return; }
    await saveShop({ address, lat: where.lat, lon: where.lon }, shop?.id);
    setBusy(false);
    onSaved();
  };
  return (
    <Card title="Shop address" subtitle="Every route starts and ends here.">
      <div className="flex flex-col sm:flex-row gap-2">
        <input className={inputClass} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, NJ 08302" />
        <NavyButton onClick={save} disabled={busy || !address.trim()}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</NavyButton>
      </div>
      {msg && <p className="text-sm text-red-700 mt-2">{msg}</p>}
    </Card>
  );
}

function RouteSheets({ date, shop, routes }) {
  return (
    <div className="hidden print:block">
      <style>{`@page { size: letter; margin: 0.5in; } .rs-page { break-after: page; font: 10pt/1.35 system-ui, sans-serif; color: #111; } .rs-page:last-child { break-after: auto; }
        .rs-table { width: 100%; border-collapse: collapse; } .rs-table td, .rs-table th { border: 1px solid #94a3b8; padding: 5px 6px; vertical-align: top; text-align: left; }
        .rs-table th { background: #eef2f8; font-size: 8.5pt; text-transform: uppercase; } .rs-table tr { break-inside: avoid; }`}</style>
      {routes.filter(r => r.stops.length).map(r => (
        <section key={r.tech} className="rs-page">
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f2a5e', paddingBottom: 6, marginBottom: 10 }}>
            <div><div style={{ fontWeight: 900, color: '#0f2a5e', fontSize: '14pt', letterSpacing: '.04em' }}>SUSSEX IRRIGATION</div><div>Service route</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, fontSize: '13pt' }}>{r.tech}</div><div>{longDate(date)}</div>
              <div style={{ color: '#555' }}>{r.stops.length} stops · about {Math.round(r.miles)} mi, {Math.floor(r.minutes / 60)}h {r.minutes % 60}m driving</div></div>
          </div>
          <p style={{ margin: '0 0 8px' }}><strong>Start and end:</strong> Shop — {shop.address}</p>
          <table className="rs-table">
            <thead><tr><th style={{ width: '4%' }}>#</th><th style={{ width: '30%' }}>Farm / contact</th><th style={{ width: '28%' }}>Location</th><th>Equipment &amp; reason</th></tr></thead>
            <tbody>
              {r.stops.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 800 }}>{i + 1}</td>
                  <td><strong>{s.farm}</strong><br />{s.contact}<br />{s.phone}</td>
                  <td>{fullAddress(s)}{s.locationNote ? <><br /><em style={{ color: '#92400e' }}>{s.locationNote}</em></> : null}</td>
                  <td>{[s.brand, s.equipment].filter(Boolean).join(' ')}{s.brand || s.equipment ? <br /> : null}{s.reason}
                    <div style={{ borderTop: '1px dashed #94a3b8', marginTop: 6, paddingTop: 4, color: '#555', minHeight: 36 }}>Work done / parts:</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export default function PlanPage() {
  const [date, setDate] = useState(nextWorkday());
  const [calls, setCalls] = useState(null);
  const [techs, setTechs] = useState([]);
  const [shop, setShop] = useState(undefined);
  const [chosen, setChosen] = useState([]);
  const [perTech, setPerTech] = useState(5);
  const [plan, setPlan] = useState(null);
  const [newTech, setNewTech] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    try {
      const [c, t, s] = await Promise.all([listCalls(), listTechs(), getShop()]);
      setCalls(c); setTechs(t); setShop(s);
      setChosen(prev => (prev.length ? prev.filter(n => t.some(x => x.name === n)) : t.map(x => x.name)));
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, []);

  const open = useMemo(() => (calls || []).filter(c => c.status === 'Open'), [calls]);
  const scheduled = useMemo(() => {
    const day = (calls || []).filter(c => c.status === 'Scheduled' && c.scheduledDay === date);
    const byTech = {};
    day.forEach(c => { (byTech[c.tech] ||= []).push(c); });
    return Object.entries(byTech).map(([tech, stops]) => ({ tech, stops: stops.sort((a, b) => (a.stop || 0) - (b.stop || 0)) }));
  }, [calls, date]);

  const build = () => {
    setSavedMsg('');
    setPlan(planDay({ calls: open, techs: chosen, shop, stopsPerTech: Number(perTech) || 5 }));
  };

  const moveStop = (stop, fromTech, toTech) => {
    setPlan(p => {
      const routes = p.routes.map(r => ({ ...r, stops: r.stops.filter(s => s.id !== stop.id) }));
      let leftover = p.leftover.filter(s => s.id !== stop.id);
      if (toTech === '__none') leftover = [...leftover, stop];
      const final = routes.map(r => (r.tech === toTech ? { ...r, stops: orderStops(shop, [...r.stops, stop]) } : r))
        .map(r => withTotals(shop, r.tech === fromTech ? { ...r, stops: orderStops(shop, r.stops) } : r));
      return { ...p, routes: final, leftover };
    });
  };

  const schedule = async () => {
    setSaving(true); setError('');
    try {
      for (const r of plan.routes) {
        for (let i = 0; i < r.stops.length; i++) {
          await updateCall(r.stops[i].id, { status: 'Scheduled', scheduledDay: date, tech: r.tech, stop: i + 1 });
        }
      }
      const n = plan.routes.reduce((t, r) => t + r.stops.length, 0);
      setSavedMsg(`${n} call${n === 1 ? '' : 's'} scheduled for ${longDate(date)}.`);
      setPlan(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const createTech = async () => {
    const name = newTech.trim();
    if (!name) return;
    await addTech(name);
    setNewTech('');
    setChosen(c => [...c, name]);
    load();
  };

  if (error && !calls) return <div className="max-w-3xl mx-auto"><Card><p className="text-red-700">{error}</p></Card></div>;
  if (!calls || shop === undefined) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;

  const shown = plan ? plan.routes : scheduled.map(r => withTotals(shop || { lat: 0, lon: 0 }, r));
  const located = shown.every(r => r.stops.every(s => s.lat != null));

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="print:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">Plan the day</h1>
        <p className="text-gray-500 mb-5">The oldest open call goes first; each tech’s day is filled with the calls closest to it. Routes start and end at the shop.</p>

        <div className="space-y-4">
          {!shop?.lat ? <ShopSetup shop={shop} onSaved={load} /> : null}

          {shop?.lat != null && (
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field id="pl-date" label="Day to schedule" required>
                  <input id="pl-date" type="date" className={inputClass} value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setPlan(null); setSavedMsg(''); } }} />
                </Field>
                <Field id="pl-per" label="Stops per tech" required>
                  <select id="pl-per" className={inputClass} value={perTech} onChange={e => setPerTech(e.target.value)}>
                    {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <div className="text-sm text-gray-600 sm:pt-7"><strong>{open.length}</strong> open call{open.length === 1 ? '' : 's'} waiting</div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Who’s working</div>
                <div className="flex flex-wrap gap-2">
                  {techs.map(t => {
                    const on = chosen.includes(t.name);
                    return (
                      <button key={t.id} type="button" onClick={() => setChosen(c => (on ? c.filter(n => n !== t.name) : [...c, t.name]))}
                        className={`h-11 px-4 rounded-md font-semibold border ${on ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-gray-500 border-gray-300'}`}>
                        {on ? '✓ ' : ''}{t.name}
                      </button>
                    );
                  })}
                  <div className="flex gap-1">
                    <input className={`${inputClass} w-40`} placeholder="Add a tech" value={newTech} onChange={e => setNewTech(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTech()} />
                    <PlainButton onClick={createTech} disabled={!newTech.trim()} aria-label="Add tech"><Plus className="w-4 h-4" /></PlainButton>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-5">
                <NavyButton onClick={build} disabled={!chosen.length || !open.length} className="h-12 text-base">
                  {plan ? 'Rebuild plan' : scheduled.length ? 'Plan more calls for this day' : 'Build the plan'}
                </NavyButton>
                <span className="text-xs text-gray-500">Shop: {shop.address} · <button type="button" className="underline" onClick={() => setShop({ ...shop, lat: null })}>change</button></span>
              </div>
            </Card>
          )}

          {savedMsg && <p className="text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3 font-semibold">{savedMsg}</p>}
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          {shop?.lat != null && shown.some(r => r.stops.length) && (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-[#0f2a5e]">{plan ? 'Proposed plan' : 'Scheduled'} — {longDate(date)}</h2>
                <div className="flex gap-2">
                  {plan && <NavyButton onClick={schedule} disabled={saving} className="h-12">{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Schedule these calls'}</NavyButton>}
                  {!plan && <PlainButton onClick={() => window.print()}><Printer className="w-4 h-4" /> Print route sheets</PlainButton>}
                </div>
              </div>

              {located && <RouteMap shop={shop} routes={shown} />}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {shown.filter(r => r.stops.length || plan).map((r, ri) => (
                  <Card key={r.tech}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ background: TECH_COLORS[ri % TECH_COLORS.length] }} />
                          <h3 className="font-bold text-[#0f2a5e] text-lg">{r.tech}</h3>
                        </div>
                        <p className="text-sm text-gray-500">{r.stops.length} stop{r.stops.length === 1 ? '' : 's'} · about {Math.round(r.miles)} mi · {Math.floor(r.minutes / 60)}h {r.minutes % 60}m driving</p>
                      </div>
                      {r.stops.length > 0 && (
                        <a href={mapsLink(shop, r.stops)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1e3a8a] whitespace-nowrap">
                          Directions <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <ol className="space-y-2">
                      <li className="text-sm text-gray-500">Start at the shop</li>
                      {r.stops.map((s, i) => (
                        <li key={s.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: TECH_COLORS[ri % TECH_COLORS.length] }}>{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[#0f2a5e]">{s.farm} <span className="font-normal text-gray-500">· {s.city}</span></div>
                              <div className="text-gray-600 line-clamp-2">{[s.brand, s.equipment].filter(Boolean).join(' ')}{s.brand || s.equipment ? ' — ' : ''}{s.reason}</div>
                              <div className="text-xs text-amber-700 font-semibold mt-0.5">{waitText(s.received)}</div>
                            </div>
                          </div>
                          {plan && (
                            <select aria-label="Move to" value={r.tech} onChange={e => moveStop(s, r.tech, e.target.value)}
                              className="mt-2 h-9 rounded-md border border-gray-300 bg-white px-2 text-sm w-full">
                              {chosen.map(t => <option key={t} value={t}>{t === r.tech ? `Assigned to ${t}` : `Move to ${t}`}</option>)}
                              <option value="__none">Leave for another day</option>
                            </select>
                          )}
                        </li>
                      ))}
                      <li className="text-sm text-gray-500">Back to the shop</li>
                    </ol>
                  </Card>
                ))}
              </div>

              {plan && plan.leftover.length > 0 && (
                <Card title={`Still waiting (${plan.leftover.length})`} subtitle="Not on this day's plan — add a tech or stops per tech, or move one in.">
                  <ul className="space-y-1 text-sm">
                    {plan.leftover.map(s => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <span><strong>{s.farm}</strong> · {s.city} · <span className="text-amber-700">{waitText(s.received)}</span></span>
                        <select aria-label="Add to" value="" onChange={e => e.target.value && moveStop(s, '__none', e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm">
                          <option value="">Add to…</option>
                          {chosen.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}

          {plan && plan.unlocated.length > 0 && (
            <Card>
              <p className="flex items-start gap-2 text-amber-800"><AlertTriangle className="w-5 h-5 shrink-0" />
                <span><strong>{plan.unlocated.length} call{plan.unlocated.length === 1 ? '' : 's'} couldn’t be placed on the map</strong> and aren’t in the plan: {plan.unlocated.map(c => c.farm).join(', ')}. Fix the address under Service calls → Edit.</span>
              </p>
            </Card>
          )}
        </div>
      </div>

      {!plan && shop?.lat != null && <RouteSheets date={date} shop={shop} routes={shown} />}
    </div>
  );
}
