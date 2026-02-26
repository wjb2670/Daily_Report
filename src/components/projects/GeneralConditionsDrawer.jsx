import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const ALLOCATION_LABELS = {
  fixed: "Fixed Amount",
  percentage_of_contract: "% of Contract",
  percentage_of_cost_code: "% of Cost Code",
};

const PHASE_LABELS = {
  phase1: "8 Unit Garage",
  phase2: "12 Unit Garage",
};

function GCPhaseSection({ projectId, phase, sovTotal, label }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newItem, setNewItem] = useState({ description: "", cost_code: "", amount: "", allocation_method: "fixed" });

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  const loadItems = async () => {
    setLoading(true);
    const data = await base44.entities.GeneralConditionsItem.filter({ project_id: projectId, phase });
    data.sort((a, b) => (a.cost_code || "").localeCompare(b.cost_code || ""));
    setItems(data);
    setLoading(false);
  };

  const addItem = async () => {
    if (!newItem.description) return;
    setSaving(true);
    setError("");
    try {
      await base44.entities.GeneralConditionsItem.create({
        ...newItem,
        project_id: projectId,
        phase,
        amount: newItem.amount ? Number(newItem.amount) : 0,
      });
      setNewItem({ description: "", cost_code: "", amount: "", allocation_method: "fixed" });
      loadItems();
    } catch (e) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    await base44.entities.GeneralConditionsItem.delete(id);
    loadItems();
  };

  const total = items.reduce((sum, item) => {
    if (item.allocation_method === "percentage_of_contract" || item.allocation_method === "percentage_of_cost_code") {
      return sum + ((item.amount || 0) / 100) * (sovTotal || 0);
    }
    return sum + (item.amount || 0);
  }, 0);

  return (
    <div className="border border-blue-200 rounded-xl bg-blue-50/50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#0f2a5e] text-sm">General Conditions Breakdown — {label}</span>
          <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">{items.length} items</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-[#0f2a5e]">
            Total: ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-blue-200">
          {loading ? (
            <p className="text-gray-400 text-sm py-4">Loading...</p>
          ) : (
            <>
              {items.length === 0 && (
                <div className="text-center py-5">
                  <p className="text-gray-400 text-sm italic mb-3">No items yet for {label}.</p>
                </div>
              )}

              {items.length > 0 && (
                <>
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase mt-4 mb-1 px-1">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-3">Cost Code</div>
                    <div className="col-span-2">Allocation</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-1" />
                  </div>
                  <div className="divide-y divide-blue-100">
                    {items.map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 py-2.5 text-sm items-center px-1">
                        <div className="col-span-4 font-medium text-gray-800">{item.description}</div>
                        <div className="col-span-3 text-gray-500 text-xs">{item.cost_code || "—"}</div>
                        <div className="col-span-2 text-xs text-blue-700 bg-blue-100 rounded px-1.5 py-0.5 text-center">
                          {ALLOCATION_LABELS[item.allocation_method] || item.allocation_method}
                        </div>
                        <div className="col-span-2 text-right font-medium text-[#0f2a5e]">
                          {item.allocation_method === "fixed"
                            ? `$${(item.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `${item.amount || 0}%`}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
              <div className="grid grid-cols-12 gap-2 mt-4">
                <Input
                  className="col-span-4 text-sm"
                  placeholder="Description *"
                  value={newItem.description}
                  onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                />
                <Input
                  className="col-span-2 text-sm"
                  placeholder="Cost Code"
                  value={newItem.cost_code}
                  onChange={e => setNewItem(p => ({ ...p, cost_code: e.target.value }))}
                />
                <Select value={newItem.allocation_method} onValueChange={v => setNewItem(p => ({ ...p, allocation_method: v }))}>
                  <SelectTrigger className="col-span-3 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage_of_contract">% of Contract</SelectItem>
                    <SelectItem value="percentage_of_cost_code">% of Cost Code</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-2 text-sm"
                  type="number"
                  placeholder={newItem.allocation_method === "fixed" ? "$" : "%"}
                  value={newItem.amount}
                  onChange={e => setNewItem(p => ({ ...p, amount: e.target.value }))}
                />
                <Button onClick={addItem} disabled={saving} className="col-span-1 bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white px-2">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function GeneralConditionsDrawer({ projectId, sovTotal }) {
  return (
    <div className="space-y-3">
      <GCPhaseSection projectId={projectId} phase="phase1" sovTotal={sovTotal} label={PHASE_LABELS.phase1} />
      <GCPhaseSection projectId={projectId} phase="phase2" sovTotal={sovTotal} label={PHASE_LABELS.phase2} />
    </div>
  );
}