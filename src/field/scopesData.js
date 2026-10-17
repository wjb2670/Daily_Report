// Subcontract scopes: the trade library, each job's subcontracts, and the
// Exhibit A text/Word file that goes in the subcontract.
import { graph, graphAll } from '@/field/graph';
import { getSite, getListId } from '@/field/spAdapter';
import { getPmDrive, makeFolder, safeName } from '@/field/projectsData';
import { STANDARD_CONDITIONS, OPENING, CLOSING, TRADES } from '@/field/scopeSeed';

const SHARED = { _standard: 'Whayland standard conditions', _opening: 'Opening lines (every trade)', _closing: 'Closing lines (every trade)' };
export const SECTION_TITLES = {
  standard: 'Whayland standard conditions',
  opening: 'Opening',
  trade: 'Trade scope',
  closing: 'Closing',
};
export const SUB_STATUS = ['Draft', 'PM approved', 'Contract sent', 'Signed'];

let uid = 0;
const newId = () => `l${Date.now().toString(36)}${(uid++).toString(36)}`;
const clean = items => items.map(i => ({ text: i.text, on: i.on !== false, ...(i.sub?.length ? { sub: i.sub } : {}) }));

// ---- Library ------------------------------------------------------------------

export function libraryRowsFromSeed() {
  return [
    { Title: SHARED._standard, CostCode: '_standard', WorkName: '', ItemsJSON: JSON.stringify(clean(STANDARD_CONDITIONS)) },
    { Title: SHARED._opening, CostCode: '_opening', WorkName: '', ItemsJSON: JSON.stringify(clean(OPENING)) },
    { Title: SHARED._closing, CostCode: '_closing', WorkName: '', ItemsJSON: JSON.stringify(clean(CLOSING)) },
    ...TRADES.map(t => ({ Title: t.name, CostCode: t.costCode, WorkName: t.workName, ItemsJSON: JSON.stringify(clean(t.items)) })),
  ];
}

const listPath = async key => `/sites/${(await getSite()).id}/lists/${await getListId(key)}`;
const parse = (s, fallback) => { try { return JSON.parse(s || ''); } catch { return fallback; } };

const toLibRow = item => ({
  id: item.id,
  name: item.fields?.Title || '',
  costCode: item.fields?.CostCode || '',
  workName: item.fields?.WorkName || '',
  items: parse(item.fields?.ItemsJSON, []),
});

export async function loadLibrary() {
  const items = await graphAll(`${await listPath('scopeLibrary')}/items?$expand=fields($select=Title,CostCode,WorkName,ItemsJSON)&$top=999`);
  const rows = items.map(toLibRow);
  const shared = k => rows.find(r => r.costCode === k) || { id: null, name: SHARED[k], costCode: k, items: [] };
  return {
    standard: shared('_standard'),
    opening: shared('_opening'),
    closing: shared('_closing'),
    trades: rows.filter(r => !r.costCode.startsWith('_')).sort((a, b) => a.costCode.localeCompare(b.costCode, undefined, { numeric: true })),
  };
}

export async function saveLibraryRow(row) {
  const path = await listPath('scopeLibrary');
  const fields = { Title: row.name, CostCode: row.costCode, WorkName: row.workName || '', ItemsJSON: JSON.stringify(clean(row.items)) };
  if (row.id) {
    await graph(`${path}/items/${row.id}/fields`, { method: 'PATCH', body: fields });
    return row.id;
  }
  return (await graph(`${path}/items`, { method: 'POST', body: { fields } })).id;
}

export async function deleteLibraryRow(id) {
  await graph(`${await listPath('scopeLibrary')}/items/${id}`, { method: 'DELETE' });
}

// ---- Scope model ----------------------------------------------------------------
// A subcontract's scope: four sections of lines. Each line has its text, whether
// it's ticked, any a./b. sub-points, and the values typed into its [blanks].

const toLine = (i, extra = {}) => ({ id: newId(), text: i.text, on: i.on !== false, sub: i.sub ? [...i.sub] : [], fills: {}, ...extra });

export function buildScope(library, trade) {
  return {
    sections: [
      { key: 'standard', lines: library.standard.items.map(i => toLine(i)) },
      { key: 'opening', lines: library.opening.items.map(i => toLine(i)) },
      { key: 'trade', lines: (trade?.items || []).map(i => toLine(i)) },
      { key: 'closing', lines: library.closing.items.map(i => toLine(i)) },
    ],
  };
}

export const newLine = text => ({ id: newId(), text, on: true, sub: [], fills: {}, custom: true });

// "[spec section]" style blanks in a line, in order, with how many times each repeats.
export function blanksOf(text) {
  const out = [];
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

function fillWith(text, next, ctx) {
  return String(text)
    .replace(/\{project\}/g, ctx.project || '{project}')
    .replace(/\{company\}/g, ctx.company || '{company}')
    .replace(/\[([^\]]+)\]/g, () => (next() || '').trim() || '________');
}

// A line's blanks are numbered across its text and then its sub-points.
export function lineBlanks(line) {
  return [line.text, ...(line.sub || [])].flatMap(blanksOf);
}

export function fillLine(line, ctx = {}) {
  let i = 0;
  const next = () => line.fills?.[`${i++}`];
  return { text: fillWith(line.text, next, ctx), sub: (line.sub || []).filter(x => x.trim()).map(x => fillWith(x, next, ctx)) };
}

export function missingBlanks(scope) {
  const out = [];
  for (const s of scope.sections) {
    for (const l of s.lines) {
      if (!l.on) continue;
      lineBlanks(l).forEach((label, i) => { if (!(l.fills?.[`${i}`] || '').trim()) out.push(label); });
    }
  }
  return out;
}

// The numbered Exhibit A lines, in order, with blanks filled.
export function exhibitLines(scope, ctx) {
  const out = [];
  for (const s of scope.sections) {
    for (const l of s.lines) {
      if (!l.on || !l.text.trim()) continue;
      out.push(fillLine(l, ctx));
    }
  }
  return out;
}

export const exhibitIntro = workName =>
  `All work necessary to in every way provide all labor, materials, equipment, and accessories to complete ${String(workName || 'TRADE').toUpperCase()} WORK in accordance with the drawings and RFIs referenced in this contract, including but not necessarily limited to the following:`;

const letter = i => String.fromCharCode(97 + (i % 26));

export function exhibitPlainText(sub, project) {
  const ctx = { project: project.name, company: sub.company };
  const lines = exhibitLines(sub.scope, ctx);
  return [
    'EXHIBIT A',
    'Scope of Work',
    '',
    exhibitIntro(sub.workName),
    '',
    ...lines.flatMap((l, i) => [`${i + 1}. ${l.text}`, ...l.sub.map((x, j) => `    ${letter(j)}. ${x}`)]),
  ].join('\n');
}

// ---- Subcontracts -----------------------------------------------------------------

const toSub = item => {
  const f = item.fields || {};
  return {
    id: item.id,
    company: f.Title || '',
    projectId: f.ProjectId || '',
    jobNumber: f.JobNumber || '',
    contractNumber: f.ContractNumber || '',
    costCode: f.CostCode || '',
    tradeName: f.TradeName || '',
    workName: f.WorkName || '',
    status: f.Status || 'Draft',
    companyAddress: f.CompanyAddress || '',
    companyCity: f.CompanyCity || '',
    companyPhone: f.CompanyPhone || '',
    companyEmail: f.CompanyEmail || '',
    approvedBy: f.ApprovedBy || '',
    approvedAt: f.ApprovedAt || '',
    folderUrl: f.FolderUrl || '',
    folderId: f.FolderId || '',
    scope: parse(f.ScopeJSON, { sections: [] }),
    updated: item.lastModifiedDateTime || '',
  };
};

const SUB_FIELDS = {
  company: 'Title', projectId: 'ProjectId', jobNumber: 'JobNumber', contractNumber: 'ContractNumber', costCode: 'CostCode',
  tradeName: 'TradeName', workName: 'WorkName', status: 'Status', companyAddress: 'CompanyAddress', companyCity: 'CompanyCity',
  companyPhone: 'CompanyPhone', companyEmail: 'CompanyEmail', approvedBy: 'ApprovedBy', folderUrl: 'FolderUrl', folderId: 'FolderId',
};
function subFields(changes) {
  const out = {};
  for (const [k, v] of Object.entries(changes)) {
    if (SUB_FIELDS[k]) out[SUB_FIELDS[k]] = v ?? '';
    if (k === 'scope') out.ScopeJSON = JSON.stringify(v);
    if (k === 'approvedAt') out.ApprovedAt = v || null;
  }
  return out;
}

export async function listSubcontracts(projectId) {
  const path = await listPath('subcontracts');
  const items = await graphAll(`${path}/items?$expand=fields&$filter=fields/ProjectId eq '${projectId}'&$top=999`, { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } });
  return items.map(toSub).sort((a, b) => a.contractNumber.localeCompare(b.contractNumber, undefined, { numeric: true }));
}

export async function getSubcontract(id) {
  return toSub(await graph(`${await listPath('subcontracts')}/items/${id}?$expand=fields`));
}

export async function createSubcontract(data) {
  const item = await graph(`${await listPath('subcontracts')}/items`, { method: 'POST', body: { fields: subFields(data) } });
  return item.id;
}

export async function updateSubcontract(id, changes) {
  await graph(`${await listPath('subcontracts')}/items/${id}/fields`, { method: 'PATCH', body: subFields(changes) });
}

export async function deleteSubcontract(id) {
  await graph(`${await listPath('subcontracts')}/items/${id}`, { method: 'DELETE' });
  const price = await findPrice(id).catch(() => null);
  if (price) await graph(`${await listPath('subPrices')}/items/${price.id}`, { method: 'DELETE' }).catch(() => {});
}

// ---- Prices (kept in their own list) ----------------------------------------------

async function findPrice(subId) {
  const path = await listPath('subPrices');
  const r = await graph(`${path}/items?$expand=fields&$filter=fields/SubcontractId eq '${subId}'`, { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } });
  return r.value?.[0] || null;
}

export async function getPrices(subIds) {
  const path = await listPath('subPrices');
  const items = await graphAll(`${path}/items?$expand=fields&$top=999`);
  const want = new Set(subIds.map(String));
  const out = {};
  for (const i of items) if (want.has(String(i.fields?.SubcontractId))) out[i.fields.SubcontractId] = i.fields.Amount ?? null;
  return out;
}

export async function setPrice(subId, contractNumber, amount) {
  const path = await listPath('subPrices');
  const existing = await findPrice(subId);
  const fields = { Title: contractNumber || '', SubcontractId: String(subId), Amount: amount === '' || amount == null ? null : Number(amount) };
  if (existing) await graph(`${path}/items/${existing.id}/fields`, { method: 'PATCH', body: fields });
  else await graph(`${path}/items`, { method: 'POST', body: { fields } });
}

// ---- Contract numbers and folders ---------------------------------------------------

const isSubAgreementsFolder = name => /^sub\s*contract\s+agreements$/i.test(String(name).replace(/\s+/g, ' ').trim());

async function subAgreementsFolder(project) {
  if (!project.folderId) {
    const err = new Error('Link this job’s folder on the project page first, so the contract files have somewhere to go.');
    err.code = 'no_folder';
    throw err;
  }
  const { driveId } = await getPmDrive();
  const kids = await graphAll(`/drives/${driveId}/items/${project.folderId}/children?$select=id,name,folder,webUrl&$top=999`);
  let folder = kids.find(k => k.folder && isSubAgreementsFolder(k.name));
  if (!folder) folder = await makeFolder(driveId, project.folderId, 'Sub Contract  Agreements');
  return { driveId, folder, kids: folder.id ? await graphAll(`/drives/${driveId}/items/${folder.id}/children?$select=id,name,folder&$top=999`) : [] };
}

// Next contract number for the job: 2026-21-29 follows the highest of the
// numbers already in the app and the folders already in Sub Contract Agreements.
export async function nextContractNumber(project, existingSubs = []) {
  const re = new RegExp(`^${project.jobNumber.replace(/[-]/g, '\\-')}-(\\d{1,3})\\b`);
  let max = 0;
  const take = s => { const m = String(s || '').match(re); if (m) max = Math.max(max, Number(m[1])); };
  existingSubs.forEach(s => take(s.contractNumber));
  try {
    const { kids } = await subAgreementsFolder(project);
    kids.forEach(k => take(k.name));
  } catch { /* no folder yet: numbers from the app only */ }
  return `${project.jobNumber}-${String(max + 1).padStart(2, '0')}`;
}

// ---- Word file -------------------------------------------------------------------

export async function exhibitDocx(sub, project) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat } = await import('docx');
  const ctx = { project: project.name, company: sub.company };
  const lines = exhibitLines(sub.scope, ctx);
  const font = 'Times New Roman';
  const doc = new Document({
    styles: { default: { document: { run: { font, size: 22 } } } },
    numbering: {
      config: [{
        reference: 'exhibit',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } },
          { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'EXHIBIT A', bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: 'Scope of Work', bold: true, size: 24 })] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `Contract # ${sub.contractNumber}    Cost Code # ${sub.costCode}`, size: 20 })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `${project.name} · ${sub.company}`, size: 20 })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun(exhibitIntro(sub.workName))] }),
        ...lines.flatMap(l => [
          new Paragraph({ numbering: { reference: 'exhibit', level: 0 }, spacing: { after: 80 }, children: [new TextRun(l.text)] }),
          ...l.sub.map(x => new Paragraph({ numbering: { reference: 'exhibit', level: 1 }, spacing: { after: 60 }, children: [new TextRun(x)] })),
        ]),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

// Makes "Sub Contract Agreements/<contract #> <Company>" with the Exhibit A
// Word file and a copy of the master subcontract, the same way the office
// sets them up today.
export const MASTER_SUB_FOLDER = 'Master Template Files/MASTER Subcontractor File - COPY & RENAME';

export async function createContractFiles(project, sub, onStep = () => {}) {
  const { driveId, folder } = await subAgreementsFolder(project);
  const folderName = safeName(`${sub.contractNumber} ${sub.company}`);
  onStep(`Making the ${folderName} folder`);
  const target = await makeFolder(driveId, folder.id, folderName);

  onStep('Writing Exhibit A – Scope of Work');
  const blob = await exhibitDocx(sub, project);
  const exName = `${sub.contractNumber} Exhibit A - Scope of Work.docx`;
  await graph(`/drives/${driveId}/items/${target.id}:/${encodeURIComponent(exName)}:/content?@microsoft.graph.conflictBehavior=replace`, {
    method: 'PUT', body: blob, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });

  onStep('Copying the master subcontract');
  const masterName = project.contractType === 'CM' ? 'MASTER Trade Contract.docx' : 'MASTER GC LONG CONTRACT.docx';
  let copied = '';
  try {
    const master = await graph(`/drives/${driveId}/root:/${MASTER_SUB_FOLDER.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(masterName)}?$select=id,name`);
    const name = `${sub.contractNumber} Contract.docx`;
    await graph(`/drives/${driveId}/items/${master.id}/copy`, { method: 'POST', body: { parentReference: { driveId, id: target.id }, name } });
    copied = name;
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  return { folderId: target.id, folderUrl: target.webUrl, exhibit: exName, contract: copied };
}
