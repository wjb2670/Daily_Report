import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_LABELS = {
  estimating: "Estimating",
  administrative: "Administrative",
  accounting: "Accounting",
  field: "Field",
  owner: "Owner"
};

export default function ContactFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({
    name: "", role: "estimating", title: "",
    email: "", phone: "", cell: "", notes: ""
  });

  useEffect(() => {
    if (initial) setForm({ name: "", role: "estimating", title: "", email: "", phone: "", cell: "", notes: "", ...initial });
    else setForm({ name: "", role: "estimating", title: "", email: "", phone: "", cell: "", notes: "" });
  }, [initial, open]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="John Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Project Manager" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Cell</Label>
              <Input value={form.cell} onChange={e => set("cell", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => { if (form.name.trim()) onSave(form); }}
              className="bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white"
            >
              {initial ? "Save Changes" : "Add Contact"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}