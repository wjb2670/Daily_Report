// Receipt coding: the PM splits each field receipt across the job's budget
// cost codes. Receipts (what the super sent) and Receipt Coding (the PM's
// split) are separate lists so the field never reads the coding.
import { graph, graphAll } from '@/field/graph';
import { getSite, getListId } from '@/field/spAdapter';
import { getPmDrive, listProjectRecords } from '@/field/projectsData';
import { currentAccount } from '@/field/auth';

export const BUDGET_FOLDER = 'Estimating Turnover Folder';
const listPath = async key => `/sites/${(await getSite()).id}/lists/${await getListId(key)}`;
const QUERY = { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } };
const parse = (s, fallback) => { try { return JSON.parse(s || ''); } catch { return fallback; } };
const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
export const cents = n => Math.round(Number(n || 0) * 100);
export const money = n => (n == null || n === '' ? '' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const toReceipt = item => {
  const f = item.fields || {};
  return {
    id: String(item.id), store: f.Title || 'Receipt', projectId: String(f.ProjectId || ''), jobNumber: f.JobNumber || '',
    date: (f.ReceiptDate || '').slice(0, 10), total: f.Total ?? null, by: f.SubmittedBy || '', email: f.SubmittedEmail || '',
    driveId: f.DriveId || '', fileId: f.FileId || '', fileUrl: f.FileUrl || '', sent: item.createdDateTime || '',
  };
};
const toCoding = item => {
  const f = item.fields || {};
  return { id: String(item.id), receiptId: String(f.ReceiptId || ''), lines: parse(f.LinesJSON, []), by: f.CodedBy || '', at: f.CodedAt || '' };
};

// I am this job's PM when the Project Manager field names me.
export function isMyJob(project, me = currentAccount()) {
  const pm = norm(project?.projectManager); const name = norm(me?.name); const user = norm(me?.email).split('@')[0];
  if (!pm || !name) return false;
  return pm === name || pm.includes(name) || name.includes(pm) || (user && pm.replace(/[^a-z]/g, '').includes(user.replace(/[^a-z]/g, '')));
}

// Every receipt with its job and coding (if any), newest first.
export async function listReceipts() {
  const [rows, codings, projects] = await Promise.all([
    graphAll(`${await listPath('receipts')}/items?$expand=fields&$top=999`),
    graphAll(`${await listPath('receiptCoding')}/items?$expand=fields&$top=999`),
    listProjectRecords(),
  ]);
  const byProject = Object.fromEntries(projects.map(p => [String(p.id), p]));
  const byReceipt = Object.fromEntries(codings.map(toCoding).map(c => [c.receiptId, c]));
  return rows.map(toReceipt)
    .map(r => ({ ...r, project: byProject[r.projectId] || null, coding: byReceipt[r.id] || null }))
    .sort((a, b) => (b.date || b.sent).localeCompare(a.date || a.sent));
}

export async function getReceipt(id) {
  const [item, codings] = await Promise.all([
    graph(`${await listPath('receipts')}/items/${id}?$expand=fields`),
    graphAll(`${await listPath('receiptCoding')}/items?$expand=fields&$filter=fields/ReceiptId eq '${id}'&$top=5`, QUERY),
  ]);
  const r = toReceipt(item);
  const projects = await listProjectRecords();
  return { ...r, project: projects.find(p => String(p.id) === r.projectId) || null, coding: codings[0] ? toCoding(codings[0]) : null };
}

// Lines: [{ code, description, note, amount }]. They must add up to the total.
export async function saveCoding(receipt, lines) {
  const sum = lines.reduce((t, l) => t + cents(l.amount), 0);
  if (receipt.total != null && sum !== cents(receipt.total)) throw new Error(`The lines add up to ${money(sum / 100)}, but the receipt is ${money(receipt.total)}.`);
  if (lines.some(l => !l.code)) throw new Error('Every line needs a cost code.');
  const me = currentAccount() || {};
  const fields = {
    Title: receipt.store, ReceiptId: receipt.id, ProjectId: receipt.projectId, JobNumber: receipt.jobNumber,
    ReceiptDate: receipt.date ? `${receipt.date}T12:00:00Z` : null, ...(receipt.total != null ? { Total: Number(receipt.total) } : {}),
    LinesJSON: JSON.stringify(lines.map(l => ({ code: l.code, description: l.description || '', note: l.note || '', amount: cents(l.amount) / 100 }))),
    CodedBy: me.name || me.email || '', CodedAt: new Date().toISOString(),
  };
  const path = await listPath('receiptCoding');
  if (receipt.coding?.id) await graph(`${path}/items/${receipt.coding.id}/fields`, { method: 'PATCH', body: fields });
  else await graph(`${path}/items`, { method: 'POST', body: { fields } });
  return { by: fields.CodedBy, at: fields.CodedAt };
}

// ---- The job's budget cost codes ------------------------------------------------

export async function getBudgetCodes(projectId) {
  const items = await graphAll(`${await listPath('budgetCodes')}/items?$expand=fields&$filter=fields/ProjectId eq '${projectId}'&$top=5`, QUERY);
  const f = items[0]?.fields;
  return f ? { id: String(items[0].id), codes: parse(f.CodesJSON, []), file: f.SourceFile || '', url: f.SourceUrl || '', loadedBy: f.LoadedBy || '', at: items[0].lastModifiedDateTime } : null;
}

// Excel files in the job's Estimating Turnover Folder (and one level down).
export async function findBudgetFiles(project) {
  if (!project.folderId) throw new Error('This job has no job folder linked yet (Project Startup).');
  const { driveId } = await getPmDrive();
  const kids = await graphAll(`/drives/${driveId}/items/${project.folderId}/children?$select=id,name,folder&$top=999`);
  const folder = kids.find(k => k.folder && norm(k.name) === norm(BUDGET_FOLDER)) || kids.find(k => k.folder && norm(k.name).startsWith('estimating turnover'));
  if (!folder) throw new Error(`There’s no “${BUDGET_FOLDER}” in this job’s folder.`);
  const pick = '$select=id,name,file,folder,webUrl,lastModifiedDateTime&$top=999';
  const top = await graphAll(`/drives/${driveId}/items/${folder.id}/children?${pick}`);
  const inner = (await Promise.all(top.filter(k => k.folder).map(k => graphAll(`/drives/${driveId}/items/${k.id}/children?${pick}`).then(v => v.map(x => ({ ...x, name: `${k.name} / ${x.name}` })))))).flat();
  const files = [...top, ...inner].filter(f => f.file && /\.xls[xm]?$/i.test(f.name));
  // Most likely first: "budget" in the name, then newest.
  return files.map(f => ({ id: f.id, name: f.name, webUrl: f.webUrl, modified: f.lastModifiedDateTime, driveId }))
    .sort((a, b) => (/budget/i.test(b.name) - /budget/i.test(a.name)) || b.modified.localeCompare(a.modified));
}

// Reads cost codes (and their descriptions) from a budget workbook. Amounts
// are ignored. Accepts Whayland codes (01.01000, 02.02521), plain numbers
// (2521) under a "Cost Code" heading, and CSI-style codes (03 30 00, 03-300).
const CODE_RE = /^(\d{2}\.\d{3,5}|\d{2}[ -]\d{2}[ -]\d{2}|\d{2}-\d{3,4}|\d{1,2}-\d{3,5})$/;
export function parseBudgetCodes(XLSX, wb) {
  const out = new Map();
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: false });
    let codeCol = -1;
    rows.forEach(row => {
      const head = row.findIndex(c => typeof c === 'string' && /^\s*(cost\s*code|code|cost\s*code\s*#|cc)\s*$/i.test(c));
      if (head >= 0) { codeCol = head; return; }
      row.forEach((cell, i) => {
        let code = null;
        if (typeof cell === 'string' && CODE_RE.test(cell.trim())) code = cell.trim();
        else if (i === codeCol && cell != null && String(cell).trim() !== '') {
          // Excel turns 01.01000 into 1.01: put the zeros back.
          if (typeof cell === 'number') code = Number.isInteger(cell) ? String(cell) : (() => { const [a, b] = cell.toFixed(5).split('.'); return `${a.padStart(2, '0')}.${b}`; })();
          else if (/^[\d.\- ]{3,}$/.test(String(cell).trim())) code = String(cell).trim();
        }
        if (!code || out.has(code)) return;
        const description = row.slice(i + 1).find(c => typeof c === 'string' && /[a-z]/i.test(c) && !CODE_RE.test(c.trim()));
        out.set(code, { code, description: description ? String(description).trim().slice(0, 120) : '' });
      });
    });
  }
  return [...out.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

export async function loadBudgetCodes(project, file) {
  const meta = await graph(`/drives/${file.driveId}/items/${file.id}?$select=id,name,@microsoft.graph.downloadUrl`);
  const res = await fetch(meta['@microsoft.graph.downloadUrl']);
  if (!res.ok) throw new Error(`Couldn’t download ${file.name}.`);
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' });
  const codes = parseBudgetCodes(XLSX, wb);
  if (!codes.length) throw new Error(`No cost codes found in ${file.name}. The app looks for a “Cost Code” column or codes like 01.01000.`);
  const me = currentAccount() || {};
  const fields = { Title: project.name, ProjectId: String(project.id), CodesJSON: JSON.stringify(codes), SourceFile: file.name, SourceUrl: file.webUrl || '', LoadedBy: me.name || me.email || '' };
  const existing = await getBudgetCodes(project.id);
  const path = await listPath('budgetCodes');
  if (existing) await graph(`${path}/items/${existing.id}/fields`, { method: 'PATCH', body: fields });
  else await graph(`${path}/items`, { method: 'POST', body: { fields } });
  return { codes, file: file.name, url: file.webUrl, loadedBy: fields.LoadedBy, at: new Date().toISOString() };
}

// ---- Weekly export for accounting --------------------------------------------------

export function codingCsv(receipts) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Job', 'Project', 'Receipt date', 'Store', 'Sent by', 'Cost code', 'Description', 'Note', 'Amount', 'Receipt total', 'Coded by', 'Coded on', 'Receipt file']];
  for (const r of receipts.filter(x => x.coding)) {
    for (const l of r.coding.lines) {
      rows.push([r.jobNumber, r.project?.name || '', r.date, r.store, r.by, l.code, l.description, l.note, Number(l.amount).toFixed(2), r.total != null ? Number(r.total).toFixed(2) : '', r.coding.by, (r.coding.at || '').slice(0, 10), r.fileUrl]);
    }
  }
  return rows.map(r => r.map(q).join(',')).join('\r\n');
}
