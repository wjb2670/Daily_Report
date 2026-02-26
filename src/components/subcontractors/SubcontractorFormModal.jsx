import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function SubcontractorFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({
    company_name: "", trade: "", type: "subcontractor",
    address: "", city: "", state: "", zip: "",
    phone: "", website: "", license_number: "",
    insurance_expiry: "", notes: ""
  });

  useEffect(() => {
    if (initial) setForm({ ...form, ...initial });
    else setForm({
      company_name: "", trade: "", type: "subcontractor",
      address: "", city: "", state: "", zip: "",
      phone: "", website: "", license_number: "",
      insurance_expiry: "", notes: ""
    });
  }, [initial, open]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = () => {
    if (!form.company_name.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Company" : "Add Company"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company Name *</Label>
              <Input value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="ABC Electrical LLC" />
            </div>
            <div>
              <Label>Trade / Specialty</Label>
              <Input value={form.trade} onChange={e => set("trade", e.target.value)} placeholder="Electrical" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={e => set("city", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="PA" />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={e => set("zip", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Office Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="www.example.com" />
            </div>
            <div>
              <Label>License #</Label>
              <Input value={form.license_number} onChange={e => set("license_number", e.target.value)} />
            </div>
            <div>
              <Label>Insurance Expiry</Label>
              <Input type="date" value={form.insurance_expiry} onChange={e => set("insurance_expiry", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white">
              {initial ? "Save Changes" : "Add Company"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}