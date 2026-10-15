// Service Calls data in Sussex Irrigation's SharePoint site.
import { graph, graphAll } from '@/field/graph';
import { CONFIG } from '@/field/auth';

const text = (name, displayName, extra = {}) => ({ name, displayName: displayName || name, text: {}, ...extra });
const notes = (name, displayName) => ({ name, displayName: displayName || name, text: { allowMultipleLines: true, textType: 'plain', linesForEditing: 6 } });
const number = (name, displayName) => ({ name, displayName: displayName || name, number: {} });

export const STATUSES = ['Open', 'Scheduled', 'Completed', 'Canceled'];

export const LISTS = {
  calls: {
    displayName: 'Service Calls',
    description: 'Service requests taken by the office. Newest data is entered by the Service Calls app.',
    titleLabel: 'Farm Name',
    columns: [
      text('ContactPerson', 'Contact Person'),
      text('ServiceAddress', 'Location of Service'),
      text('City'),
      text('State'),
      text('Zip', 'ZIP'),
      text('Phone', 'Contact Phone'),
      text('Email', 'Contact Email'),
      text('EquipmentBrand', 'Equipment Brand'),
      text('EquipmentType', 'Equipment Type'),
      notes('Reason', 'Reason for Call'),
      { name: 'CallReceived', displayName: 'Call Received', dateTime: { format: 'dateTime' }, indexed: true },
      { name: 'Status', displayName: 'Status', choice: { choices: STATUSES, displayAs: 'dropDownMenu', allowTextEntry: false }, defaultValue: { value: 'Open' }, indexed: true },
      { name: 'ScheduledDate', displayName: 'Scheduled Date', dateTime: { format: 'dateOnly' } },
      text('ScheduledDay', 'Scheduled Day', { indexed: true }),
      text('AssignedTech', 'Assigned Tech'),
      number('RouteOrder', 'Stop #'),
      number('Latitude'),
      number('Longitude'),
      text('LocationNote', 'Location Note'),
      text('TakenBy', 'Taken By'),
      notes('ServiceNotes', 'Service Notes'),
    ],
  },
  techs: {
    displayName: 'Technicians',
    description: 'Service techs available for scheduling. Uncheck Active for anyone no longer scheduled.',
    titleLabel: 'Technician',
    columns: [{ name: 'Active', displayName: 'Active', boolean: {} }],
  },
  settings: {
    displayName: 'Service Settings',
    description: 'Settings for the Service Calls app (e.g. the shop address routes start from).',
    titleLabel: 'Setting',
    columns: [text('SettingValue', 'Value'), number('Latitude'), number('Longitude')],
  },
};

// ---- Site and lists -------------------------------------------------------------

let sitePromise = null;
export function getSite() {
  if (!sitePromise) {
    sitePromise = graph(`/sites/${CONFIG.siteHost}:${CONFIG.sitePath}?$select=id,webUrl,displayName`)
      .catch(err => { sitePromise = null; throw err; });
  }
  return sitePromise;
}

const listIds = {};
async function findList(site, key) {
  const name = LISTS[key].displayName.replace(/'/g, "''");
  const found = await graph(`/sites/${site.id}/lists?$select=id,displayName,webUrl&$filter=displayName eq '${name}'`);
  return found.value?.[0] || null;
}

async function listPath(key) {
  const site = await getSite();
  if (!listIds[key]) {
    const list = await findList(site, key);
    if (!list) {
      const err = new Error(`The “${LISTS[key].displayName}” list hasn't been set up yet. Open Setup first.`);
      err.code = 'not_set_up';
      throw err;
    }
    listIds[key] = list.id;
  }
  return `/sites/${site.id}/lists/${listIds[key]}`;
}

export async function setupSite(log) {
  const site = await graph(`/sites/${CONFIG.siteHost}:${CONFIG.sitePath}?$select=id,webUrl,displayName`);
  log(`Found the “${site.displayName}” site`);
  const out = {};
  for (const key of Object.keys(LISTS)) {
    const def = LISTS[key];
    let list = await findList(site, key);
    if (!list) {
      list = await graph(`/sites/${site.id}/lists`, {
        method: 'POST',
        body: { displayName: def.displayName, description: def.description, columns: def.columns, list: { template: 'genericList' } },
      });
      log(`Created the “${def.displayName}” list`);
    } else {
      const have = new Set((await graphAll(`/sites/${site.id}/lists/${list.id}/columns?$select=name`)).map(c => c.name));
      const missing = def.columns.filter(c => !have.has(c.name));
      for (const col of missing) await graph(`/sites/${site.id}/lists/${list.id}/columns`, { method: 'POST', body: col });
      log(missing.length ? `Added ${missing.length} column(s) to “${def.displayName}”` : `“${def.displayName}” list is already set up`);
    }
    try {
      const cols = await graphAll(`/sites/${site.id}/lists/${list.id}/columns?$select=id,name,displayName`);
      const title = cols.find(c => c.name === 'Title');
      if (title && title.displayName !== def.titleLabel) {
        await graph(`/sites/${site.id}/lists/${list.id}/columns/${title.id}`, { method: 'PATCH', body: { displayName: def.titleLabel } });
      }
    } catch { /* cosmetic */ }
    listIds[key] = list.id;
    out[key] = list;
  }
  return { site, lists: out };
}

// ---- Calls ------------------------------------------------------------------------

export function toCall(item) {
  const f = item.fields || {};
  return {
    id: item.id,
    farm: f.Title || '',
    contact: f.ContactPerson || '',
    address: f.ServiceAddress || '',
    city: f.City || '',
    state: f.State || '',
    zip: f.Zip || '',
    phone: f.Phone || '',
    email: f.Email || '',
    brand: f.EquipmentBrand || '',
    equipment: f.EquipmentType || '',
    reason: f.Reason || '',
    received: f.CallReceived || item.createdDateTime || null,
    status: f.Status || 'Open',
    scheduledDay: f.ScheduledDay || '',
    tech: f.AssignedTech || '',
    stop: f.RouteOrder ?? null,
    lat: f.Latitude ?? null,
    lon: f.Longitude ?? null,
    locationNote: f.LocationNote || '',
    takenBy: f.TakenBy || '',
    serviceNotes: f.ServiceNotes || '',
  };
}

const FIELD_MAP = {
  farm: 'Title', contact: 'ContactPerson', address: 'ServiceAddress', city: 'City', state: 'State', zip: 'Zip',
  phone: 'Phone', email: 'Email', brand: 'EquipmentBrand', equipment: 'EquipmentType', reason: 'Reason',
  received: 'CallReceived', status: 'Status', tech: 'AssignedTech', stop: 'RouteOrder',
  lat: 'Latitude', lon: 'Longitude', locationNote: 'LocationNote', takenBy: 'TakenBy', serviceNotes: 'ServiceNotes',
};

function toFields(call) {
  const fields = {};
  for (const [k, col] of Object.entries(FIELD_MAP)) if (k in call) fields[col] = call[k] ?? null;
  if ('scheduledDay' in call) {
    fields.ScheduledDay = call.scheduledDay || '';
    fields.ScheduledDate = call.scheduledDay ? `${call.scheduledDay}T12:00:00Z` : null;
  }
  return fields;
}

const byOldest = (a, b) => String(a.received || '').localeCompare(String(b.received || ''));

export async function listCalls() {
  const path = await listPath('calls');
  const items = await graphAll(`${path}/items?$expand=fields&$top=500`);
  return items.map(toCall).sort(byOldest);
}

export async function createCall(call) {
  const path = await listPath('calls');
  const item = await graph(`${path}/items`, { method: 'POST', body: { fields: toFields({ status: 'Open', ...call }) } });
  return { ...call, id: item.id };
}

export async function updateCall(id, changes) {
  const path = await listPath('calls');
  await graph(`${path}/items/${id}/fields`, { method: 'PATCH', body: toFields(changes) });
}

// ---- Technicians and settings -------------------------------------------------------

export async function listTechs() {
  const path = await listPath('techs');
  const items = await graphAll(`${path}/items?$expand=fields($select=Title,Active)&$top=200`);
  return items
    .map(i => ({ id: i.id, name: i.fields?.Title || '', active: i.fields?.Active !== false }))
    .filter(t => t.name && t.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addTech(name) {
  const path = await listPath('techs');
  await graph(`${path}/items`, { method: 'POST', body: { fields: { Title: name, Active: true } } });
}

export async function getShop() {
  const path = await listPath('settings');
  const items = await graphAll(`${path}/items?$expand=fields&$top=50`);
  const row = items.find(i => i.fields?.Title === 'Shop address');
  if (!row) return null;
  return { id: row.id, address: row.fields.SettingValue || '', lat: row.fields.Latitude ?? null, lon: row.fields.Longitude ?? null };
}

export async function saveShop({ address, lat, lon }, existingId) {
  const path = await listPath('settings');
  const fields = { Title: 'Shop address', SettingValue: address, Latitude: lat, Longitude: lon };
  if (existingId) await graph(`${path}/items/${existingId}/fields`, { method: 'PATCH', body: fields });
  else await graph(`${path}/items`, { method: 'POST', body: { fields } });
}
