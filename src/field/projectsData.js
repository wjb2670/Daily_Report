// New-project setup: job numbers, project folders on the PM Team site,
// contract templates, and the startup checklist stored on the Projects list.
import { graph, graphAll } from '@/field/graph';
import { CONFIG } from '@/field/auth';
import { getSite, getListId } from '@/field/spAdapter';

export const PM_SITE_PATH = '/sites/PMTeam';
export const TEMPLATE_FOLDER = 'Master Template Files';
// Each year's Project Files has a master job folder the team copies for new jobs.
export const MASTER_FOLDER = 'MAKE COPY - Master Job Folder';

// Used only if no master job folder can be found: the same subfolders, empty.
export const PROJECT_SUBFOLDERS = [
  'Buy Out Log', 'Cert of Occupancies', 'Close-Out Docs', 'Drawings', 'Estimating Turnover Folder',
  'Field Bulletins', 'Field Reports', 'Finish Schedule', 'Inspection Reports', 'Owner Change Orders',
  'Owner Contract', 'Owner Invoices', 'Permits', 'Purchase Orders', 'Release of Liens', 'RFI',
  'Safety Reports', 'Schedule', 'Sub Change Orders', 'Sub Contract  Agreements', 'Subcontractor Drug Policy',
  'Submittals', 'Timesheet', 'Transmittals',
];

const enc = path => path.split('/').map(encodeURIComponent).join('/');

// ---- PM Team document library ------------------------------------------------------

let pmDrivePromise = null;
export function getPmDrive() {
  if (!pmDrivePromise) {
    pmDrivePromise = (async () => {
      const site = await graph(`/sites/${CONFIG.siteHost}:${PM_SITE_PATH}?$select=id,webUrl`);
      const drive = await graph(`/sites/${site.id}/drive?$select=id,webUrl`);
      return { siteId: site.id, driveId: drive.id, webUrl: drive.webUrl };
    })().catch(err => { pmDrivePromise = null; throw err; });
  }
  return pmDrivePromise;
}

const yearFolder = year => `${year} Project Files`;

async function childFolders(driveId, path) {
  try {
    const items = await graphAll(`/drives/${driveId}/root:/${enc(path)}:/children?$select=id,name,folder,webUrl&$top=999`);
    return items.filter(i => i.folder);
  } catch (err) {
    if (err.status === 404) return [];
    throw err;
  }
}

const NUM = year => new RegExp(`^${year}-(\\d{1,3})\\b`);

// Highest number already used for the year, from the project folders (including
// grouped folders one level down, like "2026 TWC Restores Projects") and the
// Projects list. The next job is that + 1, two digits (2026-07, 2026-42).
export async function nextJobNumber(year) {
  const { driveId } = await getPmDrive();
  const re = NUM(year);
  let max = 0;
  const take = name => { const m = name?.match(re); if (m) max = Math.max(max, Number(m[1])); };

  const top = await childFolders(driveId, yearFolder(year));
  for (const f of top) {
    if (re.test(f.name)) take(f.name);
    else for (const g of await childFolders(driveId, `${yearFolder(year)}/${f.name}`)) take(g.name);
  }
  try {
    const site = await getSite();
    const listId = await getListId('projects');
    const items = await graphAll(`/sites/${site.id}/lists/${listId}/items?$expand=fields($select=JobNumber)&$top=999`);
    items.forEach(i => take(i.fields?.JobNumber));
  } catch { /* list not set up yet */ }
  return `${year}-${String(max + 1).padStart(2, '0')}`;
}

export async function jobNumberInUse(number) {
  const year = number.slice(0, 4);
  const { driveId } = await getPmDrive();
  const re = new RegExp(`^${number.replace('-', '\\-')}\\b`);
  const top = await childFolders(driveId, yearFolder(year));
  for (const f of top) {
    if (re.test(f.name)) return true;
    if (!NUM(year).test(f.name)) {
      for (const g of await childFolders(driveId, `${yearFolder(year)}/${f.name}`)) if (re.test(g.name)) return true;
    }
  }
  return false;
}

const safeName = s => String(s || '').replace(/["*:<>?/\\|#%]+/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');

async function makeFolder(driveId, parentId, name) {
  const parent = parentId ? `/drives/${driveId}/items/${parentId}/children` : `/drives/${driveId}/root/children`;
  try {
    return await graph(parent, { method: 'POST', body: { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' } });
  } catch (err) {
    if (err.status !== 409) throw err;
    const path = parentId ? null : name;
    return path
      ? graph(`/drives/${driveId}/root:/${enc(path)}?$select=id,name,webUrl`)
      : (await graphAll(`/drives/${driveId}/items/${parentId}/children?$select=id,name,webUrl,folder`)).find(i => i.name === name);
  }
}

async function findMasterFolder(driveId, year) {
  for (const y of [Number(year), Number(year) - 1, Number(year) - 2]) {
    try {
      return await graph(`/drives/${driveId}/root:/${enc(`${yearFolder(y)}/${MASTER_FOLDER}`)}?$select=id,name,webUrl`);
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }
  return null;
}

async function itemAt(driveId, path) {
  try {
    return await graph(`/drives/${driveId}/root:/${enc(path)}?$select=id,name,webUrl,folder`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// "2026 Project Files/2026-42 Project Name": a copy of the master job folder
// (all subfolders, Job Tracking Log, Sub Contact List and templates).
export async function createProjectFolder(number, projectName, onStep) {
  const { driveId } = await getPmDrive();
  const year = number.slice(0, 4);
  const yearDir = await makeFolder(driveId, null, yearFolder(year));
  const name = safeName(`${number} ${projectName}`);
  const path = `${yearFolder(year)}/${name}`;

  if (await itemAt(driveId, path)) {
    const e = new Error(`A folder named “${name}” already exists in ${yearFolder(year)}.`);
    e.code = 'folder_exists';
    throw e;
  }

  const master = await findMasterFolder(driveId, year);
  if (master) {
    onStep?.(`Copying “${MASTER_FOLDER}”…`);
    await graph(`/drives/${driveId}/items/${master.id}/copy`, {
      method: 'POST',
      body: { parentReference: { driveId, id: yearDir.id }, name },
    });
    // SharePoint copies in the background; wait for the new folder to appear.
    for (let i = 0; i < 60; i++) {
      const made = await itemAt(driveId, path);
      if (made) {
        onStep?.(`Created folder “${name}” from the master job folder`);
        return { id: made.id, webUrl: made.webUrl, name, fromMaster: true };
      }
      await wait(i < 10 ? 1000 : 2000);
    }
    throw new Error('SharePoint is still copying the master job folder. Check the PM Team site in a minute, then try again.');
  }

  // No master folder found: build the standard subfolders, empty.
  const folder = await graph(`/drives/${driveId}/items/${yearDir.id}/children`, { method: 'POST', body: { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' } });
  onStep?.(`Created folder “${name}” (no master job folder found, so subfolders are empty)`);
  let done = 0;
  for (const sub of PROJECT_SUBFOLDERS) {
    await makeFolder(driveId, folder.id, sub);
    done += 1;
    if (done % 6 === 0 || done === PROJECT_SUBFOLDERS.length) onStep?.(`Added ${done} of ${PROJECT_SUBFOLDERS.length} subfolders`);
  }
  return { id: folder.id, webUrl: folder.webUrl, name, fromMaster: false };
}

// ---- Templates and documents ----------------------------------------------------

export async function listContractTemplates() {
  const { driveId } = await getPmDrive();
  const items = await graphAll(`/drives/${driveId}/root:/${enc(TEMPLATE_FOLDER)}:/children?$select=id,name,file&$top=200`);
  return items.filter(i => i.file && /contract/i.test(i.name) && /\.(docx?|pdf)$/i.test(i.name));
}

async function ownerContractFolderId(project) {
  const { driveId } = await getPmDrive();
  const kids = await graphAll(`/drives/${driveId}/items/${project.folderId}/children?$select=id,name,folder`);
  let target = kids.find(k => k.folder && k.name === 'Owner Contract');
  if (!target) target = await makeFolder(driveId, project.folderId, 'Owner Contract');
  return { driveId, folderId: target.id };
}

// Copies a template into the job's Owner Contract folder as "<job #> Owner Contract.docx".
export async function copyContractTemplate(project, template) {
  const { driveId, folderId } = await ownerContractFolderId(project);
  const ext = (template.name.match(/\.[^.]+$/) || ['.docx'])[0];
  const name = `${project.jobNumber} Owner Contract${ext}`;
  await graph(`/drives/${driveId}/items/${template.id}/copy`, {
    method: 'POST',
    body: { parentReference: { driveId, id: folderId }, name },
  });
  return name;
}

// Saves an attached document (award letter, NTP, bond, signed contract) into
// the job's Owner Contract folder, named with the job number and what it is.
export async function uploadStartupDoc(project, label, file) {
  const { driveId, folderId } = await ownerContractFolderId(project);
  const ext = (file.name.match(/\.[^.]+$/) || [''])[0];
  const name = safeName(`${project.jobNumber} ${label}`) + ext;
  const res = await graph(`/drives/${driveId}/items/${folderId}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  return { name: res.name || name, webUrl: res.webUrl };
}

export async function listStartupDocs(project) {
  if (!project.folderId) return [];
  const { driveId, folderId } = await ownerContractFolderId(project);
  const items = await graphAll(`/drives/${driveId}/items/${folderId}/children?$select=id,name,webUrl,file,lastModifiedDateTime&$top=200`);
  return items.filter(i => i.file);
}

// ---- Projects list ------------------------------------------------------------

const dateOnly = v => (v ? String(v).slice(0, 10) : '');
const people = v => (Array.isArray(v) ? v : v ? [v] : []).map(p => p.LookupValue).filter(Boolean);

export function toProjectRecord(item) {
  const f = item.fields || {};
  return {
    id: item.id,
    name: f.Title || '',
    jobNumber: f.JobNumber || '',
    status: f.Status || 'Awarded',
    owner: f.OwnerName || '',
    contractType: f.ContractType || '',
    contractAmount: f.ContractAmount ?? null,
    address: f.Address || '', city: f.City || '', state: f.State || '', zip: f.Zip || '',
    projectManager: f.ProjectManager || '',
    superintendents: people(f.Superintendent),
    crew: people(f.CrewAccess),
    awardDate: dateOnly(f.AwardDate),
    awardLetterDate: dateOnly(f.AwardLetterDate),
    ntpDate: dateOnly(f.NTPDate),
    bondsRequired: f.BondsRequired || 'Not yet known',
    paymentBond: f.PaymentBond || 'Not started',
    performanceBond: f.PerformanceBond || 'Not started',
    ownerContract: f.OwnerContract || 'Not started',
    folderUrl: f.ProjectFolderUrl || '',
    folderId: f.ProjectFolderId || '',
    notes: f.ProjectNotes || '',
    created: item.createdDateTime || '',
  };
}

const TO_FIELD = {
  name: 'Title', jobNumber: 'JobNumber', status: 'Status', owner: 'OwnerName', contractType: 'ContractType',
  contractAmount: 'ContractAmount', address: 'Address', city: 'City', state: 'State', zip: 'Zip',
  projectManager: 'ProjectManager', bondsRequired: 'BondsRequired', paymentBond: 'PaymentBond',
  performanceBond: 'PerformanceBond', ownerContract: 'OwnerContract', folderUrl: 'ProjectFolderUrl',
  folderId: 'ProjectFolderId', notes: 'ProjectNotes',
};
const DATE_FIELDS = { awardDate: 'AwardDate', awardLetterDate: 'AwardLetterDate', ntpDate: 'NTPDate' };

function toFields(changes) {
  const out = {};
  for (const [k, v] of Object.entries(changes)) {
    if (TO_FIELD[k]) out[TO_FIELD[k]] = v === '' ? null : v;
    if (DATE_FIELDS[k]) out[DATE_FIELDS[k]] = v ? `${v}T12:00:00Z` : null;
  }
  return out;
}

async function projectsPath() {
  const site = await getSite();
  return `/sites/${site.id}/lists/${await getListId('projects')}`;
}

export async function listProjectRecords() {
  const items = await graphAll(`${await projectsPath()}/items?$expand=fields&$top=999`);
  return items.map(toProjectRecord).sort((a, b) => b.jobNumber.localeCompare(a.jobNumber, undefined, { numeric: true }));
}

export async function getProjectRecord(id) {
  return toProjectRecord(await graph(`${await projectsPath()}/items/${id}?$expand=fields`));
}

export async function createProjectRecord(data) {
  const item = await graph(`${await projectsPath()}/items`, { method: 'POST', body: { fields: toFields(data) } });
  return item.id;
}

export async function updateProjectRecord(id, changes) {
  await graph(`${await projectsPath()}/items/${id}/fields`, { method: 'PATCH', body: toFields(changes) });
}

export async function projectsListUrl() {
  const site = await getSite();
  const list = await graph(`/sites/${site.id}/lists/${await getListId('projects')}?$select=webUrl`);
  return list.webUrl;
}

// ---- Startup progress ---------------------------------------------------------

export function startupSteps(p) {
  const bondsDone = p.bondsRequired === 'No' || (p.bondsRequired === 'Yes' && p.paymentBond === 'Received' && p.performanceBond === 'Received');
  return [
    { key: 'number', label: 'Job number & folder', done: !!(p.jobNumber && p.folderId) },
    { key: 'award', label: 'Award letter', done: !!p.awardLetterDate },
    { key: 'ntp', label: 'Notice to proceed', done: !!p.ntpDate },
    { key: 'bonds', label: 'Bonds', done: bondsDone },
    { key: 'contract', label: 'Owner contract', done: p.ownerContract === 'Signed' },
    { key: 'super', label: 'Superintendent', done: p.superintendents.length > 0 },
  ];
}
