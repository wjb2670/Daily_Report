import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, FileText, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  paid: "bg-purple-100 text-purple-800",
};

export default function Billing() {
  const [draws, setDraws] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.DrawRequest.list("-created_date", 50),
      base44.entities.Project.list("-created_date", 100),
    ]).then(([drawData, projectData]) => {
      setDraws(drawData);
      setProjects(projectData);
      setLoading(false);
    });
  }, []);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const totalBilled = draws.reduce((sum, d) => sum + (d.total_amount || 0), 0);
  const totalPaid = draws.filter(d => d.status === "paid").reduce((sum, d) => sum + (d.net_amount || 0), 0);
  const pending = draws.filter(d => d.status === "submitted").length;
  const drafts = draws.filter(d => d.status === "draft").length;

  const stats = [
    { label: "Total Billed", value: `$${totalBilled.toLocaleString()}`, color: "text-blue-600 bg-blue-50" },
    { label: "Total Paid", value: `$${totalPaid.toLocaleString()}`, color: "text-green-600 bg-green-50" },
    { label: "Pending Approval", value: pending, color: "text-yellow-600 bg-yellow-50" },
    { label: "Draft Draws", value: drafts, color: "text-gray-600 bg-gray-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Billing</h1>
          <p className="text-gray-500 text-sm mt-0.5">Draw requests & AIA billing</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-[#0f2a5e]">{loading ? "—" : value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Draw Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0f2a5e] text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Draw Requests
          </h2>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : draws.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No draw requests yet.</p>
            <p className="text-xs mt-1">Open a project's Schedule of Values to create a draw request.</p>
          </div>
        ) : (
          <div className="divide-y">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase pb-2 px-1">
              <div className="col-span-3">Project</div>
              <div className="col-span-1 text-center">Draw #</div>
              <div className="col-span-2">Period</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Retainage</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1" />
            </div>

            {draws.map(draw => {
              const project = projectMap[draw.project_id];
              return (
                <div key={draw.id} className="grid grid-cols-12 gap-2 py-3 text-sm items-center px-1">
                  <div className="col-span-3">
                    <div className="font-medium text-[#0f2a5e]">{project?.name || "—"}</div>
                    {project && <div className="text-xs text-gray-400">#{project.job_number}</div>}
                  </div>
                  <div className="col-span-1 text-center text-gray-600">{draw.draw_number}</div>
                  <div className="col-span-2 text-gray-500 text-xs">
                    {draw.period_from && draw.period_to
                      ? `${draw.period_from} – ${draw.period_to}`
                      : draw.period_from || "—"}
                  </div>
                  <div className="col-span-2 text-right font-medium text-[#0f2a5e]">
                    {draw.total_amount != null ? `$${draw.total_amount.toLocaleString()}` : "—"}
                  </div>
                  <div className="col-span-2 text-right text-gray-500">
                    {draw.retainage_held != null ? `$${draw.retainage_held.toLocaleString()}` : "—"}
                  </div>
                  <div className="col-span-1 text-center">
                    <Badge className={statusColors[draw.status] || "bg-gray-100 text-gray-700"}>
                      {draw.status}
                    </Badge>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {project && (
                      <Link to={createPageUrl(`ProjectDetail?id=${draw.project_id}`)}>
                        <button className="text-gray-300 hover:text-[#1e3a8a] transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}