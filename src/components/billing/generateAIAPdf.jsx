import { jsPDF } from "jspdf";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69986966442e93bb8f52d310/5f8462f80_whayland-logo-white1.png";

const $ = (v) =>
  v == null
    ? "0.00"
    : Math.abs(Number(v)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const sortedItems = [...lineItems].sort((a, b) => {
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

  // ── LOGO above the top rule, preserving aspect ratio ──────────────────────
  const logoH = 44;
  const logoW = logoData ? logoH * (2.5) : 0; // will be overridden after image load measurement
  if (logoData) {
    // measure natural size via a temp canvas trick is not available here;
    // we know from the uploaded image it is roughly 3:1 wide
    const lH = 44;
    const lW = lH * 3.2;
    doc.addImage(logoData, "PNG", PW - M - lW, M - 10, lW, lH);
  }

  // Title & top rule
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PAYMENT APPLICATION", M, M + 20);

  doc.setDrawColor(0);
  doc.setLineWidth(1.5);
  const lineY = M + 30;
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
  const pCol = 245;
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
  const aCol = 500;
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

  // ── LEFT HALF: Contractor's Summary of Work ───────────────────────────────
  // Left column runs from M to midpoint (~396pt); right column from 410 to PW-M
  const leftW = 360;
  const sumColW = leftW - 10; // width for label + value

  const sumY = divY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CONTRACTOR'S SUMMARY OF WORK", M, sumY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Application is made for payment as shown below.", M, sumY + 14);
  doc.text("Continuation Page is attached.", M, sumY + 24);

  const valX = M + sumColW; // right-align values here

  const summaryRows = [
    ["1. CONTRACT AMOUNT", s.originalContractSum],
    ["2. SUM OF ALL CHANGE ORDERS", s.changeOrderNet],
    ["3. CURRENT CONTRACT AMOUNT (Line 1 + 2)", s.contractSumToDate],
    ["4. TOTAL COMPLETED AND STORED\n    (Column G on Continuation Page)", s.totalCompletedStored],
  ];

  let rY = sumY + 38;
  doc.setFontSize(8.5);
  summaryRows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    const lines = label.split("\n");
    lines.forEach((l, i) => doc.text(l, M, rY + i * 10));
    doc.setFont("helvetica", "normal");
    doc.text($(val), valX, rY, { align: "right" });
    rY += lines.length > 1 ? 22 : 14;
  });

  doc.setFont("helvetica", "bold");
  doc.text("5. RETAINAGE:", M, rY);
  rY += 12;
  const retPct = s.totalCompletedStored ? ((s.totalRetainage / s.totalCompletedStored) * 100).toFixed(1) : "0.0";
  doc.setFont("helvetica", "normal");
  doc.text(`   A. ${retPct}% Of Completed Work`, M, rY);
  doc.text($(s.totalRetainage), valX, rY, { align: "right" });
  rY += 12;
  doc.text("   B. 0% of Material Stored", M, rY);
  doc.text("0.00", valX, rY, { align: "right" });
  rY += 12;
  doc.text("   Total Retainage (Line 5a + 5b or Column I)", M, rY);
  doc.text($(s.totalRetainage), valX, rY, { align: "right" });
  rY += 14;

  [
    ["6. TOTAL COMPLETED AND STORED LESS RETAINAGE:\n    (Line 4 minus Line 5 Total)", s.totalEarnedLessRetainage],
    ["7. LESS PREVIOUS CERTIFICATES FOR PAYMENT:", s.previousCertificates],
    ["8. CURRENT PAYMENT DUE:", s.currentPaymentDue],
  ].forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    const lines = label.split("\n");
    lines.forEach((l, i) => doc.text(l, M, rY + i * 10));
    doc.text($(val), valX, rY, { align: "right" });
    rY += lines.length > 1 ? 22 : 14;
  });

  doc.setFont("helvetica", "bold");
  doc.text("9. BALANCE TO FINISH:", M, rY);
  doc.text($(s.balanceToFinish), valX, rY, { align: "right" });
  rY += 14;

  // Change order table
  const coW = leftW;
  doc.setLineWidth(0.5);
  doc.rect(M, rY, coW, 11, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY OF CHANGE ORDERS", M + 3, rY + 8);
  doc.text("ADDITIONS", M + coW - 110, rY + 8);
  doc.text("DEDUCTIONS", M + coW - 55, rY + 8);
  rY += 11;

  [
    ["Total changes approved in previous months", 0, 0],
    ["Total approved this month", period.change_order_additions || 0, period.change_order_deductions || 0],
  ].forEach(([label, add, ded]) => {
    doc.rect(M, rY, coW, 11, "S");
    doc.setFont("helvetica", "normal");
    doc.text(label, M + 3, rY + 8);
    doc.text($(add), M + coW - 65, rY + 8, { align: "right" });
    doc.text($(ded), M + coW - 3, rY + 8, { align: "right" });
    rY += 11;
  });

  doc.rect(M, rY, coW, 11, "S");
  doc.setFont("helvetica", "bold");
  doc.text("TOTALS", M + coW / 2, rY + 8, { align: "center" });
  doc.text($(period.change_order_additions || 0), M + coW - 65, rY + 8, { align: "right" });
  doc.text($(period.change_order_deductions || 0), M + coW - 3, rY + 8, { align: "right" });
  rY += 11;

  doc.rect(M, rY, coW, 11, "S");
  doc.text("NET CHANGES", M + coW / 2, rY + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text($((period.change_order_additions || 0) - (period.change_order_deductions || 0)), M + coW - 65, rY + 8, { align: "right" });

  // ── RIGHT HALF: Certification ─────────────────────────────────────────────
  const rCol = M + leftW + 20;
  const rW = PW - M - rCol;
  let cY = sumY;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const certText = "Contractor's signature below is his assurance to Owner, concerning the payment herein applied for, that: (1) the Work has been performed as required in the Contract Documents, (2) all sums previously paid to Contractor under the Contract have been used to pay Contractor's costs for labor, materials and other obligations under the Contract for Work previously paid for, and (3) Contractor is legally entitled to this payment.";
  doc.text(doc.splitTextToSize(certText, rW), rCol, cY);

  cY += 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CONTRACTOR:  THE WHAYLAND COMPANY, LLC, CONST MANAGER", rCol, cY);
  cY += 14;
  doc.text("By:", rCol, cY);
  doc.line(rCol + 14, cY, rCol + rW * 0.6, cY);
  doc.text("Date:", rCol + rW * 0.6 + 5, cY);
  doc.line(rCol + rW * 0.6 + 30, cY, PW - M, cY);
  cY += 11;
  doc.setFont("helvetica", "normal");
  doc.text("State of: Delaware", rCol, cY);
  cY += 11;
  doc.text("County of: Sussex", rCol, cY);
  cY += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ARCHITECT'S CERTIFICATION", rCol, cY);
  cY += 12;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const archText = "Architect's signature below is his assurance to Owner, concerning the payment herein applied for, that: (1) Architect has inspected the Work represented by this Application, (2) such Work has been completed to the extent indicated, and the quality of workmanship and materials conforms with the Contract Documents, (3) this Application for Payment accurately states the amount of Work completed and payment due therefor, and (4) Architect knows of no reason why payment should not be made.";
  doc.text(doc.splitTextToSize(archText, rW), rCol, cY);
  cY += 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CERTIFIED AMOUNT:", rCol, cY);
  doc.line(rCol + 95, cY, PW - M, cY);
  cY += 14;
  doc.text("ARCHITECT:", rCol, cY);
  doc.setFont("helvetica", "normal");
  doc.text(project.owner_contact || "—", rCol + 60, cY);
  cY += 14;
  doc.setFont("helvetica", "bold");
  doc.text("By:", rCol, cY);
  doc.line(rCol + 14, cY, rCol + rW * 0.6, cY);
  doc.text("Date:", rCol + rW * 0.6 + 5, cY);
  doc.line(rCol + rW * 0.6 + 30, cY, PW - M, cY);
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