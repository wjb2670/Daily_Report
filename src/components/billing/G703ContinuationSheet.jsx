import React from "react";
import { Badge } from "@/components/ui/badge";

const fmt = (val) =>
  val == null || val === 0 ? "$0.00" : `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (val) => (val == null ? "0%" : `${val.toFixed(1)}%`);

export default function G703ContinuationSheet({ lineItems, locked, onUpdate }) {
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-bold text-[#0f2a5e] text-base">Continuation Sheet (G703)</h2>
        <Badge variant="outline" className="text-xs text-gray-500">Read Only</Badge>
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
            {lineItems.map((item, idx) => {
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

                  {/* Editable: Work This Period */}
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

                  {/* Editable: Materials This Period */}
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

                  {/* Retainage checkbox */}
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={!!(item.retainage_percent)}
                      onChange={e => {
                        const pct = e.target.checked ? 10 : 0;
                        const completed = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
                        onUpdate(item.id, { retainage_percent: pct, retainage_amount: completed * (pct / 100) });
                      }}
                      className="cursor-pointer"
                    />
                  </td>

                  {/* Retainage % */}
                  <td className="py-2 px-1 text-right text-orange-500">
                    {item.retainage_percent ? `${item.retainage_percent}%` : "0%"}
                  </td>
                </tr>
              );
            })}
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
      </div>
    </div>
  );
}