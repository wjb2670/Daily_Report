import React from 'react';
import logoUrl from '@/field/whayland-logo.png';

// Print-ready daily reports for one project over a date range.
// Letter size; each day starts on a new page; that day's photos follow it.

const NAVY = '#0f2a5e';
const PHOTOS_PER_PAGE = 6;

const dayDate = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
export const longDate = d => dayDate(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const shortDate = d => dayDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const time = iso => (iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');
const dateTime = iso => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const num = v => Number(v) || 0;
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const isTicket = p => p?.category === 'ticket';

export function sitePhotos(report) {
  return (report.photos || []).filter(p => !isTicket(p) && p.url);
}

export function summarize(reports) {
  const s = { days: reports.length, manHours: 0, workerDays: 0, delayHours: 0, delays: {}, deliveries: 0, inspections: 0, photos: 0, incidents: 0 };
  for (const r of reports) {
    for (const m of r.manpower || []) { s.manHours += num(m.workers) * num(m.hours); s.workerDays += num(m.workers); }
    for (const d of r.delays || []) { s.delayHours += num(d.hours_lost); s.delays[d.cause] = (s.delays[d.cause] || 0) + num(d.hours_lost); }
    s.deliveries += (r.deliveries || []).length;
    s.inspections += (r.inspections || []).length;
    s.photos += sitePhotos(r).length;
    const inc = (r.safety_incidents || '').trim();
    if (inc && inc.toLowerCase() !== 'none') s.incidents += 1;
  }
  return s;
}

function Logo() {
  return <img src={logoUrl} alt="The Whayland Company" style={{ height: '0.62in', width: 'auto' }} />;
}

function SectionTitle({ children }) {
  return <h3 className="rp-h3">{children}</h3>;
}

function Table({ columns, rows, empty = 'None reported.' }) {
  if (!rows.length) return <p className="rp-empty">{empty}</p>;
  return (
    <table className="rp-table">
      <thead><tr>{columns.map(c => <th key={c.label} style={{ width: c.width, textAlign: c.align || 'left' }}>{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id || i}>{columns.map(c => <td key={c.label} style={{ textAlign: c.align || 'left' }}>{c.value(r) ?? ''}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Text({ value, empty = 'None reported.' }) {
  const v = (value || '').trim();
  return v ? <p className="rp-text">{v}</p> : <p className="rp-empty">{empty}</p>;
}

function Weather({ report }) {
  const rows = [['7:00 AM', report.weather_am], ['2:00 PM', report.weather_pm]];
  return (
    <table className="rp-table">
      <thead><tr><th style={{ width: '14%' }}>Reading</th><th>Conditions</th><th style={{ width: '10%', textAlign: 'right' }}>Temp</th><th style={{ width: '18%' }}>Wind</th><th style={{ width: '11%', textAlign: 'right' }}>Humidity</th><th style={{ width: '13%', textAlign: 'right' }}>Rain (1 hr)</th></tr></thead>
      <tbody>
        {rows.map(([label, w]) => (
          <tr key={label}>
            <td>{label}</td>
            {w ? (
              <>
                <td>{w.condition || '—'}<span className="rp-muted"> · observed {time(w.observed_at)}</span></td>
                <td style={{ textAlign: 'right' }}>{w.temperature_f ?? '—'}°F</td>
                <td>{w.wind_mph ?? '—'} mph {w.wind_direction || ''}{w.wind_gust_mph ? `, gusts ${w.wind_gust_mph}` : ''}</td>
                <td style={{ textAlign: 'right' }}>{w.humidity_percent ?? '—'}%</td>
                <td style={{ textAlign: 'right' }}>{w.precip_last_hour_in != null ? `${w.precip_last_hour_in}"` : '—'}</td>
              </>
            ) : <td colSpan={5} className="rp-muted">Not recorded</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PageHeader({ project, title, right }) {
  return (
    <div className="rp-pagehead">
      <div>
        <div className="rp-proj">{project.name}</div>
        <div className="rp-muted">Job {project.job_number || '—'}{project.city ? ` · ${[project.city, project.state].filter(Boolean).join(', ')}` : ''}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="rp-daytitle">{title}</div>
        {right && <div className="rp-muted">{right}</div>}
      </div>
    </div>
  );
}

function DayReport({ project, report }) {
  const manpower = report.manpower || [];
  const totalWorkers = manpower.reduce((s, m) => s + num(m.workers), 0);
  const totalHours = manpower.reduce((s, m) => s + num(m.workers) * num(m.hours), 0);
  const incidents = (report.safety_incidents || '').trim();
  const status = report.status === 'draft' ? 'DRAFT — not signed off' : null;
  const has = v => (Array.isArray(v) ? v.length > 0 : !!(v || '').trim());
  const optionalSections = [
    { title: 'Deliveries', has: has(report.deliveries), body: <Table columns={[
      { label: 'Material', width: '30%', value: d => d.material },
      { label: 'Supplier', width: '22%', value: d => d.supplier },
      { label: 'Quantity', width: '18%', value: d => d.quantity },
      { label: 'Notes', value: d => d.notes },
    ]} rows={report.deliveries || []} /> },
    { title: 'Equipment', has: has(report.equipment), body: <Table columns={[
      { label: 'Equipment', width: '30%', value: e => e.equipment },
      { label: 'Owned / rented by', width: '26%', value: e => e.company },
      { label: 'Hours', width: '10%', align: 'right', value: e => e.hours },
      { label: 'Notes', value: e => e.notes },
    ]} rows={report.equipment || []} /> },
    { title: 'Inspections', has: has(report.inspections), body: <Table columns={[
      { label: 'Inspection', width: '30%', value: i => i.type },
      { label: 'Inspector / agency', width: '26%', value: i => i.inspector },
      { label: 'Result', width: '12%', value: i => i.result },
      { label: 'Notes', value: i => i.notes },
    ]} rows={report.inspections || []} /> },
    { title: 'Visitors & Meetings', has: has(report.visitors), body: <Table columns={[
      { label: 'Name', width: '26%', value: v => v.name },
      { label: 'Company', width: '26%', value: v => v.company },
      { label: 'Purpose', value: v => v.purpose },
    ]} rows={report.visitors || []} /> },
  ];
  const lateSections = [
    { title: 'Delays', has: has(report.delays), body: <Table columns={[
      { label: 'Cause', width: '20%', value: d => d.cause },
      { label: 'Hours lost', width: '12%', align: 'right', value: d => d.hours_lost },
      { label: 'Description', value: d => d.description },
    ]} rows={report.delays || []} /> },
    { title: 'Utilities', has: has(report.utilities_installed) || has(report.utilities_removed), body: (
      <table className="rp-table rp-kv">
        <tbody>
          <tr><th style={{ width: '30%' }}>Installed</th><td>{report.utilities_installed?.trim() || '—'}</td></tr>
          <tr><th>Removed</th><td>{report.utilities_removed?.trim() || '—'}</td></tr>
        </tbody>
      </table>
    ) },
    { title: 'Notes', has: has(report.notes), body: <Text value={report.notes} /> },
  ];
  const empties = [...optionalSections, ...lateSections].filter(o => !o.has).map(o => o.title);

  return (
    <section className="rp-page rp-break">
      <PageHeader project={project} title={longDate(report.report_date)}
        right={`Superintendent: ${report.superintendent || '—'}`} />
      {status && <div className="rp-draft">{status}</div>}

      <SectionTitle>Weather</SectionTitle>
      <Weather report={report} />
      {report.site_conditions?.trim() && <p className="rp-text"><strong>Site conditions:</strong> {report.site_conditions}</p>}

      <SectionTitle>Crew on Site <span className="rp-muted">— {totalWorkers} workers · {fmt(totalHours)} man-hours</span></SectionTitle>
      <Table
        columns={[
          { label: 'Company', width: '24%', value: m => m.company },
          { label: 'Trade', width: '16%', value: m => m.trade },
          { label: 'Workers', width: '9%', align: 'right', value: m => m.workers },
          { label: 'Hours', width: '8%', align: 'right', value: m => m.hours },
          { label: 'Man-hrs', width: '9%', align: 'right', value: m => fmt(num(m.workers) * num(m.hours)) },
          { label: 'Work', value: m => m.work_performed },
        ]}
        rows={manpower}
        empty="No crew reported."
      />

      <SectionTitle>Work Performed</SectionTitle>
      <Text value={report.work_performed} />

      {optionalSections.filter(o => o.has).map(o => (
        <React.Fragment key={o.title}>
          <SectionTitle>{o.title}</SectionTitle>
          {o.body}
        </React.Fragment>
      ))}

      <SectionTitle>Safety</SectionTitle>
      <table className="rp-table rp-kv">
        <tbody>
          <tr><th style={{ width: '30%' }}>Toolbox talk</th><td>{report.toolbox_talk?.trim() || '—'}</td></tr>
          <tr><th>Incidents / near-misses</th><td>{incidents ? (incidents.toLowerCase() === 'none' ? 'None' : incidents) : 'Not reported'}</td></tr>
        </tbody>
      </table>

      {lateSections.filter(o => o.has).map(o => (
        <React.Fragment key={o.title}>
          <SectionTitle>{o.title}</SectionTitle>
          {o.body}
        </React.Fragment>
      ))}

      {empties.length > 0 && (
        <p className="rp-none"><strong>Nothing reported:</strong> {empties.join(', ')}.</p>
      )}

      <div className="rp-signoff">
        <div>
          <div className="rp-label">Superintendent sign-off</div>
          <div className="rp-sig">{report.signed_by || ' '}</div>
        </div>
        <div>
          <div className="rp-label">Signed</div>
          <div className="rp-sig">{report.signed_at ? dateTime(report.signed_at) : 'Not signed'}</div>
        </div>
        <div>
          <div className="rp-label">Photos</div>
          <div className="rp-sig">{sitePhotos(report).length}</div>
        </div>
      </div>
      {report.revisions?.length > 0 && (
        <p className="rp-muted" style={{ marginTop: 6 }}>
          Edited after sign-off: {report.revisions.map(r => `${dateTime(r.at)}${r.by ? ` (${r.by})` : ''}`).join('; ')}
        </p>
      )}
    </section>
  );
}

function PhotoPages({ project, report, srcs }) {
  const photos = sitePhotos(report);
  const pages = chunk(photos, PHOTOS_PER_PAGE);
  return pages.map((page, pi) => (
    <section key={pi} className="rp-page rp-break">
      <PageHeader project={project} title={`Photos — ${longDate(report.report_date)}`}
        right={pages.length > 1 ? `Page ${pi + 1} of ${pages.length} · ${photos.length} photos` : `${photos.length} photo${photos.length === 1 ? '' : 's'}`} />
      <div className="rp-photogrid">
        {page.map((p, i) => (
          <figure key={p.id} className="rp-photo">
            <div className="rp-photoimg">
              {srcs[p.id] ? <img src={srcs[p.id]} alt={p.caption || 'Job site photo'} /> : <span className="rp-muted">Photo unavailable</span>}
            </div>
            <figcaption>
              <div><strong>{pi * PHOTOS_PER_PAGE + i + 1}.</strong> {p.caption?.trim() || <span className="rp-muted">No caption</span>}</div>
              <div className="rp-muted">
                {p.taken_at ? dateTime(p.taken_at) : ''}
                {p.latitude != null ? ` · ${Number(p.latitude).toFixed(5)}, ${Number(p.longitude).toFixed(5)}` : ''}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  ));
}

function Cover({ project, from, to, reports, preparedBy, includePhotos }) {
  const s = summarize(reports);
  const delayText = Object.entries(s.delays).filter(([, h]) => h).map(([c, h]) => `${c} ${fmt(h)} hrs`).join(', ');
  return (
    <section className="rp-page">
      <div className="rp-coverhead">
        <Logo />
        <div style={{ textAlign: 'right' }}>
          <div className="rp-kicker">Daily Construction Reports</div>
          <div className="rp-muted">Prepared {dateTime(new Date().toISOString())}{preparedBy ? ` by ${preparedBy}` : ''}</div>
        </div>
      </div>

      <h1 className="rp-h1">{project.name}</h1>
      <table className="rp-table rp-kv" style={{ marginTop: 8 }}>
        <tbody>
          <tr><th style={{ width: '24%' }}>Job number</th><td>{project.job_number || '—'}</td></tr>
          <tr><th>Job site</th><td>{[project.address, project.city, project.state, project.zip].filter(Boolean).join(', ') || '—'}</td></tr>
          {project.project_manager && <tr><th>Project manager</th><td>{project.project_manager}</td></tr>}
          <tr><th>Report period</th><td>{longDate(from)} — {longDate(to)}</td></tr>
        </tbody>
      </table>

      <SectionTitle>Summary</SectionTitle>
      <div className="rp-stats">
        {[
          ['Days reported', s.days],
          ['Man-hours', fmt(s.manHours)],
          ['Avg. crew / day', s.days ? fmt(s.workerDays / s.days) : 0],
          ['Delay hours', fmt(s.delayHours)],
          ['Deliveries', s.deliveries],
          ['Inspections', s.inspections],
          ['Safety incidents', s.incidents],
          ...(includePhotos ? [['Photos', s.photos]] : []),
        ].map(([label, value]) => (
          <div key={label} className="rp-stat"><div className="rp-statval">{value}</div><div className="rp-label">{label}</div></div>
        ))}
      </div>
      {delayText && <p className="rp-text"><strong>Delays by cause:</strong> {delayText}</p>}

      <SectionTitle>Reports included</SectionTitle>
      <Table
        columns={[
          { label: 'Date', width: '30%', value: r => longDate(r.report_date) },
          { label: 'Superintendent', width: '20%', value: r => r.superintendent },
          { label: 'Crew', width: '8%', align: 'right', value: r => (r.manpower || []).reduce((t, m) => t + num(m.workers), 0) },
          { label: 'Man-hrs', width: '10%', align: 'right', value: r => fmt((r.manpower || []).reduce((t, m) => t + num(m.workers) * num(m.hours), 0)) },
          ...(includePhotos ? [{ label: 'Photos', width: '8%', align: 'right', value: r => sitePhotos(r).length }] : []),
          { label: 'Signed off', value: r => (r.signed_by ? `${r.signed_by}, ${dateTime(r.signed_at)}` : 'Draft — not signed') },
        ]}
        rows={reports}
        empty="No daily reports in this period."
      />
    </section>
  );
}

export const PRINT_CSS = `
  @page { size: letter; margin: 0.45in 0.5in 0.55in; @bottom-left { content: "The Whayland Company · Daily Reports"; font: 8pt system-ui, sans-serif; color: #6b7280; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt system-ui, sans-serif; color: #6b7280; } }
  .rp-root { color: #111827; font: 9.5pt/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rp-page { background: #fff; }
  .rp-break { break-before: page; }
  .rp-coverhead { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${NAVY}; padding-bottom: 10px; margin-bottom: 18px; }
  .rp-kicker { font-size: 13pt; font-weight: 800; color: ${NAVY}; text-transform: uppercase; letter-spacing: .06em; }
  .rp-h1 { font-size: 22pt; font-weight: 800; color: ${NAVY}; margin: 6px 0 4px; line-height: 1.15; }
  .rp-h3 { font-size: 11pt; font-weight: 800; color: ${NAVY}; text-transform: uppercase; letter-spacing: .04em; margin: 8px 0 3px; padding-bottom: 2px; border-bottom: 1.5px solid ${NAVY}; break-after: avoid; }
  .rp-h3 .rp-muted { text-transform: none; letter-spacing: 0; font-weight: 600; }
  .rp-muted { color: #6b7280; font-size: 9pt; }
  .rp-label { color: #6b7280; font-size: 8pt; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
  .rp-text { margin: 2px 0 0; white-space: pre-wrap; }
  .rp-none { margin: 8px 0 0; padding: 5px 8px; background: #f3f4f6; border-radius: 4px; font-size: 9pt; color: #374151; }
  .rp-empty { margin: 2px 0 0; color: #6b7280; font-style: italic; }
  .rp-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .rp-table th { background: #eef2f8; color: ${NAVY}; font-weight: 700; padding: 3px 6px; border: 1px solid #cbd5e1; font-size: 8pt; text-transform: uppercase; letter-spacing: .03em; }
  .rp-table td { padding: 3px 6px; border: 1px solid #cbd5e1; vertical-align: top; }
  .rp-table tr { break-inside: avoid; }
  .rp-kv th { text-align: left; }
  .rp-pagehead { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; border-bottom: 3px solid ${NAVY}; padding-bottom: 5px; margin-bottom: 4px; }
  .rp-proj { font-weight: 800; color: ${NAVY}; font-size: 11pt; }
  .rp-daytitle { font-weight: 800; font-size: 13pt; color: #111827; }
  .rp-draft { display: inline-block; margin-top: 4px; background: #fef3c7; color: #92400e; font-weight: 800; font-size: 8.5pt; padding: 2px 8px; border-radius: 4px; letter-spacing: .04em; }
  .rp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .rp-stat { border: 1px solid #cbd5e1; border-left: 4px solid ${NAVY}; border-radius: 4px; padding: 6px 8px; }
  .rp-statval { font-size: 16pt; font-weight: 800; color: ${NAVY}; line-height: 1.1; }
  .rp-signoff { display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 16px; margin-top: 10px; break-inside: avoid; }
  .rp-sig { border-bottom: 1px solid #111827; padding: 4px 2px 2px; min-height: 22px; font-weight: 600; }
  .rp-photogrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
  .rp-photo { margin: 0; break-inside: avoid; }
  .rp-photoimg { height: 2.55in; background: #f3f4f6; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .rp-photoimg img { width: 100%; height: 100%; object-fit: contain; }
  .rp-photo figcaption { font-size: 9pt; margin-top: 3px; }
  @media screen {
    .rp-root { background: #e5e7eb; padding: 16px 0; }
    .rp-page { width: 7.5in; min-height: 9.9in; margin: 0 auto 16px; padding: 0.5in; box-shadow: 0 1px 4px rgba(0,0,0,.15); box-sizing: content-box; }
  }
  @media print {
    html, body { background: #fff !important; }
    .rp-root { background: #fff; }
    .rp-page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  }
`;

export default function PrintableReport({ project, from, to, reports, srcs, includePhotos, preparedBy }) {
  return (
    <div className="rp-root">
      <style>{PRINT_CSS}</style>
      <Cover project={project} from={from} to={to} reports={reports} preparedBy={preparedBy} includePhotos={includePhotos} />
      {reports.map(r => (
        <React.Fragment key={r.id || r.report_date}>
          <DayReport project={project} report={r} />
          {includePhotos && <PhotoPages project={project} report={r} srcs={srcs} />}
        </React.Fragment>
      ))}
    </div>
  );
}
