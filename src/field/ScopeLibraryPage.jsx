import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { loadLibrary, saveLibraryRow, deleteLibraryRow, importAvailable, importDutchmansHarvest } from '@/field/scopesData';
import { DH_TRADES } from '@/field/scopeSeedDH';
import { can } from '@/field/roles';

const input = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:bg-gray-50';

const toTyped = item => [item.text, ...(item.sub || []).map(s => `- ${s}`)].join('\n');
function fromTyped(raw, on) {
  const rows = raw.split('\n').map(r => r.trimEnd()).filter(r => r.trim());
  return { text: (rows[0] || '').trim(), on, sub: rows.slice(1).map(r => r.replace(/^\s*-\s*/, '').trim()).filter(Boolean) };
}

function RowEditor({ row, editable, onSaved, onDeleted, shared }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(() => ({ ...row, items: row.items.map(i => ({ ...i, typed: toTyped(i) })) }));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setDraft({ ...row, items: row.items.map(i => ({ ...i, typed: toTyped(i) })) }); setDirty(false); setConfirm(false); }, [row]);

  const set = patch => { setDraft(d => ({ ...d, ...patch })); setDirty(true); };
  const setItem = (i, patch) => set({ items: draft.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const move = (i, d) => { const a = [...draft.items]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); set({ items: a }); };

  const save = async () => {
    setSaving(true);
    try {
      const items = draft.items.map(i => fromTyped(i.typed, i.on)).filter(i => i.text);
      const id = await saveLibraryRow({ ...draft, items });
      onSaved({ ...draft, id, items });
      setDirty(false);
      toast({ title: 'Library saved', description: 'New subcontracts use these lines. Existing ones keep what they have.' });
    } catch (err) { toast({ title: 'Couldn’t save', description: err.message, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
      {!shared && (
        <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_1fr] gap-3">
          <div className="space-y-1"><label htmlFor="lib-code" className="block text-sm font-semibold text-gray-700">Cost code</label>
            <input id="lib-code" className={input} disabled={!editable} value={draft.costCode} onChange={e => set({ costCode: e.target.value })} /></div>
          <div className="space-y-1"><label htmlFor="lib-name" className="block text-sm font-semibold text-gray-700">Trade</label>
            <input id="lib-name" className={input} disabled={!editable} value={draft.name} onChange={e => set({ name: e.target.value })} /></div>
          <div className="space-y-1"><label htmlFor="lib-work" className="block text-sm font-semibold text-gray-700">Work name in Exhibit A</label>
            <input id="lib-work" className={input} disabled={!editable} value={draft.workName} onChange={e => set({ workName: e.target.value })} /></div>
        </div>
      )}
      {shared && <h2 className="font-bold text-[#0f2a5e] text-lg">{draft.name}</h2>}
      <p className="text-sm text-gray-500">Ticked lines start out ticked on every new subcontract{shared ? '' : ' for this trade'}; the PM can untick them. Put blanks in [square brackets]. Start a new line with “-” for an a./b. sub-point. Use {'{project}'} and {'{company}'} for names filled in automatically.</p>
      <ul className="space-y-2">
        {draft.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2">
            <input type="checkbox" checked={item.on} disabled={!editable} onChange={e => setItem(i, { on: e.target.checked })} aria-label="Ticked by default" className="mt-2 w-5 h-5 shrink-0 accent-[#0f2a5e]" />
            <textarea value={item.typed} disabled={!editable} onChange={e => setItem(i, { typed: e.target.value })} rows={Math.max(2, item.typed.split('\n').length)}
              aria-label={`Line ${i + 1}`} className="flex-1 min-w-0 rounded-md border border-gray-200 p-2 text-base md:text-sm disabled:bg-gray-50" />
            {editable && (
              <div className="flex flex-col shrink-0">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-gray-400 hover:text-[#0f2a5e] disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" aria-label="Move down" disabled={i === draft.items.length - 1} onClick={() => move(i, 1)} className="p-1 text-gray-400 hover:text-[#0f2a5e] disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" aria-label="Delete line" onClick={() => set({ items: draft.items.filter((_, j) => j !== i) })} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => set({ items: [...draft.items, { text: '', on: true, sub: [], typed: '' }] })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a8a] py-2 mr-auto"><Plus className="w-4 h-4" /> Add a line</button>
          {!shared && draft.id && (confirm ? (
            <>
              <button type="button" onClick={async () => { await deleteLibraryRow(draft.id); onDeleted(draft.id); }} className="h-10 px-3 rounded-md bg-red-600 text-white text-sm font-semibold">Delete trade</button>
              <button type="button" onClick={() => setConfirm(false)} className="h-10 px-3 rounded-md border border-gray-300 text-sm font-semibold text-gray-700">Keep</button>
            </>
          ) : <button type="button" onClick={() => setConfirm(true)} className="text-sm text-gray-500 underline px-2">Delete trade</button>)}
          <button type="button" onClick={save} disabled={saving || !dirty || (!shared && !draft.name.trim())}
            className="h-11 px-5 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      )}
    </section>
  );
}

export default function ScopeLibraryPage() {
  const navigate = useNavigate();
  const [lib, setLib] = useState(null);
  const [error, setError] = useState('');
  const [pick, setPick] = useState('_standard');
  const [query, setQuery] = useState('');
  const editable = can('scopesEdit');
  const [importing, setImporting] = useState('');
  const [importDone, setImportDone] = useState('');
  const runImport = async () => {
    setImporting('Starting…');
    try {
      const r = await importDutchmansHarvest(lib, s => setImporting(s));
      const fresh = await loadLibrary();
      setLib(fresh);
      setImportDone(`Added ${r.added} trades and added extra lines to ${r.updated} existing trades.`);
    } catch (err) { setImportDone(`Import stopped: ${err.message}. Tap the button again to finish.`); }
    setImporting('');
  };

  useEffect(() => {
    loadLibrary().then(l => { setLib(l); if (l.trades[0]) setPick(l.trades[0].id); })
      .catch(err => setError(err.code === 'not_set_up' ? 'The Scope Library isn’t set up yet. Ask Wendy to run Site setup.' : err.message));
  }, []);

  if (error) return <div className="max-w-3xl mx-auto"><p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p></div>;
  if (!lib) return <div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading the scope library…</div>;

  const shared = [lib.standard, lib.opening, lib.closing];
  const q = query.trim().toLowerCase();
  const trades = lib.trades.filter(t => !q || `${t.costCode} ${t.name}`.toLowerCase().includes(q));
  const current = pick === '_new' ? { id: null, name: '', costCode: '', workName: '', items: [] }
    : shared.find(s => s.costCode === pick) || lib.trades.find(t => t.id === pick);

  const saved = row => setLib(l => {
    if (row.costCode.startsWith('_')) return { ...l, [row.costCode.slice(1)]: row };
    const trades2 = l.trades.some(t => t.id === row.id) ? l.trades.map(t => (t.id === row.id ? row : t)) : [...l.trades, row];
    return { ...l, trades: trades2.sort((a, b) => a.costCode.localeCompare(b.costCode, undefined, { numeric: true })) };
  });

  const item = (key, label, sub) => (
    <button key={key} type="button" onClick={() => setPick(key)}
      className={`w-full text-left px-3 py-2.5 rounded-md ${pick === key ? 'bg-[#0f2a5e] text-white' : 'hover:bg-blue-50 text-gray-800'}`}>
      <div className="font-semibold text-sm leading-tight">{label}</div>
      {sub && <div className={`text-xs ${pick === key ? 'text-blue-100' : 'text-gray-500'}`}>{sub}</div>}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold mb-3 py-2"><ArrowLeft className="w-5 h-5" /> Back</button>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">Scope library</h1>
      <p className="text-gray-500 mb-5">The normal scope lines for each trade. {editable ? 'Changes apply to new subcontracts; ones already written keep their lines.' : 'Only PMs can change the library.'}</p>
      {importDone && <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{importDone}</p>}
      {editable && lib && importAvailable(lib) && (
        <section className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm text-blue-900"><strong>Add the Dutchman’s Harvest trades.</strong> {DH_TRADES.length} trades from the Dutchman’s Harvest scope sheet (cabinets, countertops, drywall, flooring, painting, plumbing, HVAC, electrical and more). Trades you already have get the new lines as extra options, unticked.</div>
          <button type="button" onClick={runImport} disabled={!!importing} className="h-11 px-4 rounded-md bg-[#0f2a5e] text-white font-semibold disabled:opacity-60 shrink-0 inline-flex items-center gap-2">
            {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> {importing}</> : 'Add these trades'}
          </button>
        </section>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)] gap-5">
        <aside className="bg-white rounded-xl border border-gray-200 p-2 space-y-1 self-start">
          <div className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Every subcontract</div>
          {shared.map(s => item(s.costCode, s.name))}
          <div className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Trades</div>
          <div className="relative px-1 pb-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input aria-label="Search trades" className={`${input} h-10 pl-8`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" />
          </div>
          <div className="max-h-[50vh] md:max-h-[60vh] overflow-y-auto space-y-1">
            {trades.map(t => item(t.id, t.name, t.costCode))}
          </div>
          {editable && <button type="button" onClick={() => setPick('_new')} className="w-full inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-[#1e3a8a]"><Plus className="w-4 h-4" /> Add a trade</button>}
        </aside>
        <div className="min-w-0">
          {current ? (
            <RowEditor row={current} shared={current.costCode?.startsWith('_')} editable={editable} onSaved={row => { saved(row); if (!row.costCode.startsWith('_')) setPick(row.id); }}
              onDeleted={id => { setLib(l => ({ ...l, trades: l.trades.filter(t => t.id !== id) })); setPick('_standard'); }} />
          ) : <p className="text-gray-500">Pick a trade.</p>}
          <Link to="/projects" className="inline-block mt-4 text-sm text-[#1e3a8a] font-semibold">Go to projects</Link>
        </div>
      </div>
    </div>
  );
}
