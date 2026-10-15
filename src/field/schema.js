// What the Field Reports SharePoint site holds. The Set up screen creates
// these lists and columns; the app reads and writes them.

export const PHOTO_FOLDER = 'Daily Report Photos';

const text = (name, displayName, extra = {}) => ({ name, displayName: displayName || name, text: {}, ...extra });
const notes = (name, displayName) => ({ name, displayName: displayName || name, text: { allowMultipleLines: true, textType: 'plain', linesForEditing: 6 } });
const number = (name, displayName) => ({ name, displayName: displayName || name, number: {} });
const people = (name, displayName) => ({ name, displayName: displayName || name, personOrGroup: { allowMultipleSelection: true, chooseFromType: 'peopleOnly' } });
const choice = (name, choices, displayName) => ({ name, displayName: displayName || name, choice: { choices, displayAs: 'dropDownMenu', allowTextEntry: false }, defaultValue: { value: choices[0] } });

export const LISTS = {
  projects: {
    displayName: 'Projects',
    description: 'Jobs available in the Field Reports app. A project appears in the app for the people named in Superintendent or Crew Access while its Status is Active.',
    titleLabel: 'Project Name',
    columns: [
      text('JobNumber', 'Job Number', { indexed: true }),
      choice('Status', ['Active', 'On Hold', 'Complete']),
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
};

const STATUS_TO_LIST = { draft: 'Draft', submitted: 'Submitted', sent: 'Filed' };
const STATUS_FROM_LIST = { Draft: 'draft', Submitted: 'submitted', Filed: 'sent' };
export const PROJECT_STATUS = { Active: 'active', 'On Hold': 'on_hold', Complete: 'complete' };

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
