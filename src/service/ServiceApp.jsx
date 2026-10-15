import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LogOut, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { initAuth, signIn, signOut, currentAccount, isConfigured, CONFIG } from '@/field/auth';
import CallFormPage from './CallFormPage';
import CallsPage from './CallsPage';
import PlanPage from './PlanPage';
import { setupSite } from './data';
import { Card, NavyButton } from './ui';

function Brand({ light }) {
  return (
    <div className={`leading-none ${light ? 'text-white' : 'text-[#0f2a5e]'}`}>
      <div className="font-black tracking-[0.12em] text-base sm:text-lg">SUSSEX IRRIGATION</div>
      <div className={`text-[11px] font-semibold tracking-wide ${light ? 'text-blue-200' : 'text-gray-500'}`}>SERVICE CALLS</div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-lg">
        <Brand />
        <p className="mt-4 text-gray-700">This app isn’t connected to Sussex Irrigation’s Microsoft 365 yet. Register it in Sussex’s Entra admin center and enter the IDs and SharePoint address in <code>src/service/auth.js</code>.</p>
      </Card>
    </div>
  );
}

function SignIn({ error }) {
  return (
    <div className="min-h-screen bg-[#0f2a5e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6"><Brand light /></div>
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Service Calls</h1>
          <p className="text-gray-600">Sign in with your Sussex Irrigation Microsoft account — the same one you use for Outlook.</p>
          {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
          <NavyButton onClick={signIn} className="w-full h-12 text-base">Sign in with Microsoft</NavyButton>
        </div>
      </div>
    </div>
  );
}

function SetupPage() {
  const [steps, setSteps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const run = async () => {
    setBusy(true); setSteps([]); setError(''); setDone(null);
    try { setDone(await setupSite(s => setSteps(x => [...x, s]))); } catch (err) {
      setError(err.status === 404 ? `Couldn’t find the site at ${CONFIG.siteHost}${CONFIG.sitePath}.` : err.status === 403 ? 'Your account can’t change that site. Sign in as a site owner.' : err.message);
    } finally { setBusy(false); }
  };
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">Setup</h1>
      <p className="text-gray-500 mb-5">One time only. Creates the Service Calls, Technicians and Service Settings lists in {CONFIG.siteHost}{CONFIG.sitePath}. Safe to run again.</p>
      <Card>
        <NavyButton onClick={run} disabled={busy}>{busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : 'Set up Service Calls'}</NavyButton>
        <ul className="mt-4 space-y-1 text-sm">{steps.map(s => <li key={s} className="flex gap-2 text-green-800"><CheckCircle2 className="w-4 h-4 mt-0.5" />{s}</li>)}</ul>
        {error && <p className="mt-3 flex gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</p>}
        {done && <p className="mt-3 text-sm text-green-900 bg-green-50 rounded-lg p-3">All set. Next: open <strong>Plan the day</strong> to enter the shop address and add your techs.</p>}
      </Card>
    </div>
  );
}

const tab = ({ isActive }) => `px-3 py-2 rounded-md text-sm font-semibold whitespace-nowrap ${isActive ? 'bg-white text-[#0f2a5e]' : 'text-blue-100 hover:text-white'}`;

function Shell({ account, children }) {
  return (
    <div className="min-h-screen bg-blue-50 print:bg-white">
      <header className="bg-[#0f2a5e] text-white sticky top-0 z-[1000] shadow print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Brand light />
          <nav className="flex gap-1 order-3 sm:order-none w-full sm:w-auto overflow-x-auto">
            <NavLink to="/new" className={tab}>Take a call</NavLink>
            <NavLink to="/calls" className={tab}>Service calls</NavLink>
            <NavLink to="/plan" className={tab}>Plan the day</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-blue-100 hidden md:inline">{account.name}</span>
            <button type="button" aria-label="Sign out" onClick={() => window.confirm('Sign out?') && signOut()} className="p-2 text-blue-100 hover:text-white"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-6 print:p-0">{children}</main>
      <footer className="text-center pb-6 print:hidden"><NavLink to="/setup" className="text-xs text-gray-400">Setup (office)</NavLink></footer>
    </div>
  );
}

export default function ServiceApp() {
  const [state, setState] = useState({ loading: true, account: null, error: '' });
  useEffect(() => {
    if (!isConfigured()) { setState({ loading: false, account: null, error: '' }); return; }
    initAuth()
      .then(() => setState({ loading: false, account: currentAccount(), error: '' }))
      .catch(err => setState({ loading: false, account: currentAccount(), error: err.message }));
  }, []);

  if (!isConfigured()) return <NotConfigured />;
  if (state.loading) return <div className="min-h-screen bg-[#0f2a5e] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!state.account) return <SignIn error={state.error} />;

  return (
    <HashRouter>
      <Shell account={state.account}>
        <Routes>
          <Route path="/new" element={<CallFormPage />} />
          <Route path="/call/:id" element={<CallFormPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/calls" replace />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
