// Saving daily reports so nothing is lost in the field.
//
// Every change is written to the device first (localStorage for the report,
// IndexedDB for photos taken without signal), then sent to the DailyReport
// table. If the phone is offline, the device copy is marked "pending" and is
// sent automatically once the connection comes back.
import { base44 } from '@/api/base44Client';

const DRAFT_PREFIX = 'dailyReport:draft:';
export const LAST_PROJECT_KEY = 'dailyReport:lastProject';

export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const draftKey = (projectId, date) => `${DRAFT_PREFIX}${projectId}:${date}`;

export function emptyReport(project, date) {
  return {
    project_id: project.id,
    project_name: project.name,
    job_number: project.job_number || '',
    report_date: date,
    status: 'draft',
    superintendent: project.superintendent || '',
    work_performed: '',
    weather_am: null,
    weather_pm: null,
    site_conditions: '',
    manpower: [],
    equipment: [],
    deliveries: [],
    visitors: [],
    inspections: [],
    toolbox_talk: '',
    safety_incidents: '',
    delays: [],
    utilities_installed: '',
    utilities_removed: '',
    photos: [],
    notes: '',
    signed_by: '',
    signed_at: null,
    submitted_at: null,
    revisions: [],
    client_updated_at: null,
  };
}

// ---- Device copy -----------------------------------------------------------

export function readDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key, data, pending) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, pending, saved_at: new Date().toISOString() }));
  } catch {
    // storage full or blocked; the server copy still saves when online
  }
}

export function pendingDraftKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX) && readDraft(key)?.pending) keys.push(key);
    }
  } catch {
    // ignore
  }
  return keys;
}

// ---- Photos waiting for signal (IndexedDB) -----------------------------------

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('whayland-daily-report', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function photoStore(mode, fn) {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode);
    const req = fn(tx.objectStore('photos'));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const photoQueue = {
  put: (id, blob) => photoStore('readwrite', s => s.put(blob, id)),
  get: id => photoStore('readonly', s => s.get(id)),
  remove: id => photoStore('readwrite', s => s.delete(id)),
};

// ---- Server copy -------------------------------------------------------------

const LOCAL_ONLY_PHOTO_FIELDS = ['pending', 'preview', 'error'];

// What gets stored in the DailyReport table: photos still waiting to upload
// stay on the device until they have a real URL.
export function serverPayload(data) {
  const { id: _id, created_date: _c, updated_date: _u, created_by: _b, ...rest } = data;
  return {
    ...rest,
    photos: (data.photos || [])
      .filter(p => p.url && !p.pending)
      .map(p => Object.fromEntries(Object.entries(p).filter(([k]) => !LOCAL_ONLY_PHOTO_FIELDS.includes(k)))),
  };
}

export async function findServerReport(projectId, date) {
  const rows = await base44.entities.DailyReport.filter({ project_id: projectId, report_date: date });
  if (!rows?.length) return null;
  // If two devices ever created the same day, use the most recently edited.
  return [...rows].sort((a, b) =>
    String(b.client_updated_at || b.updated_date || '').localeCompare(String(a.client_updated_at || a.updated_date || '')),
  )[0];
}

// Load the report for a project/day, merging the device copy and server copy.
export async function loadReport(project, date) {
  const key = draftKey(project.id, date);
  const local = readDraft(key);
  let server = null;
  let online = true;
  try {
    server = await findServerReport(project.id, date);
  } catch {
    online = false;
  }

  if (local?.pending) {
    const localNewer = !server || String(local.data.client_updated_at || '') >= String(server.client_updated_at || '');
    if (localNewer) return { data: { ...local.data, id: server?.id || local.data.id }, pending: true, online };
    // Another device saved more recently; keep its copy plus any photos still waiting here.
    const waiting = (local.data.photos || []).filter(p => p.pending);
    return { data: { ...server, photos: [...(server.photos || []), ...waiting] }, pending: waiting.length > 0, online };
  }
  if (server) return { data: server, pending: false, online };
  if (local) return { data: local.data, pending: false, online };
  return { data: emptyReport(project, date), pending: false, online };
}

// Uploads a waiting photo and returns its URL.
async function uploadPhoto(photo, data) {
  const blob = await photoQueue.get(photo.id);
  if (!blob) throw Object.assign(new Error('Photo is no longer on this device'), { lost: true });
  const name = `${data.report_date}_${(data.job_number || 'job').replace(/[^\w-]+/g, '')}_${photo.id}.jpg`;
  const file = new File([blob], name, { type: 'image/jpeg' });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

// Sends report changes to the server one at a time. Rapid edits are merged:
// only the newest version is sent once the previous save finishes.
export class ReportSyncer {
  constructor({ onStatus, onPhotoUploaded, onSaved }) {
    this.onStatus = onStatus;
    this.onPhotoUploaded = onPhotoUploaded;
    this.onSaved = onSaved;
    this.id = null;
    this.next = null;
    this.running = null;
  }

  setId(id) {
    this.id = id || null;
  }

  queue(data) {
    this.next = data;
    if (!this.running) this.running = this.run().finally(() => { this.running = null; });
    return this.running;
  }

  async run() {
    while (this.next) {
      const data = this.next;
      this.next = null;
      this.onStatus?.('saving');
      try {
        const saved = await this.push(data);
        if (!this.next) this.onStatus?.('saved');
        this.onSaved?.(saved, data);
      } catch (err) {
        if (!this.next) this.next = data; // keep it for the retry
        this.onStatus?.(navigator.onLine === false ? 'offline' : 'error', err);
        return;
      }
    }
  }

  async push(data) {
    let photos = data.photos || [];
    for (const photo of photos.filter(p => p.pending)) {
      try {
        const url = await uploadPhoto(photo, data);
        photos = photos.map(p => (p.id === photo.id ? { ...p, url, pending: false, uploaded_at: new Date().toISOString() } : p));
        this.onPhotoUploaded?.(photo.id, url);
      } catch (err) {
        if (err.lost) {
          photos = photos.filter(p => p.id !== photo.id);
          this.onPhotoUploaded?.(photo.id, null);
        } else {
          throw err;
        }
      }
    }
    const payload = serverPayload({ ...data, photos });

    if (!this.id) {
      const existing = await findServerReport(data.project_id, data.report_date);
      if (existing) this.id = existing.id;
    }
    const saved = this.id
      ? await base44.entities.DailyReport.update(this.id, payload)
      : await base44.entities.DailyReport.create(payload);
    this.id = saved?.id || this.id;

    for (const p of data.photos || []) {
      if (p.pending) photoQueue.remove(p.id).catch(() => {});
    }
    return { ...saved, id: this.id, photos };
  }
}
