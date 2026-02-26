import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FolderOpen, ClipboardList, DollarSign, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Project.list("-created_date", 10).then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const activeProjects = projects.filter(p => p.status === "active").length;
  const awardedProjects = projects.filter(p => p.status === "awarded").length;
  const totalValue = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

  const stats = [
    { label: "Total Projects", value: projects.length, icon: FolderOpen, color: "text-blue-600 bg-blue-50" },
    { label: "Active", value: activeProjects, icon: ClipboardList, color: "text-green-600 bg-green-50" },
    { label: "Awarded", value: awardedProjects, icon: Users, color: "text-yellow-600 bg-yellow-50" },
    { label: "Total Contract Value", value: `$${(totalValue / 1000000).toFixed(1)}M`, icon: DollarSign, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0f2a5e]">Project Hub</h1>
        <p className="text-gray-500 mt-1">Welcome to the Whayland Project Management Platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-[#0f2a5e]">{loading ? "—" : value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0f2a5e] text-lg">Recent Projects</h2>
          <Link to={createPageUrl("Projects")} className="text-sm text-[#1e3a8a] hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No projects yet. <Link to={createPageUrl("Projects")} className="text-[#1e3a8a] hover:underline">Create your first project</Link></p>
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.slice(0, 5).map(p => (
              <Link key={p.id} to={createPageUrl(`ProjectDetail?id=${p.id}`)}
                className="flex items-center justify-between px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-[#0f2a5e] hover:border-[#0f2a5e] hover:text-white transition-all group shadow-sm cursor-pointer">
                <div>
                  <div className="font-semibold text-[#0f2a5e] group-hover:text-white">{p.name}</div>
                  <div className="text-sm text-gray-500 group-hover:text-blue-200">#{p.job_number} · {p.status?.replace("_", " ")}</div>
                </div>
                <div className="flex items-center gap-3">
                  {p.contract_value && (
                    <div className="text-sm font-semibold text-[#0f2a5e] group-hover:text-white">${p.contract_value.toLocaleString()}</div>
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}