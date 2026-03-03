import { jsPDF } from "jspdf";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69986966442e93bb8f52d310/42d90ce33_6671BlueandGrayLogo.png";

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
      canvas.getContext("2d").drawImage(img, 0, 0);
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

  const rowsPerPage = 22;
  const chunks = [];
  for (let i = 0; i < lineItems.length; i += rowsPerPage) {
    chunks.push(lineItems.slice(i, i + rowsPerPage));
  }
  chunks.forEach((chunk, idx) => {
    doc.addPage();
    drawG703Page(doc, PW, PH, project, period, chunk, idx === chunks.length - 1 ? summaryValues : null, logoData);
  });

  doc.save(`PaymentApplication_${project.name.replace(/\s+/g, "_")}_Period${period.period_number}.pdf`);
}

function drawG702(doc, PW, PH, project, period, s, logoData) {
  const M = 36;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, PH, "F");

  if (logoData) {
    doc.addImage(logoData, "PNG", PW - 178, M - 8, 142, 48);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PAYMENT APPLICATION", M, M + 10);

  doc.setDrawColor(0);
  doc.setLineWidth(1.5);
  doc.line(M, M + 16, PW - M, M + 16);

  const hY = M + 24;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TO:", M, hY);
  doc.setFont("helvetica", "normal");
  const toLines = [
    project.owner_company || project.owner_name || "",
    project.owner_address || "",
    `${project.city || ""} ${project.state || ""} ${project.zip || ""}`.trim(),
  ].filter(Boolean);
  toLines.forEach((line, i) => doc.text(line, M + 22, hY + i * 10));

  doc.setFont("helvetica", "bold");
  doc.text("FROM:", M, hY + 42);
  doc.setFont("helvetica", "normal");
  ["THE WHAYLAND COMPANY, LLC, CONST MANAGER", "100 WEST 10TH STREET", "LAUREL DE 19956"].forEach(
    (line, i) => doc.text(line, M + 32, hY + 42 + i * 10)
  );

  const pCol = M + 200;
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT NAME", pCol, hY);
  doc.text("AND LOCATION:", pCol, hY + 9);
  doc.setFont("helvetica", "normal");
  doc.text(project.name || "", pCol + 80, hY);
  doc.text(`${project.address || ""} ${project.city || ""} ${project.state || ""}`.trim(), pCol + 80, hY + 9);

  doc.setFont("helvetica", "bold");
  doc.text("ARCHITECT:", pCol, hY + 24);
  doc.setFont("helvetica", "normal");
  doc.text(project.owner_contact || "—", pCol + 58, hY + 24);

  const aCol = pCol + 220;
  doc.setFont("helvetica", "bold");
  doc.text("APPLICATION #", aCol, hY);
  doc.setFont("helvetica", "normal");
  doc.text(String(period.period_number), aCol + 80, hY);
  doc.setFont("helvetica", "bold");
  doc.text("PERIOD THRU:", aCol, hY + 14);
  doc.setFont("helvetica", "normal");
  doc.text(period.period_end_date || "—", aCol + 70, hY + 14);
  doc.setFont("helvetica", "bold");
  doc.text("DATE OF CONTRACT:", aCol, hY + 28);
  doc.setFont("helvetica", "normal");
  doc.text(project.start_date || "—", aCol + 90, hY + 28);

  const sumY = hY + 80;
  doc.setLineWidth(0.5);
  doc.line(M, sumY, M + 280, sumY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONTRACTOR'S SUMMARY OF WORK", M, sumY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Application is made for payment as shown below.", M, sumY + 26);
  doc.text("Continuation Page is attached.", M, sumY + 35);

  const summaryRows = [
    ["1. CONTRACT AMOUNT", s.originalContractSum],
    ["2. SUM OF ALL CHANGE ORDERS", s.changeOrderNet],
    ["3. CURRENT CONTRACT AMOUNT (Line 1 + 2)", s.contractSumToDate],
    ["4. TOTAL COMPLETED AND STORED\n    (Column G on Continuation Page)", s.totalCompletedStored],
  ];

  let rY = sumY + 48;
  summaryRows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const lines = label.split("\n");
    lines.forEach((l, i) => doc.text(l, M, rY + i * 9));
    doc.setFont("helvetica", "normal");
    doc.text($(val), M + 265, rY, { align: "right" });
    rY += lines.length > 1 ? 20 : 13;
  });

  doc.setFont("helvetica", "bold");
  doc.text("5. RETAINAGE:", M, rY);
  rY += 11;
  const retPct = s.totalCompletedStored ? ((s.totalRetainage / s.totalCompletedStored) * 100).toFixed(1) : "0.0";
  doc.setFont("helvetica", "normal");
  doc.text(`   A. ${retPct}% Of Completed Work`, M, rY);
  doc.text($(s.totalRetainage), M + 265, rY, { align: "right" });
  rY += 11;
  doc.text("   B. 0% of Material Stored", M, rY);
  doc.text("0.00", M + 265, rY, { align: "right" });
  rY += 11;
  doc.text("   Total Retainage (Line 5a + 5b or Column I)", M, rY);
  doc.text($(s.totalRetainage), M + 265, rY, { align: "right" });
  rY += 13;

  [
    ["6. TOTAL COMPLETED AND STORED LESS RETAINAGE:\n    (Line 4 minus Line 5 Total)", s.totalEarnedLessRetainage],
    ["7. LESS PREVIOUS CERTIFICATES FOR PAYMENT:", s.previousCertificates],
    ["8. CURRENT PAYMENT DUE:", s.currentPaymentDue],
  ].forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    const lines = label.split("\n");
    lines.forEach((l, i) => doc.text(l, M, rY + i * 9));
    doc.text($(val), M + 265, rY, { align: "right" });
    rY += lines.length > 1 ? 20 : 13;
  });

  doc.setFont("helvetica", "bold");
  doc.text("9. BALANCE TO FINISH:", M, rY);
  doc.text($(s.balanceToFinish), M + 265, rY, { align: "right" });
  rY += 13;

  // Change order table
  doc.setLineWidth(0.5);
  doc.rect(M, rY, 280, 10, "S");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY OF CHANGE ORDERS", M + 2, rY + 7);
  doc.text("ADDITIONS", M + 185, rY + 7);
  doc.text("DEDUCTIONS", M + 240, rY + 7);
  rY += 10;

  [
    ["Total changes approved in previous months", 0, 0],
    ["Total approved this month", period.change_order_additions || 0, period.change_order_deductions || 0],
  ].forEach(([label, add, ded]) => {
    doc.rect(M, rY, 280, 10, "S");
    doc.setFont("helvetica", "normal");
    doc.text(label, M + 2, rY + 7);
    doc.text($(add), M + 215, rY + 7, { align: "right" });
    doc.text($(ded), M + 278, rY + 7, { align: "right" });
    rY += 10;
  });

  doc.rect(M, rY, 280, 10, "S");
  doc.setFont("helvetica", "bold");
  doc.text("TOTALS", M + 140, rY + 7, { align: "right" });
  doc.text($(period.change_order_additions || 0), M + 215, rY + 7, { align: "right" });
  doc.text($(period.change_order_deductions || 0), M + 278, rY + 7, { align: "right" });
  rY += 10;

  doc.rect(M, rY, 280, 10, "S");
  doc.text("NET CHANGES", M + 140, rY + 7, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text($((period.change_order_additions || 0) - (period.change_order_deductions || 0)), M + 215, rY + 7, { align: "right" });

  // Right column certification
  const rCol = M + 300;
  const certY = sumY + 14;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  const certText = "Contractor's signature below is his assurance to Owner, concerning the payment herein applied for, that: (1) the Work has been performed as required in the Contract Documents, (2) all sums previously paid to Contractor under the Contract have been used to pay Contractor's costs for labor, materials and other obligations under the Contract for Work previously paid for, and (3) Contractor is legally entitled to this payment.";
  doc.text(doc.splitTextToSize(certText, PW - rCol - M), rCol, certY);

  let cY = certY + 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CONTRACTOR:  THE WHAYLAND COMPANY, LLC, CONST MANAGER", rCol, cY);
  cY += 14;
  doc.text("By:", rCol, cY);
  doc.line(rCol + 12, cY, rCol + 160, cY);
  doc.text("Date:", rCol + 165, cY);
  doc.line(rCol + 182, cY, PW - M, cY);
  cY += 10;
  doc.setFont("helvetica", "normal");
  doc.text("State of: Delaware", rCol, cY);
  cY += 10;
  doc.text("County of: Sussex", rCol, cY);
  cY += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ARCHITECT'S CERTIFICATION", rCol, cY);
  cY += 10;

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  const archText = "Architect's signature below is his assurance to Owner, concerning the payment herein applied for, that: (1) Architect has inspected the Work represented by this Application, (2) such Work has been completed to the extent indicated, and the quality of workmanship and materials conforms with the Contract Documents, (3) this Application for Payment accurately states the amount of Work completed and payment due therefor, and (4) Architect knows of no reason why payment should not be made.";
  doc.text(doc.splitTextToSize(archText, PW - rCol - M), rCol, cY);
  cY += 44;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CERTIFIED AMOUNT:", rCol, cY);
  doc.line(rCol + 85, cY, PW - M, cY);
  cY += 14;
  doc.text("ARCHITECT:", rCol, cY);
  doc.setFont("helvetica", "normal");
  doc.text(project.owner_contact || "—", rCol + 55, cY);
  cY += 12;
  doc.setFont("helvetica", "bold");
  doc.text("By:", rCol, cY);
  doc.line(rCol + 12, cY, rCol + 160, cY);
  doc.text("Date:", rCol + 165, cY);
  doc.line(rCol + 182, cY, PW - M, cY);
}

function drawG703Page(doc, PW, PH, project, period, items, summaryValues, logoData) {
  const M = 28;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, PH, "F");

  doc.setDrawColor(180);
  doc.setLineWidth(1);
  doc.rect(M, M, PW - M * 2, PH - M * 2);

  if (logoData) {
    doc.addImage(logoData, "PNG", PW - M - 145, M + 2, 141, 38);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PAYMENT APPLICATION DETAILS", PW / 2, M + 20, { align: "center" });

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(M, M + 26, PW - M, M + 26);

  const shY = M + 35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Customer:", M + 4, shY);
  doc.setFont("helvetica", "normal");
  doc.text((project.owner_company || project.owner_name || "").toUpperCase(), M + 38, shY);
  doc.setFont("helvetica", "bold");
  doc.text("Project:", M + 4, shY + 10);
  doc.setFont("helvetica", "normal");
  doc.text(project.name.toUpperCase(), M + 28, shY + 10);
  doc.setFont("helvetica", "bold");
  doc.text("Application Number:", PW / 2 + 20, shY);
  doc.setFont("helvetica", "normal");
  doc.text(String(period.period_number), PW / 2 + 100, shY);
  doc.setFont("helvetica", "bold");
  doc.text("For Period Ending:", PW / 2 + 20, shY + 10);
  doc.setFont("helvetica", "normal");
  doc.text(period.period_end_date || "—", PW / 2 + 100, shY + 10);

  const tY = shY + 20;
  const cols = [
    { x: M,       w: 36  },
    { x: M + 36,  w: 145 },
    { x: M + 181, w: 72  },
    { x: M + 253, w: 72  },
    { x: M + 325, w: 72  },
    { x: M + 397, w: 60  },
    { x: M + 457, w: 72  },
    { x: M + 529, w: 36  },
    { x: M + 565, w: 80  },
    { x: M + 645, w: PW - M - 645 - M },
  ];
  const colLabels = ["A", "B", "C", "D", "E", "F", "G", "H\n(G÷C)", "Balance\nTo Finish", "I\nRetainage"];

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
      [9, $(item.retainage_amount)],
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
    doc.text($(s.totalRetainage), cols[9].x + cols[9].w - 2, tMid, { align: "right" });
  }
}