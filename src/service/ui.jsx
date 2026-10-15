import React from 'react';

// Small shared pieces for the Service Calls screens.
export const NAVY = '#0f2a5e';

export function Card({ title, subtitle, children, className = '' }) {
  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 ${className}`}>
      {title && <h2 className="font-bold text-[#0f2a5e] text-lg leading-tight">{title}</h2>}
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      {title || subtitle ? <div className="mt-4">{children}</div> : children}
    </section>
  );
}

export function Field({ id, label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {label}{required ? <span className="text-red-600"> *</span> : <span className="font-normal text-gray-400"> (optional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export const inputClass = 'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]';

export function NavyButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props}
      className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  );
}

export function PlainButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props}
      className={`inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md border border-gray-300 bg-white text-[#0f2a5e] font-semibold disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export function waitText(received, now = Date.now()) {
  if (!received) return '';
  const mins = Math.max(0, Math.round((now - Date.parse(received)) / 60000));
  if (mins < 60) return `Waiting ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Waiting ${hrs} hr${hrs === 1 ? '' : 's'}`;
  const days = Math.floor(hrs / 24);
  return `Waiting ${days} day${days === 1 ? '' : 's'}`;
}

export const receivedText = iso => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

export const fullAddress = c => [c.address, c.city, [c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

export function StatusPill({ status }) {
  const styles = {
    Open: 'bg-amber-100 text-amber-800',
    Scheduled: 'bg-blue-100 text-blue-800',
    Completed: 'bg-green-100 text-green-800',
    Canceled: 'bg-gray-100 text-gray-600',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[status] || styles.Open}`}>{status}</span>;
}
