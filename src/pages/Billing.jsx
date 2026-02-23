import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  bidding: "bg-yellow-100 text-yellow-800",
  awarded: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-gray-100 text-gray-700",
  complete: "bg-purple-100 text-purple-800",
};

export default function Billing() {
  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [proj, per] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.BillingPeriod.list(),
    ]);
    setProjects(proj);
    setPeriods(per);
    setLoading(false);
  };

  const getProjectPeriods = (projectId) =>
    periods.filter(p => p.project_id === projectId);

  const getLatestStatus = (projectId) => {
    const pp = getProjectPeriods(projectId);
    if (!pp.length) return null;
    return pp[pp.length - 1].status;
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  const activeProjects = projects.filter(p => ["active", "awarded", "bidding"].includes(p.status));
  const completeProjects = projects.filter(p => p.status === "complete");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Billing</h1>
          <p className="text-gray-500 text-sm mt-0.5">AIA G702 / G703 Applications for Payment</p>
        </div>
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Active Projects</h2>
          <div className="space-y-3">
            {activeProjects.map(project => {
              const pp = getProjectPeriods(project.id);
              const latestStatus = getLatestStatus(project.id);
              return (
                <Link
                  key={project.id}
                  to={createPageUrl(`ProjectBilling?id=${project.id}`)}
                  className="block"
                >
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-[#1e3a8a] transition-all cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#0f2a5e] rounded-lg flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#0f2a5e] text-base">{project.name}</span>
                            {project.project_type && (
                              <Badge className="bg-[#0f2a5e] text-white text-xs">{project.project_type}</Badge>
                            )}
                            <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-700"}>
                              {project.status?.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">
                            Job #{project.job_number}
                            {project.contract_value ? ` · $${project.contract_value.toLocaleString()}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-gray-400">Billing Periods</div>
                          <div className="text-sm font-bold text-[#0f2a5e]">{pp.length}</div>
                        </div>
                        {latestStatus && (
                          <Badge className={
                            latestStatus === "paid" ? "bg-purple-100 text-purple-800" :
                            latestStatus === "approved" ? "bg-green-100 text-green-800" :
                            latestStatus === "submitted" ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                          }>
                            {latestStatus}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Projects */}
      {completeProjects.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Completed Projects</h2>
          <div className="space-y-3">
            {completeProjects.map(project => {
              const pp = getProjectPeriods(project.id);
              return (
                <Link
                  key={project.id}
                  to={createPageUrl(`ProjectBilling?id=${project.id}`)}
                  className="block"
                >
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-[#1e3a8a] transition-all cursor-pointer opacity-70 hover:opacity-100">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-700 text-base">{project.name}</span>
                            <Badge className="bg-purple-100 text-purple-800">complete</Badge>
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">Job #{project.job_number} · {pp.length} periods</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No projects yet. Create a project first to start billing.</p>
          <Link to={createPageUrl("Projects")}>
            <Button className="mt-4 bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white">
              <Plus className="w-4 h-4 mr-1" /> Go to Projects
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}