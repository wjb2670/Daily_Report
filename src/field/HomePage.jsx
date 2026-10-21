import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, FolderKanban, Handshake, FileSignature, BookOpen, BarChart3, Users, Calculator, Receipt, HardHat, ChevronRight,
} from 'lucide-react';
import { can, currentRole } from '@/field/roles';
import { currentAccount } from '@/field/auth';
import { listAllSubcontracts } from '@/field/scopesData';

// The app's modules. Each person sees the ones their role allows.
const MODULES = [
  { to: '/report', area: 'daily', icon: ClipboardList, title: 'Daily Report', sub: 'Fill in or review a day on any job' },
  { to: '/job', area: 'daily', icon: HardHat, title: 'Field dashboard', sub: 'What the super sees for a job' },
  { to: '/projects', area: 'projectsView', icon: FolderKanban, title: 'Project Startup', sub: 'New jobs, award, bonds, job folder, field access' },
  { to: '/turnover', area: 'projectsView', icon: Handshake, title: 'Turnover', sub: 'Estimating → PM and super hand-off meeting' },
  { to: '/subcontracts', area: 'subsView', icon: FileSignature, title: 'Subcontracts', sub: 'Scopes, PM approval and contracts', badge: 'queue' },
  { to: '/scope-library', area: 'subsView', icon: BookOpen, title: 'Scope Library', sub: 'Standard scope lines by trade' },
  { to: '/reports', area: 'reports', icon: BarChart3, title: 'Reports', sub: 'Printed daily reports by job and date' },
  { area: 'projectsEdit', icon: Calculator, title: 'Estimating', sub: 'Bids, sub numbers, proposals', soon: true },
  { area: 'projectsEdit', icon: Receipt, title: 'Billing', sub: 'AIA G702/G703 by cost code', soon: true },
  { to: '/access', area: 'admin', icon: Users, title: 'Access', sub: 'Who can use which module' },
];

export default function HomePage() {
  const [waiting, setWaiting] = useState(null);
  const first = (currentAccount()?.name || '').split(' ')[0];

  useEffect(() => {
    if (!can('subsContract')) return;
    listAllSubcontracts().then(all => setWaiting(all.filter(s => s.status === 'PM approved').length)).catch(() => {});
  }, []);

  const mine = MODULES.filter(m => can(m.area));
  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e]">{first ? `Hi, ${first}` : 'Whayland projects'}</h1>
      <p className="text-gray-500 mb-5">{currentRole()} access</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mine.map(m => {
          const body = (
            <>
              <m.icon className={`w-8 h-8 shrink-0 ${m.soon ? 'text-gray-400' : 'text-[#0f2a5e]'}`} />
              <span className="flex-1 min-w-0">
                <span className={`block font-bold text-lg leading-tight ${m.soon ? 'text-gray-500' : 'text-[#0f2a5e]'}`}>{m.title}</span>
                <span className="block text-sm text-gray-500">{m.sub}</span>
                {m.badge === 'queue' && waiting > 0 && <span className="inline-block mt-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5">{waiting} approved scope{waiting === 1 ? '' : 's'} waiting for contracts</span>}
                {m.soon && <span className="inline-block mt-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5">Coming soon</span>}
              </span>
              {!m.soon && <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
            </>
          );
          const cls = 'h-full flex items-center gap-3 rounded-xl border p-4';
          return (
            <li key={m.title}>
              {m.soon ? <div className={`${cls} bg-gray-50 border-dashed border-gray-300`}>{body}</div>
                : <Link to={m.to} className={`${cls} bg-white border-gray-200 shadow-sm hover:border-[#0f2a5e]`}>{body}</Link>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
