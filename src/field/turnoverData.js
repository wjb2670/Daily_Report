// Turnover: the estimating → PM and super hand-off meeting for a job.
// The checklist and sign-offs live in the Turnovers list. Notes on dollar
// items (budget, alternates, sub numbers) live in Turnover Office Notes, which
// the field app never reads: supers and crews never see a dollar amount.
import { graph, graphAll } from '@/field/graph';
import { getSite, getListId } from '@/field/spAdapter';
import { getPmDrive, safeName } from '@/field/projectsData';
import { noDollars } from '@/field/scopesData';

export const SIGNOFF_SLOTS = ['Estimator', 'Project Manager', 'Superintendent', 'Keith'];

// office: true → the item's notes are office-only (they usually hold dollars).
export const TURNOVER_ITEMS = [
  { id: 'docs', text: 'Contract documents: drawings and specs set, addenda, owner contract type (GC or CM)' },
  { id: 'alts', text: 'Accepted alternates, allowances and unit prices', office: true },
  { id: 'budget', text: 'Budget by cost code and the estimate’s contingency', office: true },
  { id: 'lowsubs', text: 'Low sub by trade, with their proposal number, date and exclusions', office: true },
  { id: 'gaps', text: 'Scope gaps between trades: items no sub carried' },
  { id: 'schedule', text: 'Schedule milestones, substantial completion and liquidated damages' },
  { id: 'longlead', text: 'Long-lead items and submittals to release first' },
  { id: 'permits', text: 'Permits, special inspections and testing' },
  { id: 'contacts', text: 'Owner, architect and engineer contacts; owner’s special requirements' },
  { id: 'site', text: 'Site logistics: access, staging, temporary utilities, dumpsters, toilets' },
  { id: 'insurance', text: 'Insurance, bond and prevailing wage requirements', office: true },
  { id: 'safety', text: 'Safety plan and site-specific hazards' },
  { id: 'risks', text: 'Known risks and what the estimator is worried about' },
  { id: 'super', text: 'Notes the super needs to know' },
];

const listPath = async key => `/sites/${(await getSite()).id}/lists/${await getListId(key)}`;
const parse = (s, fallback) => { try { return JSON.parse(s || ''); } catch { return fallback; } };
const QUERY = { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } };

export const blankTurnover = () => ({
  id: null, status: 'In progress', meetingDate: '', packetUrl: '', signoffs: {},
  items: TURNOVER_ITEMS.map(i => ({ ...i, done: false, notes: '' })),
});

function fromItem(item) {
  const f = item.fields || {};
  const saved = parse(f.ChecklistJSON, []);
  // Keep the standard items in order, then any added for this job.
  const items = [
    ...TURNOVER_ITEMS.map(std => ({ ...std, done: false, notes: '', ...(saved.find(s => s.id === std.id) || {}), text: std.text, office: !!std.office })),
    ...saved.filter(s => !TURNOVER_ITEMS.some(std => std.id === s.id)),
  ];
  return {
    id: item.id, status: f.Status || 'In progress', meetingDate: (f.MeetingDate || '').slice(0, 10), packetUrl: f.PacketUrl || '',
    signoffs: parse(f.SignoffsJSON, {}), items, projectId: f.ProjectId, updated: item.lastModifiedDateTime,
  };
}

async function findRow(key, projectId) {
  const items = await graphAll(`${await listPath(key)}/items?$expand=fields&$filter=fields/ProjectId eq '${projectId}'&$top=5`, QUERY);
  return items[0] || null;
}

// office: true also loads the dollar notes (office roles only).
export async function getTurnover(projectId, { office = false } = {}) {
  const row = await findRow('turnovers', projectId);
  const t = row ? fromItem(row) : blankTurnover();
  if (office) {
    const money = await findRow('turnoverMoney', projectId);
    const notes = parse(money?.fields?.NotesJSON, {});
    t.moneyId = money?.id || null;
    t.items = t.items.map(i => (i.office ? { ...i, notes: notes[i.id] || '' } : notes[i.id] ? { ...i, notes: notes[i.id] } : i));
  } else {
    t.items = t.items.map(i => (i.office ? { ...i, notes: '' } : { ...i, notes: noDollars(i.notes), text: noDollars(i.text) }));
  }
  return t;
}

export async function listTurnovers() {
  const items = await graphAll(`${await listPath('turnovers')}/items?$expand=fields($select=ProjectId,Status,ChecklistJSON,SignoffsJSON,MeetingDate)&$top=999`);
  return items.map(fromItem);
}

export const allSigned = t => SIGNOFF_SLOTS.every(s => t.signoffs?.[s]);

// Saves the checklist. Office notes go to their own list; the field-readable
// row never holds them.
export async function saveTurnover(project, t) {
  const status = allSigned(t) ? 'Signed off' : 'In progress';
  const fields = {
    Title: project.name, ProjectId: String(project.id), JobNumber: project.jobNumber || project.job_number || '', Status: status,
    MeetingDate: t.meetingDate ? `${t.meetingDate}T12:00:00Z` : null,
    ChecklistJSON: JSON.stringify(t.items.map(({ id, text, office, done, notes, custom }) => ({ id, done, notes: office ? '' : noDollars(notes), ...(custom ? { text, office: !!office, custom: true } : {}) }))),
    SignoffsJSON: JSON.stringify(t.signoffs || {}),
    ...(t.packetUrl != null ? { PacketUrl: t.packetUrl } : {}),
  };
  const path = await listPath('turnovers');
  let id = t.id;
  if (id) await graph(`${path}/items/${id}/fields`, { method: 'PATCH', body: fields });
  else id = (await graph(`${path}/items`, { method: 'POST', body: { fields } })).id;

  // Office-only items, plus any other note that mentions a dollar amount: the
  // full wording is kept here and the field row holds it with the amount hidden.
  const officeNotes = Object.fromEntries(t.items.filter(i => i.notes && (i.office || noDollars(i.notes) !== i.notes)).map(i => [i.id, i.notes]));
  let { moneyId } = t;
  if (moneyId || Object.keys(officeNotes).length) {
    const mpath = await listPath('turnoverMoney');
    const mf = { Title: project.name, ProjectId: String(project.id), NotesJSON: JSON.stringify(officeNotes) };
    if (moneyId) await graph(`${mpath}/items/${moneyId}/fields`, { method: 'PATCH', body: mf });
    else moneyId = (await graph(`${mpath}/items`, { method: 'POST', body: { fields: mf } })).id;
  }
  return { ...t, id, moneyId, status };
}

// The super signs from the field app: only the sign-off is written.
export async function fieldSignOff(t, slot, who) {
  const path = await listPath('turnovers');
  const row = await graph(`${path}/items/${t.id}?$expand=fields($select=SignoffsJSON)`);
  const signoffs = { ...parse(row.fields?.SignoffsJSON, {}), [slot]: who };
  const status = SIGNOFF_SLOTS.every(s => signoffs[s]) ? 'Signed off' : 'In progress';
  await graph(`${path}/items/${t.id}/fields`, { method: 'PATCH', body: { SignoffsJSON: JSON.stringify(signoffs), Status: status } });
  return { ...t, signoffs, status };
}

// ---- Turnover Packet PDF ---------------------------------------------------------

const fmtDate = d => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');

export async function packetPdf(project, t) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = 612; const M = 54; let y = M;
  const NAVY = [15, 42, 94];
  const room = h => { if (y + h > 740) { doc.addPage(); y = M; } };
  const para = (text, { size = 10, bold = false, color = [0, 0, 0], indent = 0, gap = 4 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
    for (const line of doc.splitTextToSize(String(text), W - 2 * M - indent)) { room(size + 3); doc.text(line, M + indent, y); y += size + 3; }
    y += gap;
  };
  para('TURNOVER PACKET', { size: 9, bold: true, color: NAVY, gap: 12 });
  para(`${project.jobNumber || ''} ${project.name}`.trim(), { size: 18, bold: true, color: NAVY, gap: 2 });
  para([project.owner, project.contractType, t.meetingDate && `Meeting ${fmtDate(t.meetingDate)}`].filter(Boolean).join(' · '), { size: 10, color: [80, 80, 80], gap: 12 });
  doc.setDrawColor(...NAVY); doc.line(M, y - 6, W - M, y - 6); y += 8;

  t.items.forEach((i, n) => {
    room(30);
    para(`${i.done ? '[x]' : '[  ]'}  ${n + 1}. ${i.text}${i.office ? '  (office only)' : ''}`, { size: 10.5, bold: true, gap: 2 });
    para(i.notes || 'No notes.', { size: 10, color: i.notes ? [0, 0, 0] : [130, 130, 130], indent: 22, gap: 8 });
  });

  room(120); y += 6;
  para('SIGN-OFFS', { size: 9, bold: true, color: NAVY, gap: 6 });
  for (const slot of SIGNOFF_SLOTS) {
    const s = t.signoffs?.[slot];
    para(`${slot}: ${s ? `${s.name}, ${new Date(s.at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'not signed'}`, { size: 10.5, gap: 4 });
  }
  para(`Saved ${new Date().toLocaleString('en-US')}. Office copy: includes dollar notes. Do not send to the field.`, { size: 8, color: [130, 130, 130] });
  return doc.output('blob');
}

// Saves the packet into the job folder and returns its link.
export async function savePacket(project, t) {
  if (!project.folderId) throw new Error('Link the job folder first (Project Startup).');
  const blob = await packetPdf(project, t);
  const { driveId } = await getPmDrive();
  const name = `${safeName(`${project.jobNumber || ''} Turnover Packet ${new Date().toISOString().slice(0, 10)}`.trim())}.pdf`;
  const item = await graph(`/drives/${driveId}/items/${project.folderId}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=replace`, {
    method: 'PUT', body: blob, headers: { 'Content-Type': 'application/pdf' },
  });
  return item.webUrl;
}
