import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const fmt = (val) =>
  val == null ? "$0.00" : `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyRow = () => ({ description: "", type: "addition", amount: "" });

export default function ChangeOrderModal({ open, onClose, period, onSaved }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows(r => [...r, emptyRow()]);
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const totalAdditions = rows
    .filter(r => r.type === "addition")
    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalDeductions = rows
    .filter(r => r.type === "deduction")
    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    const newAdditions = (period.change_order_additions || 0) + totalAdditions;
    const newDeductions = (period.change_order_deductions || 0) + totalDeductions;

    // Update period totals
    await base44.entities.BillingPeriod.update(period.id, {
      change_order_additions: newAdditions,
      change_order_deductions: newDeductions,
    });

    // Find the highest existing CO number across all periods for this project
    const allCOLines = await base44.entities.BillingLineItem.filter({
      project_id: period.project_id,
      is_change_order: true,
    });
    let maxCoNum = 0;
    allCOLines.forEach(line => {
      const match = line.description && line.description.match(/^CO #(\d+)/);
      if (match) maxCoNum = Math.max(maxCoNum, parseInt(match[1], 10));
    });

    // Create a BillingLineItem for each CO row so it appears in the G703
    const validRows = rows.filter(r => r.description && parseFloat(r.amount) > 0);
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const coNum = maxCoNum + i + 1;
      const amount = parseFloat(row.amount) || 0;
      const signedAmount = row.type === "addition" ? amount : -amount;
      await base44.entities.BillingLineItem.create({
        billing_period_id: period.id,
        project_id: period.project_id,
        description: `CO #${coNum}: ${row.description}`,
        scheduled_value: signedAmount,
        work_this_period: signedAmount,
        previous_applications: 0,
        materials_this_period: 0,
        retainage_percent: 0,
        retainage_amount: 0,
        is_general_conditions: false,
        is_change_order: true,
        co_type: row.type,
      });
    }

    setSaving(false);
    setRows([emptyRow()]);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#0f2a5e]">Add Change Orders — Period {period?.period_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-1" />
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <Input
                  className="h-8 text-sm"
                  placeholder="CO description"
                  value={row.description}
                  onChange={e => updateRow(i, "description", e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Select value={row.type} onValueChange={v => updateRow(i, "type", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Addition (+)</SelectItem>
                    <SelectItem value="deduction">Deduction (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 flex items-center gap-1">
                <span className="text-gray-400 text-sm">$</span>
                <Input
                  className="h-8 text-sm"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={row.amount}
                  onChange={e => updateRow(i, "amount", e.target.value)}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addRow} className="gap-1 mt-1">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </Button>
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
          <div className="space-y-1">
            {totalAdditions > 0 && (
              <div className="text-green-700 font-medium">Additions: +{fmt(totalAdditions)}</div>
            )}
            {totalDeductions > 0 && (
              <div className="text-red-600 font-medium">Deductions: −{fmt(totalDeductions)}</div>
            )}
            <div className="text-[#0f2a5e] font-bold">
              Net: {fmt(totalAdditions - totalDeductions)}
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              className="bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white"
              onClick={handleSave}
              disabled={saving || rows.every(r => !r.amount)}
            >
              {saving ? "Saving..." : "Apply Change Orders"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}