import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, DollarSign, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SOVSection({ projectId }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLine, setNewLine] = useState({ line_number: "", description: "", cost_code: "", scheduled_value: "" });

  useEffect(() => {
    loadLines();
  }, [projectId]);

  const loadLines = async () => {
    const data = await base44.entities.ScheduleOfValues.filter({ project_id: projectId }, "line_number");
    setLines(data);
    setLoading(false);
  };

  const addLine = async () => {
    if (!newLine.description || !newLine.scheduled_value) return;
    await base44.entities.ScheduleOfValues.create({
      ...newLine,
      project_id: projectId,
      scheduled_value: Number(newLine.scheduled_value),
    });
    setNewLine({ line_number: "", description: "", cost_code: "", scheduled_value: "" });
    loadLines();
  };

  const deleteLine = async (id) => {
    await base44.entities.ScheduleOfValues.delete(id);
    loadLines();
  };

  const total = lines.reduce((sum, l) => sum + (l.scheduled_value || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#0f2a5e] text-lg">Schedule of Values</h3>
        <div className="flex items-center gap-1 text-sm font-semibold text-[#0f2a5e]">
          <DollarSign className="w-4 h-4" />
          Total: ${total.toLocaleString()}
        </div>
      </div>

      {/* Add new line */}
      <div className="grid grid-cols-12 gap-2 mb-4 text-sm">
        <Input className="col-span-1" placeholder="#" value={newLine.line_number} onChange={e => setNewLine(p => ({ ...p, line_number: e.target.value }))} />
        <Input className="col-span-4" placeholder="Description *" value={newLine.description} onChange={e => setNewLine(p => ({ ...p, description: e.target.value }))} />
        <Input className="col-span-3" placeholder="Cost Code" value={newLine.cost_code} onChange={e => setNewLine(p => ({ ...p, cost_code: e.target.value }))} />
        <Input className="col-span-3" type="number" placeholder="Value *" value={newLine.scheduled_value} onChange={e => setNewLine(p => ({ ...p, scheduled_value: e.target.value }))} />
        <Button onClick={addLine} className="col-span-1 bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white px-2">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

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
              <div className="col-span-3 text-right font-medium text-[#0f2a5e]">${(line.scheduled_value || 0).toLocaleString()}</div>
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