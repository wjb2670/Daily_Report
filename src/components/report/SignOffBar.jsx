import React from 'react';
import { CheckCircle2, PenLine, ChevronRight } from 'lucide-react';
import { SyncIndicator } from '@/components/report/FooterActions';

const time = d => (d ? new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

// Stays at the top of the report while scrolling: how much is done, what's
// still needed (tap to jump there), and a one-tap sign-off.
export default function SignOffBar({ report, sections, onOpen, onSign, signer, status, lastSaved, pending, disabled }) {
  const required = sections.filter(s => s.required);
  const done = required.filter(s => s.done).length;
  const missing = required.filter(s => !s.done);
  const signed = report?.status === 'submitted' || report?.status === 'sent';

  return (
    <div className="sticky z-30 -mx-4 px-4 py-2 bg-[#f1f5f9]/95 backdrop-blur" style={{ top: 'var(--app-header-h, 0px)' }}>
      {signed ? (
        <div role="status" className="rounded-xl border-2 border-green-500 bg-green-50 px-4 py-2.5">
          <div className="flex items-center gap-2 font-semibold text-green-900">
            <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0" />
            <span>Signed by {report.signed_by} at {time(report.signed_at)}</span>
          </div>
          <p className="text-sm text-green-800 mt-0.5">
            Saved to SharePoint. You can still add notes and photos; changes are logged{report.revisions?.length ? ` (edited ${report.revisions.length} time${report.revisions.length === 1 ? '' : 's'})` : ''}.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#0f2a5e] leading-tight">{done} of {required.length} required sections done</div>
              <div className="h-1.5 rounded-full bg-gray-200 mt-1.5 max-w-xs"><div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${required.length ? (done / required.length) * 100 : 100}%` }} /></div>
            </div>
            <button type="button" onClick={onSign} disabled={disabled || !signer}
              className={`h-11 px-4 rounded-lg font-semibold inline-flex items-center gap-2 shrink-0 disabled:opacity-40 ${missing.length ? 'border-2 border-[#0f2a5e] text-[#0f2a5e] bg-white' : 'bg-[#0f2a5e] text-white'}`}>
              <PenLine className="w-5 h-5" /> Sign off{signer ? ` as ${signer.split(' ')[0]}` : ''}
            </button>
          </div>
          {missing.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-sm font-semibold text-red-700">Still need:</span>
              {missing.map(s => (
                <button key={s.key} type="button" onClick={() => onOpen(s.key)}
                  className="inline-flex items-center gap-0.5 h-9 px-2.5 rounded-full border-2 border-red-500 bg-red-50 text-red-800 text-sm font-semibold">
                  {s.title} <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
          {(status === 'offline' || status === 'error' || pending) && <div className="mt-1.5"><SyncIndicator status={status} lastSaved={lastSaved} pending={pending} /></div>}
        </div>
      )}
    </div>
  );
}
