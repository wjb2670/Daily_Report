// Whayland's subcontractor database: the "Final Subcontractor List.xlsx"
// workbook the office keeps up to date. The app reads it straight from
// SharePoint each session, so the spreadsheet stays the one place to edit.
import { graph } from '@/field/graph';
import { getPmDrive } from '@/field/projectsData';

export const DIRECTORY_FILE = 'Final Subcontractor List.xlsx';
export const DIRECTORY_HOME = 'Master Template Files';
const SHEET = 'Subcontractors';

const enc = path => path.split('/').map(encodeURIComponent).join('/');
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = s => clean(s).toLowerCase().replace(/[.,]/g, '').replace(/\b(inc|llc|co|corp|company|the)\b/g, '').replace(/\s+/g, ' ').trim();

async function findWorkbook(driveId) {
  try {
    return await graph(`/drives/${driveId}/root:/${enc(`${DIRECTORY_HOME}/${DIRECTORY_FILE}`)}?$select=id,name,webUrl`);
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  // Not in Master Template Files: look anywhere on the PM Team site.
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
    const { driveId } = await getPmDrive();
    const file = await findWorkbook(driveId);
    if (!file) {
      const err = new Error(`Couldn’t find “${DIRECTORY_FILE}” on the PM Team site. Put it in ${DIRECTORY_HOME} so everyone in the office can use it.`);
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
export const divisionOf = costCode => {
  const m = String(costCode || '').match(/^(\d{1,2})\d{2}/);
  return m ? m[1].padStart(2, '0') : '';
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
