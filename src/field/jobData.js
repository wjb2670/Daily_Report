// The field dashboard's data: the job folders a crew may open, weekly
// receipts, the 3-week look-ahead, and job events (meetings, inspections).
import { graph, graphAll } from '@/field/graph';
import { getSite, getListId, projectPeopleEmails } from '@/field/spAdapter';
import { getPmDrive, makeFolder, safeName } from '@/field/projectsData';
import { photoQueue } from '@/lib/dailyReportStore';

// Folders in the job folder that superintendents and crew may open (read-only).
export const FIELD_FOLDERS = ['Drawings', 'Inspection Reports', 'Permits', 'RFI', 'Schedule', 'Specifications', 'Submittals'];
// The one folder they may add to.
export const RECEIPTS_FOLDER = 'Weekly Receipts';
// Folders the crew can add files to as well as open.
export const FIELD_UPLOAD_FOLDERS = ['Inspection Reports', 'Permits'];
export const RECEIPTS_DUE_DAY = 5; // Friday

const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

// ---- Office: give the assigned crew access to their job's folders ---------------

async function folderPermissions(driveId, itemId) {
  return graphAll(`/drives/${driveId}/items/${itemId}/permissions`);
}
const permEmail = p => norm(p.grantedToV2?.user?.email || p.grantedTo?.user?.email || p.invitation?.email || p.grantedToV2?.siteUser?.email || '');

export async function syncFieldAccess(project, onStep = () => {}) {
  if (!project.folderId) {
    const err = new Error('Link the job folder first.');
    err.code = 'no_folder';
    throw err;
  }
  const { driveId } = await getPmDrive();
  onStep('Finding the job’s folders');
  const kids = (await graphAll(`/drives/${driveId}/items/${project.folderId}/children?$select=id,name,folder,webUrl&$top=999`)).filter(k => k.folder);
  const folders = {};
  const missing = [];
  for (const name of FIELD_FOLDERS) {
    const f = kids.find(k => norm(k.name) === norm(name));
    if (f) folders[name] = { id: f.id, webUrl: f.webUrl };
    else missing.push(name);
  }
  let receipts = kids.find(k => norm(k.name) === norm(RECEIPTS_FOLDER));
  if (!receipts) {
    onStep(`Creating ${RECEIPTS_FOLDER}`);
    receipts = await makeFolder(driveId, project.folderId, RECEIPTS_FOLDER);
  }

  onStep('Reading who is assigned');
  const people = await projectPeopleEmails(project.id);
  const emails = people.map(p => p.email);
  const before = project.fieldAccess?.emails || [];
  const removed = before.filter(e => !emails.includes(e));

  const grant = async (itemId, role) => {
    if (!emails.length) return;
    await graph(`/drives/${driveId}/items/${itemId}/invite`, {
      method: 'POST',
      body: { requireSignIn: true, sendInvitation: false, roles: [role], recipients: emails.map(email => ({ email })) },
    });
  };
  const revoke = async itemId => {
    if (!removed.length) return;
    const perms = await folderPermissions(driveId, itemId);
    for (const p of perms) {
      if (p.inheritedFrom) continue;
      if (removed.includes(permEmail(p))) await graph(`/drives/${driveId}/items/${itemId}/permissions/${p.id}`, { method: 'DELETE' });
    }
  };

  for (const [name, f] of Object.entries(folders)) {
    const canAdd = FIELD_UPLOAD_FOLDERS.includes(name);
    onStep(`${name}: ${canAdd ? 'view and add-files' : 'view'} access`);
    await grant(f.id, canAdd ? 'write' : 'read');
    await revoke(f.id);
  }
  onStep(`${RECEIPTS_FOLDER}: add-files access`);
  await grant(receipts.id, 'write');
  await revoke(receipts.id);

  const fieldFolders = { driveId, folders, receipts: { id: receipts.id, webUrl: receipts.webUrl } };
  const fieldAccess = { emails, names: people.map(p => p.name), updatedAt: new Date().toISOString(), missing };
  return { fieldFolders, fieldAccess, removed };
}

// ---- Field: browse the job folders ----------------------------------------------

export async function listFolder(driveId, itemId) {
  const items = await graphAll(`/drives/${driveId}/items/${itemId}/children?$select=id,name,folder,file,size,webUrl,lastModifiedDateTime&$top=999`);
  return items
    .map(i => ({ id: i.id, name: i.name, isFolder: !!i.folder, size: i.size, webUrl: i.webUrl, modified: i.lastModifiedDateTime }))
    .sort((a, b) => (b.isFolder - a.isFolder) || a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// Adds a file to a job folder. Small files go up in one request; larger ones
// (a scanned permit set, a phone video) go up in pieces.
const SMALL = 4 * 1024 * 1024;
const CHUNK = 10 * 320 * 1024;
export async function uploadToFolder(driveId, folderId, file, onProgress = () => {}) {
  const name = safeName(file.name.replace(/\.[^.]+$/, '')) + (file.name.match(/\.[^.]+$/)?.[0] || '');
  const at = `/drives/${driveId}/items/${folderId}:/${encodeURIComponent(name)}:`;
  if (file.size <= SMALL) {
    onProgress(0.5);
    const item = await graph(`${at}/content?@microsoft.graph.conflictBehavior=rename`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
    onProgress(1);
    return item;
  }
  const { uploadUrl } = await graph(`${at}/createUploadSession`, { method: 'POST', body: { item: { '@microsoft.graph.conflictBehavior': 'rename' } } });
  let item = null;
  for (let start = 0; start < file.size; start += CHUNK) {
    const end = Math.min(start + CHUNK, file.size);
    const res = await fetch(uploadUrl, { method: 'PUT', body: file.slice(start, end), headers: { 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` } });
    if (!res.ok) throw new Error(`Upload stopped (${res.status}). Check your signal and try again.`);
    if (res.status === 200 || res.status === 201) item = await res.json();
    onProgress(end / file.size);
  }
  return item;
}

// ---- 3-week look-ahead ----------------------------------------------------------

const LOOKAHEAD_NAME = /look\s*-?\s*a?head|look\s*out|lookahead/i;

function dateFromName(name) {
  const m = name.match(/(20\d{2})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

export async function findLookahead(fieldFolders) {
  const sched = fieldFolders?.folders?.Schedule;
  if (!sched) return null;
  const files = await graphAll(`/drives/${fieldFolders.driveId}/items/${sched.id}/children?$select=id,name,file,webUrl,lastModifiedDateTime&$top=999`);
  const sheets = files.filter(f => f.file && /\.xlsx?$/i.test(f.name) && LOOKAHEAD_NAME.test(f.name));
  if (!sheets.length) return null;
  sheets.sort((a, b) => (dateFromName(b.name) || b.lastModifiedDateTime).localeCompare(dateFromName(a.name) || a.lastModifiedDateTime));
  const f = sheets[0];
  return { id: f.id, name: f.name, webUrl: f.webUrl, asOf: dateFromName(f.name) || String(f.lastModifiedDateTime).slice(0, 10) };
}

export async function readLookahead(fieldFolders, file) {
  const sheets = await graph(`/drives/${fieldFolders.driveId}/items/${file.id}/workbook/worksheets?$select=name`);
  const sheet = sheets.value?.[0]?.name;
  const range = await graph(`/drives/${fieldFolders.driveId}/items/${file.id}/workbook/worksheets('${encodeURIComponent(sheet)}')/usedRange(valuesOnly=true)?$select=text`);
  return parseLookahead(range.text || []);
}

const MD = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function parseMD(s, refYear) {
  const m = String(s).trim().match(MD);
  if (!m) return null;
  let y = m[3] ? Number(m[3]) : refYear;
  if (y < 100) y += 2000;
  return new Date(y, Number(m[1]) - 1, Number(m[2]));
}

// Reads Whayland's 3-week look-ahead layout: a row of dates across the top,
// then one row per task with its trade and an "x" under each work day.
// Tasks further out have a "Week of 8/3" style note at the end of the row.
export function parseLookahead(rows) {
  const cells = rows.map(r => r.map(c => String(c ?? '').trim()));
  let dateRow = -1;
  let dateCols = [];
  cells.forEach((r, i) => {
    const cols = r.map((c, j) => (MD.test(c) && /\/\d{2,4}$/.test(c) ? j : -1)).filter(j => j >= 0);
    if (dateRow < 0 && cols.length >= 5) { dateRow = i; dateCols = cols; }
  });
  if (dateRow < 0) return { items: [], error: 'Couldn’t find the row of dates in the look-ahead.' };
  const dates = Object.fromEntries(dateCols.map(j => [j, parseMD(cells[dateRow][j], new Date().getFullYear())]));
  const refYear = dates[dateCols[0]].getFullYear();
  const startMonth = dates[dateCols[0]].getMonth();

  const header = cells.slice(0, dateRow + 1);
  const findCol = re => { for (const r of header) { const j = r.findIndex(c => re.test(c)); if (j >= 0) return j; } return -1; };
  const taskCol = findCol(/task/i) >= 0 ? findCol(/task/i) : 1;
  const tradeCol = findCol(/^trade$/i) >= 0 ? findCol(/^trade$/i) : taskCol + 1;
  const lastDateCol = dateCols[dateCols.length - 1];

  const items = [];
  for (const r of cells.slice(dateRow + 1)) {
    const task = r[taskCol];
    if (!task) continue;
    const trade = r[tradeCol] || '';
    const marked = dateCols.filter(j => r[j] && r[j].toLowerCase() !== '0').map(j => dates[j]);
    let start = null;
    let end = null;
    let approx = false;
    if (marked.length) {
      start = marked[0];
      end = marked[marked.length - 1];
    } else {
      const note = r.slice(lastDateCol + 1).find(c => c) || '';
      const found = note.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g) || [];
      if (found.length) {
        const fix = (txt, d) => { if (d && !/\/\d{2,4}$/.test(txt) && d.getMonth() < startMonth - 6) d.setFullYear(d.getFullYear() + 1); return d; };
        start = fix(found[0], parseMD(found[0], refYear));
        const last = found[found.length - 1];
        const lastDate = fix(last, parseMD(last, refYear));
        const isRange = found.length > 1 && /-/.test(note.slice(note.indexOf(found[0]) + found[0].length, note.lastIndexOf(last)));
        end = isRange ? lastDate : new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 6);
        approx = /wk|week/i.test(note);
      }
    }
    if (!start) continue;
    const skip = /^(n\/a|none|-)$/i.test(trade);
    items.push({ task, trade: skip ? '' : trade, start: ymd(start), end: ymd(end || start), approx });
  }
  return { items };
}

// ---- Job events -----------------------------------------------------------------

const eventsPath = async () => `/sites/${(await getSite()).id}/lists/${await getListId('jobEvents')}`;
const toEvent = i => ({ id: i.id, title: i.fields?.Title || '', when: i.fields?.EventDate || '', kind: i.fields?.Kind || 'Other', notes: i.fields?.Notes || '', addedBy: i.fields?.AddedBy || '' });

export async function listEvents(projectId) {
  const items = await graphAll(`${await eventsPath()}/items?$expand=fields&$filter=fields/ProjectId eq '${projectId}'&$top=500`, { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } });
  return items.map(toEvent).sort((a, b) => a.when.localeCompare(b.when));
}
export async function addEvent(projectId, ev) {
  const item = await graph(`${await eventsPath()}/items`, { method: 'POST', body: { fields: { Title: ev.title, ProjectId: String(projectId), EventDate: ev.when, Kind: ev.kind, Notes: ev.notes || '', AddedBy: ev.addedBy || '' } } });
  return toEvent({ ...item, fields: { Title: ev.title, EventDate: ev.when, Kind: ev.kind, Notes: ev.notes, AddedBy: ev.addedBy } });
}
export async function deleteEvent(id) {
  await graph(`${await eventsPath()}/items/${id}`, { method: 'DELETE' });
}

// ---- Weekly receipts ------------------------------------------------------------

const PENDING_KEY = 'fieldReports:pendingReceipts';
const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; } };
const writePending = list => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch { /* full */ } };
export const pendingReceipts = projectId => readPending().filter(r => String(r.projectId) === String(projectId));

export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

export function receiptName({ date, vendor, amount }) {
  const amt = amount ? ` $${Number(amount).toFixed(2)}` : '';
  return safeName(`${date} ${vendor || 'Receipt'}${amt}`) + '.jpg';
}

async function putReceipt(fieldFolders, name, blob) {
  return graph(`/drives/${fieldFolders.driveId}/items/${fieldFolders.receipts.id}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`, {
    method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' },
  });
}

// Saves the photo on the device first, then sends it; with no signal it waits.
export async function saveReceipt(project, blob, meta) {
  const id = `rcpt-${Date.now().toString(36)}`;
  const name = receiptName(meta);
  await photoQueue.put(id, blob);
  writePending([...readPending(), { id, projectId: project.id, name, folders: project.field_folders }]);
  return sendPendingReceipts();
}

let sending = null;
export function sendPendingReceipts() {
  if (sending) return sending;
  sending = (async () => {
    let sent = 0;
    for (const r of readPending()) {
      if (navigator.onLine === false) break;
      try {
        const blob = await photoQueue.get(r.id);
        if (blob) await putReceipt(r.folders, r.name, blob);
        await photoQueue.remove(r.id);
        writePending(readPending().filter(x => x.id !== r.id));
        sent += 1;
      } catch {
        break; // try again later
      }
    }
    return { sent, waiting: readPending().length };
  })().finally(() => { sending = null; });
  return sending;
}

export async function receiptsThisWeek(fieldFolders) {
  if (!fieldFolders?.receipts) return [];
  const since = weekStart().getTime();
  const files = await graphAll(`/drives/${fieldFolders.driveId}/items/${fieldFolders.receipts.id}/children?$select=id,name,createdDateTime,file&$top=999`);
  return files.filter(f => f.file && new Date(f.createdDateTime).getTime() >= since);
}
