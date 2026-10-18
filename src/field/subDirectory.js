// Whayland's subcontractor database: MASTER SUB LIST.xlsx on the Estimating
// Team site, which estimating keeps up to date. The app reads it straight from
// SharePoint each session, so the spreadsheet stays the one place to edit.
import { graph } from '@/field/graph';
import { CONFIG } from '@/field/auth';

export const DIRECTORY_SITE = '/sites/EstimatingTeam';
export const DIRECTORY_FILE = 'MASTER SUB LIST.xlsx';
export const DIRECTORY_HOME = ''; // top of the site's Documents
const SHEET = 'Subcontractors';

let drivePromise = null;
function getDirectoryDrive() {
  if (!drivePromise) {
    drivePromise = (async () => {
      const site = await graph(`/sites/${CONFIG.siteHost}:${DIRECTORY_SITE}?$select=id`);
      const drive = await graph(`/sites/${site.id}/drive?$select=id`);
      return { driveId: drive.id };
    })().catch(err => { drivePromise = null; throw err; });
  }
  return drivePromise;
}

const enc = path => path.split('/').map(encodeURIComponent).join('/');
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = s => clean(s).toLowerCase().replace(/[.,]/g, '').replace(/\b(inc|llc|co|corp|company|the)\b/g, '').replace(/\s+/g, ' ').trim();

async function findWorkbook(driveId) {
  try {
    return await graph(`/drives/${driveId}/root:/${enc([DIRECTORY_HOME, DIRECTORY_FILE].filter(Boolean).join('/'))}?$select=id,name,webUrl`);
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  // Moved within the site: find it by name.
  const found = await graph(`/drives/${driveId}/root/search(q='${encodeURIComponent(DIRECTORY_FILE.replace(/\.xlsx$/, ''))}')?$select=id,name,webUrl`);
  return (found.value || []).find(i => i.name === DIRECTORY_FILE) || null;
}

// Header names in the sheet → our field names. Matching is forgiving so a
// renamed column ("Contact" for "Primary Contact") still lines up.
const COLUMNS = [
  ['trade', /^trade/i], ['company', /^company/i], ['contact', /contact/i], ['email', /e-?mail/i], ['notes', /^notes?/i],
  ['address', /street|address/i], ['city', /^city/i], ['state', /^state/i], ['zip', /^zip/i], ['phone', /^phone|office|tele/i], ['cell', /^cell|mobile/i],
];

function toRows(values) {
  const headerAt = values.findIndex(r => r.some(c => /^company/i.test(clean(c))));
  if (headerAt < 0) return [];
  const header = values[headerAt].map(clean);
  const col = {};
  for (const [name, re] of COLUMNS) {
    const i = header.findIndex((h, j) => re.test(h) && !Object.values(col).includes(j));
    if (i >= 0) col[name] = i;
  }
  return values.slice(headerAt + 1)
    .map(r => Object.fromEntries(Object.entries(col).map(([k, i]) => [k, clean(r[i])])))
    .filter(r => r.company);
}

// Rows grouped by company, with every contact listed under it.
function toCompanies(rows) {
  const map = new Map();
  for (const r of rows) {
    const k = key(r.company);
    if (!map.has(k)) map.set(k, { key: k, company: r.company, trades: new Set(), contacts: [], address: '', city: '', state: '', zip: '', phone: '' });
    const c = map.get(k);
    if (r.trade) c.trades.add(r.trade);
    if (!c.address && r.address) Object.assign(c, { address: r.address, city: r.city, state: r.state, zip: r.zip });
    if (!c.phone && r.phone) c.phone = r.phone;
    if (r.contact || r.email) c.contacts.push({ name: r.contact, email: r.email, phone: r.phone, cell: r.cell, notes: r.notes });
  }
  return [...map.values()].map(c => ({ ...c, trades: [...c.trades] })).sort((a, b) => a.company.localeCompare(b.company));
}

let cache = null;
export function loadDirectory({ refresh = false } = {}) {
  if (cache && !refresh) return cache;
  cache = (async () => {
    let driveId;
    try {
      ({ driveId } = await getDirectoryDrive());
    } catch (err) {
      const e = new Error(err.status === 403 || err.status === 404
        ? 'You don’t have access to the Estimating Team site, where the subcontractor list lives. Ask Wendy for access, or type the company details in.'
        : err.message);
      e.code = 'no_directory';
      throw e;
    }
    const file = await findWorkbook(driveId);
    if (!file) {
      const err = new Error(`Couldn’t find “${DIRECTORY_FILE}” on the Estimating Team site. Type the company details in for now.`);
      err.code = 'no_directory';
      throw err;
    }
    let range;
    try {
      range = await graph(`/drives/${driveId}/items/${file.id}/workbook/worksheets('${SHEET}')/usedRange(valuesOnly=true)?$select=values`);
    } catch (err) {
      if (err.status !== 404) throw err;
      const sheets = await graph(`/drives/${driveId}/items/${file.id}/workbook/worksheets?$select=name`);
      const first = sheets.value?.find(s => /sub/i.test(s.name)) || sheets.value?.[0];
      range = await graph(`/drives/${driveId}/items/${file.id}/workbook/worksheets('${encodeURIComponent(first.name)}')/usedRange(valuesOnly=true)?$select=values`);
    }
    const companies = toCompanies(toRows(range.values || []));
    return { file, companies };
  })().catch(err => { cache = null; throw err; });
  return cache;
}

// Cost code 3010 → division "03"; directory trades start "03 - Concrete …".
// Whayland cost codes are 4 digits for divisions 1–9 (3010 → 03) and 5 for
// 10 and up (15400 → 15).
export const divisionOf = costCode => {
  const digits = (String(costCode || '').match(/^\d+/) || [''])[0];
  if (digits.length < 4) return '';
  return digits.length === 4 ? `0${digits[0]}` : digits.slice(0, 2);
};
export const inDivision = (company, division) => !!division && company.trades.some(t => t.startsWith(`${division} `) || t.startsWith(`${division}-`));

export function searchCompanies(companies, query, division) {
  const q = key(query);
  const scored = [];
  for (const c of companies) {
    const name = c.key;
    let score = 0;
    if (q) {
      if (name.startsWith(q)) score = 3;
      else if (name.includes(q)) score = 2;
      else if (c.contacts.some(p => key(p.name).includes(q))) score = 1;
      else continue;
    }
    if (inDivision(c, division)) score += 0.5;
    scored.push([score, c]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].company.localeCompare(b[1].company)).map(x => x[1]);
}

export const cityLine = c => [c.city, [c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

// The subcontract fields a chosen company + contact fill in.
export function detailsFrom(company, contact) {
  return {
    company: company.company,
    companyContact: contact?.name || '',
    companyAddress: company.address,
    companyCity: cityLine(company),
    companyPhone: contact?.phone || company.phone || contact?.cell || '',
    companyEmail: contact?.email || '',
  };
}
