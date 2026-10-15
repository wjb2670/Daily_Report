import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList } from 'lucide-react';
import Section from './Section';

const STATUS_STYLES = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-800' },
  sent: { label: 'Sent to SharePoint', className: 'bg-purple-100 text-purple-800' },
};

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

export default function ReportHeader({ projects, projectId, date, onProjectChange, onDateChange, report, onField, disabled }) {
  return (
    <Section icon={ClipboardList} title="Report Information" action={report && <StatusBadge status={report.status} />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="project">Project</Label>
          <select
            id="project"
            value={projectId || ''}
            onChange={e => onProjectChange(e.target.value)}
            className="w-full h-11 sm:h-9 rounded-md border border-input bg-white px-3 text-base md:text-sm"
          >
            <option value="" disabled>Select a project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.job_number ? `${p.job_number} · ` : ''}{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="report_date">Report date</Label>
          <Input
            id="report_date"
            type="date"
            value={date}
            onChange={e => e.target.value && onDateChange(e.target.value)}
            className="h-11 sm:h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="superintendent">Superintendent</Label>
          <Input
            id="superintendent"
            placeholder="Name"
            value={report?.superintendent || ''}
            onChange={e => onField('superintendent', e.target.value)}
            disabled={!report || disabled}
            className="h-11 sm:h-9"
          />
        </div>
      </div>
    </Section>
  );
}
