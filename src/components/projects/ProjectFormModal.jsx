import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const SECTIONS = ["Project Info", "Owner Info", "Team"];

export default function ProjectFormModal({ project, onSave, onClose }) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    name: project?.name || "",
    job_number: project?.job_number || "",
    project_type: project?.project_type || "GC",
    status: project?.status || "awarded",
    address: project?.address || "",
    city: project?.city || "",
    state: project?.state || "",
    zip: project?.zip || "",
    start_date: project?.start_date || "",
    end_date: project?.end_date || "",
    contract_value: project?.contract_value || "",
    description: project?.description || "",
    owner_name: project?.owner_name || "",
    owner_company: project?.owner_company || "",
    owner_address: project?.owner_address || "",
    owner_email: project?.owner_email || "",
    owner_phone: project?.owner_phone || "",
    owner_contact: project?.owner_contact || "",
    project_manager: project?.project_manager || "",
    superintendent: project?.superintendent || "",
    notes: project?.notes || "",
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, contract_value: form.contract_value ? Number(form.contract_value) : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-[#0f2a5e]">
            {project ? "Edit Project" : "New Project"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === i ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {tab === 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Project Name *</Label>
                  <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Main Street Office Building" />
                </div>
                <div>
                  <Label>Job Number *</Label>
                  <Input value={form.job_number} onChange={e => set("job_number", e.target.value)} required placeholder="e.g. 2024-001" />
                </div>
                <div>
                  <Label>Project Type *</Label>
                  <Select value={form.project_type} onValueChange={v => set("project_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GC">GC – General Contractor</SelectItem>
                      <SelectItem value="CM">CM – Construction Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bidding">Bidding</SelectItem>
                      <SelectItem value="awarded">Awarded</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contract Value ($)</Label>
                  <Input type="number" value={form.contract_value} onChange={e => set("contract_value", e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => set("address", e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => set("city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => set("state", e.target.value)} />
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  <Input value={form.zip} onChange={e => set("zip", e.target.value)} />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>Project Description</Label>
                  <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
                </div>
              </div>
            </>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Owner Company</Label>
                <Input value={form.owner_company} onChange={e => set("owner_company", e.target.value)} />
              </div>
              <div>
                <Label>Owner Contact Name</Label>
                <Input value={form.owner_contact} onChange={e => set("owner_contact", e.target.value)} />
              </div>
              <div>
                <Label>Owner Email</Label>
                <Input type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} />
              </div>
              <div>
                <Label>Owner Phone</Label>
                <Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Owner Address</Label>
                <Input value={form.owner_address} onChange={e => set("owner_address", e.target.value)} />
              </div>
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Project Manager</Label>
                <Input value={form.project_manager} onChange={e => set("project_manager", e.target.value)} />
              </div>
              <div>
                <Label>Superintendent</Label>
                <Input value={form.superintendent} onChange={e => set("superintendent", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={4} />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t mt-4">
            <div className="flex gap-2">
              {tab > 0 && (
                <Button type="button" variant="outline" onClick={() => setTab(t => t - 1)}>Back</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              {tab < SECTIONS.length - 1 ? (
                <Button type="button" className="bg-[#1e3a8a] text-white" onClick={() => setTab(t => t + 1)}>Next</Button>
              ) : (
                <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold">
                  {project ? "Save Changes" : "Create Project"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}