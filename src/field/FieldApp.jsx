import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { LogOut, Loader2, ClipboardList, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import DailyReport from '@/pages/DailyReport';
import SetupPage from '@/field/SetupPage';
import ReportsPage from '@/field/ReportsPage';
import ProjectsPage from '@/field/ProjectsPage';
import NewProjectPage from '@/field/NewProjectPage';
import AddExistingPage from '@/field/AddExistingPage';
import ProjectStartupPage from '@/field/ProjectStartupPage';
import AccessPage from '@/field/AccessPage';
import { loadMyRole } from '@/field/accessData';
import { can } from '@/field/roles';
import { initAuth, signIn, signOut, currentAccount } from '@/field/auth';

import logoUrl from '@/field/whayland-logo.png';

function Logo({ className }) {
  return <img src={logoUrl} alt="Whayland" className={className} />;
}

function SignIn({ error }) {
  const offline = navigator.onLine === false;
  return (
    <div className="min-h-screen bg-[#0f2a5e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <Logo className="h-20 w-auto mx-auto mb-6" />
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <div className="inline-flex p-3 rounded-xl text-blue-600 bg-blue-50"><ClipboardList className="w-7 h-7" /></div>
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Field Reports</h1>
          <p className="text-gray-600">Sign in with your Whayland Microsoft account — the same email and password you use for Outlook.</p>
          {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
          {offline ? (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">You need signal to sign in the first time. After that the app works without signal.</p>
          ) : (
            <Button onClick={signIn} className="w-full h-12 bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold text-base">
              Sign in with Microsoft
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Daily Report', area: 'daily' },
  { to: '/projects', label: 'Projects', area: 'projectsView' },
  { to: '/reports', label: 'Reports', area: 'reports' },
  { to: '/access', label: 'Access', area: 'admin' },
];

function NoAccess() {
  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-gray-200 p-6 text-center space-y-3">
      <div className="inline-flex p-3 rounded-xl text-[#0f2a5e] bg-blue-50"><Lock className="w-6 h-6" /></div>
      <h1 className="text-xl font-bold text-[#0f2a5e]">You don’t have access to this</h1>
      <p className="text-gray-600">Ask Wendy if you need it.</p>
      <Link to="/" className="inline-block text-[#1e3a8a] font-semibold underline">Back to the start</Link>
    </div>
  );
}

// Shows the page only to roles allowed in that area. readOnlyUnless: people who
// can view but not edit get the page with every button and box turned off.
function Allowed({ area, readOnlyUnless, children }) {
  if (!can(area)) return <NoAccess />;
  if (readOnlyUnless && !can(readOnlyUnless)) {
    return (
      <>
        <p className="max-w-3xl mx-auto mb-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">View only. You can look but not change anything.</p>
        <fieldset disabled className="contents">{children}</fieldset>
      </>
    );
  }
  return children;
}

const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

function Shell({ account, role, children }) {
  const { pathname } = useLocation();
  const nav = NAV.filter(n => can(n.area));
  return (
    <div className="min-h-screen bg-blue-50 print:bg-white">
      <header className="bg-[#0f2a5e] text-white sticky top-0 z-40 shadow print:hidden">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:h-14 sm:py-0">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <Logo className="h-8 w-auto" />
          </Link>
          <nav className={`order-3 sm:order-none w-full sm:w-auto grid ${COLS[nav.length]} sm:flex gap-1`}>
            {nav.map(({ to, label }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
              return (
                <Link key={to} to={to}
                  className={`text-center text-[13px] sm:text-sm font-semibold rounded-md px-1 sm:px-3 py-1.5 whitespace-nowrap ${active ? 'bg-white text-[#0f2a5e]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="text-sm text-blue-100 truncate hidden md:inline">{account.name} · {role}</span>
            <button
              type="button"
              onClick={() => { if (window.confirm('Sign out of Field Reports?')) signOut(); }}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 text-sm text-blue-100 hover:text-white px-2 py-2"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-6 print:p-0">{children}</main>
      {pathname === '/' && can('admin') && (
        <footer className="text-center pb-6 print:hidden">
          <Link to="/setup" className="text-xs text-gray-400 hover:text-gray-600">Site setup (office)</Link>
        </footer>
      )}
    </div>
  );
}

export default function FieldApp() {
  const [state, setState] = useState({ loading: true, account: null, error: '' });

  useEffect(() => {
    initAuth()
      .then(async () => {
        const account = currentAccount();
        const role = account ? await loadMyRole() : 'Field';
        setState({ loading: false, account, role, error: '' });
      })
      .catch(err => setState({ loading: false, account: currentAccount(), error: err.message || 'Sign-in failed. Try again.' }));
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-[#0f2a5e] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (!state.account) return <SignIn error={state.error} />;

  return (
    <HashRouter>
      <Shell account={state.account} role={state.role}>
        <Routes>
          <Route path="/setup" element={<Allowed area="admin"><SetupPage /></Allowed>} />
          <Route path="/access" element={<Allowed area="admin"><AccessPage /></Allowed>} />
          <Route path="/reports" element={<Allowed area="reports"><ReportsPage /></Allowed>} />
          <Route path="/projects" element={<Allowed area="projectsView"><ProjectsPage /></Allowed>} />
          <Route path="/projects/new" element={<Allowed area="projectsEdit"><NewProjectPage /></Allowed>} />
          <Route path="/projects/existing" element={<Allowed area="projectsEdit"><AddExistingPage /></Allowed>} />
          <Route path="/projects/:id" element={<Allowed area="projectsView" readOnlyUnless="projectsEdit"><ProjectStartupPage /></Allowed>} />
          <Route path="*" element={can('daily') ? <DailyReport /> : <Navigate to="/reports" replace />} />
        </Routes>
      </Shell>
      <Toaster />
    </HashRouter>
  );
}
