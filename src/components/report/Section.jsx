import React from 'react';
import { Info } from 'lucide-react';

export const TONES = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  amber: 'text-amber-600 bg-amber-50',
  purple: 'text-purple-600 bg-purple-50',
  red: 'text-red-600 bg-red-50',
  slate: 'text-slate-600 bg-slate-100',
};

// Card wrapper matching the Project Hub dashboard cards. `instruction` is a
// plain-language line telling the crew exactly what to enter.
export default function Section({ icon: Icon, tone = 'blue', title, subtitle, instruction, action, children }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={`inline-flex p-2 rounded-lg shrink-0 ${TONES[tone]}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-[#0f2a5e] text-lg leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {instruction && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 text-[#0f2a5e] px-3 py-2.5 mb-4 text-[15px] leading-snug">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
          <p>{instruction}</p>
        </div>
      )}
      {children}
    </section>
  );
}
