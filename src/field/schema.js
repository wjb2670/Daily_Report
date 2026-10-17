// What the Field Reports SharePoint site holds. The Set up screen creates
// these lists and columns; the app reads and writes them.

export const PHOTO_FOLDER = 'Daily Report Photos';

const text = (name, displayName, extra = {}) => ({ name, displayName: displayName || name, text: {}, ...extra });
const notes = (name, displayName) => ({ name, displayName: displayName || name, text: { allowMultipleLines: true, textType: 'plain', linesForEditing: 6 } });
const number = (name, displayName) => ({ name, displayName: displayName || name, number: {} });
const people = (name, displayName) => ({ name, displayName: displayName || name, personOrGroup: { allowMultipleSelection: true, chooseFromType: 'peopleOnly' } });
const choice = (name, choices, displayName) => ({ name, displayName: displayName || name, choice: { choices, displayAs: 'dropDownMenu', allowTextEntry: false }, defaultValue: { value: choices[0] } });
const date = (name, displayName) => ({ name, displayName: displayName || name, dateTime: { format: 'dateOnly' } });

// New-project startup steps, kept as plain columns so they read well in SharePoint too.
export const BOND_STATUS = ['Not started', 'Requested', 'Received'];
export const CONTRACT_STATUS = ['Not started', 'Drafted', 'Sent for signature', 'Signed'];
export const BONDS_REQUIRED = ['Not yet known', 'Yes', 'No'];

export const LISTS = {
  projects: {
    displayName: 'Projects',
    description: 'Every Whayland job, from award through completion. A project appears in the field app for the people named in Superintendent or Crew Access.',
    titleLabel: 'Project Name',
    columns: [
      text('JobNumber', 'Job Number', { indexed: true }),
      choice('Status', ['Awarded', 'Active', 'On Hold', 'Complete']),
      people('Superintendent'),
      people('CrewAccess', 'Crew Access'),
      text('Address'),
      text('City'),
      text('State'),
      text('Zip', 'ZIP'),
      text('ProjectManager', 'Project Manager'),
      number('Latitude'),
      number('Longitude'),
      notes('ProjectNotes', 'Notes'),
      text('OwnerName', 'Owner / Client'),
      choice('ContractType', ['GC', 'CM'], 'Contract Type'),
      number('ContractAmount', 'Contract Amount'),
      date('AwardDate', 'Award Date'),
      date('AwardLetterDate', 'Award Letter Received'),
      date('NTPDate', 'Notice to Proceed'),
      choice('BondsRequired', BONDS_REQUIRED, 'Bonds Required'),
      choice('PaymentBond', BOND_STATUS, 'Payment Bond'),
      choice('PerformanceBond', BOND_STATUS, 'Performance Bond'),
      choice('OwnerContract', CONTRACT_STATUS, 'Owner Contract'),
      text('ProjectFolderUrl', 'Project Folder'),
      text('ProjectFolderId', 'Project Folder ID'),
      { name: 'ExistingJob', displayName: 'Existing Job', boolean: {} },
    ],
  },
  reports: {
    displayName: 'Daily Reports',
    description: 'One row per project per day, saved by the Field Reports app.',
    titleLabel: 'Report',
    columns: [
      text('ProjectId', 'Project ID', { indexed: true }),
      text('ReportDay', 'Report Day', { indexed: true }),
      { name: 'ReportDate', displayName: 'Report Date', dateTime: { format: 'dateOnly' } },
      text('JobNumber', 'Job Number'),
      text('ProjectName', 'Project Name'),
      choice('Status', ['Draft', 'Submitted', 'Filed']),
      text('Superintendent'),
      number('Headcount', 'On Site'),
      number('ManHours', 'Man-Hours'),
      notes('WorkPerformed', 'Work Performed'),
      text('WeatherAM', 'Weather 7 AM'),
      text('WeatherPM', 'Weather 2 PM'),
      text('Delays'),
      text('Safety'),
      number('PhotoCount', 'Photos'),
      text('SignedBy', 'Signed By'),
      { name: 'SignedAt', displayName: 'Signed At', dateTime: { format: 'dateTime' } },
      text('PreparedBy', 'Prepared By'),
      text('ClientUpdatedAt', 'Last Edited (device)'),
      notes('ReportJSON', 'Report Data'),
    ],
  },
  subs: {
    displayName: 'Subcontractors',
    description: 'Company names suggested in the Crew on Site section.',
    titleLabel: 'Company',
    columns: [text('Trade')],
  },
  scopeLibrary: {
    displayName: 'Scope Library',
    description: 'Standard subcontract scope lines by trade. Edited on the app’s Scope Library page.',
    titleLabel: 'Trade',
    columns: [
      text('CostCode', 'Cost Code', { indexed: true }),
      text('WorkName', 'Work Name (Exhibit A)'),
      notes('ItemsJSON', 'Scope Lines'),
    ],
  },
  subcontracts: {
    displayName: 'Subcontracts',
    description: 'One row per subcontract: company, trade and the scope the PM approved. Prices are kept in the Subcontract Prices list.',
    titleLabel: 'Company',
    columns: [
      text('ProjectId', 'Project ID', { indexed: true }),
      text('JobNumber', 'Job Number'),
      text('ContractNumber', 'Contract Number'),
      text('CostCode', 'Cost Code'),
      text('TradeName', 'Trade'),
      text('WorkName', 'Work Name (Exhibit A)'),
      choice('Status', ['Draft', 'PM approved', 'Contract sent', 'Signed']),
      text('CompanyAddress', 'Company Address'),
      text('CompanyCity', 'Company City, ST ZIP'),
      text('CompanyPhone', 'Company Phone'),
      text('CompanyEmail', 'Company Email'),
      text('ApprovedBy', 'Approved By'),
      { name: 'ApprovedAt', displayName: 'Approved At', dateTime: { format: 'dateTime' } },
      text('FolderUrl', 'Contract Folder'),
      text('FolderId', 'Contract Folder ID'),
      notes('ScopeJSON', 'Scope'),
    ],
  },
  subPrices: {
    displayName: 'Subcontract Prices',
    description: 'Contract amounts, kept apart from Subcontracts so field crews never see them. Limit this list to office staff in SharePoint.',
    titleLabel: 'Contract Number',
    columns: [
      text('SubcontractId', 'Subcontract ID', { indexed: true }),
      number('Amount'),
    ],
  },
  access: {
    displayName: 'App Access',
    description: 'Who can use which part of the Field Reports app. Managed on the app’s Access page. Anyone not listed is Field.',
    titleLabel: 'Name',
    columns: [
      text('Email', 'Email', { indexed: true }),
      choice('Role', ['Field', 'Reports only', 'Office', 'PM', 'Admin']),
    ],
  },
};

const STATUS_TO_LIST = { draft: 'Draft', submitted: 'Submitted', sent: 'Filed' };
const STATUS_FROM_LIST = { Draft: 'draft', Submitted: 'submitted', Filed: 'sent' };
export const PROJECT_STATUS = { Awarded: 'awarded', Active: 'active', 'On Hold': 'on_hold', Complete: 'complete' };

const weatherText = w => (w ? `${w.temperature_f ?? '—'}°F, ${w.condition || ''}${w.wind_mph != null ? `, wind ${w.wind_mph} mph` : ''}`.replace(/, $/, '') : '');

// Report (as the app holds it) → SharePoint row. The full report is kept in
// ReportJSON; the other columns make the list easy to read and filter.
export function reportToFields(r) {
  const manpower = r.manpower || [];
  const headcount = manpower.reduce((s, m) => s + (Number(m.workers) || 0), 0);
  const manHours = manpower.reduce((s, m) => s + (Number(m.workers) || 0) * (Number(m.hours) || 0), 0);
  const delays = (r.delays || []).map(d => `${d.cause}${d.hours_lost ? ` (${d.hours_lost} hrs)` : ''}`).join('; ');
  return {
    Title: `${r.job_number || 'Job'} · ${r.report_date}`,
    ProjectId: String(r.project_id),
    ReportDay: r.report_date,
    ReportDate: `${r.report_date}T12:00:00Z`,
    JobNumber: r.job_number || '',
    ProjectName: r.project_name || '',
    Status: STATUS_TO_LIST[r.status] || 'Draft',
    Superintendent: r.superintendent || '',
    Headcount: headcount,
    ManHours: manHours,
    WorkPerformed: r.work_performed || '',
    WeatherAM: weatherText(r.weather_am),
    WeatherPM: weatherText(r.weather_pm),
    Delays: delays.slice(0, 255),
    Safety: (r.safety_incidents || '').slice(0, 255),
    PhotoCount: (r.photos || []).length,
    SignedBy: r.signed_by || '',
    ...(r.signed_at ? { SignedAt: r.signed_at } : {}),
    PreparedBy: r.prepared_by || '',
    ClientUpdatedAt: r.client_updated_at || '',
    ReportJSON: JSON.stringify(r),
  };
}

export function fieldsToReport(item) {
  const f = item.fields || {};
  let data = {};
  try { data = JSON.parse(f.ReportJSON || '{}'); } catch { /* keep the columns below */ }
  return {
    ...data,
    id: item.id,
    project_id: f.ProjectId ?? data.project_id,
    report_date: f.ReportDay ?? data.report_date,
    status: STATUS_FROM_LIST[f.Status] || data.status || 'draft',
    client_updated_at: f.ClientUpdatedAt || data.client_updated_at,
    updated_date: item.lastModifiedDateTime,
  };
}
