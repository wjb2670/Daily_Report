import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, DollarSign, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GeneralConditionsDrawer from "./GeneralConditionsDrawer";

export default function SOVSection({ projectId, projectType }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLine, setNewLine] = useState({ line_number: "", description: "", cost_code: "", scheduled_value: "" });
  const [addError, setAddError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const fileRef = useRef();

  useEffect(() => {
    loadLines();
  }, [projectId]);

  const loadLines = async () => {
    const data = await base44.entities.ScheduleOfValues.filter({ project_id: projectId }, "line_number");
    setLines(data);
    setLoading(false);
  };

  const addLine = async () => {
    setAddError("");
    if (!newLine.description) { setAddError("Description is required."); return; }
    if (!newLine.scheduled_value) { setAddError("Scheduled value is required."); return; }
    await base44.entities.ScheduleOfValues.create({
      ...newLine,
      project_id: projectId,
      scheduled_value: Number(newLine.scheduled_value),
      category: "Construction",
      retainage_percent: 10,
    });
    setNewLine({ line_number: "", description: "", cost_code: "", scheduled_value: "" });
    loadLines();
  };

  const deleteLine = async (id) => {
    await base44.entities.ScheduleOfValues.delete(id);
    loadLines();
  };

  const total = lines.reduce((sum, l) => sum + (l.scheduled_value || 0), 0);

  const downloadTemplate = () => {
    const csv = [
      ["Line Number", "Description", "Cost Code", "Scheduled Value", "Category"],
      ["1", "General Conditions", "1000", "50000", "General"],
      ["2", "Site Work", "2100", "150000", "Site"],
      ["3", "Concrete Footings & Foundation", "3010", "80000", "Structural"],
      ["4", "Rough Carpentry", "6100", "120000", "Framing"],
      ["5", "Roofing", "7400", "75000", "Exterior"],
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SOV_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim(); });
      return obj;
    });
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const normalizeRow = (row) => {
    // Map flexible header names to our fields
    const find = (keys) => {
      for (const k of keys) {
        const match = Object.keys(row).find(h => h.includes(k));
        if (match && row[match]) return row[match];
      }
      return "";
    };
    const rawValue = find(["scheduled_value", "scheduled", "value", "amount"]);
    const numValue = parseFloat(String(rawValue).replace(/[$,\s\r]/g, "")) || 0;
    return {
      line_number: find(["line_number", "line", "item", "no"]),
      description: find(["description", "desc", "name", "item"]),
      cost_code: find(["cost_code", "cost", "code"]),
      scheduled_value: numValue,
      category: find(["category", "cat", "type"]),
    };
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    // For CSV files, parse directly in the browser
    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      const rows = parseCSV(text);
      const items = rows.map(normalizeRow).filter(i => i.description && i.scheduled_value);
      if (items.length === 0) {
        setImportResult({ success: false, error: "No valid rows found. Make sure your CSV has Description and Scheduled Value columns." });
        setImporting(false);
        e.target.value = "";
        return;
      }
      for (const item of items) {
        await base44.entities.ScheduleOfValues.create({ ...item, project_id: projectId });
      }
      setImportResult({ success: true, count: items.length });
      loadLines();
    } else {
      // For Excel files, use the AI extraction
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  line_number: { type: "string" },
                  description: { type: "string" },
                  cost_code: { type: "string" },
                  scheduled_value: { type: "number" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });
      if (extracted.status === "success" && extracted.output?.line_items?.length) {
        const items = extracted.output.line_items.filter(i => i.description && i.scheduled_value);
        for (const item of items) {
          await base44.entities.ScheduleOfValues.create({ ...item, project_id: projectId });
        }
        setImportResult({ success: true, count: items.length });
        loadLines();
      } else {
        setImportResult({ success: false, error: "Could not extract data. Please use the CSV template format." });
      }
    }

    setImporting(false);
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-[#0f2a5e] text-lg">Schedule of Values</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm font-semibold text-[#0f2a5e]">
            <DollarSign className="w-4 h-4" />
            Total: ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileImport} />
          <Button variant="outline" size="sm" className="text-gray-500 border-gray-300"
            onClick={downloadTemplate}>
            Download Template
          </Button>
          <Button variant="outline" size="sm" className="text-[#1e3a8a] border-[#1e3a8a]"
            onClick={() => fileRef.current.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-1" />
            {importing ? "Importing..." : "Import File"}
          </Button>
        </div>
      </div>

      {/* General Conditions Drawers */}
      <div className="mb-4 space-y-3">
        <GeneralConditionsDrawer projectId={projectId} sovTotal={total} />
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg mb-4 ${importResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {importResult.success
            ? <><CheckCircle className="w-4 h-4" /> Imported {importResult.count} line items successfully.</>
            : <><AlertCircle className="w-4 h-4" /> {importResult.error}</>}
        </div>
      )}


      {/* Add new line */}
      <div className="grid grid-cols-12 gap-2 mb-1 text-sm">
        <Input className="col-span-1" placeholder="#" value={newLine.line_number} onChange={e => setNewLine(p => ({ ...p, line_number: e.target.value }))} />
        <Input className="col-span-4" placeholder="Description *" value={newLine.description} onChange={e => { setAddError(""); setNewLine(p => ({ ...p, description: e.target.value })); }} />
        <Input className="col-span-3" placeholder="Cost Code" value={newLine.cost_code} onChange={e => setNewLine(p => ({ ...p, cost_code: e.target.value }))} />
        <Input className="col-span-3" type="number" placeholder="Value *" value={newLine.scheduled_value} onChange={e => { setAddError(""); setNewLine(p => ({ ...p, scheduled_value: e.target.value })); }} onKeyDown={e => { if (e.key === "Enter") addLine(); }} />
        <Button type="button" onClick={addLine} className="col-span-1 bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white px-2">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {addError && <p className="text-red-500 text-xs mb-3">{addError}</p>}
      {!addError && <div className="mb-3" />}

      {/* Table header */}
      {lines.length > 0 && (
        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase mb-1 px-1">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-3">Cost Code</div>
          <div className="col-span-3 text-right">Scheduled Value</div>
          <div className="col-span-1" />
        </div>
      )}

      {/* Lines */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : lines.length === 0 ? (
        <p className="text-gray-400 text-sm italic text-center py-6">No SOV lines added yet.</p>
      ) : (
        <div className="divide-y">
          {lines.map(line => (
            <div key={line.id} className="grid grid-cols-12 gap-2 py-2.5 text-sm items-center px-1">
              <div className="col-span-1 text-gray-400">{line.line_number}</div>
              <div className="col-span-4 font-medium text-gray-800">{line.description}</div>
              <div className="col-span-3 text-gray-500">{line.cost_code}</div>
              <div className="col-span-3 text-right font-medium text-[#0f2a5e]">${(line.scheduled_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => deleteLine(line.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}