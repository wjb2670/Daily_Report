// Reads and writes the App Access list (who has which role).
import { graph, graphAll } from '@/field/graph';
import { getSite, getListId } from '@/field/spAdapter';
import { currentAccount } from '@/field/auth';
import { ROLES, OWNERS, setCurrentRole } from '@/field/roles';

const CACHE_KEY = 'fieldReports:role';
const norm = e => String(e || '').trim().toLowerCase();

async function accessPath() {
  const site = await getSite();
  return `/sites/${site.id}/lists/${await getListId('access')}`;
}

const toEntry = item => ({
  id: item.id,
  name: item.fields?.Title || '',
  email: norm(item.fields?.Email),
  role: ROLES.includes(item.fields?.Role) ? item.fields.Role : 'Field',
});

export async function listAccess() {
  const path = await accessPath();
  const items = await graphAll(`${path}/items?$expand=fields($select=Title,Email,Role)&$top=500`);
  return items.map(toEntry).sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || a.name.localeCompare(b.name));
}

export async function addAccess({ name, email, role }) {
  const path = await accessPath();
  const item = await graph(`${path}/items`, { method: 'POST', body: { fields: { Title: name.trim(), Email: norm(email), Role: role } } });
  return toEntry({ ...item, fields: { Title: name.trim(), Email: norm(email), Role: role } });
}

export async function updateAccess(id, fields) {
  const path = await accessPath();
  const body = {};
  if (fields.role) body.Role = fields.role;
  if (fields.name != null) body.Title = fields.name.trim();
  await graph(`${path}/items/${id}/fields`, { method: 'PATCH', body });
}

export async function removeAccess(id) {
  const path = await accessPath();
  await graph(`${path}/items/${id}`, { method: 'DELETE' });
}

// Works out the signed-in person's role. Falls back to the last known role
// when there's no signal, and to Field when they aren't on the list.
export async function loadMyRole() {
  const acct = currentAccount();
  const email = norm(acct?.email);
  let role = OWNERS.includes(email) ? 'Admin' : 'Field';
  try {
    const entries = await listAccess();
    const mine = entries.find(e => e.email === email);
    if (mine && !OWNERS.includes(email)) role = mine.role;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ email, role })); } catch { /* ignore */ }
  } catch (err) {
    if (err.code !== 'not_set_up') {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached?.email === email && !OWNERS.includes(email)) role = cached.role;
      } catch { /* ignore */ }
    }
  }
  setCurrentRole(role);
  return role;
}
