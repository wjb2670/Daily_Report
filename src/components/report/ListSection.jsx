import React, { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import Section from './Section';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const blank = fields => Object.fromEntries(fields.map(f => [f.key, f.default ?? '']));

// A card with a small entry form and the list of entries below it.
// Tap the pencil on an entry to load it back into the form and change it.
export default function ListSection({
  icon, tone, title, subtitle, instruction, fields, items = [], onChange, addLabel = 'Add', emptyText, summary, extraActions, renderItemExtra, disabled,
}) {
  const [draft, setDraft] = useState(() => blank(fields));
  const [editingId, setEditingId] = useState(null);
  const listId = useId();

  const required = fields.filter(f => f.required);
  const canAdd = required.every(f => String(draft[f.key] ?? '').trim());

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));

  const commit = () => {
    if (!canAdd) return;
    const clean = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    );
    if (editingId) {
      onChange(items.map(i => (i.id === editingId ? { ...i, ...clean } : i)));
    } else {
      onChange([...items, { ...clean, id: newId(), added_at: new Date().toISOString() }]);
    }
    setDraft(blank(fields));
    setEditingId(null);
  };

  const edit = item => {
    setDraft(Object.fromEntries(fields.map(f => [f.key, item[f.key] ?? ''])));
    setEditingId(item.id);
  };

  const cancel = () => {
    setDraft(blank(fields));
    setEditingId(null);
  };

  const describe = summary || (item => {
    const [first, ...rest] = fields;
    return {
      title: item[first.key],
      detail: rest.map(f => (item[f.key] ? `${f.suffixLabel ? `${item[f.key]} ${f.suffixLabel}` : item[f.key]}` : null))
        .filter(Boolean).join(' · '),
    };
  });

  return (
    <Section icon={icon} tone={tone} title={title} subtitle={subtitle} instruction={disabled ? null : instruction}>
      {!disabled && (
        <div onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); commit(); } }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => {
              const inputId = `${listId}-in-${f.key}`;
              const common = {
                id: inputId,
                'aria-label': f.label,
                value: draft[f.key] ?? '',
                onChange: e => set(f.key, e.target.value),
              };
              const span = f.full ? 'sm:col-span-2' : '';
              return (
                <div key={f.key} className={`space-y-1 ${span}`}>
                  <Label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
                    {f.label}{f.required ? <span className="text-red-600"> *</span> : <span className="font-normal text-gray-400"> (optional)</span>}
                  </Label>
                  {f.type === 'select' ? (
                    <select
                      {...common}
                      className={`w-full h-11 sm:h-10 rounded-md border border-input bg-white px-3 text-base md:text-sm ${draft[f.key] ? '' : 'text-muted-foreground'}`}
                    >
                      <option value="">Choose…</option>
                      {f.options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                    </select>
                  ) : (
                    <Input
                      {...common}
                      type={f.type === 'number' ? 'number' : 'text'}
                      inputMode={f.type === 'number' ? 'decimal' : undefined}
                      min={f.type === 'number' ? 0 : undefined}
                      step={f.step}
                      placeholder={f.hint || ''}
                      list={f.suggestions?.length ? `${listId}-${f.key}` : undefined}
                      className="h-11 sm:h-10"
                    />
                  )}
                </div>
              );
            })}
          </div>
          {fields.filter(f => f.suggestions?.length).map(f => (
            <datalist key={f.key} id={`${listId}-${f.key}`}>
              {f.suggestions.map(s => <option key={s} value={s} />)}
            </datalist>
          ))}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={commit} disabled={!canAdd} className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold h-11 sm:h-10 w-full sm:w-auto">
              {editingId ? <><Check className="w-4 h-4 mr-1" /> Save changes</> : <><Plus className="w-4 h-4 mr-1" /> {addLabel}</>}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancel} className="h-11 sm:h-10 w-full sm:w-auto">
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
            {!editingId && extraActions?.(next => onChange([...items, { ...next, id: newId(), added_at: new Date().toISOString() }]))}
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <>
        {!disabled && <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">Added today ({items.length})</h3>}
        <ul className="space-y-2">
          {items.map(item => {
            const { title: t, detail } = describe(item);
            return (
              <li
                key={item.id}
                className={`rounded-lg border px-3 py-2 text-sm ${editingId === item.id ? 'border-[#1e3a8a] bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 py-1">
                  <div className="font-semibold text-[#0f2a5e] break-words">{t}</div>
                  {detail && <div className="text-gray-500 break-words">{detail}</div>}
                </div>
                {!disabled && (
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => edit(item)} aria-label="Edit" className="h-10 w-10 text-gray-500">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove"
                      className="h-10 w-10 text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (window.confirm(`Remove "${t}"?`)) {
                          onChange(items.filter(i => i.id !== item.id));
                          if (editingId === item.id) cancel();
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                </div>
                {renderItemExtra?.(item)}
              </li>
            );
          })}
        </ul>
        </>
      ) : (
        <p className={`text-gray-400 text-sm italic ${disabled ? '' : 'mt-4'}`}>{emptyText}</p>
      )}
    </Section>
  );
}
