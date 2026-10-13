import React, { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import Section from './Section';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const blank = fields => Object.fromEntries(fields.map(f => [f.key, f.default ?? '']));

// A card with a small entry form and the list of entries below it.
// Tap the pencil on an entry to load it back into the form and change it.
export default function ListSection({
  icon, tone, title, subtitle, fields, items = [], onChange, addLabel = 'Add', emptyText, summary, extraActions, disabled,
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
    <Section icon={icon} tone={tone} title={title} subtitle={subtitle}>
      {!disabled && (
        <div onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); commit(); } }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields.map(f => {
              const common = {
                'aria-label': f.label,
                value: draft[f.key] ?? '',
                onChange: e => set(f.key, e.target.value),
              };
              const span = f.full ? 'sm:col-span-2' : '';
              if (f.type === 'select') {
                return (
                  <select
                    key={f.key}
                    {...common}
                    className={`h-11 sm:h-9 rounded-md border border-input bg-white px-3 text-base md:text-sm ${span} ${draft[f.key] ? '' : 'text-muted-foreground'}`}
                  >
                    <option value="">{f.label}{f.required ? ' *' : ''}</option>
                    {f.options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                  </select>
                );
              }
              return (
                <Input
                  key={f.key}
                  {...common}
                  type={f.type === 'number' ? 'number' : 'text'}
                  inputMode={f.type === 'number' ? 'decimal' : undefined}
                  min={f.type === 'number' ? 0 : undefined}
                  step={f.step}
                  placeholder={`${f.label}${f.required ? ' *' : ''}`}
                  list={f.suggestions?.length ? `${listId}-${f.key}` : undefined}
                  className={`h-11 sm:h-9 ${span}`}
                />
              );
            })}
          </div>
          {fields.filter(f => f.suggestions?.length).map(f => (
            <datalist key={f.key} id={`${listId}-${f.key}`}>
              {f.suggestions.map(s => <option key={s} value={s} />)}
            </datalist>
          ))}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button onClick={commit} disabled={!canAdd} className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold h-11 sm:h-9">
              {editingId ? <><Check className="w-4 h-4 mr-1" /> Save changes</> : <><Plus className="w-4 h-4 mr-1" /> {addLabel}</>}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancel} className="h-11 sm:h-9">
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
            {!editingId && extraActions?.(next => onChange([...items, { ...next, id: newId(), added_at: new Date().toISOString() }]))}
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <ul className={`space-y-2 ${disabled ? '' : 'mt-4'}`}>
          {items.map(item => {
            const { title: t, detail } = describe(item);
            return (
              <li
                key={item.id}
                className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${editingId === item.id ? 'border-[#1e3a8a] bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
              >
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
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={`text-gray-400 text-sm italic ${disabled ? '' : 'mt-3'}`}>{emptyText}</p>
      )}
    </Section>
  );
}
