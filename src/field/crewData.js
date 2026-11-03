// The Crew Board: who is on which job. The Projects list stays the record
// (its Superintendent and Crew Access columns); the board moves people
// between jobs and then updates their folder access on the PM Team site.
import { graph, graphAll } from '@/field/graph';
import { getSite, getListId } from '@/field/spAdapter';
import { toProjectRecord, updateProjectRecord } from '@/field/projectsData';
import { syncFieldAccess } from '@/field/jobData';

export const ROLE_FIELD = { Superintendent: 'Superintendent', Crew: 'CrewAccess' };
const QUERY = { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } };
const norm = s => String(s || '').trim().toLowerCase();
const listPath = async key => `/sites/${(await getSite()).id}/lists/${await getListId(key)}`;
const peopleIn = v => (Array.isArray(v) ? v : v ? [v] : []);

// SharePoint people columns store a user's number on this site. People who
// have opened the site (or the app) once have one.
const userIds = {};
async function siteUserId(email) {
  const key = norm(email);
  if (key in userIds) return userIds[key];
  const site = await getSite();
  try {
    const items = await graphAll(`/sites/${site.id}/lists/User Information List/items?$expand=fields($select=EMail,UserName,Title)&$filter=fields/EMail eq '${key.replace(/'/g, "''")}'&$top=5`, QUERY);
    userIds[key] = items[0] ? Number(items[0].id) : null;
  } catch {
    userIds[key] = null;
  }
  return userIds[key];
}

// Everything the board shows: active jobs, and every person from the roster
// or already named on a job.
export async function loadBoard() {
  const [projectItems, rosterItems] = await Promise.all([
    graphAll(`${await listPath('projects')}/items?$expand=fields&$top=999`),
    graphAll(`${await listPath('fieldCrew')}/items?$expand=fields&$top=999`).catch(() => []),
  ]);
  const people = new Map();
  const keyOf = p => norm(p.email) || `id:${p.userId}`;
  const add = p => {
    const k = keyOf(p);
    const cur = people.get(k);
    people.set(k, cur ? { ...cur, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== '')) } : { jobs: [], ...p });
    return people.get(k);
  };
  for (const r of rosterItems) {
    const f = r.fields || {};
    add({ rosterId: r.id, name: f.Title || f.Email, email: norm(f.Email), role: f.Role || 'Crew', userId: f.UserId ?? null });
  }
  const projects = projectItems.map(i => ({ ...toProjectRecord(i), raw: i.fields || {} }))
    .filter(p => p.status !== 'Complete')
    .sort((a, b) => a.jobNumber.localeCompare(b.jobNumber, undefined, { numeric: true }));
  for (const p of projects) {
    for (const [role, field] of Object.entries(ROLE_FIELD)) {
      for (const u of peopleIn(p.raw[field])) {
        const person = add({ name: u.LookupValue, email: norm(u.Email), userId: u.LookupId != null ? Number(u.LookupId) : null });
        if (!person.role) person.role = role;
        person.jobs.push({ projectId: String(p.id), as: role });
      }
    }
  }
  const list = [...people.values()].map(p => ({ ...p, role: p.role || 'Crew', key: keyOf(p) }))
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'Superintendent' ? -1 : 1));
  return { projects, people: list };
}

export async function addToRoster({ name, email, role }) {
  const userId = await siteUserId(email);
  await graph(`${await listPath('fieldCrew')}/items`, { method: 'POST', body: { fields: { Title: name.trim(), Email: norm(email), Role: role, ...(userId ? { UserId: userId } : {}) } } });
  return { userId };
}

export async function removeFromRoster(rosterId) {
  await graph(`${await listPath('fieldCrew')}/items/${rosterId}`, { method: 'DELETE' });
}

async function setPeople(projectId, field, ids) {
  await graph(`${await listPath('projects')}/items/${projectId}/fields`, {
    method: 'PATCH',
    body: { [`${field}LookupId@odata.type`]: 'Collection(Edm.Int32)', [`${field}LookupId`]: ids },
  });
}

// Moves (or adds) a person between jobs, then updates folder access on every
// job that changed. from/to are project ids, or null for "not on a job".
export async function movePerson(board, person, { from = null, to = null, keepFrom = false }, onStep = () => {}) {
  const userId = person.userId || (person.email ? await siteUserId(person.email) : null);
  if (!userId) {
    const err = new Error(`${person.name} hasn’t opened the Field Reports app or site yet, so SharePoint can’t assign them. Ask them to sign in to the app once, then try again.`);
    err.code = 'no_user';
    throw err;
  }
  const field = ROLE_FIELD[person.role] || 'CrewAccess';
  const changed = [];
  const edit = async (projectId, fn) => {
    const p = board.projects.find(x => String(x.id) === String(projectId));
    const item = await graph(`${await listPath('projects')}/items/${projectId}?$expand=fields`);
    const now = peopleIn(item.fields?.[field]).map(u => Number(u.LookupId)).filter(n => Number.isFinite(n));
    const next = fn(now);
    if (next.length !== now.length || next.some((n, i) => n !== now[i])) {
      await setPeople(projectId, field, next);
      changed.push(p);
    }
  };
  if (to) {
    onStep(`Adding ${person.name} to ${board.projects.find(x => String(x.id) === String(to))?.jobNumber || 'the job'}`);
    await edit(to, ids => (ids.includes(userId) ? ids : [...ids, userId]));
  }
  if (from && !keepFrom && String(from) !== String(to)) {
    onStep(`Taking ${person.name} off ${board.projects.find(x => String(x.id) === String(from))?.jobNumber || 'the old job'}`);
    // Off the job entirely, whichever column they were in.
    for (const f of Object.values(ROLE_FIELD)) {
      const item = await graph(`${await listPath('projects')}/items/${from}?$expand=fields`);
      const now = peopleIn(item.fields?.[f]).map(u => Number(u.LookupId)).filter(n => Number.isFinite(n));
      if (now.includes(userId)) {
        await setPeople(from, f, now.filter(n => n !== userId));
        if (!changed.some(c => String(c.id) === String(from))) changed.push(board.projects.find(x => String(x.id) === String(from)));
      }
    }
  }
  // Folder access follows the move.
  const notes = [];
  for (const p of changed.filter(Boolean)) {
    if (!p.folderId) { notes.push(`${p.jobNumber} has no job folder linked, so no folder access was changed there.`); continue; }
    onStep(`Updating folder access for ${p.jobNumber}`);
    const res = await syncFieldAccess(p, onStep);
    await updateProjectRecord(p.id, { fieldFolders: res.fieldFolders, fieldAccess: res.fieldAccess });
  }
  return { notes };
}
