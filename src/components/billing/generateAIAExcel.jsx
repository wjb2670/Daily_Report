import * as XLSX from "xlsx";

const fmtNum = (v) => v == null ? 0 : Number(v);

export function generateAIAExcel({ project, period, lineItems, summaryValues, prevCOAdditions = 0, prevCODeductions = 0 }) {
  const wb = XLSX.utils.book_new();
  const s = summaryValues;

  // ── Sheet 1: G702 Summary ─────────────────────────────────────────────────
  const retPct = s.totalCompletedStored ? ((s.totalRetainage / s.totalCompletedStored) * 100).toFixed(1) : "0.0";
  const thisAdd = period.change_order_additions || 0;
  const thisDed = period.change_order_deductions || 0;
  const totalAdd = prevCOAdditions + thisAdd;
  const totalDed = prevCODeductions + thisDed;

  const g702Data = [
    ["PAYMENT APPLICATION — G702 SUMMARY"],
    [],
    ["Project:", project.name || ""],
    ["Owner:", project.owner_company || project.owner_name || ""],
    ["Architect:", project.owner_contact || ""],
    ["Application #:", period.period_number],
    ["Period Thru:", period.period_end_date || ""],
    ["Date of Contract:", project.start_date || ""],
    [],
    ["CONTRACTOR'S APPLICATION FOR PAYMENT", "", "AMOUNT"],
    ["1.  Original Contract Sum", "", fmtNum(s.originalContractSum)],
    ["2.  Net Change by Change Orders", "", fmtNum(s.changeOrderNet)],
    ["3.  Contract Sum to Date (1 + 2)", "", fmtNum(s.contractSumToDate)],
    ["4.  Total Completed & Stored to Date", "", fmtNum(s.totalCompletedStored)],
    [`5a. Retainage: ${retPct}% of Completed Work`, "", fmtNum(s.totalRetainage)],
    ["5b. Retainage: 0% of Stored Material", "", 0],
    ["5.  Total Retainage (5a + 5b)", "", fmtNum(s.totalRetainage)],
    ["6.  Total Earned Less Retainage (4 - 5)", "", fmtNum(s.totalEarnedLessRetainage)],
    ["7.  Less Previous Certificates for Payment", "", fmtNum(s.previousCertificates)],
    ["8.  Current Payment Due", "", fmtNum(s.currentPaymentDue)],
    ["9.  Balance to Finish, Including Retainage (3 - 6)", "", fmtNum(s.contractSumToDate - s.totalEarnedLessRetainage)],
    [],
    ["CHANGE ORDER SUMMARY", "ADDITIONS", "DEDUCTIONS"],
    ["Total changes approved in previous months", fmtNum(prevCOAdditions), fmtNum(prevCODeductions)],
    ["Total approved this month", fmtNum(thisAdd), fmtNum(thisDed)],
    ["TOTALS", fmtNum(totalAdd), fmtNum(totalDed)],
    ["NET CHANGES by Change Orders", fmtNum(totalAdd - totalDed), ""],
  ];

  const ws702 = XLSX.utils.aoa_to_sheet(g702Data);
  ws702["!cols"] = [{ wch: 52 }, { wch: 18 }, { wch: 18 }];

  // Apply currency format to numeric cells in the summary
  const currFmt = '"$"#,##0.00';
  [10,11,12,13,14,15,16,17,18,19,20,23,24,25,26].forEach(r => {
    ["B","C"].forEach(col => {
      const ref = col + (r + 1);
      if (ws702[ref] && typeof ws702[ref].v === "number") ws702[ref].z = currFmt;
    });
  });

  XLSX.utils.book_append_sheet(wb, ws702, "G702 Summary");

  // ── Sheet 2: G703 Continuation ────────────────────────────────────────────
  const gc1Items = lineItems.filter(l => l.is_general_conditions && l.gc_phase !== "phase2");
  const gc2Items = lineItems.filter(l => l.gc_phase === "phase2");
  const cmItems  = lineItems.filter(l => !l.is_general_conditions && l.gc_phase !== "phase2" && !l.is_change_order);
  const coItems  = lineItems.filter(l => l.is_change_order).sort((a, b) => {
    const numA = parseInt((a.description || "").match(/CO #(\d+)/)?.[1] || "9999", 10);
    const numB = parseInt((b.description || "").match(/CO #(\d+)/)?.[1] || "9999", 10);
    return numA - numB;
  });

  const headers = [
    "Item #", "Description of Work", "Scheduled Value",
    "Work Completed - Previous Periods", "Work Completed - This Period",
    "Materials Presently Stored", "Total Completed & Stored to Date",
    "% Complete (G/C)", "Balance to Finish", "Retainage %", "Retainage $",
  ];

  const makeRow = (itemNum, desc, item, indent = false) => {
    const completed = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
    const pct = item.scheduled_value ? completed / item.scheduled_value : 0;
    const balance = (item.scheduled_value || 0) - completed;
    return [
      indent ? "  — " + itemNum : itemNum,
      indent ? "    " + desc : desc,
      fmtNum(item.scheduled_value),
      fmtNum(item.previous_applications),
      fmtNum(item.work_this_period),
      fmtNum(item.materials_this_period),
      fmtNum(completed),
      pct,
      fmtNum(balance),
      fmtNum(item.retainage_percent) / 100,
      fmtNum(item.retainage_amount),
    ];
  };

  const sumItems = (items) => ({
    scheduled_value: items.reduce((s, l) => s + (l.scheduled_value || 0), 0),
    previous_applications: items.reduce((s, l) => s + (l.previous_applications || 0), 0),
    work_this_period: items.reduce((s, l) => s + (l.work_this_period || 0), 0),
    materials_this_period: items.reduce((s, l) => s + (l.materials_this_period || 0), 0),
    retainage_percent: 0,
    retainage_amount: items.reduce((s, l) => s + (l.retainage_amount || 0), 0),
  });

  const rows = [headers];
  // Track which data rows (0-indexed within rows array, after header) are GC sub-rows
  const gc1SubRowIndices = [];
  const gc2SubRowIndices = [];

  // GC Phase 1 — summary row + collapsed sub-rows
  if (gc1Items.length > 0) {
    rows.push(makeRow("01", gc1Items.length === 1 ? gc1Items[0].description : "General Conditions", sumItems(gc1Items), false));
    gc1Items.forEach((item, i) => {
      gc1SubRowIndices.push(rows.length); // 0-indexed position in rows array
      rows.push(makeRow(`01.${i + 1}`, item.description, item, true));
    });
  }

  // CM items
  cmItems.forEach((item, idx) => {
    rows.push(makeRow(String((gc1Items.length > 0 ? 1 : 0) + idx + 2).padStart(2, "0"), item.description, item, false));
  });

  // Change Order items
  coItems.forEach((item, idx) => {
    rows.push(makeRow(`CO${idx + 1}`, item.description, item, false));
  });

  // GC Phase 2 — summary row + collapsed sub-rows
  if (gc2Items.length > 0) {
    rows.push(makeRow("20", "General Conditions — 12 Unit Garage", sumItems(gc2Items), false));
    gc2Items.forEach((item, i) => {
      gc2SubRowIndices.push(rows.length);
      rows.push(makeRow(`20.${i + 1}`, item.description, item, true));
    });
  }

  // Grand totals
  const totalScheduled = lineItems.reduce((s, l) => s + (l.scheduled_value || 0), 0);
  const totalPrevious  = lineItems.reduce((s, l) => s + (l.previous_applications || 0), 0);
  const totalWork      = lineItems.reduce((s, l) => s + (l.work_this_period || 0), 0);
  const totalMaterials = lineItems.reduce((s, l) => s + (l.materials_this_period || 0), 0);
  const totalCompleted = lineItems.reduce((s, l) => s + (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);
  const totalBalance   = lineItems.reduce((s, l) => {
    const c = (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0);
    return s + ((l.scheduled_value || 0) - c);
  }, 0);
  const totalRetainage = lineItems.reduce((s, l) => s + (l.retainage_amount || 0), 0);

  rows.push(["TOTAL", "", fmtNum(totalScheduled), fmtNum(totalPrevious), fmtNum(totalWork), fmtNum(totalMaterials), fmtNum(totalCompleted), totalScheduled ? totalCompleted / totalScheduled : 0, fmtNum(totalBalance), "", fmtNum(totalRetainage)]);

  const ws703 = XLSX.utils.aoa_to_sheet(rows);
  ws703["!cols"] = [
    { wch: 8 }, { wch: 42 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 13 }, { wch: 16 }, { wch: 12 }, { wch: 16 },
  ];

  // Apply number formats to data rows (skip header at index 0)
  const currencyCols = ["C","D","E","F","G","I","K"];
  const pctCols = ["H","J"];
  for (let r = 1; r < rows.length; r++) {
    currencyCols.forEach(col => {
      const ref = col + (r + 1);
      if (ws703[ref] && typeof ws703[ref].v === "number") ws703[ref].z = '"$"#,##0.00';
    });
    pctCols.forEach(col => {
      const ref = col + (r + 1);
      if (ws703[ref] && typeof ws703[ref].v === "number") ws703[ref].z = "0.0%";
    });
  }

  // Apply row grouping (outline level 1, hidden) to GC sub-rows so they act as a collapsible dropdown
  if (!ws703["!rows"]) ws703["!rows"] = [];
  [...gc1SubRowIndices, ...gc2SubRowIndices].forEach(rowIdx => {
    // rowIdx is 0-based in rows[], Excel sheet row is rowIdx+1 (1-indexed), array index is rowIdx
    if (!ws703["!rows"][rowIdx]) ws703["!rows"][rowIdx] = {};
    ws703["!rows"][rowIdx].level = 1;
    ws703["!rows"][rowIdx].hidden = true;
  });

  XLSX.utils.book_append_sheet(wb, ws703, "G703 Continuation");

  // Download
  const safeName = (project.name || "Project").replace(/[^a-z0-9]/gi, "_");
  XLSX.writeFile(wb, `AIA_${safeName}_Period${period.period_number}.xlsx`);
}