// Stands in for the Base44 client in the Field Reports build, so the report
// screens save to the Field Reports SharePoint site instead of Base44.
// Only the calls the report screens use are provided.
import { graph, graphAll } from '@/field/graph';
import { CONFIG, currentAccount } from '@/field/auth';
import { LISTS, PHOTO_FOLDER, PROJECT_STATUS, reportToFields, fieldsToReport } from '@/field/schema';

const CACHE = 'fieldReports:';
const remember = (key, value) => { try { localStorage.setItem(CACHE + key, JSON.stringify(value)); } catch { /* full */ } };
const recall = key => { try { return JSON.parse(localStorage.getItem(CACHE + key) || 'null'); } catch { return null; } };

// ---- Site, lists, library ---------------------------------------------------------

let sitePromise = null;
export function getSite() {
  if (!sitePromise) {
    sitePromise = graph(`/sites/${CONFIG.siteHost}:${CONFIG.sitePath}?$select=id,webUrl,displayName`)
      .catch(err => { sitePromise = null; throw err; });
  }
  return sitePromise;
}

const listIds = {};
export async function getListId(key) {
  if (listIds[key]) return listIds[key];
  const cached = recall(`list:${key}`);
  if (cached) return (listIds[key] = cached);
  const site = await getSite();
  const name = LISTS[key].displayName.replace(/'/g, "''");
  const found = await graph(`/sites/${site.id}/lists?$select=id,displayName&$filter=displayName eq '${name}'`);
  const id = found.value?.[0]?.id;
  if (!id) {
    const err = new Error(`The "${LISTS[key].displayName}" list hasn't been set up yet. Ask the office to run Site setup.`);
    err.code = 'not_set_up';
    throw err;
  }
  remember(`list:${key}`, id);
  return (listIds[key] = id);
}

const listPath = async key => `/sites/${(await getSite()).id}/lists/${await getListId(key)}`;

// ---- Who is signed in --------------------------------------------------------------

let mePromise = null;
function getMe() {
  if (!mePromise) {
    mePromise = graph('/me?$select=id,displayName,mail,userPrincipalName')
      .then(me => {
        const out = { full_name: me.displayName, email: (me.mail || me.userPrincipalName || '').toLowerCase(), upn: (me.userPrincipalName || '').toLowerCase() };
        remember('me', out);
        return out;
      })
      .catch(err => {
        mePromise = null;
        const cached = recall('me');
        if (cached) return cached;
        const acct = currentAccount();
        if (acct) return { full_name: acct.name, email: acct.email.toLowerCase(), upn: acct.email.toLowerCase() };
        throw err;
      });
  }
  return mePromise;
}

// ---- Projects -------------------------------------------------------------------

const peopleIn = value => (Array.isArray(value) ? value : value ? [value] : []);

function toProject(item) {
  const f = item.fields || {};
  const supers = peopleIn(f.Superintendent);
  return {
    id: item.id,
    name: f.Title || '(no name)',
    job_number: f.JobNumber || '',
    status: PROJECT_STATUS[f.Status] || 'active',
    address: f.Address || '',
    city: f.City || '',
    state: f.State || '',
    zip: f.Zip || '',
    project_manager: f.ProjectManager || '',
    superintendent: supers.map(p => p.LookupValue).filter(Boolean).join(', '),
    latitude: f.Latitude ?? null,
    longitude: f.Longitude ?? null,
    _people: [...supers, ...peopleIn(f.CrewAccess)],
  };
}

// The site's own user list maps person IDs to email addresses, for the rare
// case Microsoft returns a person without their email.
const userEmails = {};
async function emailForLookup(lookupId) {
  if (lookupId in userEmails) return userEmails[lookupId];
  try {
    const site = await getSite();
    const item = await graph(`/sites/${site.id}/lists/User%20Information%20List/items/${lookupId}?$expand=fields($select=EMail,UserName)`);
    userEmails[lookupId] = (item.fields?.EMail || item.fields?.UserName || '').toLowerCase();
  } catch {
    userEmails[lookupId] = null;
  }
  return userEmails[lookupId];
}

async function isAssigned(project, me) {
  for (const person of project._people) {
    const email = (person.Email || '').toLowerCase() || (person.LookupId != null ? await emailForLookup(person.LookupId) : '');
    if (email && (email === me.email || email === me.upn)) return true;
  }
  return false;
}

const strip = ({ _people, ...p }) => p; // eslint-disable-line no-unused-vars

async function listMyProjects() {
  try {
    const [me, path] = await Promise.all([getMe(), listPath('projects')]);
    const items = await graphAll(`${path}/items?$expand=fields&$top=500`);
    const all = items.map(toProject);
    const mine = [];
    for (const p of all) if (await isAssigned(p, me)) mine.push(strip(p));
    mine.sort((a, b) => a.name.localeCompare(b.name));
    remember('projects', mine);
    return mine;
  } catch (err) {
    const cached = recall('projects');
    if (cached && err.code !== 'not_set_up') return cached; // no signal: use the last list
    throw err;
  }
}

// Every project in the list, any status — used when generating printed reports.
export async function listAllProjects() {
  const path = await listPath('projects');
  const items = await graphAll(`${path}/items?$expand=fields&$top=500`);
  return items.map(toProject).map(strip).sort((a, b) => a.name.localeCompare(b.name));
}

// ---- Daily reports -----------------------------------------------------------

const esc = v => String(v).replace(/'/g, "''");
const QUERY_HEADERS = { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' };

async function filterReports(query = {}, sort) {
  const path = await listPath('reports');
  const parts = [];
  if (query.project_id != null) parts.push(`fields/ProjectId eq '${esc(query.project_id)}'`);
  if (query.report_date) parts.push(`fields/ReportDay eq '${esc(query.report_date)}'`);
  const filter = parts.length ? `&$filter=${encodeURIComponent(parts.join(' and '))}` : '';
  const items = await graphAll(`${path}/items?$expand=fields${filter}&$top=200`, { headers: QUERY_HEADERS });
  const reports = items.map(fieldsToReport);
  if (sort === '-report_date') reports.sort((a, b) => String(b.report_date).localeCompare(String(a.report_date)));
  return reports;
}

async function createReport(data) {
  const path = await listPath('reports');
  const item = await graph(`${path}/items`, { method: 'POST', body: { fields: reportToFields(data) } });
  return { ...data, id: item.id };
}

async function updateReport(id, data) {
  const path = await listPath('reports');
  await graph(`${path}/items/${id}/fields`, { method: 'PATCH', body: reportToFields(data) });
  return { ...data, id };
}

// ---- Photos ------------------------------------------------------------------

const safeName = s => String(s || '').replace(/["*:<>?/\\|#%]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Job';

// Photos land in Daily Report Photos / <Job # – Project> / <date> /
// (delivery ticket photos in a Delivery Tickets folder inside that day)
async function uploadPhoto({ file }) {
  const site = await getSite();
  const [date, job, photoId = ''] = file.name.split('_');
  const isTicket = photoId.startsWith('t');
  const project = (recall('projects') || []).find(p => (p.job_number || 'job').replace(/[^\w-]+/g, '') === job);
  const jobFolder = safeName(project ? `${project.job_number} - ${project.name}` : job);
  const path = [PHOTO_FOLDER, jobFolder, date || 'undated', ...(isTicket ? ['Delivery Tickets'] : []), file.name]
    .map(encodeURIComponent).join('/');
  const item = await graph(`/sites/${site.id}/drive/root:/${path}:/content`, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'image/jpeg' },
  });
  return { file_url: `sp:${item.parentReference?.driveId}/${item.id}`, web_url: item.webUrl };
}

// Turns a stored photo reference into a viewable image address.
const thumbCache = new Map();
// `size` is 'large' (about 800px, for the app) or 'c1600x1600' (for printing).
export function resolvePhoto(url, size = 'large') {
  if (!url?.startsWith('sp:')) return Promise.resolve(url);
  const key = `${size}|${url}`;
  if (!thumbCache.has(key)) {
    const [driveId, itemId] = url.slice(3).split('/');
    const p = graph(`/drives/${driveId}/items/${itemId}/thumbnails?$select=${size}`)
      .then(r => r.value?.[0]?.[size]?.url || null)
      .catch(err => { thumbCache.delete(key); throw err; });
    thumbCache.set(key, p);
  }
  return thumbCache.get(key);
}

// ---- Base44-shaped client ------------------------------------------------------

export const base44 = {
  entities: {
    Project: {
      list: () => listMyProjects(),
      filter: async q => (await listMyProjects()).filter(p => Object.entries(q).every(([k, v]) => p[k] === v)),
      update: async (id, data) => {
        const fields = {};
        if ('latitude' in data) fields.Latitude = data.latitude;
        if ('longitude' in data) fields.Longitude = data.longitude;
        await graph(`${await listPath('projects')}/items/${id}/fields`, { method: 'PATCH', body: fields });
        return { id, ...data };
      },
    },
    Subcontractor: {
      list: async () => {
        try {
          const items = await graphAll(`${await listPath('subs')}/items?$expand=fields($select=Title,Trade)&$top=500`);
          const subs = items.map(i => ({ id: i.id, company_name: i.fields?.Title, trade: i.fields?.Trade }));
          remember('subs', subs);
          return subs;
        } catch {
          return recall('subs') || [];
        }
      },
    },
    DailyReport: { filter: filterReports, create: createReport, update: updateReport },
    AllProjects: { list: () => listAllProjects() },
  },
  auth: { me: getMe },
  integrations: { Core: { UploadFile: uploadPhoto } },
};

export default base44;
