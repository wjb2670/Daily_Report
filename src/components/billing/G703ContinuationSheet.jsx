import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

const fmt = (val) =>
  val == null || val === 0 ? "$0.00" : `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (val) => (val == null ? "0%" : `${val.toFixed(1)}%`);

export default function G703ContinuationSheet({ lineItems, locked, onUpdate }) {
  const [gcExpanded, setGcExpanded] = useState(false);

  const cmItems = lineItems.filter(l => !l.is_general_conditions);
  const gcItems = lineItems.filter(l => l.is_general_conditions);

  // GC lump sum values come directly from the SOV (scheduled_value) and billing fields on each GC line item
  const gcScheduled = gcItems.reduce((s, l) => s + (l.scheduled_value || 0), 0);
  const gcPrevious = gcItems.reduce((s, l) => s + (l.previous_applications || 0), 0);
  const gcWork = gcItems.reduce((s, l) => s + (l.work_this_period || 0), 0);
  const gcMaterials = gcItems.reduce((s, l) => s + (l.materials_this_period || 0), 0);
  const gcCompleted = gcPrevious + gcWork + gcMaterials;
  const gcBalance = gcScheduled - gcCompleted;
  const gcRetainage = gcItems.reduce((s, l) => s + (l.retainage_amount || 0), 0);
  const gcPct = gcScheduled ? (gcCompleted / gcScheduled) * 100 : 0;

  const allItems = [...cmItems, ...(gcItems.length > 0 ? [{ _isGCLumpSum: true }] : [])];

  const totalScheduled = lineItems.reduce((s, l) => s + (l.scheduled_value || 0), 0);
  const totalPrevious = lineItems.reduce((s, l) => s + (l.previous_applications || 0), 0);
  const totalWork = lineItems.reduce((s, l) => s + (l.work_this_period || 0), 0);
  const totalMaterials = lineItems.reduce((s, l) => s + (l.materials_this_period || 0), 0);
  const totalCompleted = lineItems.reduce((s, l) =>
    s + (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);
  const totalBalance = lineItems.reduce((s, l) => {
    const completed = (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0);
    return s + ((l.scheduled_value || 0) - completed);
  }, 0);
  const totalRetainage = lineItems.reduce((s, l) => s + (l.retainage_amount || 0), 0);

  const renderEditableRow = (item, idx) => {
    const completedToDate = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
    const totalPct = item.scheduled_value ? (completedToDate / item.scheduled_value) * 100 : 0;
    const balanceToFinish = (item.scheduled_value || 0) - completedToDate;

    return (
      <tr key={item.id} className="hover:bg-gray-50">
        <td className="py-2 px-1 text-gray-500">{item.item_number || String(idx + 1).padStart(2, "0")}</td>
        <td className="py-2 px-1 font-medium text-gray-800 max-w-[140px] truncate" title={item.description}>
          {item.description}
        </td>
        <td className="py-2 px-1 text-right text-gray-700">{fmt(item.scheduled_value)}</td>
        <td className="py-2 px-1 text-right text-gray-500">{fmt(item.previous_applications)}</td>
        <td className="py-2 px-1 text-right text-blue-600">
          {locked ? fmt(item.work_this_period) : (
            <input
              type="number"
              className="w-20 text-right text-xs border border-blue-200 rounded px-1 py-0.5 text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={item.work_this_period || ""}
              placeholder="0.00"
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                const retainageAmt = val * ((item.retainage_percent || 0) / 100);
                onUpdate(item.id, { work_this_period: val, retainage_amount: retainageAmt });
              }}
            />
          )}
        </td>
        <td className="py-2 px-1 text-right text-green-600">
          {locked ? fmt(item.materials_this_period) : (
            <input
              type="number"
              className="w-20 text-right text-xs border border-green-200 rounded px-1 py-0.5 text-green-600 focus:outline-none focus:ring-1 focus:ring-green-300"
              value={item.materials_this_period || ""}
              placeholder="0.00"
              onChange={e => onUpdate(item.id, { materials_this_period: parseFloat(e.target.value) || 0 })}
            />
          )}
        </td>
        <td className="py-2 px-1 text-right font-medium text-gray-800">{fmt(completedToDate)}</td>
        <td className="py-2 px-1 text-right text-gray-600">{pct(totalPct)}</td>
        <td className="py-2 px-1 text-right text-gray-500">{fmt(balanceToFinish)}</td>
        <td className="py-2 px-1 text-center">
          <input
            type="checkbox"
            disabled={locked}
            checked={!!(item.retainage_percent)}
            onChange={e => {
              const p = e.target.checked ? 10 : 0;
              const completed = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
              onUpdate(item.id, { retainage_percent: p, retainage_amount: completed * (p / 100) });
            }}
            className="cursor-pointer"
          />
        </td>
        <td className="py-2 px-1 text-right text-orange-500">
          {item.retainage_percent ? `${item.retainage_percent}%` : "0%"}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-bold text-[#0f2a5e] text-base">Continuation Sheet (G703)</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-1 font-semibold text-gray-500 w-10">Item #</th>
              <th className="text-left py-2 px-1 font-semibold text-gray-500 w-36">Description</th>
              <th className="text-right py-2 px-1 font-semibold text-gray-500">Scheduled Value</th>
              <th className="text-right py-2 px-1 font-semibold text-gray-500">Previous Apps</th>
              <th className="text-right py-2 px-1 font-semibold text-blue-600">Work This Period</th>
              <th className="text-right py-2 px-1 font-semibold text-green-600">Materials This Period</th>
              <th className="text-right py-2 px-1 font-semibold text-gray-500">Completed To Date</th>
              <th className="text-right py-2 px-1 font-semibold text-gray-500">Total %</th>
              <th className="text-right py-2 px-1 font-semibold text-gray-500">Balance To Finish</th>
              <th className="text-center py-2 px-1 font-semibold text-gray-500">Retainage</th>
              <th className="text-right py-2 px-1 font-semibold text-gray-500">Retainage %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* General Conditions — lump sum row with expand toggle, shown first as item 01 */}
            {gcItems.length > 0 && (
              <>
                <tr
                  className="bg-amber-50/60 hover:bg-amber-50 cursor-pointer"
                  onClick={() => setGcExpanded(v => !v)}
                >
                  <td className="py-2 px-1 text-gray-500">01</td>
                  <td className="py-2 px-1 font-semibold text-amber-800">
                    <span className="flex items-center gap-1">
                      {gcExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      General Conditions
                    </span>
                  </td>
                  <td className="py-2 px-1 text-right font-semibold text-gray-700">{fmt(gcScheduled)}</td>
                  <td className="py-2 px-1 text-right text-gray-500">{fmt(gcPrevious)}</td>
                  <td className="py-2 px-1 text-right text-blue-600 font-semibold">{fmt(gcWork)}</td>
                  <td className="py-2 px-1 text-right text-green-600 font-semibold">{fmt(gcMaterials)}</td>
                  <td className="py-2 px-1 text-right font-semibold text-gray-800">{fmt(gcCompleted)}</td>
                  <td className="py-2 px-1 text-right text-gray-600">{pct(gcPct)}</td>
                  <td className="py-2 px-1 text-right text-gray-500">{fmt(gcBalance)}</td>
                  <td className="py-2 px-1 text-center text-gray-300">—</td>
                  <td className="py-2 px-1 text-right text-orange-500">{fmt(gcRetainage)}</td>
                </tr>

                {/* Expanded GC breakdown rows — read-only */}
                {gcExpanded && gcItems.map((item, idx) => {
                  const completedToDate = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
                  const totalPctItem = item.scheduled_value ? (completedToDate / item.scheduled_value) * 100 : 0;
                  const balanceToFinish = (item.scheduled_value || 0) - completedToDate;
                  return (
                    <tr key={item.id} className="bg-amber-50/30 text-gray-400 italic">
                      <td className="py-1.5 px-1 pl-5 text-gray-400">{item.item_number || String(idx + 1).padStart(2, "0")}</td>
                      <td className="py-1.5 px-1 pl-5 text-gray-500 max-w-[140px] truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-1.5 px-1 text-right">{fmt(item.scheduled_value)}</td>
                      <td className="py-1.5 px-1 text-right">{fmt(item.previous_applications)}</td>
                      <td className="py-1.5 px-1 text-right text-blue-400">{fmt(item.work_this_period)}</td>
                      <td className="py-1.5 px-1 text-right text-green-400">{fmt(item.materials_this_period)}</td>
                      <td className="py-1.5 px-1 text-right">{fmt(completedToDate)}</td>
                      <td className="py-1.5 px-1 text-right">{pct(totalPctItem)}</td>
                      <td className="py-1.5 px-1 text-right">{fmt(balanceToFinish)}</td>
                      <td className="py-1.5 px-1 text-center">—</td>
                      <td className="py-1.5 px-1 text-right text-orange-300">{item.retainage_percent ? `${item.retainage_percent}%` : "0%"}</td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-bold text-gray-700">
              <td colSpan={2} className="py-2 px-1 text-xs uppercase">TOTALS</td>
              <td className="py-2 px-1 text-right">{fmt(totalScheduled)}</td>
              <td className="py-2 px-1 text-right">{fmt(totalPrevious)}</td>
              <td className="py-2 px-1 text-right text-blue-600">{fmt(totalWork)}</td>
              <td className="py-2 px-1 text-right text-green-600">{fmt(totalMaterials)}</td>
              <td className="py-2 px-1 text-right">{fmt(totalCompleted)}</td>
              <td className="py-2 px-1 text-right">
                {totalScheduled ? pct((totalCompleted / totalScheduled) * 100) : "0%"}
              </td>
              <td className="py-2 px-1 text-right">{fmt(totalBalance)}</td>
              <td />
              <td className="py-2 px-1 text-right text-orange-500">{fmt(totalRetainage)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-200 rounded inline-block" /> Read-only / Auto-calculated</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-100 rounded inline-block" /> Work this period (editable)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-100 rounded inline-block" /> Materials this period (editable)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-100 rounded inline-block" /> General Conditions (click to expand)</span>
      </div>
    </div>
  );
}