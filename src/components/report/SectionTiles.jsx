import React from 'react';

// The report's home screen: one dark blue button per section. The section
// name reads first, then what's been entered, then a plain label saying
// whether it's done, still needed, or optional.
// Status lines that the Done / Needed / Optional label already says.
const GENERIC = new Set(['Required', 'Optional', 'Optional — tap if any', 'Added', 'Done', 'Take a few', 'Records itself', 'Uploaded']);

function StatusLabel({ section }) {
  if (section.done) {
    return <span className="inline-block rounded-full bg-green-500 text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1">Done</span>;
  }
  if (section.required) {
    return <span className="inline-block rounded-full bg-amber-400 text-[#0f2a5e] text-xs font-bold uppercase tracking-wide px-2.5 py-1">Needed</span>;
  }
  return <span className="inline-block rounded-full bg-white/15 text-white text-xs font-semibold uppercase tracking-wide px-2.5 py-1">Optional</span>;
}

export default function SectionTiles({ sections, onOpen }) {
  const required = sections.filter(s => s.required);
  const requiredDone = required.filter(s => s.done).length;
  const allDone = requiredDone === required.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-[#0f2a5e] text-xl">Today&apos;s report</h2>
        <span className={`text-base font-bold ${allDone ? 'text-green-700' : 'text-amber-700'}`}>
          {requiredDone} of {required.length} required done
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sections.map(s => {
          const needed = s.required && !s.done;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onOpen(s.key)}
              className={`text-left rounded-xl p-4 min-h-[128px] flex flex-col justify-between gap-3 bg-[#0f2a5e] text-white shadow-md
                transition-all hover:bg-[#1e3a8a] active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300
                ${needed ? 'ring-4 ring-amber-400' : ''}`}
            >
              <div>
                <div className="text-lg sm:text-xl font-bold leading-tight">{s.title}</div>
                <div className="text-base text-blue-100 mt-1 leading-snug">{s.value}</div>
                {s.status && !GENERIC.has(s.status) && <div className="text-sm text-blue-200 mt-0.5 leading-snug">{s.status}</div>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <StatusLabel section={s} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
