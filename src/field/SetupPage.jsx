import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertTriangle, Settings, ExternalLink } from 'lucide-react';
import { graph, graphAll } from '@/field/graph';
import { CONFIG } from '@/field/auth';
import { LISTS, PHOTO_FOLDER } from '@/field/schema';
import { INITIAL_ACCESS } from '@/field/roles';
import { libraryRowsFromSeed } from '@/field/scopesData';

// Creates (or completes) the lists, columns and photo folder the app needs in
// the Field Reports site. Safe to run again: it only adds what's missing.
async function ensureList(site, key, log) {
  const def = LISTS[key];
  const name = def.displayName.replace(/'/g, "''");
  const found = await graph(`/sites/${site.id}/lists?$select=id,displayName,webUrl&$filter=displayName eq '${name}'`);
  let list = found.value?.[0];

  if (!list) {
    list = await graph(`/sites/${site.id}/lists`, {
      method: 'POST',
      body: { displayName: def.displayName, description: def.description, columns: def.columns, list: { template: 'genericList' } },
    });
    log(`Created the “${def.displayName}” list`);
  } else {
    const existing = await graphAll(`/sites/${site.id}/lists/${list.id}/columns?$select=name`);
    const have = new Set(existing.map(c => c.name));
    const missing = def.columns.filter(c => !have.has(c.name));
    for (const col of missing) {
      await graph(`/sites/${site.id}/lists/${list.id}/columns`, { method: 'POST', body: col });
    }
    // Existing dropdown columns get any new choices (e.g. "Awarded" for Status).
    let widened = 0;
    const current = await graphAll(`/sites/${site.id}/lists/${list.id}/columns?$select=id,name,choice`);
    for (const col of def.columns.filter(c => c.choice)) {
      const have = current.find(c => c.name === col.name);
      const choices = have?.choice?.choices;
      if (choices && col.choice.choices.some(c => !choices.includes(c))) {
        const merged = [...col.choice.choices, ...choices.filter(c => !col.choice.choices.includes(c))];
        await graph(`/sites/${site.id}/lists/${list.id}/columns/${have.id}`, { method: 'PATCH', body: { choice: { ...col.choice, choices: merged } } });
        widened += 1;
      }
    }
    log(missing.length || widened
      ? `Updated “${def.displayName}”: ${[missing.length && `${missing.length} new column${missing.length === 1 ? '' : 's'}`, widened && `${widened} dropdown${widened === 1 ? '' : 's'} with new choices`].filter(Boolean).join(', ')}`
      : `“${def.displayName}” list is already set up`);
  }

  // Give the built-in Title column a clearer name (e.g. "Project Name").
  try {
    const cols = await graphAll(`/sites/${site.id}/lists/${list.id}/columns?$select=id,name,displayName`);
    const title = cols.find(c => c.name === 'Title');
    if (title && title.displayName !== def.titleLabel) {
      await graph(`/sites/${site.id}/lists/${list.id}/columns/${title.id}`, { method: 'PATCH', body: { displayName: def.titleLabel } });
    }
  } catch {
    // cosmetic only
  }
  return list;
}

export default function SetupPage() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const log = text => setSteps(s => [...s, text]);

  const run = async () => {
    setRunning(true);
    setSteps([]);
    setError('');
    setDone(null);
    try {
      const site = await graph(`/sites/${CONFIG.siteHost}:${CONFIG.sitePath}?$select=id,webUrl,displayName`);
      log(`Found the “${site.displayName}” site`);
      const lists = {};
      for (const key of ['projects', 'reports', 'subs', 'access', 'scopeLibrary', 'subcontracts', 'subPrices', 'jobEvents', 'turnovers', 'turnoverMoney']) lists[key] = await ensureList(site, key, log);
      // First time only: add the starting people to App Access.
      const people = (await graph(`/sites/${site.id}/lists/${lists.access.id}/items?$top=1`)).value || [];
      if (people.length === 0) {
        for (const p of INITIAL_ACCESS) {
          await graph(`/sites/${site.id}/lists/${lists.access.id}/items`, { method: 'POST', body: { fields: { Title: p.name, Email: p.email, Role: p.role } } });
        }
        log(`Added ${INITIAL_ACCESS.length} people to App Access (${INITIAL_ACCESS.map(p => p.name.split(' ')[0]).join(', ')})`);
      }
      // First time only: fill the Scope Library from Whayland's own scopes.
      const lib = (await graph(`/sites/${site.id}/lists/${lists.scopeLibrary.id}/items?$top=1`)).value || [];
      if (lib.length === 0) {
        const rows = libraryRowsFromSeed();
        for (const fields of rows) await graph(`/sites/${site.id}/lists/${lists.scopeLibrary.id}/items`, { method: 'POST', body: { fields } });
        log(`Filled the Scope Library with ${rows.length - 3} trades and the standard Exhibit A lines`);
      }
      try {
        await graph(`/sites/${site.id}/drive/root/children`, {
          method: 'POST',
          body: { name: PHOTO_FOLDER, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
        });
        log(`Created the “${PHOTO_FOLDER}” folder in Documents`);
      } catch (err) {
        if (err.status !== 409) throw err;
        log(`“${PHOTO_FOLDER}” folder is already there`);
      }
      Object.keys(LISTS).forEach(k => { try { localStorage.removeItem(`fieldReports:list:${k}`); } catch { /* ignore */ } });
      setDone({ site, lists });
    } catch (err) {
      setError(err.status === 403
        ? 'Your account doesn’t have permission to change the Field Reports site. Sign in as a site owner and try again.'
        : err.status === 404
          ? `Couldn’t find the site at ${CONFIG.siteHost}${CONFIG.sitePath}. Check it exists and you are a member.`
          : err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2a5e] mb-1">Site setup</h1>
      <p className="text-gray-500 mb-6">One time only, for the office. Builds what the app needs in the Field Reports SharePoint site.</p>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex p-2 rounded-lg text-blue-600 bg-blue-50"><Settings className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h2 className="font-bold text-[#0f2a5e] text-lg">Field Reports site</h2>
            <p className="text-sm text-gray-500 break-all">{CONFIG.siteHost}{CONFIG.sitePath}</p>
          </div>
        </div>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><strong>Projects</strong> list — the office adds jobs and assigns the Superintendent and Crew Access.</li>
          <li><strong>Daily Reports</strong> list — one row per project per day, filled in by the app.</li>
          <li><strong>Subcontractors</strong> list — company names suggested to the crew.</li>
          <li><strong>App Access</strong> list — who can see reports and projects. Managed on the Access page.</li>
          <li><strong>Scope Library</strong>, <strong>Subcontracts</strong> and <strong>Subcontract Prices</strong> lists — subcontract scopes by trade and job.</li>
          <li><strong>{PHOTO_FOLDER}</strong> folder — photos, filed by job and date.</li>
        </ul>
        <Button onClick={run} disabled={running} className="w-full sm:w-auto h-11 bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold">
          {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up…</> : 'Set up Field Reports'}
        </Button>

        {steps.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {steps.map(s => (
              <li key={s} className="flex items-start gap-2 text-green-800"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{s}</li>
            ))}
          </ul>
        )}
        {error && (
          <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}
          </p>
        )}
        {done && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900 space-y-2">
            <p className="font-semibold">All set. Next, add a project and assign yourself to test it:</p>
            <a href={`${done.lists.projects.webUrl || `${done.site.webUrl}/Lists/Projects`}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#1e3a8a] font-semibold underline">
              Open the Projects list <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
