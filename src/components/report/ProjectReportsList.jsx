import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Camera, HardHat, Loader2 } from 'lucide-react';
import { StatusBadge } from './ReportHeader';
import { todayStr } from '@/lib/dailyReportStore';

function formatDate(d) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// All daily reports for one project, newest first.
export default function ProjectReportsList({ projectId }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    base44.entities.DailyReport.filter({ project_id: projectId }, '-report_date')
      .then(setReports)
      .catch(() => setError(true));
  }, [projectId]);

  const link = date => createPageUrl(`DailyReport?project=${projectId}&date=${date}`);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-[#0f2a5e] text-lg">Daily Reports</h2>
        <Button asChild className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white">
          <Link to={link(todayStr())}><Plus className="w-4 h-4 mr-1" /> Today&apos;s report</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">Could not load reports. Check the connection and try again.</p>
      ) : reports === null ? (
        <p className="text-sm text-gray-400 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No daily reports for this project yet.</p>
      ) : (
        <ul className="grid gap-2">
          {reports.map(r => {
            const workers = (r.manpower || []).reduce((s, m) => s + (Number(m.workers) || 0), 0);
            return (
              <li key={r.id}>
                <Link
                  to={link(r.report_date)}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-[#0f2a5e] hover:border-[#0f2a5e] hover:text-white transition-all group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#0f2a5e] group-hover:text-white">{formatDate(r.report_date)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-sm text-gray-500 group-hover:text-blue-200 flex flex-wrap gap-x-3 mt-0.5">
                      {r.superintendent && <span>{r.superintendent}</span>}
                      <span className="inline-flex items-center gap-1"><HardHat className="w-3.5 h-3.5" />{workers} on site</span>
                      <span className="inline-flex items-center gap-1"><Camera className="w-3.5 h-3.5" />{r.photos?.length || 0} photo{r.photos?.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
