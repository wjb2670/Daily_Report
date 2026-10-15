import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { TONES } from './Section';

// The report's home screen: one dashboard-style tile per section. Each tile
// shows what's been entered and whether the section still needs attention.
export default function SectionTiles({ sections, onOpen }) {
  const required = sections.filter(s => s.required);
  const requiredDone = required.filter(s => s.done).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-[#0f2a5e] text-lg">Today&apos;s report</h2>
        <span className={`text-sm font-semibold ${requiredDone === required.length ? 'text-green-700' : 'text-amber-700'}`}>
          {requiredDone} of {required.length} required done
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sections.map(s => {
          const Icon = s.icon;
          const needed = s.required && !s.done;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onOpen(s.key)}
              className={`relative text-left bg-white rounded-xl p-4 shadow-sm border-2 transition-all hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]
                ${needed ? 'border-amber-300' : s.done ? 'border-green-200' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex p-2 rounded-lg ${TONES[s.tone]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {s.done
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" aria-label="Done" />
                  : <ChevronRight className="w-5 h-5 text-gray-300" />}
              </div>
              <div className="mt-3 text-xl font-bold text-[#0f2a5e] leading-tight truncate">{s.value}</div>
              <div className="text-sm text-gray-600 mt-0.5 font-medium">{s.title}</div>
              <div className={`text-xs mt-1 font-semibold ${needed ? 'text-amber-700' : s.done ? 'text-green-700' : 'text-gray-400'}`}>
                {s.status}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
