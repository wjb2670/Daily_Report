import React, { useState } from "react";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function ScopeImportModal({ projects, defaultProjectId, onImported, onClose }) {
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file || !projectId) return;
    setLoading(true);
    setResult(null);

    const fileUrl = await base44.integrations.Core.UploadFile({ file });

    const schema = {
      type: "object",
      properties: {
        scopes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              cost_code: { type: "string" },
              description: { type: "string" },
              subcontractor_company: { type: "string" },
              awarded_amount: { type: "number" },
              scope_of_work: { type: "string" }
            }
          }
        }
      }
    };

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl.file_url,
      json_schema: schema
    });

    if (extracted.status === "success" && extracted.output?.scopes) {
      const scopes = extracted.output.scopes;
      let created = 0;
      for (const scope of scopes) {
        if (scope.description) {
          await base44.entities.Scope.create({
            ...scope,
            project_id: projectId,
            status: scope.awarded_amount ? "awarded" : "bidding",
          });
          created++;
        }
      }
      setResult({ success: true, count: created });
    } else {
      setResult({ success: false, error: extracted.details || "Could not extract data from file." });
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-[#0f2a5e]">Import Scopes from Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">
            Upload your Excel file with scopes. Each sheet should have a cost code, description, company name, and amount in the first row.
          </p>

          <div>
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Excel File (.xlsx)</Label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => setFile(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1e3a8a] file:text-white hover:file:bg-[#0f2a5e] cursor-pointer"
            />
          </div>

          {result && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.success
                ? <><CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> Successfully imported {result.count} scopes.</>
                : <><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {result.error}</>
              }
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {result?.success ? "Close" : "Cancel"}
            </Button>
            {!result?.success && (
              <Button
                onClick={handleImport}
                disabled={!file || !projectId || loading}
                className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Importing...</span>
                ) : (
                  <><Upload className="w-4 h-4 mr-1" /> Import Scopes</>
                )}
              </Button>
            )}
            {result?.success && (
              <Button onClick={onImported} className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold">
                View Scopes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}