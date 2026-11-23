// Sending a subcontract and tracking it to "ready to pay": the email to the
// sub (written from the job and the subcontract, never retyped), the log of
// every step, the sub's signed copy, Whayland's signature, the executed copy
// back to the sub, and the paperwork that has to be in before payment.
import { graph, graphAll } from '@/field/graph';
import { getSite, getListId } from '@/field/spAdapter';
import { getPmDrive, makeFolder, safeName, TEMPLATE_FOLDER } from '@/field/projectsData';
import { updateSubcontract } from '@/field/scopesData';
import { currentAccount, MAIL_SCOPES } from '@/field/auth';
import { isLibraryProject, libraryDrive, ensureLibraries, tagFile } from '@/field/libraries';

const listPath = async key => `/sites/${(await getSite()).id}/lists/${await getListId(key)}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const me = () => { const a = currentAccount() || {}; return a.name || a.email || ''; };
export const WHAYLAND = 'The Whayland Company, 100 West 10th Street, Laurel, DE 19956';

export const stateName = st => (/^md|maryland/i.test(String(st || '').trim()) ? 'Maryland' : 'Delaware');
export const projectAddress = p => [p.address, [p.city, [p.state, p.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', ');

// ---- Company directory (the Subcontractors list) ----------------------------------

const DIR = {
  name: 'Title', trade: 'Trade', contact: 'ContactName', email: 'Email', phone: 'Phone', address: 'Address', city: 'City', state: 'State', zip: 'Zip',
  remitName: 'RemitName', remitAddress: 'RemitAddress', remitCity: 'RemitCity', businessType: 'BusinessType', tinLast4: 'TinLast4', vendorCode: 'VendorCode',
  w9Year: 'W9Year', w9Url: 'W9Url', deLicenseUrl: 'DELicenseUrl', mdLicenseUrl: 'MDLicenseUrl',
};
const DIR_DATES = { deLicenseExpires: 'DELicenseExpires', mdLicenseExpires: 'MDLicenseExpires', statusConfirmedOn: 'StatusConfirmedOn' };
const toCompany = item => {
  const f = item.fields || {}; const out = { id: String(item.id) };
  for (const [k, c] of Object.entries(DIR)) out[k] = f[c] || '';
  for (const [k, c] of Object.entries(DIR_DATES)) out[k] = (f[c] || '').slice(0, 10);
  return out;
};
// "Harkins Concrete" and "Harkins Concrete Construction, Inc." are the same company.
const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/\b(the|inc|llc|l\.l\.c|co|corp|corporation|company|ltd|construction|contracting|contractors?)\b\.?/g, '').replace(/[^a-z0-9]/g, '');

export async function findCompany(name) {
  const items = await graphAll(`${await listPath('subs')}/items?$expand=fields&$top=999`);
  const hit = items.find(i => norm(i.fields?.Title) === norm(name));
  return hit ? toCompany(hit) : null;
}

export async function saveCompany(company, changes) {
  const fields = {};
  for (const [k, v] of Object.entries(changes)) {
    if (DIR[k]) fields[DIR[k]] = v ?? '';
    if (DIR_DATES[k]) fields[DIR_DATES[k]] = v ? `${v}T12:00:00Z` : null;
  }
  // Never store a full tax ID: keep only the last 4 digits.
  if ('tinLast4' in changes) fields.TinLast4 = String(changes.tinLast4 || '').replace(/\D/g, '').slice(-4);
  const path = await listPath('subs');
  if (company?.id) { await graph(`${path}/items/${company.id}/fields`, { method: 'PATCH', body: fields }); return { ...company, ...changes }; }
  const item = await graph(`${path}/items`, { method: 'POST', body: { fields: { Title: changes.name || company?.name, ...fields } } });
  return toCompany(item);
}

// ---- Where a subcontract's files live -------------------------------------------

export async function contractDrive(project) {
  if (isLibraryProject(project)) return project.libraryFolders.contracts.driveId;
  return (await getPmDrive()).driveId;
}

export async function contractFiles(project, sub) {
  if (!sub.folderId) return [];
  const driveId = await contractDrive(project);
  const items = await graphAll(`/drives/${driveId}/items/${sub.folderId}/children?$select=id,name,file,size,webUrl,lastModifiedDateTime&$top=999`);
  return items.filter(i => i.file).map(i => ({ ...i, driveId }));
}

// The Invoicing & Payment Procedures sheet, from Master Template Files.
export async function findPaymentProcedures() {
  const { driveId } = await getPmDrive();
  try {
    const items = await graphAll(`/drives/${driveId}/root:/${encodeURIComponent(TEMPLATE_FOLDER)}:/children?$select=id,name,file,size&$top=999`);
    const hit = items.filter(i => i.file && /invoic/i.test(i.name) && /pay/i.test(i.name)).sort((a, b) => /\.pdf$/i.test(b.name) - /\.pdf$/i.test(a.name))[0];
    return hit ? { ...hit, driveId } : null;
  } catch { return null; }
}

// Saves a file into the subcontract's folder (job-specific paperwork).
export async function saveToContract(project, sub, file, name, docType) {
  if (!sub.folderId) throw new Error('Create the contract files first, so the paperwork has a folder.');
  const driveId = await contractDrive(project);
  const ext = (file.name.match(/\.[^.]+$/) || [''])[0];
  const fname = `${safeName(name)}${ext}`;
  const item = await graph(`/drives/${driveId}/items/${sub.folderId}:/${encodeURIComponent(fname)}:/content?@microsoft.graph.conflictBehavior=rename`, {
    method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (isLibraryProject(project)) await tagFile(driveId, item.id, { DocumentType: docType, Job: project.jobNumber, Company: sub.company }).catch(() => {});
  return { name: item.name, url: item.webUrl, id: item.id, driveId };
}

// Saves a yearly company document (W-9, business license) to Company Documents.
export async function saveCompanyDoc(companyName, file, docType, { year, expires } = {}) {
  let lib;
  try { lib = await libraryDrive('companyDocs'); } catch (err) {
    if (err.code !== 'no_library') throw err;
    await ensureLibraries(() => {}, ['companyDocs']);
    lib = await libraryDrive('companyDocs');
  }
  const folder = await makeFolder(lib.driveId, null, safeName(companyName));
  const ext = (file.name.match(/\.[^.]+$/) || [''])[0];
  const fname = `${safeName(`${companyName} ${docType} ${year || expires || today()}`)}${ext}`;
  const item = await graph(`/drives/${lib.driveId}/items/${folder.id}:/${encodeURIComponent(fname)}:/content?@microsoft.graph.conflictBehavior=rename`, {
    method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  await tagFile(lib.driveId, item.id, { DocumentType: docType, Company: companyName, DocYear: year ? String(year) : '', ...(expires ? { Expires: `${expires}T12:00:00Z` } : {}) }).catch(() => {});
  return { name: item.name, url: item.webUrl };
}

// ---- Log ------------------------------------------------------------------------

export async function logStep(sub, what, extra = {}) {
  const entry = { at: new Date().toISOString(), by: me(), what, ...extra };
  const log = [...(sub.log || []), entry];
  await updateSubcontract(sub.id, { log, ...(extra.status ? { status: extra.status } : {}) });
  return { ...sub, log, ...(extra.status ? { status: extra.status } : {}) };
}

// ---- The email --------------------------------------------------------------------

// The cover letter, as the body of the email. Everything comes from the job,
// the subcontract and the company directory.
export function contractEmail(project, sub, company = {}, sender = me()) {
  const state = stateName(project.state);
  const jobAddr = projectAddress(project);
  const owner = `${project.owner || '[Owner name]'}, ${project.ownerAddress || '[Owner address]'}`;
  const onFile = [
    ['Company', company.name || sub.company],
    ['Address', [company.address || sub.companyAddress, company.city ? `${company.city}, ${company.state} ${company.zip}`.trim() : sub.companyCity].filter(Boolean).join(', ')],
    ['Phone', company.phone || sub.companyPhone],
    ['Email', company.email || sub.companyEmail],
    ['Remit to', [company.remitName, company.remitAddress, company.remitCity].filter(Boolean).join(', ') || 'Same as above'],
    ['Business type', company.businessType],
  ].filter(([, v]) => v);
  const subject = `Subcontract ${sub.contractNumber} – ${project.name}`;
  const p = s => `<p style="margin:0 0 12px">${s}</p>`;
  const li = s => `<li style="margin:0 0 6px">${s}</li>`;
  const html = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1f2937">
${p(`${esc(sub.companyContact || company.contact || sub.company)},`)}
${p(`Attached is our Subcontract/Supplier Agreement for <b>${esc(project.name)}</b>, Contract No. <b>${esc(sub.contractNumber)}</b>, along with our Invoicing &amp; Payment Procedures.`)}
${p('<b>Please sign the agreement where indicated and return it by replying to this email.</b> Do not make any changes to the agreement without written approval from The Whayland Company. Once the agreement is fully executed, we will email you a copy for your records.')}
${p('<b>Please return the following with the signed agreement:</b>')}
<ul style="margin:0 0 12px;padding-left:22px">
${li('Signed Invoicing &amp; Payment Procedures')}
${li('Your Schedule of Values')}
${li(`A copy of your <b>${state}</b> business license, and any required city or town licenses`)}
${li(`A Certificate of Insurance for this project showing General Liability, Auto and Workers’ Compensation coverage, with:
<ul style="margin:6px 0 0;padding-left:20px">
<li>Project: <b>${esc(project.name)}${jobAddr ? `, ${esc(jobAddr)}` : ''}</b></li>
<li>Additional insured (General Liability): ${esc(WHAYLAND)} (General Contractor), and ${esc(owner)} (Owner)</li>
<li>Certificate holders: both The Whayland Company and the Owner</li>
</ul>`)}
${li('Confirmation that your company information below is current. If anything has changed, reply with the correct information.')}
</ul>
<table style="border-collapse:collapse;margin:0 0 14px;font-size:10.5pt">${onFile.map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#6b7280">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`).join('')}</table>
${p('Invoices must be submitted on AIA G702 and G703 forms; invoices on any other form will be returned unprocessed. Please send Safety Data Sheets (SDS) for the materials you will use, and shop drawings or samples of items you will furnish and install, as soon as possible.')}
${p('<b>No payment can be made until all of the items above have been received in our office.</b>')}
${p('Thank you. We look forward to working with you.')}
${p(`${esc(sender)}<br>The Whayland Company<br>100 West 10th Street, Laurel, DE 19956`)}
</div>`;
  return { subject, html };
}

export function executedEmail(project, sub, sender = me()) {
  return {
    subject: `Executed Subcontract ${sub.contractNumber} – ${project.name}`,
    html: `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1f2937">
<p>${esc(sub.companyContact || sub.company)},</p>
<p>Attached is your fully executed Subcontract/Supplier Agreement for <b>${esc(project.name)}</b>, Contract No. <b>${esc(sub.contractNumber)}</b>, for your records.</p>
<p>As a reminder, no payment can be made until all required paperwork, including a project-specific Certificate of Insurance, has been received.</p>
<p>Thank you,<br>${esc(sender)}<br>The Whayland Company</p></div>`,
  };
}

// ---- Sending ------------------------------------------------------------------------

const b64 = async blob => {
  const buf = new Uint8Array(await blob.arrayBuffer()); let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
};

async function fileBlob(f) {
  const meta = await graph(`/drives/${f.driveId}/items/${f.id}`);
  const res = await fetch(meta['@microsoft.graph.downloadUrl']);
  if (!res.ok) throw new Error(`Couldn’t read ${f.name}.`);
  return res.blob();
}

// Sends from the signed-in person's own mailbox (it lands in their Sent Items).
export async function sendMail({ to, cc = [], subject, html, attachments = [] }, onStep = () => {}) {
  const M = { scopes: MAIL_SCOPES };
  const rcpt = list => list.filter(Boolean).map(address => ({ emailAddress: { address } }));
  const draft = await graph('/me/messages', { ...M, method: 'POST', body: { subject, body: { contentType: 'HTML', content: html }, toRecipients: rcpt(to), ccRecipients: rcpt(cc) } });
  for (const f of attachments) {
    onStep(`Attaching ${f.name}`);
    const blob = f.blob || await fileBlob(f);
    if (blob.size < 3 * 1024 * 1024) {
      await graph(`/me/messages/${draft.id}/attachments`, { ...M, method: 'POST', body: { '@odata.type': '#microsoft.graph.fileAttachment', name: f.name, contentBytes: await b64(blob) } });
    } else {
      const { uploadUrl } = await graph(`/me/messages/${draft.id}/attachments/createUploadSession`, { ...M, method: 'POST', body: { AttachmentItem: { attachmentType: 'file', name: f.name, size: blob.size } } });
      const CH = 3 * 1024 * 1024;
      for (let at = 0; at < blob.size; at += CH) {
        const part = blob.slice(at, Math.min(at + CH, blob.size));
        const r = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${at}-${at + part.size - 1}/${blob.size}` }, body: part });
        if (!r.ok && r.status !== 200 && r.status !== 201) throw new Error(`Couldn’t attach ${f.name}.`);
      }
    }
  }
  onStep('Sending');
  await graph(`/me/messages/${draft.id}/send`, { ...M, method: 'POST' });
}

// ---- Ready to pay ----------------------------------------------------------------

const daysTo = d => (d ? Math.round((new Date(`${d}T12:00:00`) - new Date()) / 864e5) : null);

// The six things that must be in before payment, for one subcontract.
export function paperwork(project, sub, company) {
  const c = sub.compliance || {};
  const st = stateName(project.state);
  const licExp = st === 'Maryland' ? company?.mdLicenseExpires : company?.deLicenseExpires;
  const licUrl = st === 'Maryland' ? company?.mdLicenseUrl : company?.deLicenseUrl;
  const yr = String(new Date().getFullYear());
  const coiDays = daysTo(c.coi?.expires);
  const items = [
    { key: 'contract', label: 'Executed contract', done: sub.status === 'Executed', note: sub.status === 'Executed' ? 'Executed' : `Now: ${sub.status}` },
    { key: 'coi', label: 'Certificate of insurance (this job)', done: !!(c.coi?.url && c.coi?.checkedBy && coiDays != null && coiDays >= 0), note: !c.coi?.url ? 'Not received' : !c.coi.checkedBy ? 'Received, not checked yet' : coiDays < 0 ? `Expired ${c.coi.expires}` : `Expires ${c.coi.expires}${coiDays <= 30 ? ' (soon)' : ''}`, url: c.coi?.url, warn: coiDays != null && coiDays <= 30 },
    { key: 'license', label: `${st} business license`, done: !!(licUrl && daysTo(licExp) >= 0), note: !licUrl ? 'Not on file' : daysTo(licExp) < 0 ? `Expired ${licExp}` : `On file, expires ${licExp}`, url: licUrl, company: true },
    { key: 'w9', label: `W-9 (${yr})`, done: company?.w9Year === yr, note: company?.w9Year ? `On file: ${company.w9Year}` : 'Not on file', url: company?.w9Url, company: true },
    { key: 'status', label: 'Company information confirmed', done: !!c.status?.at, note: c.status?.at ? `${c.status.how} · ${c.status.by}, ${c.status.at.slice(0, 10)}` : 'Not confirmed for this job' },
    { key: 'payProc', label: 'Invoicing & Payment Procedures', done: !!c.payProc?.url, note: c.payProc?.url ? 'Signed copy received' : 'Not received', url: c.payProc?.url },
  ];
  return { items, done: items.filter(i => i.done).length, ready: items.every(i => i.done) };
}

export async function setCompliance(sub, patch) {
  const compliance = { ...(sub.compliance || {}), ...patch };
  await updateSubcontract(sub.id, { compliance });
  return { ...sub, compliance };
}

// For the super's dashboard: is there a current certificate for this sub on this job?
export const coiOk = sub => { const c = sub.compliance?.coi; return !!(c?.url && c.expires && daysTo(c.expires) >= 0); };

