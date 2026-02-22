import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Building2, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function Billing() {
  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list("-created_date", 100),
      base44.entities.BillingPeriod.list("-created_date", 200),
    ]).then(([proj, per]) => {
      setProjects(proj);
      setPeriods(per);
      setLoading(false);
    });
  }, []);

  const totalContractValue = projects.reduce((s, p) => s + (p.contract_value || 0), 0);
  const activeProjects = projects.filter(p => p.status === "active").length;

  // Latest period per project for "last billed"
  const latestPeriodByProject = {};
  periods.forEach(p => {
    if (!latestPeriodByProject[p.project_id] || p.period_number > latestPeriodByProject[p.project_id].period_number) {
      latestPeriodByProject[p.project_id] = p;
    }
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Project Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">AIA G702/G703 Billing Management</p>
        </div>
        <Link to={createPageUrl("Projects")}>
          <Button className="bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white">
            <Plus className="w-4 h-4 mr-1" /> New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Active Projects</div>
              <div className="text-2xl font-bold text-[#0f2a5e]">{loading ? "—" : activeProjects}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Contract Value</div>
              <div className="text-2xl font-bold text-[#0f2a5e]">{loading ? "—" : `$${totalContractValue.toLocaleString()}`}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Billed</div>
              <div className="text-2xl font-bold text-[#0f2a5e]">—</div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Cards */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const projectPeriods = periods.filter(p => p.project_id === project.id);
            const latestPeriod = latestPeriodByProject[project.id];
            return (
              <Link key={project.id} to={createPageUrl(`ProjectBilling?id=${project.id}`)}>
                <div className="bg-[#0f2a5e] text-white rounded-xl p-5 hover:bg-[#1e3a8a] transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-base leading-tight">{project.name}</div>
                        <div className="text-blue-200 text-xs">{project.job_number}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {project.project_type && (
                        <Badge className="bg-white/20 text-white text-xs border-0">{project.project_type}</Badge>
                      )}
                      {latestPeriod && (
                        <Badge className="bg-white/20 text-white text-xs border-0">Period {latestPeriod.period_number}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20">
                    <div>
                      <div className="text-blue-200 text-xs flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> CONTRACT
                      </div>
                      <div className="font-bold text-sm mt-0.5">
                        ${(project.contract_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-200 text-xs flex items-center gap-1">
                        <FileText className="w-3 h-3" /> LAST BILLED
                      </div>
                      <div className="font-bold text-sm mt-0.5">$0.00</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}