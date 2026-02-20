import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ScopeFormModal({ scope, projects, defaultProjectId, onSave, onClose }) {
  const [form, setForm] = useState({
    project_id: scope?.project_id || defaultProjectId || "",
    cost_code: scope?.cost_code || "",
    description: scope?.description || "",
    subcontractor_company: scope?.subcontractor_company || "",
    awarded_amount: scope?.awarded_amount || "",
    status: scope?.status || "bidding",
    scope_of_work: scope?.scope_of_work || "",
    notes: scope?.notes || "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, awarded_amount: form.awarded_amount ? Number(form.awarded_amount) : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-[#0f2a5e]">{scope ? "Edit Scope" : "Add Scope"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {projects?.length > 0 && (
            <div>
              <Label>Project *</Label>
              <Select value={form.project_id} onValueChange={v => set("project_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cost Code</Label>
              <Input value={form.cost_code} onChange={e => set("cost_code", e.target.value)} placeholder="e.g. 2100" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidding">Bidding</SelectItem>
                  <SelectItem value="awarded">Awarded</SelectItem>
                  <SelectItem value="contract_sent">Contract Sent</SelectItem>
                  <SelectItem value="contract_signed">Contract Signed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Scope Description *</Label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} required placeholder="e.g. Site Work" />
            </div>
            <div>
              <Label>Subcontractor Company</Label>
              <Input value={form.subcontractor_company} onChange={e => set("subcontractor_company", e.target.value)} placeholder="e.g. Bennett Construction" />
            </div>
            <div>
              <Label>Awarded Amount ($)</Label>
              <Input type="number" value={form.awarded_amount} onChange={e => set("awarded_amount", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div>
            <Label>Scope of Work Detail</Label>
            <Textarea
              value={form.scope_of_work}
              onChange={e => set("scope_of_work", e.target.value)}
              rows={8}
              placeholder="Enter the full detailed scope of work here..."
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold">
              {scope ? "Save Changes" : "Add Scope"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}