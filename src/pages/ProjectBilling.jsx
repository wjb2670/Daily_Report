import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Upload, Download, Trash2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  draft: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  paid: "bg-purple-100 text-purple-800",
};

export default function ProjectBilling() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");

  const [project, setProject] = useState(null);
  const [sovItems, setSovItems] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ item_number: "", description: "", scheduled_value: "", is_general_conditions: false, retainage_percent: 10 });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (projectId) loadAll();
  }, [projectId]);

  const loadAll = async () => {
    const [proj, sov, per] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.ScheduleOfValues.filter({ project_id: projectId }, "line_number"),
      base44.entities.BillingPeriod.filter({ project_id: projectId }, "period_number"),
    ]);
    setProject(proj[0] || null);
    setSovItems(sov);
    setPeriods(per);
    setLoading(false);
  };

  const addSOVItem = async () => {
    if (!newItem.description || !newItem.scheduled_value) return;
    await base44.entities.ScheduleOfValues.create({
      project_id: projectId,
      line_number: newItem.item_number,
      description: newItem.description,
      scheduled_value: parseFloat(newItem.scheduled_value),
      category: newItem.is_general_conditions ? "General Conditions" : "Construction",
    });
    setNewItem({ item_number: "", description: "", scheduled_value: "", is_general_conditions: false });
    setAddingItem(false);
    loadAll();
  };

  const deleteSOVItem = async (id) => {
    await base44.entities.ScheduleOfValues.delete(id);
    loadAll();
  };

  const createNewPeriod = async () => {
    const nextNum = periods.length > 0 ? Math.max(...periods.map(p => p.period_number)) + 1 : 1;
    const created = await base44.entities.BillingPeriod.create({
      project_id: projectId,
      period_number: nextNum,
      status: "draft",
    });
    window.location.href = createPageUrl(`BillingPeriodDetail?period_id=${created.id}`);
  };

  const parseCSVLine = (line) => {
    const cols = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { cols.push(cur.trim().replace(/[$,]/g, "")); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim().replace(/[$,]/g, ""));
    return cols;
  };

  const handleCSVImport = async (e, isGC = false) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) { setImporting(false); return; }
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
    const rows = lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim(); });
      return obj;
    }).filter(r => r.description || r.desc);

    for (const row of rows) {
      const desc = row.description || row.desc || row.name || "";
      const rawVal = row.scheduled_value || row.value || row.amount || "0";
      const val = parseFloat(rawVal.replace(/[$,\s]/g, "")) || 0;
      if (!desc) continue;
      await base44.entities.ScheduleOfValues.create({
        project_id: projectId,
        line_number: row.item || row.line_number || row.item_number || "",
        description: desc,
        scheduled_value: val,
        cost_code: row.cost_code || row.code || "",
        category: isGC ? "General Conditions" : "Construction",
      });
    }
    setImporting(false);
    e.target.value = "";
    loadAll();
  };

  const downloadTemplate = () => {
    const csv = ["Item #,Description,Scheduled Value", "01,Site Work,50000", "02,Concrete,80000"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "SOV_Template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const [gcExpanded, setGcExpanded] = useState(false);

  const cmItems = sovItems.filter(i => i.category !== "General Conditions");
  const gcItems = sovItems.filter(i => i.category === "General Conditions");
  const gcTotal = gcItems.reduce((s, i) => s + (i.scheduled_value || 0), 0);
  const totalScheduled = sovItems.reduce((s, i) => s + (i.scheduled_value || 0), 0);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!project) return <div className="text-center py-16 text-gray-400">Project not found.</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <Link to={createPageUrl("Billing")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0f2a5e]">{project.name}</h1>
            {project.project_type && <Badge className="bg-[#0f2a5e] text-white">{project.project_type}</Badge>}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">#{project.job_number} · Contract: ${(project.contract_value || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Schedule of Values */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-bold text-[#0f2a5e] text-base">Schedule of Values ({sovItems.length} items)</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" id="csv-import-cm" className="hidden" accept=".csv" onChange={e => handleCSVImport(e, false)} />
            <input type="file" id="csv-import-gc" className="hidden" accept=".csv" onChange={e => handleCSVImport(e, true)} />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5 mr-1" /> Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => document.getElementById("csv-import-cm").click()} disabled={importing}>
              <Upload className="w-3.5 h-3.5 mr-1" /> {importing ? "Importing..." : "Import CM"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => document.getElementById("csv-import-gc").click()} disabled={importing}>
              <Upload className="w-3.5 h-3.5 mr-1" /> Import GC
            </Button>
            <Button size="sm" className="bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white" onClick={() => setAddingItem(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
            </Button>
          </div>
        </div>

        {sovItems.length === 0 && !addingItem ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">No line items yet. Add or import items to get started.</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase pb-2 px-1 border-b">
              <div className="col-span-1">Item #</div>
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-center">Type</div>
              <div className="col-span-2 text-right">Scheduled Value</div>
              <div className="col-span-1 text-right text-orange-500">Ret. %</div>
              <div className="col-span-1" />
            </div>

            {/* GC Lump Sum Row — item 01, expandable */}
            {gcItems.length > 0 && (
              <>
                <div
                  className="grid grid-cols-12 gap-2 py-2.5 text-sm items-center px-1 border-b border-amber-100 bg-amber-50/60 cursor-pointer hover:bg-amber-50"
                  onClick={() => setGcExpanded(v => !v)}
                >
                  <div className="col-span-1 text-gray-500">01</div>
                  <div className="col-span-5 font-semibold text-amber-800 flex items-center gap-1">
                    {gcExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    General Conditions
                  </div>
                  <div className="col-span-2 text-center">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">GC</Badge>
                  </div>
                  <div className="col-span-2 text-right text-[#0f2a5e] font-semibold">
                    ${gcTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right text-orange-500 text-xs">
                    {gcItems[0]?.retainage_percent != null ? `${gcItems[0].retainage_percent}%` : "10%"}
                  </div>
                  <div className="col-span-1" />
                </div>

                {/* Expanded GC sub-items */}
                {gcExpanded && gcItems.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 py-2 text-xs items-center px-1 border-b border-amber-50 bg-amber-50/20">
                    <div className="col-span-1 pl-4 text-gray-400">—</div>
                    <div className="col-span-5 pl-4 text-gray-600 italic">{item.description}</div>
                    <div className="col-span-2 text-center">
                      <span className="text-gray-400 text-xs">{item.cost_code}</span>
                    </div>
                    <div className="col-span-2 text-right text-gray-500">
                      ${(item.scheduled_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 text-right">
                      <input
                        type="number"
                        className="w-12 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-500"
                        value={item.retainage_percent ?? 10}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          base44.entities.ScheduleOfValues.update(item.id, { retainage_percent: parseFloat(e.target.value) || 0 }).then(loadAll);
                        }}
                      />
                      <span className="text-gray-400 ml-0.5">%</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={e => { e.stopPropagation(); deleteSOVItem(item.id); }} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* CM Items — numbered starting at 02 if GC exists */}
            {cmItems.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 py-2.5 text-sm items-center px-1 border-b border-gray-50">
                <div className="col-span-1 text-gray-500">{item.line_number || String((gcItems.length > 0 ? 1 : 0) + idx + 1).padStart(2, "0")}</div>
                <div className="col-span-5 font-medium text-gray-800">{item.description}</div>
                <div className="col-span-2 text-center">
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">CM</Badge>
                </div>
                <div className="col-span-2 text-right text-[#0f2a5e] font-medium">
                  ${(item.scheduled_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 text-right flex items-center justify-end gap-0.5">
                  <input
                    type="number"
                    className="w-12 text-right text-xs border border-orange-200 rounded px-1 py-0.5 text-orange-500"
                    value={item.retainage_percent ?? 10}
                    onChange={e => base44.entities.ScheduleOfValues.update(item.id, { retainage_percent: parseFloat(e.target.value) || 0 }).then(loadAll)}
                  />
                  <span className="text-gray-400 text-xs">%</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => deleteSOVItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add item row */}
            {addingItem && (
              <div className="grid grid-cols-12 gap-2 py-2 items-center px-1 border-b border-blue-100 bg-blue-50">
                <div className="col-span-2">
                  <Input className="h-7 text-xs" placeholder="#" value={newItem.item_number}
                    onChange={e => setNewItem(p => ({ ...p, item_number: e.target.value }))} />
                </div>
                <div className="col-span-5">
                  <Input className="h-7 text-xs" placeholder="Description *" value={newItem.description}
                    onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="col-span-2 flex items-center gap-1 px-1">
                  <input type="checkbox" id="is-gc" checked={newItem.is_general_conditions}
                    onChange={e => setNewItem(p => ({ ...p, is_general_conditions: e.target.checked }))} />
                  <label htmlFor="is-gc" className="text-xs text-gray-600 cursor-pointer">GC</label>
                </div>
                <div className="col-span-2">
                  <Input className="h-7 text-xs" type="number" placeholder="Value *" value={newItem.scheduled_value}
                    onChange={e => setNewItem(p => ({ ...p, scheduled_value: e.target.value }))} />
                </div>
                <div className="col-span-1 flex gap-1">
                  <button onClick={addSOVItem} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setAddingItem(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 text-sm font-bold text-[#0f2a5e]">
              Total: ${totalScheduled.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </>
        )}
      </div>

      {/* Billing Periods */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0f2a5e] text-base">Billing Periods</h2>
          <Button size="sm" className="bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white" onClick={createNewPeriod}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Period
          </Button>
        </div>

        {periods.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No billing periods yet.</p>
        ) : (
          <div className="divide-y">
            {periods.map(period => (
              <Link key={period.id} to={createPageUrl(`BillingPeriodDetail?period_id=${period.id}`)}>
                <div className="flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#0f2a5e] text-white rounded-lg flex items-center justify-center text-sm font-bold">
                      {period.period_number}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-[#0f2a5e]">Period {period.period_number}</div>
                      {period.period_end_date && (
                        <div className="text-xs text-gray-400">{period.period_end_date}</div>
                      )}
                    </div>
                  </div>
                  <Badge className={statusColors[period.status] || "bg-gray-100 text-gray-700"}>
                    {period.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}