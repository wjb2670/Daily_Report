import { jsPDF } from "jspdf";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69986966442e93bb8f52d310/5f8462f80_whayland-logo-white1.png";

const $ = (v) =>
  v == null
    ? "$0.00"
    : "$" + Math.abs(Number(v)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (v) => (v == null ? "0.00" : Number(v).toFixed(2));

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateAIAPdf({ project, period, lineItems, summaryValues }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();

  const logoData = await loadImage(LOGO_URL);

  drawG702(doc, PW, PH, project, period, summaryValues, logoData);

  // Collapse all GC sub-items into a single "General Conditions" summary row
  const gcItems = lineItems.filter(l => l.is_general_conditions);
  const nonGcItems = lineItems.filter(l => !l.is_general_conditions);

  const gcCollapsed = gcItems.length > 0 ? [{
    item_number: gcItems[0].item_number || "GC",
    description: "General Conditions",
    scheduled_value: gcItems.reduce((s, l) => s + (l.scheduled_value || 0), 0),
    previous_applications: gcItems.reduce((s, l) => s + (l.previous_applications || 0), 0),
    work_this_period: gcItems.reduce((s, l) => s + (l.work_this_period || 0), 0),
    materials_this_period: gcItems.reduce((s, l) => s + (l.materials_this_period || 0), 0),
    retainage_amount: gcItems.reduce((s, l) => s + (l.retainage_amount || 0), 0),
    is_general_conditions: true,
  }] : [];

  const sortedItems = [...nonGcItems, ...gcCollapsed].sort((a, b) => {
    const numA = parseFloat(a.item_number) || 9999;
    const numB = parseFloat(b.item_number) || 9999;
    return numA - numB;
  });

  const rowsPerPage = 22;
  const chunks = [];
  for (let i = 0; i < sortedItems.length; i += rowsPerPage) {
    chunks.push(sortedItems.slice(i, i + rowsPerPage));
  }
  chunks.forEach((chunk, idx) => {
    doc.addPage();
    drawG703Page(doc, PW, PH, project, period, chunk, idx === chunks.length - 1 ? summaryValues : null, logoData);
  });

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

function drawG702(doc, PW, PH, project, period, s, logoData) {
  const M = 36;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, PH, "F");

  // ── LOGO above the top rule, vertically centered in the space above the rule ──
  if (logoData) {
    const lH = 42;
    const lW = lH * 3.2;
    const logoY = M + (55 / 2) - lH / 2;
    doc.addImage(logoData, "PNG", PW - M - lW, logoY, lW, lH);
  }

  // Title & top rule
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PAYMENT APPLICATION", M, M + 20);

  doc.setDrawColor(0);
  doc.setLineWidth(1.5);
  const lineY = M + 55;
  doc.line(M, lineY, PW - M, lineY);

  // ── HEADER ROW: To/From | Project+Architect | App#/Period/Date ─────────────
  // Column positions (landscape 792pt wide, margins 36pt each side = 720pt usable)
  // Col 1: TO/FROM  x=36, w=190
  // Col 2: PROJECT NAME / ARCHITECT  x=240, w=240
  // Col 3: APP# / PERIOD / DATE  x=495, w=180
  // (logo sits on right)

  const hY = lineY + 12;
  doc.setFontSize(8.5);

  // Col 1 – TO
  doc.setFont("helvetica", "bold");
  doc.text("TO:", M, hY);
  doc.setFont("helvetica", "normal");
  const toLines = [
    project.owner_company || project.owner_name || "",
    project.owner_address || "",
    `${project.city || ""} ${project.state || ""} ${project.zip || ""}`.trim(),
  ].filter(Boolean);
  toLines.forEach((line, i) => doc.text(line, M + 22, hY + i * 11));

  // Col 1 – FROM (inline with architect row)
  const fromY = hY + 44;
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", M, fromY);
  doc.setFont("helvetica", "normal");
  ["THE WHAYLAND COMPANY, LLC, CONST MANAGER", "100 WEST 10TH STREET", "LAUREL DE 19956"].forEach(
    (line, i) => doc.text(line, M + 36, fromY + i * 11)
  );

  // Col 2 – PROJECT NAME & LOCATION
  const pCol = 310;
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT NAME", pCol, hY);
  doc.text("AND LOCATION:", pCol, hY + 9);
  doc.setFont("helvetica", "normal");
  doc.text(project.name || "", pCol + 85, hY);
  doc.text(`${project.address || ""} ${project.city || ""} ${project.state || ""}`.trim(), pCol + 85, hY + 9);

  // Col 2 – ARCHITECT (same Y as FROM)
  doc.setFont("helvetica", "bold");
  doc.text("ARCHITECT:", pCol, fromY);
  doc.setFont("helvetica", "normal");
  doc.text(project.owner_contact || "—", pCol + 62, fromY);

  // Col 3 – Application #, Period Thru, Date of Contract
  const aCol = 540;
  doc.setFont("helvetica", "bold");
  doc.text("APPLICATION #:", aCol, hY);
  doc.setFont("helvetica", "normal");
  doc.text(String(period.period_number), aCol + 90, hY);

  doc.setFont("helvetica", "bold");
  doc.text("PERIOD THRU:", aCol, hY + 14);
  doc.setFont("helvetica", "normal");
  doc.text(period.period_end_date || "—", aCol + 80, hY + 14);

  doc.setFont("helvetica", "bold");
  doc.text("DATE OF CONTRACT:", aCol, hY + 28);
  doc.setFont("helvetica", "normal");
  doc.text(project.start_date || "—", aCol + 102, hY + 28);

  // ── DIVIDER between header and body ──────────────────────────────────────
  const divY = fromY + 36;
  doc.setLineWidth(0.5);
  doc.line(M, divY, PW - M, divY);

  // ── TWO-COLUMN BODY ───────────────────────────────────────────────────────
  const leftW = 370;
  const rCol = M + leftW + 14;
  const rW = PW - M - rCol;
  const bodyY = divY + 10;

  // ── LEFT: Contractor's Summary of Work ───────────────────────────────────
  const rowH = 16;
  const labelX = M + 4;
  const valX = M + leftW - 4;

  // Helper: draw a bordered row with label and value
  const drawRow = (label, val, y, h = rowH, bold = false, highlight = false, overrideValX = null) => {
    if (highlight) {
      doc.setFillColor(235, 240, 250);
      doc.rect(M, y, leftW, h, "F");
    }
    doc.setDrawColor(150);
    doc.setLineWidth(0.4);
    doc.rect(M, y, leftW, h, "S");
    doc.setFontSize(8);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const labelLines = doc.splitTextToSize(label, leftW - 80);
    labelLines.forEach((l, i) => doc.text(l, labelX, y + 10 + i * 9));
    doc.setFont("helvetica", "bold");
    doc.text(val, overrideValX !== null ? overrideValX : valX, y + 10, { align: "right" });
  };

  let rY = bodyY;

  // Section header
  doc.setFillColor(15, 42, 94);
  doc.rect(M, rY, leftW, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CONTRACTOR'S APPLICATION FOR PAYMENT", labelX, rY + 10);
  doc.setTextColor(0);
  rY += 14;

  const retPct = s.totalCompletedStored ? ((s.totalRetainage / s.totalCompletedStored) * 100).toFixed(1) : "0.0";
  const indentedValX = valX - 72; // indented value X for 5a/5b (1" = 72pt)

  const summaryRows = [
    ["1.  Original Contract Sum", s.originalContractSum, false, false],
    ["2.  Net Change by Change Orders", s.changeOrderNet, false, false],
    ["3.  Contract Sum to Date (1 + 2)", s.contractSumToDate, false, false],
    ["4.  Total Completed & Stored to Date", s.totalCompletedStored, false, false],
    [`5a. Retainage: ${retPct}% of Completed Work`, s.totalRetainage, false, true],
    ["5b. Retainage: 0% of Stored Material", 0, false, true],
    ["5.  Total Retainage (5a + 5b)", s.totalRetainage, false, false],
    ["6.  Total Earned Less Retainage (4 – 5)", s.totalEarnedLessRetainage, false, false],
    ["7.  Less Previous Certificates for Payment", s.previousCertificates, false, false],
    ["8.  Current Payment Due", s.currentPaymentDue, true, false],
    ["9.  Balance to Finish, Including Retainage (3 – 6)", s.balanceToFinish, false, false],
  ];

  summaryRows.forEach(([label, val, hl, indented]) => {
    drawRow(label, $(val), rY, rowH, hl, hl, indented ? indentedValX : null);
    rY += rowH;
  });

  rY += 8;

  // Change Order Summary table
  const coColLabel = leftW * 0.44;
  const coColAdd = leftW * 0.27;
  const coColDed = leftW * 0.29;

  // Header
  doc.setFillColor(200, 210, 225);
  doc.rect(M, rY, leftW, 13, "F");
  doc.setDrawColor(120);
  doc.setLineWidth(0.4);
  doc.rect(M, rY, leftW, 13, "S");
  doc.line(M + coColLabel, rY, M + coColLabel, rY + 13);
  doc.line(M + coColLabel + coColAdd, rY, M + coColLabel + coColAdd, rY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CHANGE ORDER SUMMARY", M + coColLabel / 2, rY + 9, { align: "center" });
  doc.text("ADDITIONS", M + coColLabel + coColAdd / 2, rY + 9, { align: "center" });
  doc.text("DEDUCTIONS", M + coColLabel + coColAdd + coColDed / 2, rY + 9, { align: "center" });
  rY += 13;

  const coRows = [
    ["Total changes approved\nin previous months", 0, 0],
    ["Total approved this month", period.change_order_additions || 0, period.change_order_deductions || 0],
    ["TOTALS", period.change_order_additions || 0, period.change_order_deductions || 0],
    ["NET CHANGES by Change Orders", (period.change_order_additions || 0) - (period.change_order_deductions || 0), null],
  ];

  coRows.forEach(([label, add, ded], idx) => {
    const ch = idx === 0 ? 18 : 13;
    const isTotal = label === "TOTALS" || label.startsWith("NET");
    if (isTotal) {
      doc.setFillColor(230, 235, 245);
      doc.rect(M, rY, leftW, ch, "F");
    }
    doc.setDrawColor(120);
    doc.setLineWidth(0.4);
    doc.rect(M, rY, leftW, ch, "S");
    doc.line(M + coColLabel, rY, M + coColLabel, rY + ch);
    doc.line(M + coColLabel + coColAdd, rY, M + coColLabel + coColAdd, rY + ch);
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setFontSize(7.5);
    const labelLines = doc.splitTextToSize(label, coColLabel - 4);
    const textStartY = ch > 14 ? rY + 8 : rY + 9;
    labelLines.forEach((l, i) => doc.text(l, M + 3, textStartY + i * 8));
    doc.setFont("helvetica", "bold");
    doc.text($(add), M + coColLabel + coColAdd - 3, rY + 9, { align: "right" });
    if (ded !== null) {
      doc.text($(ded), M + coColLabel + coColAdd + coColDed - 3, rY + 9, { align: "right" });
    }
    rY += ch;
  });

  // ── RIGHT: Certification Blocks ───────────────────────────────────────────
  // Calculate total available height for the right column
  const totalRightH = PH - M - bodyY - M; // from bodyY to bottom margin
  const headerH = 14;
  const gap = 10;
  const contBoxH = Math.floor((totalRightH - headerH * 2 - gap) * 0.45);
  const archBoxH = totalRightH - headerH * 2 - gap - contBoxH;

  let cY = bodyY;

  // Contractor certification block
  doc.setFillColor(15, 42, 94);
  doc.rect(rCol, cY, rW, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CONTRACTOR'S CERTIFICATION", rCol + 4, cY + 10);
  doc.setTextColor(0);
  cY += headerH;

  doc.setDrawColor(150);
  doc.setLineWidth(0.4);
  doc.rect(rCol, cY, rW, contBoxH, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const certText = "The undersigned Contractor certifies that to the best of the Contractor's knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous Certificates for Payment were issued and payments received from the Owner, and that current payment shown herein is now due.";
  const certLines = doc.splitTextToSize(certText, rW - 8);
  doc.text(certLines, rCol + 4, cY + 11);

  // Place sig block just below the cert text
  const contSigY = cY + 11 + certLines.length * 7.5 + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CONTRACTOR:", rCol + 4, contSigY);
  doc.setFont("helvetica", "normal");
  doc.text("The Whayland Company, LLC, Const Manager", rCol + 58, contSigY);
  doc.setFont("helvetica", "bold");
  doc.text("Address:", rCol + 4, contSigY + 13);
  doc.setFont("helvetica", "normal");
  doc.text("100 West 10th Street, Laurel, DE 19956", rCol + 42, contSigY + 13);
  doc.setFont("helvetica", "bold");
  doc.text("By:", rCol + 4, contSigY + 26);
  doc.setLineWidth(0.5);
  doc.line(rCol + 18, contSigY + 26, rCol + rW * 0.55, contSigY + 26);
  doc.text("Date:", rCol + rW * 0.57, contSigY + 26);
  doc.line(rCol + rW * 0.57 + 26, contSigY + 26, rCol + rW - 4, contSigY + 26);
  doc.text("Name:", rCol + 4, contSigY + 39);
  doc.line(rCol + 26, contSigY + 39, rCol + rW - 4, contSigY + 39);
  doc.text("Title:", rCol + 4, contSigY + 52);
  doc.line(rCol + 24, contSigY + 52, rCol + rW - 4, contSigY + 52);

  cY += contBoxH + gap;

  // Architect certification block
  doc.setFillColor(15, 42, 94);
  doc.rect(rCol, cY, rW, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("ARCHITECT'S CERTIFICATE FOR PAYMENT", rCol + 4, cY + 10);
  doc.setTextColor(0);
  cY += headerH;

  doc.setDrawColor(150);
  doc.setLineWidth(0.4);
  doc.rect(rCol, cY, rW, archBoxH, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const archText = "In accordance with the Contract Documents, based on on-site observations and the data comprising this application, the Architect certifies to the Owner that to the best of the Architect's knowledge, information and belief the Work has progressed as indicated, the quality of the Work is in accordance with the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED.";
  const archLines = doc.splitTextToSize(archText, rW - 8);
  doc.text(archLines, rCol + 4, cY + 11);

  const archSigY = cY + archBoxH - 68;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("AMOUNT CERTIFIED: $", rCol + 4, archSigY);
  doc.setLineWidth(0.5);
  doc.line(rCol + 100, archSigY, rCol + rW - 4, archSigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const noteText = "(Attach explanation if amount certified differs from the amount applied. Initial all figures on this Application and on the Continuation Sheet that are changed to conform with the amount certified.)";
  doc.text(doc.splitTextToSize(noteText, rW - 8), rCol + 4, archSigY + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("ARCHITECT:", rCol + 4, archSigY + 28);
  doc.setFont("helvetica", "normal");
  doc.text(project.owner_contact || "—", rCol + 50, archSigY + 28);
  doc.setFont("helvetica", "bold");
  doc.text("By:", rCol + 4, archSigY + 41);
  doc.setLineWidth(0.5);
  doc.line(rCol + 18, archSigY + 41, rCol + rW * 0.55, archSigY + 41);
  doc.text("Date:", rCol + rW * 0.57, archSigY + 41);
  doc.line(rCol + rW * 0.57 + 26, archSigY + 41, rCol + rW - 4, archSigY + 41);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named herein.", rCol + 4, archSigY + 55, { maxWidth: rW - 8 });
}

function drawG703Page(doc, PW, PH, project, period, items, summaryValues, logoData) {
  const M = 28;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, PH, "F");

  doc.setDrawColor(180);
  doc.setLineWidth(1);
  doc.rect(M, M, PW - M * 2, PH - M * 2);

  // Logo above the rule, preserving ~3.2:1 aspect ratio
  if (logoData) {
    const lH = 38;
    const lW = lH * 3.2;
    doc.addImage(logoData, "PNG", PW - M - lW - 4, M + 2, lW, lH);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PAYMENT APPLICATION DETAILS", PW / 2, M + 22, { align: "center" });

  // Rule below title/logo
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  const ruleY = M + 46;
  doc.line(M, ruleY, PW - M, ruleY);

  // Info row below rule
  const shY = ruleY + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Customer:", M + 4, shY);
  doc.setFont("helvetica", "normal");
  doc.text((project.owner_company || project.owner_name || "").toUpperCase(), M + 52, shY);

  doc.setFont("helvetica", "bold");
  doc.text("Project:", M + 4, shY + 12);
  doc.setFont("helvetica", "normal");
  doc.text(project.name.toUpperCase(), M + 44, shY + 12);

  doc.setFont("helvetica", "bold");
  doc.text("Application Number:", PW / 2 + 20, shY);
  doc.setFont("helvetica", "normal");
  doc.text(String(period.period_number), PW / 2 + 115, shY);

  doc.setFont("helvetica", "bold");
  doc.text("For Period Ending:", PW / 2 + 20, shY + 12);
  doc.setFont("helvetica", "normal");
  doc.text(period.period_end_date || "—", PW / 2 + 108, shY + 12);

  const tY = shY + 26;
  const cols = [
    { x: M,       w: 36  },
    { x: M + 36,  w: 160 },
    { x: M + 196, w: 78  },
    { x: M + 274, w: 78  },
    { x: M + 352, w: 78  },
    { x: M + 430, w: 64  },
    { x: M + 494, w: 80  },
    { x: M + 574, w: 44  },
    { x: M + 618, w: PW - M - 618 - M },
  ];
  const colLabels = ["A", "B", "C", "D", "E", "F", "G", "H\n(G÷C)", "Balance\nTo Finish"];

  doc.setFillColor(210, 215, 220);
  doc.rect(M, tY, PW - M * 2, 28, "F");
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);

  cols.forEach((col, i) => {
    doc.rect(col.x, tY, col.w, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const lines = colLabels[i].split("\n");
    lines.forEach((l, li) => doc.text(l, col.x + col.w / 2, tY + 8 + li * 8, { align: "center" }));
  });

  // Sub-header row for Work Completed spanning D+E
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text("Work Completed", cols[3].x + (cols[3].w + cols[4].w) / 2, tY + 20, { align: "center" });
  doc.text("Scheduled Value", cols[2].x + cols[2].w / 2, tY + 22, { align: "center" });
  doc.text("From Previous", cols[3].x + cols[3].w / 2, tY + 22, { align: "center" });
  doc.text("This Period", cols[4].x + cols[4].w / 2, tY + 22, { align: "center" });
  doc.text("Materials Stored", cols[5].x + cols[5].w / 2, tY + 22, { align: "center" });
  doc.text("Completed & Stored", cols[6].x + cols[6].w / 2, tY + 20, { align: "center" });
  doc.text("To Date", cols[6].x + cols[6].w / 2, tY + 26, { align: "center" });

  let rowY = tY + 28;
  const rowH = 14;

  items.forEach((item, idx) => {
    const completedToDate = (item.previous_applications || 0) + (item.work_this_period || 0) + (item.materials_this_period || 0);
    const totalPct = item.scheduled_value ? (completedToDate / item.scheduled_value) * 100 : 0;
    const balance = (item.scheduled_value || 0) - completedToDate;

    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(M, rowY, PW - M * 2, rowH, "F");
    }

    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.rect(M, rowY, PW - M * 2, rowH);
    cols.forEach(col => {
      doc.setDrawColor(200);
      doc.line(col.x, rowY, col.x, rowY + rowH);
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(0);

    const rMid = rowY + rowH / 2 + 2.5;
    doc.text(item.item_number || String(idx + 1).padStart(4, "0"), cols[0].x + cols[0].w / 2, rMid, { align: "center" });

    const descLine = doc.splitTextToSize(item.description || "", cols[1].w - 3)[0] || "";
    doc.text(descLine, cols[1].x + 2, rMid);

    [
      [2, $(item.scheduled_value)],
      [3, $(item.previous_applications)],
      [4, $(item.work_this_period)],
      [5, $(item.materials_this_period)],
      [6, $(completedToDate)],
      [7, pct(totalPct) + "%"],
      [8, $(balance)],
    ].forEach(([ci, val]) => {
      doc.text(val, cols[ci].x + cols[ci].w - 2, rMid, { align: "right" });
    });

    rowY += rowH;
  });

  if (summaryValues) {
    const s = summaryValues;
    const totalScheduled = s.originalContractSum + s.changeOrderNet;
    const totalCompleted = s.totalCompletedStored;
    const totalPct = totalScheduled ? (totalCompleted / totalScheduled) * 100 : 0;
    const totalBalance = totalScheduled - totalCompleted;
    const workThisPeriodTotal = totalCompleted - s.previousCertificates;

    doc.setFillColor(210, 215, 220);
    doc.rect(M, rowY, PW - M * 2, rowH, "F");
    doc.setDrawColor(100);
    doc.setLineWidth(0.5);
    doc.rect(M, rowY, PW - M * 2, rowH);
    cols.forEach(col => {
      doc.setDrawColor(150);
      doc.setLineWidth(0.3);
      doc.line(col.x, rowY, col.x, rowY + rowH);
    });

    const tMid = rowY + rowH / 2 + 2.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("TOTAL:", cols[1].x + cols[1].w - 2, tMid, { align: "right" });
    doc.text($(totalScheduled), cols[2].x + cols[2].w - 2, tMid, { align: "right" });
    doc.text($(s.previousCertificates), cols[3].x + cols[3].w - 2, tMid, { align: "right" });
    doc.text($(workThisPeriodTotal), cols[4].x + cols[4].w - 2, tMid, { align: "right" });
    doc.text("0.00", cols[5].x + cols[5].w - 2, tMid, { align: "right" });
    doc.text($(totalCompleted), cols[6].x + cols[6].w - 2, tMid, { align: "right" });
    doc.text(pct(totalPct) + "%", cols[7].x + cols[7].w - 2, tMid, { align: "right" });
    doc.text($(totalBalance), cols[8].x + cols[8].w - 2, tMid, { align: "right" });
  }
}