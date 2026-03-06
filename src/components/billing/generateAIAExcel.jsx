import * as XLSX from "xlsx";

const fmtNum = (v) => v == null ? 0 : Number(v);
const fmtCur = (v) => v == null ? "$0.00" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v) => v == null ? "0.0%" : Number(v).toFixed(1) + "%";

export function generateAIAExcel({ project, period, lineItems, summaryValues, prevCOAdditions = 0, prevCODeductions = 0 }) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: G702 Summary ─────────────────────────────────────────────────
  const s = summaryValues;
  const retPct = s.totalCompletedStored ? ((s.totalRetainage / s.totalCompletedStored) * 100).toFixed(1) : "0.0";

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
    ["6.  Total Earned Less Retainage (4 – 5)", "", fmtNum(s.totalEarnedLessRetainage)],
    ["7.  Less Previous Certificates for Payment", "", fmtNum(s.previousCertificates)],
    ["8.  Current Payment Due", "", fmtNum(s.currentPaymentDue)],
    ["9.  Balance to Finish, Including Retainage (3 – 6)", "", fmtNum(s.contractSumToDate - s.totalEarnedLessRetainage)],
    [],
    ["CHANGE ORDER SUMMARY", "ADDITIONS", "DEDUCTIONS"],
    ["Total changes approved in previous months", fmtNum(prevCOAdditions), fmtNum(prevCODeductions)],
    ["Total approved this month", fmtNum(period.change_order_additions || 0), fmtNum(period.change_order_deductions || 0)],
    ["TOTALS", fmtNum(prevCOAdditions + (period.change_order_additions || 0)), fmtNum(prevCODeductions + (period.change_order_deductions || 0))],
    ["NET CHANGES by Change Orders", fmtNum((prevCOAdditions + (period.change_order_additions || 0)) - (prevCODeductions + (period.change_order_deductions || 0))), ""],
  ];

  const ws702 = XLSX.utils.aoa_to_sheet(g702Data);

  // Style column widths
  ws702["!cols"] = [{ wch: 50 }, { wch: 18 }, { wch: 18 }];

  // Format currency cells in col C (rows 11-21, 0-indexed = rows 10-20)
  const currencyFmt = '"$"#,##0.00';
  const currencyRows = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 25, 26];
  currencyRows.forEach(r => {
    ["B", "C"].forEach(col => {
      const ref = col + (r + 1);
      if (ws702[ref] && typeof ws702[ref].v === "number") {
        ws702[ref].z = currencyFmt;
      }
    });
  });

  XLSX.utils.book_append_sheet(wb, ws702, "G702 Summary");

  // ── Sheet 2: G703 Continuation Sheet ─────────────────────────────────────
  // Separate GC items to collapse into one group row + sub-rows
  const gcItems = lineItems.filter(l => l.is_general_conditions || l.gc_phase === "phase2");
  const gc1Items = lineItems.filter(l => l.is_general_conditions && l.gc_phase !== "phase2");
  const gc2Items = lineItems.filter(l => l.gc_phase === "phase2");
  const cmItems = lineItems.filter(l => !l.is_general_conditions && l.gc_phase !== "phase2" && !l.is_change_order);
  const coItems = lineItems.filter(l => l.is_change_order).sort((a, b) => {
    const numA = parseInt((a.description || "").match(/CO #(\d+)/)?.[1] || "9999", 10);
    const numB = parseInt((b.description || "").match(/CO #(\d+)/)?.[1] || "9999", 10);
    return numA - numB;
  });

  const headers = [
    "Item #",
    "Description of Work",
    "Scheduled Value",
    "Work Completed — Previous Periods",
    "Work Completed — This Period",
    "Materials Presently Stored",
    "Total Completed & Stored to Date",
    "% Complete (G÷C)",
    "Balance to Finish",
    "Retainage %",
    "Retainage $",
  ];

  const rows = [headers];

  const makeRow = (itemNum, desc, item, isSubItem = false) => {
    const completed = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
    const pct = item.scheduled_value ? (completed / item.scheduled_value) * 100 : 0;
    const balance = (item.scheduled_value || 0) - completed;
    return [
      isSubItem ? "  — " + itemNum : itemNum,
      isSubItem ? "    " + (desc || item.description || "") : (desc || item.description || ""),
      fmtNum(item.scheduled_value),
      fmtNum(item.previous_applications),
      fmtNum(item.work_this_period),
      fmtNum(item.materials_this_period),
      fmtNum(completed),
      fmtNum(pct) / 100,  // as decimal for Excel % format
      fmtNum(balance),
      fmtNum(item.retainage_percent) / 100,
      fmtNum(item.retainage_amount),
    ];
  };

  const gcTotals = (items) => ({
    scheduled_value: items.reduce((s, l) => s + (l.scheduled_value || 0), 0),
    previous_applications: items.reduce((s, l) => s + (l.previous_applications || 0), 0),
    work_this_period: items.reduce((s, l) => s + (l.work_this_period || 0), 0),
    materials_this_period: items.reduce((s, l) => s + (l.materials_this_period || 0), 0),
    retainage_percent: 0,
    retainage_amount: items.reduce((s, l) => s + (l.retainage_amount || 0), 0),
  });

  // GC Phase 1 summary row + sub-items
  if (gc1Items.length > 0) {
    const t1 = gcTotals(gc1Items);
    rows.push(makeRow("01", gc1Items.length > 1 ? "General Conditions" : gc1Items[0].description, t1, false));
    gc1Items.forEach((item, i) => {
      rows.push(makeRow(`01.${i + 1}`, item.description, item, true));
    });
  }

  // CM line items
  cmItems.forEach((item, idx) => {
    rows.push(makeRow(String((gc1Items.length > 0 ? 1 : 0) + idx + 2).padStart(2, "0"), item.description, item, false));
  });

  // Change Orders
  coItems.forEach((item, idx) => {
    rows.push(makeRow(`CO${idx + 1}`, item.description, item, false));
  });

  // GC Phase 2 summary row + sub-items (if any)
  if (gc2Items.length > 0) {
    const t2 = gcTotals(gc2Items);
    rows.push(makeRow("20", "General Conditions — 12 Unit Garage", t2, false));
    gc2Items.forEach((item, i) => {
      rows.push(makeRow(`20.${i + 1}`, item.description, item, true));
    });
  }

  // Grand totals row
  const totalScheduled = lineItems.reduce((s, l) => s + (l.scheduled_value || 0), 0);
  const totalPrevious = lineItems.reduce((s, l) => s + (l.previous_applications || 0), 0);
  const totalWork = lineItems.reduce((s, l) => s + (l.work_this_period || 0), 0);
  const totalMaterials = lineItems.reduce((s, l) => s + (l.materials_this_period || 0), 0);
  const totalCompleted = lineItems.reduce((s, l) => s + (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);
  const totalBalance = lineItems.reduce((s, l) => {
    const c = (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0);
    return s + ((l.scheduled_value || 0) - c);
  }, 0);
  const totalRetainage = lineItems.reduce((s, l) => s + (l.retainage_amount || 0), 0);
  const totalPct = totalScheduled ? totalCompleted / totalScheduled : 0;

  rows.push([
    "TOTAL",
    "",
    fmtNum(totalScheduled),
    fmtNum(totalPrevious),
    fmtNum(totalWork),
    fmtNum(totalMaterials),
    fmtNum(totalCompleted),
    totalPct,
    fmtNum(totalBalance),
    "",
    fmtNum(totalRetainage),
  ]);

  const ws703 = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws703["!cols"] = [
    { wch: 8 },   // Item #
    { wch: 40 },  // Description
    { wch: 16 },  // Scheduled Value
    { wch: 16 },  // Previous
    { wch: 16 },  // This Period
    { wch: 16 },  // Materials
    { wch: 16 },  // Total Completed
    { wch: 12 },  // % Complete
    { wch: 16 },  // Balance
    { wch: 12 },  // Ret %
    { wch: 16 },  // Ret $
  ];

  // Apply number formats to all data rows (skip header row 0)
  const currencyCols = ["C", "D", "E", "F", "G", "I", "K"]; // currency
  const pctCols = ["H", "J"]; // percent

  for (let r = 1; r < rows.length; r++) {
    currencyCols.forEach(col => {
      const ref = col + (r + 1);
      if (ws703[ref] && typeof ws703[ref].v === "number") {
        ws703[ref].z = '"$"#,##0.00';
      }
    });
    pctCols.forEach(col => {
      const ref = col + (r + 1);
      if (ws703[ref] && typeof ws703[ref].v === "number") {
        ws703[ref].z = "0.0%";
      }
    });
  }

  // Group sub-rows for GC dropdown — collect row indices of sub-items
  // Excel row grouping (outline): rows are 1-indexed, header = row 1, data starts row 2
  const groupedRows = [];
  let excelRow = 2; // 1-indexed, header is row 1
  if (gc1Items.length > 0) {
    excelRow++; // skip GC summary row
    gc1Items.forEach(() => {
      groupedRows.push(excelRow);
      excelRow++;
    });
  }
  cmItems.forEach(() => excelRow++);
  coItems.forEach(() => excelRow++);

  // Set row grouping for GC sub-items (outline level 1, collapsed by default)
  if (!ws703["!rows"]) ws703["!rows"] = [];
  groupedRows.forEach(r => {
    const idx = r - 1; // 0-indexed
    if (!ws703["!rows"][idx]) ws703["!rows"][idx] = {};
    ws703["!rows"][idx].level = 1;
    ws703["!rows"][idx].hidden = true; // collapsed by default
  });

  XLSX.utils.book_append_sheet(wb, ws703, "G703 Continuation");

  // ── Download ──────────────────────────────────────────────────────────────
  const projectName = (project.name || "Project").replace(/[^a-z0-9]/gi, "_");
  const filename = `AIA_${projectName}_Period${period.period_number}.xlsx`;
  XLSX.writeFile(wb, filename);
}