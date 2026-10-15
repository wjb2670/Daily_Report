import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, CheckCircle2, CloudOff, Loader2, AlertTriangle, Cloud } from 'lucide-react';

function formatTime(d) {
  return d ? new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

export function SyncIndicator({ status, lastSaved, pending }) {
  if (status === 'saving') return <span className="inline-flex items-center gap-1.5 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>;
  if (status === 'offline' || (pending && status !== 'saved')) {
    return <span className="inline-flex items-center gap-1.5 text-sm text-amber-700"><CloudOff className="w-4 h-4" /> No signal — saved on this device, will send when back online</span>;
  }
  if (status === 'error') return <span className="inline-flex items-center gap-1.5 text-sm text-red-600"><AlertTriangle className="w-4 h-4" /> Couldn&apos;t reach the server — saved on this device, retrying</span>;
  if (lastSaved) return <span className="inline-flex items-center gap-1.5 text-sm text-green-700"><Cloud className="w-4 h-4" /> All changes saved {formatTime(lastSaved)}</span>;
  return <span className="text-sm text-gray-400">Changes save automatically</span>;
}

export default function FooterActions({ report, status, lastSaved, pending, onSubmit, disabled }) {
  const [signer, setSigner] = useState('');

  useEffect(() => {
    setSigner(report?.signed_by || report?.superintendent || '');
  }, [report?.id, report?.report_date, report?.project_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitted = report?.status === 'submitted' || report?.status === 'sent';

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 space-y-4">
      <SyncIndicator status={status} lastSaved={lastSaved} pending={pending} />

      {submitted ? (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 text-green-800 p-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            Signed off by <strong>{report.signed_by}</strong> at {formatTime(report.signed_at)}.
            {report.status === 'sent'
              ? ' Filed to SharePoint.'
              : ' It will be filed to SharePoint at 7:00 PM. You can keep adding notes and photos until then; changes are logged.'}
            {report.revisions?.length > 0 && <div className="text-green-700 mt-1">Edited {report.revisions.length} time{report.revisions.length === 1 ? '' : 's'} after sign-off.</div>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1 flex-1">
            <Label htmlFor="signer">Superintendent sign-off</Label>
            <Input id="signer" placeholder="Type your name to sign" value={signer} onChange={e => setSigner(e.target.value)} className="h-11 sm:h-9" disabled={disabled} />
          </div>
          <Button
            onClick={() => onSubmit(signer.trim())}
            disabled={disabled || !signer.trim()}
            className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold h-11 sm:h-9"
          >
            <Send className="w-4 h-4 mr-1.5" /> Sign &amp; submit
          </Button>
        </div>
      )}
    </section>
  );
}
