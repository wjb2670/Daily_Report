// TEST: the PM Team "library layout". Instead of one folder tree per job in
// Documents, the PM Team site gets five document libraries; each job has one
// folder per library, and a Document Type column takes the place of the old
// subfolders. Only projects created as test projects use it; every other job
// keeps the classic folder layout.
import { graph, graphAll } from '@/field/graph';
import { getPmDrive, makeFolder, safeName } from '@/field/projectsData';
import { getSite, getListId } from '@/field/spAdapter';

export const LAYOUT = 'libraries';
export const isLibraryProject = p => (p?.layout || p?.folder_layout) === LAYOUT;

const text = (name, displayName) => ({ name, displayName, text: {} });
const choice = (name, displayName, choices) => ({ name, displayName, choice: { choices, displayAs: 'dropDownMenu', allowTextEntry: false } });

export const LIBRARIES = {
  jobDocuments: {
    name: 'Job Documents', perJob: true,
    description: 'Drawings, specs, schedule, submittals, RFIs, permits and inspections. One folder per job; the crew sees only their own job.',
    types: ['Drawings', 'Specifications', 'Schedule', 'Submittals', 'RFI', 'Permits', 'Inspection Reports', 'Field Bulletins', 'Finish Schedule', 'Transmittals', 'Field Markups', 'Other'],
  },
  contracts: {
    name: 'Contracts', perJob: true,
    description: 'Owner contract, award, NTP and bonds, sub agreements, change orders, POs, lien releases. Office only.',
    types: ['Owner Contract', 'Award / NTP / Bonds', 'Sub Agreement', 'Sub Change Order', 'Owner Change Order', 'Purchase Order', 'Release of Lien', 'Insurance / Drug Policy', 'Other'],
    extra: [text('Company', 'Company'), text('CostCodes', 'Cost Codes'), choice('ContractStatus', 'Status', ['Draft', 'Sent', 'Signed'])],
  },
  financials: {
    name: 'Job Financials', perJob: true,
    description: 'Budget and estimating turnover, buy-out log, pay apps, receipts, timesheets, turnover packet. Office only, never shared with the field.',
    types: ['Budget / Estimating Turnover', 'Buy Out Log', 'Owner Invoice', 'Weekly Receipts', 'Timesheet', 'Turnover Packet', 'Other'],
  },
  closeout: {
    name: 'Closeout', perJob: false,
    description: 'Close-out documents, certificates of occupancy, warranties and safety reports.',
    types: ['Close-Out Docs', 'Cert of Occupancy', 'Warranty', 'Safety Reports', 'Other'],
  },
  templates: {
    name: 'Templates', perJob: false,
    description: 'One copy of each template and form. Copy from here when you need one.',
    types: ['Contract Template', 'Job Tracking Log', 'Sub Contact List', 'Form', 'Other'],
  },
};
export const FIELD_UPLOADS = 'Field Uploads';
export const RECEIPTS = 'Weekly Receipts';

const columnsFor = def => [
  choice('DocumentType', 'Document Type', def.types),
  text('Job', 'Job'),
  ...(def.extra || []),
];

// Creates any missing library (and any missing column) on the PM Team site.
const libCache = {};
export async function ensureLibraries(log = () => {}) {
  const { siteId } = await getPmDrive();
  const lists = await graphAll(`/sites/${siteId}/lists?$select=id,displayName,webUrl,list`);
  for (const [key, def] of Object.entries(LIBRARIES)) {
    let lib = lists.find(l => l.displayName === def.name);
    if (!lib) {
      lib = await graph(`/sites/${siteId}/lists`, {
        method: 'POST',
        body: { displayName: def.name, description: def.description, list: { template: 'documentLibrary' }, columns: columnsFor(def) },
      });
      log(`Created the “${def.name}” library`);
    } else {
      const have = new Set((await graphAll(`/sites/${siteId}/lists/${lib.id}/columns?$select=name`)).map(c => c.name));
      const missing = columnsFor(def).filter(c => !have.has(c.name));
      for (const col of missing) await graph(`/sites/${siteId}/lists/${lib.id}/columns`, { method: 'POST', body: col });
      log(missing.length ? `Updated “${def.name}”: ${missing.length} new column${missing.length === 1 ? '' : 's'}` : `“${def.name}” library is ready`);
    }
    delete libCache[key];
  }
}

export async function libraryDrive(key) {
  if (!libCache[key]) {
    libCache[key] = (async () => {
      const { siteId } = await getPmDrive();
      const def = LIBRARIES[key];
      const lists = await graphAll(`/sites/${siteId}/lists?$select=id,displayName,webUrl`);
      const lib = lists.find(l => l.displayName === def.name);
      if (!lib) { const e = new Error(`The “${def.name}” library isn’t set up yet.`); e.code = 'no_library'; throw e; }
      const drive = await graph(`/sites/${siteId}/lists/${lib.id}/drive?$select=id,webUrl`);
      return { listId: lib.id, driveId: drive.id, webUrl: lib.webUrl };
    })().catch(err => { delete libCache[key]; throw err; });
  }
  return libCache[key];
}

// Sets Document Type, Job and any other columns on a file in a library.
export async function tagFile(driveId, itemId, fields) {
  const body = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null && v !== ''));
  if (!Object.keys(body).length) return;
  await graph(`/drives/${driveId}/items/${itemId}/listItem/fields`, { method: 'PATCH', body });
}

// A test job's folders: "<job #> <name>" in Job Documents, Contracts and Job
// Financials, plus Field Uploads (crew adds permits, inspections, markups) and
// Weekly Receipts (crew adds receipts) inside them.
// The Projects list needs two columns to remember a test job's library folders.
async function ensureProjectColumns() {
  const site = await getSite();
  const listId = await getListId('projects');
  const have = new Set((await graphAll(`/sites/${site.id}/lists/${listId}/columns?$select=name`)).map(c => c.name));
  if (!have.has('FolderLayout')) await graph(`/sites/${site.id}/lists/${listId}/columns`, { method: 'POST', body: { name: 'FolderLayout', displayName: 'Folder Layout', text: {} } });
  if (!have.has('LibraryFoldersJSON')) await graph(`/sites/${site.id}/lists/${listId}/columns`, { method: 'POST', body: { name: 'LibraryFoldersJSON', displayName: 'Library Folders', text: { allowMultipleLines: true, textType: 'plain', linesForEditing: 6 } } });
}

export async function createLibraryJobFolders(number, projectName, onStep = () => {}) {
  await ensureProjectColumns();
  onStep('Checking the PM Team libraries');
  await ensureLibraries(onStep);
  const name = safeName(`${number} ${projectName}`);
  const out = {};
  for (const key of ['jobDocuments', 'contracts', 'financials']) {
    const { driveId } = await libraryDrive(key);
    const f = await makeFolder(driveId, null, name);
    out[key] = { driveId, id: f.id, webUrl: f.webUrl };
    onStep(`Created ${LIBRARIES[key].name} › ${name}`);
  }
  const up = await makeFolder(out.jobDocuments.driveId, out.jobDocuments.id, FIELD_UPLOADS);
  out.jobDocuments.uploads = { id: up.id, webUrl: up.webUrl };
  const rc = await makeFolder(out.financials.driveId, out.financials.id, RECEIPTS);
  out.financials.receipts = { id: rc.id, webUrl: rc.webUrl };
  onStep(`Added ${FIELD_UPLOADS} and ${RECEIPTS} for the field`);
  return { name, folders: out };
}

// Files in a library job folder (and one level of subfolders), with their columns.
export async function listTyped(driveId, folderId, { deep = true } = {}) {
  const q = '$select=id,name,file,folder,size,webUrl,lastModifiedDateTime&$expand=listItem($expand=fields($select=DocumentType,Job,Company,CostCodes,ContractStatus))&$top=999';
  const top = await graphAll(`/drives/${driveId}/items/${folderId}/children?${q}`);
  const sub = deep ? (await Promise.all(top.filter(i => i.folder).map(f => graphAll(`/drives/${driveId}/items/${f.id}/children?${q}`).then(v => v.map(x => ({ ...x, inFolder: f.name })))))).flat() : [];
  return [...top, ...sub].filter(i => i.file).map(i => {
    const f = i.listItem?.fields || {};
    return { id: i.id, name: i.name, size: i.size, webUrl: i.webUrl, modified: i.lastModifiedDateTime, type: f.DocumentType || '', job: f.Job || '', company: f.Company || '', status: f.ContractStatus || '', inFolder: i.inFolder || '', driveId };
  });
}

// Saves a file into a library job folder and tags it.
export async function putTyped(driveId, folderId, name, body, contentType, fields) {
  const item = await graph(`/drives/${driveId}/items/${folderId}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`, {
    method: 'PUT', body, headers: { 'Content-Type': contentType || 'application/octet-stream' },
  });
  try { await tagFile(driveId, item.id, fields); } catch { /* the file is saved; the type can be set in SharePoint */ }
  return item;
}

// Fills in Job on any file in a library job folder that's missing it (files
// people drag in by hand in SharePoint).
export async function tagUntagged(project) {
  let fixed = 0;
  for (const key of ['jobDocuments', 'contracts', 'financials']) {
    const f = project.libraryFolders?.[key];
    if (!f) continue;
    for (const file of await listTyped(f.driveId, f.id)) {
      if (!file.job) { await tagFile(f.driveId, file.id, { Job: project.jobNumber }); fixed += 1; }
    }
  }
  return fixed;
}
