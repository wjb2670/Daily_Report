import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const fmt = (val) =>
  val == null || val === 0 ? "$0.00" : `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (val) => (val == null ? "0%" : `${Number(val).toFixed(1)}%`);

export default function G703ContinuationSheet({ lineItems, locked, onUpdate }) {
  const [gc1Expanded, setGc1Expanded] = useState(false);
  const [gc2Expanded, setGc2Expanded] = useState(false);
  const hasPhase2 = lineItems.some(l => l.gc_phase === "phase2");

  const cmItems  = lineItems.filter(l => !l.is_general_conditions && l.gc_phase !== "phase2" && !l.is_change_order);
  const gc1Items = lineItems.filter(l => l.is_general_conditions && l.gc_phase !== "phase2");
  const gc2Items = lineItems.filter(l => l.gc_phase === "phase2");
  const coItems  = lineItems
    .filter(l => l.is_change_order)
    .sort((a, b) => {
      const numA = parseInt((a.description || "").match(/CO #(\d+)/)?.[1] || "9999", 10);
      const numB = parseInt((b.description || "").match(/CO #(\d+)/)?.[1] || "9999", 10);
      return numA - numB;
    });

  const gcTotals = (items) => {
    const scheduled = items.reduce((s, l) => s + (l.scheduled_value || 0), 0);
    const previous  = items.reduce((s, l) => s + (l.previous_applications || 0), 0);
    const work      = items.reduce((s, l) => s + (l.work_this_period || 0), 0);
    const materials = items.reduce((s, l) => s + (l.materials_this_period || 0), 0);
    const completed = previous + work + materials;
    const balance   = scheduled - completed;
    const retainage = items.reduce((s, l) => s + (l.retainage_amount || 0), 0);
    const pct       = scheduled ? (completed / scheduled) * 100 : 0;
    return { scheduled, previous, work, materials, completed, balance, retainage, pct };
  };

  const t1 = gcTotals(gc1Items);
  const t2 = gcTotals(gc2Items);

  // Grand totals — sum every item in every column, no exceptions
  const totalScheduled = lineItems.reduce((s, l) => s + (l.scheduled_value || 0), 0);
  const totalPrevious  = lineItems.reduce((s, l) => s + (l.previous_applications || 0), 0);
  const totalWork      = lineItems.reduce((s, l) => s + (l.work_this_period || 0), 0);
  const totalMaterials = lineItems.reduce((s, l) => s + (l.materials_this_period || 0), 0);
  const totalCompleted = lineItems.reduce((s, l) =>
    s + (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);
  const totalBalance   = lineItems.reduce((s, l) => {
    const c = (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0);
    return s + ((l.scheduled_value || 0) - c);
  }, 0);
  const totalRetainage = lineItems.reduce((s, l) => s + (l.retainage_amount || 0), 0);
  const totalReleasedThisPeriod = lineItems.reduce((s, l) => s + (l.retention_released_this_period || 0), 0);
  const totalReleasedToDate = lineItems.reduce((s, l) => s + (l.retention_released_to_date || 0), 0);

  const handleWorkChange = (item, val) => {
    const work = parseFloat(val) || 0;
    const materials = item.materials_this_period || 0;
    const previous = item.previous_applications || 0;
    const retainagePct = item.retainage_percent || 0;
    const completedToDate = previous + work + materials;
    const retainageAmt = completedToDate * (retainagePct / 100);
    onUpdate(item.id, { work_this_period: work, retainage_amount: retainageAmt });
  };

  const handleMaterialsChange = (item, val) => {
    const materials = parseFloat(val) || 0;
    const work = item.work_this_period || 0;
    const previous = item.previous_applications || 0;
    const retainagePct = item.retainage_percent || 0;
    const completedToDate = previous + work + materials;
    const retainageAmt = completedToDate * (retainagePct / 100);
    onUpdate(item.id, { materials_this_period: materials, retainage_amount: retainageAmt });
  };

  const handleRetainagePctChange = (item, val) => {
    const pctVal = parseFloat(val) || 0;
    const completedToDate = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
    const retainageAmt = completedToDate * (pctVal / 100);
    onUpdate(item.id, { retainage_percent: pctVal, retainage_amount: retainageAmt });
  };

  const handleRetainageAmtChange = (item, val) => {
    const retainageAmt = parseFloat(val) || 0;
    onUpdate(item.id, { retainage_amount: retainageAmt });
  };

  const handleRetentionReleasedChange = (item, val) => {
    const released = parseFloat(val) || 0;
    const prevRetainage = item.retainage_amount || 0;
    // New retainage held = old retainage - released this period
    const newRetainageAmt = Math.max(0, prevRetainage - released);
    const releasedToDate = (item.retention_released_to_date || 0) - (item.retention_released_this_period || 0) + released;
    onUpdate(item.id, {
      retention_released_this_period: released,
      retention_released_to_date: releasedToDate,
      retainage_amount: newRetainageAmt,
    });
  };

  const renderEditableRow = (item, displayNum) => {
    const completedToDate  = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
    const totalPctItem     = item.scheduled_value ? (completedToDate / item.scheduled_value) * 100 : 0;
    const balanceToFinish  = (item.scheduled_value || 0) - completedToDate;
    const retainageAmt     = item.retainage_amount || 0;

    return (
      <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-100">
        <td className="py-2 px-1 text-gray-500 text-center">{displayNum}</td>
        <td className="py-2 px-1 font-medium text-gray-800 max-w-[160px]">
          <span className="block truncate" title={item.description}>{item.description}</span>
        </td>
        <td className="py-2 px-1 text-right text-gray-700">{fmt(item.scheduled_value)}</td>
        <td className="py-2 px-1 text-right text-gray-500">{fmt(item.previous_applications)}</td>
        <td className="py-2 px-1 text-right text-blue-600">
          {locked ? fmt(item.work_this_period) : (
            <input
              type="number"
              className="w-24 text-right text-xs border border-blue-200 rounded px-1 py-0.5 text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-300"
              defaultValue={item.work_this_period != null ? Number(item.work_this_period).toFixed(2) : "0.00"}
              key={item.id + "-work"}
              placeholder="0.00"
              step="0.01"
              onFocus={e => e.target.select()}
              onBlur={e => handleWorkChange(item, e.target.value)}
            />
          )}
        </td>
        <td className="py-2 px-1 text-right text-green-600">
          {locked ? fmt(item.materials_this_period) : (
            <input
              type="number"
              className="w-24 text-right text-xs border border-green-200 rounded px-1 py-0.5 text-green-600 focus:outline-none focus:ring-1 focus:ring-green-300"
              defaultValue={item.materials_this_period != null ? Number(item.materials_this_period).toFixed(2) : "0.00"}
              key={item.id + "-mat"}
              placeholder="0.00"
              step="0.01"
              onFocus={e => e.target.select()}
              onBlur={e => handleMaterialsChange(item, e.target.value)}
            />
          )}
        </td>
        <td className="py-2 px-1 text-right font-medium text-gray-800">{fmt(completedToDate)}</td>
        <td className="py-2 px-1 text-right text-gray-600">{pct(totalPctItem)}</td>
        <td className="py-2 px-1 text-right text-gray-500">{fmt(balanceToFinish)}</td>
        <td className="py-2 px-1 text-right text-orange-600">
          {locked ? `${item.retainage_percent ?? 0}%` : (
            <div className="flex items-center justify-end gap-0.5">
              <input
                type="number"
                className="w-14 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-300"
                defaultValue={item.retainage_percent != null ? Number(item.retainage_percent).toFixed(2) : "0.00"}
                key={item.id + "-rpct"}
                placeholder="0.00"
                step="0.01"
                onFocus={e => e.target.select()}
                onBlur={e => handleRetainagePctChange(item, e.target.value)}
                />
              <span className="text-orange-400 text-xs">%</span>
            </div>
          )}
        </td>
        <td className="py-2 px-1 text-right text-orange-600 font-medium">
          {locked ? fmt(retainageAmt) : (
            <input
              type="number"
              className="w-24 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-300"
              defaultValue={retainageAmt != null ? Number(retainageAmt).toFixed(2) : "0.00"}
              key={item.id + "-ramt-" + retainageAmt}
              placeholder="0.00"
              step="0.01"
              onFocus={e => e.target.select()}
              onBlur={e => handleRetainageAmtChange(item, e.target.value)}
            />
          )}
        </td>
        <td className="py-2 px-1 text-right text-teal-700 bg-teal-50/60">
          {locked ? fmt(item.retention_released_this_period || 0) : (
            <input
              type="number"
              className="w-24 text-right text-xs border border-teal-200 rounded px-1 py-0.5 text-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-300 bg-teal-50"
              defaultValue={item.retention_released_this_period != null ? Number(item.retention_released_this_period).toFixed(2) : "0.00"}
              key={item.id + "-retrel-" + (item.retention_released_this_period || 0)}
              placeholder="0.00"
              step="0.01"
              onFocus={e => e.target.select()}
              onBlur={e => handleRetentionReleasedChange(item, e.target.value)}
            />
          )}
        </td>
        <td className="py-2 px-1 text-right text-teal-600 bg-teal-50/40 font-medium">
          {fmt(item.retention_released_to_date || 0)}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-bold text-[#0f2a5e] text-base">Continuation Sheet (G703)</h2>
        <span className="text-xs text-gray-400 ml-2">Retainage % set per line item in the SOV</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          <thead>
            <tr className="border-b-2 border-gray-400 bg-gray-50">
              <th className="text-center py-2 px-1 font-bold text-gray-700 border border-gray-300 w-10">Item #</th>
              <th className="text-left py-2 px-2 font-bold text-gray-700 border border-gray-300 w-40">Description of Work</th>
              <th className="text-right py-2 px-1 font-bold text-gray-700 border border-gray-300">Scheduled<br/>Value</th>
              <th className="text-right py-2 px-1 font-bold text-gray-700 border border-gray-300">Work<br/>Completed<br/>Previous<br/>Periods</th>
              <th className="text-right py-2 px-1 font-bold text-blue-700 border border-gray-300">Work<br/>Completed<br/>This Period</th>
              <th className="text-right py-2 px-1 font-bold text-green-700 border border-gray-300">Materials<br/>Presently<br/>Stored</th>
              <th className="text-right py-2 px-1 font-bold text-gray-700 border border-gray-300">Total<br/>Completed<br/>& Stored</th>
              <th className="text-right py-2 px-1 font-bold text-gray-700 border border-gray-300">%<br/>(G÷C)</th>
              <th className="text-right py-2 px-1 font-bold text-gray-700 border border-gray-300">Balance<br/>to Finish</th>
              <th className="text-right py-2 px-1 font-bold text-orange-700 border border-gray-300">Ret.<br/>%</th>
              <th className="text-right py-2 px-1 font-bold text-orange-700 border border-gray-300">Ret.<br/>$</th>
              <th className="text-right py-2 px-1 font-bold text-teal-700 border border-gray-300 bg-teal-50">Ret.<br/>Released<br/>This Period<br/><span className="font-normal text-teal-400">(screen only)</span></th>
              <th className="text-right py-2 px-1 font-bold text-teal-600 border border-gray-300 bg-teal-50">Ret.<br/>Released<br/>To Date<br/><span className="font-normal text-teal-400">(screen only)</span></th>
            </tr>
          </thead>
          <tbody>
            {/* GC Phase 1 — item 01, lump sum expandable */}
            {gc1Items.length > 0 && (
              <>
                <tr className="bg-amber-50 hover:bg-amber-100 cursor-pointer border-b border-gray-200" onClick={() => setGc1Expanded(v => !v)}>
                  <td className="py-2 px-1 text-center font-bold text-gray-700 border border-gray-300">01</td>
                  <td className="py-2 px-2 border border-gray-300">
                    <span className="flex items-center gap-1 font-bold text-amber-900">
                      {gc1Expanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                      {hasPhase2 ? "General Conditions — 8 Unit Garage" : "General Conditions"}
                    </span>
                  </td>
                  <td className="py-2 px-1 text-right font-semibold text-gray-700 border border-gray-300">{fmt(t1.scheduled)}</td>
                  <td className="py-2 px-1 text-right text-gray-600 border border-gray-300">{fmt(t1.previous)}</td>
                  <td className="py-2 px-1 text-right text-blue-700 font-semibold border border-gray-300">{fmt(t1.work)}</td>
                  <td className="py-2 px-1 text-right text-green-700 font-semibold border border-gray-300">{fmt(t1.materials)}</td>
                  <td className="py-2 px-1 text-right font-semibold text-gray-800 border border-gray-300">{fmt(t1.completed)}</td>
                  <td className="py-2 px-1 text-right text-gray-600 border border-gray-300">{pct(t1.pct)}</td>
                  <td className="py-2 px-1 text-right text-gray-600 border border-gray-300">{fmt(t1.balance)}</td>
                  <td className="py-2 px-1 text-right text-orange-600 font-semibold border border-gray-300">{fmt(t1.retainage)}</td>
                  <td className="py-2 px-1 border border-gray-300 bg-teal-50" />
                  <td className="py-2 px-1 border border-gray-300 bg-teal-50" />
                </tr>
                {gc1Expanded && gc1Items.map((item) => {
                   const completedToDate  = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
                   const totalPctItem     = item.scheduled_value ? (completedToDate / item.scheduled_value) * 100 : 0;
                   const balanceToFinish  = (item.scheduled_value || 0) - completedToDate;
                   const retainageAmt     = item.retainage_amount || 0;
                   return (
                     <tr key={item.id} className="bg-amber-50/40 hover:bg-amber-50 border-b border-amber-100">
                       <td className="py-1.5 px-1 text-center border border-gray-200 text-gray-400 text-xs">—</td>
                       <td className="py-1.5 px-2 border border-gray-200 pl-6 max-w-[160px]"><span className="block truncate text-xs" title={item.description}>{item.description}</span></td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs">{fmt(item.scheduled_value)}</td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs text-gray-500">{fmt(item.previous_applications)}</td>
                       <td className="py-1.5 px-1 text-right text-amber-600 border border-gray-200 text-xs">
                         {locked ? fmt(item.work_this_period) : (
                           <input
                             type="number"
                             className="w-20 text-right text-xs border border-amber-200 rounded px-1 py-0.5 text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-300"
                             defaultValue={item.work_this_period != null ? Number(item.work_this_period).toFixed(2) : "0.00"}
                             key={item.id + "-work"}
                             placeholder="0.00"
                             step="0.01"
                             onBlur={e => handleWorkChange(item, e.target.value)}
                           />
                         )}
                       </td>
                       <td className="py-1.5 px-1 text-right text-amber-600 border border-gray-200 text-xs">
                         {locked ? fmt(item.materials_this_period) : (
                           <input
                             type="number"
                             className="w-20 text-right text-xs border border-amber-200 rounded px-1 py-0.5 text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-300"
                             defaultValue={item.materials_this_period != null ? Number(item.materials_this_period).toFixed(2) : "0.00"}
                             key={item.id + "-mat"}
                             placeholder="0.00"
                             step="0.01"
                             onBlur={e => handleMaterialsChange(item, e.target.value)}
                           />
                         )}
                       </td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs font-medium">{fmt(completedToDate)}</td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs text-gray-500">{pct(totalPctItem)}</td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs text-gray-500">{fmt(balanceToFinish)}</td>
                       <td className="py-1.5 px-1 text-right text-amber-600 border border-gray-200 text-xs">
                         {locked ? `${item.retainage_percent ?? 0}%` : (
                           <div className="flex items-center justify-end gap-0.5">
                             <input
                               type="number"
                               className="w-12 text-right text-xs border border-amber-200 rounded px-1 py-0.5 text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-300"
                               defaultValue={item.retainage_percent != null ? Number(item.retainage_percent).toFixed(2) : "0.00"}
                               key={item.id + "-rpct"}
                               placeholder="0.00"
                               step="0.01"
                               onBlur={e => handleRetainagePctChange(item, e.target.value)}
                             />
                             <span className="text-amber-400 text-xs">%</span>
                           </div>
                         )}
                       </td>
                       <td className="py-1.5 px-1 text-right text-amber-600 border border-gray-200 text-xs">
                         {locked ? fmt(retainageAmt) : (
                           <input
                             type="number"
                             className="w-20 text-right text-xs border border-amber-200 rounded px-1 py-0.5 text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-300"
                             defaultValue={retainageAmt != null ? Number(retainageAmt).toFixed(2) : "0.00"}
                             key={item.id + "-ramt-" + retainageAmt}
                             placeholder="0.00"
                             step="0.01"
                             onBlur={e => handleRetainageAmtChange(item, e.target.value)}
                           />
                         )}
                       </td>
                     </tr>
                   );
                 })}
              </>
            )}

            {/* CM line items — editable, numbered 02 onward */}
            {cmItems.map((item, idx) =>
              renderEditableRow(item, String((gc1Items.length > 0 ? 1 : 0) + idx + 2).padStart(2, "0"))
            )}

            {/* Change Order line items */}
            {coItems.map((item, idx) => {
              const isAddition = item.co_type === "addition";
              const completedToDate = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
              const totalPctItem = item.scheduled_value ? (completedToDate / item.scheduled_value) * 100 : 0;
              const balanceToFinish = (item.scheduled_value || 0) - completedToDate;
              const retainageAmt = item.retainage_amount || 0;
              return (
                <tr key={item.id} className={`border-b border-gray-100 ${isAddition ? "bg-green-50/40" : "bg-red-50/40"}`}>
                  <td className="py-2 px-1 text-center text-gray-400 border border-gray-200 text-xs">CO{idx + 1}</td>
                  <td className="py-2 px-2 font-medium max-w-[160px] border border-gray-200">
                    <span className={`block truncate text-xs ${isAddition ? "text-green-700" : "text-red-600"}`} title={item.description}>
                      {item.description}
                    </span>
                  </td>
                  <td className="py-2 px-1 text-right border border-gray-200 text-xs text-gray-600">{fmt(item.scheduled_value)}</td>
                  <td className="py-2 px-1 text-right border border-gray-200 text-xs text-gray-400">{fmt(item.previous_applications)}</td>
                  <td className="py-2 px-1 text-right text-blue-600 border border-gray-200">
                    {locked ? fmt(item.work_this_period) : (
                      <input
                        type="number"
                        className="w-24 text-right text-xs border border-blue-200 rounded px-1 py-0.5 text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-300"
                        defaultValue={item.work_this_period != null ? Number(item.work_this_period).toFixed(2) : "0.00"}
                        key={item.id + "-work"}
                        placeholder="0.00"
                        step="0.01"
                        onFocus={e => e.target.select()}
                        onBlur={e => handleWorkChange(item, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="py-2 px-1 text-right text-green-600 border border-gray-200">
                    {locked ? fmt(item.materials_this_period) : (
                      <input
                        type="number"
                        className="w-24 text-right text-xs border border-green-200 rounded px-1 py-0.5 text-green-600 focus:outline-none focus:ring-1 focus:ring-green-300"
                        defaultValue={item.materials_this_period != null ? Number(item.materials_this_period).toFixed(2) : "0.00"}
                        key={item.id + "-mat"}
                        placeholder="0.00"
                        step="0.01"
                        onFocus={e => e.target.select()}
                        onBlur={e => handleMaterialsChange(item, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="py-2 px-1 text-right font-medium text-gray-800 border border-gray-200 text-xs">{fmt(completedToDate)}</td>
                  <td className="py-2 px-1 text-right text-gray-600 border border-gray-200 text-xs">{pct(totalPctItem)}</td>
                  <td className="py-2 px-1 text-right text-gray-500 border border-gray-200 text-xs">{fmt(balanceToFinish)}</td>
                  <td className="py-2 px-1 text-right text-orange-600 border border-gray-200">
                    {locked ? `${item.retainage_percent ?? 0}%` : (
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          type="number"
                          className="w-14 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-300"
                          defaultValue={item.retainage_percent != null ? Number(item.retainage_percent).toFixed(2) : "0.00"}
                          key={item.id + "-rpct"}
                          placeholder="0.00"
                          step="0.01"
                          onFocus={e => e.target.select()}
                          onBlur={e => handleRetainagePctChange(item, e.target.value)}
                        />
                        <span className="text-orange-400 text-xs">%</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-1 text-right text-orange-600 font-medium border border-gray-200">
                    {locked ? fmt(retainageAmt) : (
                      <input
                        type="number"
                        className="w-24 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-300"
                        defaultValue={retainageAmt != null ? Number(retainageAmt).toFixed(2) : "0.00"}
                        key={item.id + "-ramt-" + retainageAmt}
                        placeholder="0.00"
                        step="0.01"
                        onFocus={e => e.target.select()}
                        onBlur={e => handleRetainageAmtChange(item, e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}

            {/* GC Phase 2 — item 20, lump sum expandable — only shown when project has phase2 items */}
            {hasPhase2 && gc2Items.length > 0 && (
              <>
                <tr className="bg-blue-50 hover:bg-blue-100 cursor-pointer border-b border-gray-200" onClick={() => setGc2Expanded(v => !v)}>
                  <td className="py-2 px-1 text-center font-bold text-gray-700 border border-gray-300">20</td>
                  <td className="py-2 px-2 border border-gray-300">
                    <span className="flex items-center gap-1 font-bold text-blue-900">
                      {gc2Expanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                      General Conditions — 12 Unit Garage
                    </span>
                  </td>
                  <td className="py-2 px-1 text-right font-semibold text-gray-700 border border-gray-300">{fmt(t2.scheduled)}</td>
                  <td className="py-2 px-1 text-right text-gray-600 border border-gray-300">{fmt(t2.previous)}</td>
                  <td className="py-2 px-1 text-right text-blue-700 font-semibold border border-gray-300">{fmt(t2.work)}</td>
                  <td className="py-2 px-1 text-right text-green-700 font-semibold border border-gray-300">{fmt(t2.materials)}</td>
                  <td className="py-2 px-1 text-right font-semibold text-gray-800 border border-gray-300">{fmt(t2.completed)}</td>
                  <td className="py-2 px-1 text-right text-gray-600 border border-gray-300">{pct(t2.pct)}</td>
                  <td className="py-2 px-1 text-right text-gray-600 border border-gray-300">{fmt(t2.balance)}</td>
                  <td className="py-2 px-1 text-right text-orange-600 font-semibold border border-gray-300">{fmt(t2.retainage)}</td>
                </tr>
                {gc2Expanded && gc2Items.map((item) => {
                   const completedToDate  = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
                   const totalPctItem     = item.scheduled_value ? (completedToDate / item.scheduled_value) * 100 : 0;
                   const balanceToFinish  = (item.scheduled_value || 0) - completedToDate;
                   const retainageAmt     = item.retainage_amount || 0;
                   return (
                     <tr key={item.id} className="bg-blue-50/40 hover:bg-blue-50 border-b border-blue-100">
                       <td className="py-1.5 px-1 text-center border border-gray-200 text-gray-400 text-xs">—</td>
                       <td className="py-1.5 px-2 border border-gray-200 pl-6 max-w-[160px]"><span className="block truncate text-xs" title={item.description}>{item.description}</span></td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs">{fmt(item.scheduled_value)}</td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs text-gray-500">{fmt(item.previous_applications)}</td>
                       <td className="py-1.5 px-1 text-right text-blue-600 border border-gray-200 text-xs">
                         {locked ? fmt(item.work_this_period) : (
                           <input
                             type="number"
                             className="w-20 text-right text-xs border border-blue-200 rounded px-1 py-0.5 text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-300"
                             defaultValue={item.work_this_period != null ? Number(item.work_this_period).toFixed(2) : "0.00"}
                             key={item.id + "-work"}
                             placeholder="0.00"
                             step="0.01"
                             onBlur={e => handleWorkChange(item, e.target.value)}
                           />
                         )}
                       </td>
                       <td className="py-1.5 px-1 text-right text-green-600 border border-gray-200 text-xs">
                         {locked ? fmt(item.materials_this_period) : (
                           <input
                             type="number"
                             className="w-20 text-right text-xs border border-green-200 rounded px-1 py-0.5 text-green-600 focus:outline-none focus:ring-1 focus:ring-green-300"
                             defaultValue={item.materials_this_period != null ? Number(item.materials_this_period).toFixed(2) : "0.00"}
                             key={item.id + "-mat"}
                             placeholder="0.00"
                             step="0.01"
                             onBlur={e => handleMaterialsChange(item, e.target.value)}
                           />
                         )}
                       </td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs font-medium">{fmt(completedToDate)}</td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs text-gray-500">{pct(totalPctItem)}</td>
                       <td className="py-1.5 px-1 text-right border border-gray-200 text-xs text-gray-500">{fmt(balanceToFinish)}</td>
                       <td className="py-1.5 px-1 text-right text-orange-600 border border-gray-200 text-xs">
                         {locked ? `${item.retainage_percent ?? 0}%` : (
                           <div className="flex items-center justify-end gap-0.5">
                             <input
                               type="number"
                               className="w-12 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-300"
                               defaultValue={item.retainage_percent != null ? Number(item.retainage_percent).toFixed(2) : "0.00"}
                               key={item.id + "-rpct"}
                               placeholder="0.00"
                               step="0.01"
                               onBlur={e => handleRetainagePctChange(item, e.target.value)}
                             />
                             <span className="text-orange-400 text-xs">%</span>
                           </div>
                         )}
                       </td>
                       <td className="py-1.5 px-1 text-right text-orange-600 border border-gray-200 text-xs">
                         {locked ? fmt(retainageAmt) : (
                           <input
                             type="number"
                             className="w-20 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-300"
                             defaultValue={retainageAmt != null ? Number(retainageAmt).toFixed(2) : "0.00"}
                             key={item.id + "-ramt-" + retainageAmt}
                             placeholder="0.00"
                             step="0.01"
                             onBlur={e => handleRetainageAmtChange(item, e.target.value)}
                           />
                         )}
                       </td>
                     </tr>
                   );
                 })}
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-400 bg-gray-100 font-bold text-gray-800">
              <td colSpan={2} className="py-2 px-2 text-xs uppercase tracking-wide border border-gray-300">Grand Totals</td>
              <td className="py-2 px-1 text-right border border-gray-300">{fmt(totalScheduled)}</td>
              <td className="py-2 px-1 text-right border border-gray-300">{fmt(totalPrevious)}</td>
              <td className="py-2 px-1 text-right text-blue-700 border border-gray-300">{fmt(totalWork)}</td>
              <td className="py-2 px-1 text-right text-green-700 border border-gray-300">{fmt(totalMaterials)}</td>
              <td className="py-2 px-1 text-right border border-gray-300">{fmt(totalCompleted)}</td>
              <td className="py-2 px-1 text-right border border-gray-300">
                {totalScheduled ? pct((totalCompleted / totalScheduled) * 100) : "0%"}
              </td>
              <td className="py-2 px-1 text-right border border-gray-300">{fmt(totalBalance)}</td>
              <td className="py-2 px-1 border border-gray-300" />
              <td className="py-2 px-1 text-right text-orange-600 border border-gray-300">{fmt(totalRetainage)}</td>
              <td className="py-2 px-1 text-right text-teal-700 border border-gray-300 bg-teal-50">{fmt(totalReleasedThisPeriod)}</td>
              <td className="py-2 px-1 text-right text-teal-600 border border-gray-300 bg-teal-50">{fmt(totalReleasedToDate)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-100 rounded inline-block" /> Work this period (editable)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-100 rounded inline-block" /> Materials this period (editable)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-100 rounded inline-block" /> {hasPhase2 ? "GC — 8 Unit Garage (item 01)" : "General Conditions (item 01)"}</span>
        {hasPhase2 && <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-100 rounded inline-block" /> GC — 12 Unit Garage (item 20)</span>}
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-100 rounded inline-block" /> Retainage % auto-calculates $ — override $ directly if needed</span>
      </div>
    </div>
  );
}