import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Phone, Mail, MapPin, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, NavyButton, PlainButton, StatusPill, waitText, receivedText, fullAddress } from './ui';
import { listCalls, updateCall } from './data';

const FILTERS = ['Open', 'Scheduled', 'Completed', 'All'];

function CallCard({ call, place, onChange }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(call.serviceNotes || '');
  const [busy, setBusy] = useState(false);

  const act = async (changes, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try { await updateCall(call.id, changes); onChange(); } catch (err) { alert(err.message); } finally { setBusy(false); }
  };

  return (
    <li className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left p-4 flex items-start gap-3">
        {place != null && (
          <div className="shrink-0 w-9 h-9 rounded-full bg-[#0f2a5e] text-white font-bold flex items-center justify-center">{place}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#0f2a5e] text-lg leading-tight">{call.farm}</span>
            <StatusPill status={call.status} />
          </div>
          <div className="text-sm text-gray-600 mt-0.5">{[call.city, call.state].filter(Boolean).join(', ')}{call.brand || call.equipment ? ` · ${[call.brand, call.equipment].filter(Boolean).join(' ')}` : ''}</div>
          <div className="text-sm text-gray-700 mt-1 line-clamp-2">{call.reason}</div>
          <div className="text-xs mt-1.5 flex flex-wrap gap-x-3">
            {call.status === 'Open' && <span className="font-semibold text-amber-700">{waitText(call.received)}</span>}
            {call.status === 'Scheduled' && <span className="font-semibold text-blue-700">{call.scheduledDay} · {call.tech}{call.stop ? ` · stop ${call.stop}` : ''}</span>}
            <span className="text-gray-500">Called {receivedText(call.received)}</span>
            {call.lat == null && <span className="text-red-600 font-semibold">Location not found</span>}
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><span className="text-gray-500">Contact:</span> <strong>{call.contact}</strong></div>
            <a href={`tel:${call.phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold"><Phone className="w-4 h-4" />{call.phone}</a>
            {call.email && <a href={`mailto:${call.email}`} className="inline-flex items-center gap-1.5 text-[#1e3a8a]"><Mail className="w-4 h-4" />{call.email}</a>}
            <a href={call.lat != null ? `https://www.google.com/maps/search/?api=1&query=${call.lat},${call.lon}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(call))}`}
              target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#1e3a8a]"><MapPin className="w-4 h-4" />{fullAddress(call)}</a>
          </div>
          {call.locationNote && (
            <p className="flex items-start gap-2 text-amber-800 bg-amber-50 rounded-lg px-3 py-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{call.locationNote}</p>
          )}
          <div><span className="text-gray-500">Reason for call:</span><p className="whitespace-pre-wrap mt-0.5">{call.reason}</p></div>
          {call.takenBy && <div className="text-gray-500">Taken by {call.takenBy}</div>}

          {(call.status === 'Scheduled' || call.status === 'Completed') && (
            <div className="space-y-1">
              <label htmlFor={`n-${call.id}`} className="block font-semibold text-gray-700">Service notes</label>
              <textarea id={`n-${call.id}`} rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base md:text-sm" placeholder="What was found and fixed, parts used…" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {call.status !== 'Completed' && call.status !== 'Canceled' && (
              <NavyButton disabled={busy} onClick={() => act({ status: 'Completed', serviceNotes: notes })}>Mark completed</NavyButton>
            )}
            {call.status === 'Completed' && notes !== (call.serviceNotes || '') && (
              <NavyButton disabled={busy} onClick={() => act({ serviceNotes: notes })}>Save notes</NavyButton>
            )}
            {call.status === 'Scheduled' && (
              <PlainButton disabled={busy} onClick={() => act({ status: 'Open', scheduledDay: '', tech: '', stop: null }, 'Take this call off the schedule and put it back in line?')}>Unschedule</PlainButton>
            )}
            {(call.status === 'Completed' || call.status === 'Canceled') && (
              <PlainButton disabled={busy} onClick={() => act({ status: 'Open', scheduledDay: '', tech: '', stop: null })}>Reopen</PlainButton>
            )}
            <Link to={`/call/${call.id}`} className="inline-flex items-center h-11 px-4 rounded-md border border-gray-300 bg-white text-[#0f2a5e] font-semibold">Edit</Link>
            {call.status !== 'Canceled' && call.status !== 'Completed' && (
              <PlainButton disabled={busy} className="text-red-700" onClick={() => act({ status: 'Canceled' }, `Cancel the call for ${call.farm}?`)}>Cancel call</PlainButton>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export default function CallsPage() {
  const [calls, setCalls] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Open');

  const load = () => listCalls().then(setCalls).catch(err => setError(err.message));
  useEffect(() => { load(); }, []);

  const shown = (calls || [])
    .filter(c => filter === 'All' || c.status === filter)
    .sort((a, b) => (filter === 'Completed' || filter === 'All'
      ? String(b.received).localeCompare(String(a.received))
      : filter === 'Scheduled'
        ? `${a.scheduledDay}${a.tech}${String(a.stop).padStart(3, '0')}`.localeCompare(`${b.scheduledDay}${b.tech}${String(b.stop).padStart(3, '0')}`)
        : String(a.received).localeCompare(String(b.received))));
  const counts = Object.fromEntries(FILTERS.map(f => [f, (calls || []).filter(c => f === 'All' || c.status === f).length]));

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">Service calls</h1>
          <p className="text-gray-500 mt-1">{filter === 'Open' ? 'Oldest call first — the number is its place in line.' : `${filter} calls`}</p>
        </div>
        <Link to="/new" className="inline-flex items-center h-11 px-5 rounded-md bg-[#0f2a5e] text-white font-semibold">Take a call</Link>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {FILTERS.map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`h-11 rounded-md text-sm font-semibold border ${filter === f ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`}>
            {f} {calls ? <span className="opacity-75">({counts[f]})</span> : null}
          </button>
        ))}
      </div>

      {error ? (
        <Card><p className="text-red-700">{error}</p></Card>
      ) : !calls ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading calls…</div>
      ) : shown.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-4">No {filter === 'All' ? '' : filter.toLowerCase()} calls.</p></Card>
      ) : (
        <ul className="space-y-3">
          {shown.map((c, i) => <CallCard key={c.id} call={c} place={filter === 'Open' ? i + 1 : null} onChange={load} />)}
        </ul>
      )}
    </div>
  );
}
