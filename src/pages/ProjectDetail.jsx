import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Building, User, DollarSign, Calendar, MapPin, Phone, Mail, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProjectFormModal from "@/components/projects/ProjectFormModal.jsx";
import SOVSection from "@/components/projects/SOVSection.jsx";
import ProjectReportsList from "@/components/report/ProjectReportsList.jsx";

const statusColors = {
  bidding: "bg-yellow-100 text-yellow-800",
  awarded: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-gray-100 text-gray-700",
  complete: "bg-purple-100 text-purple-800",
};

export default function ProjectDetail() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  const loadProject = async () => {
    const data = await base44.entities.Project.filter({ id: projectId });
    setProject(data[0] || null);
    setLoading(false);
  };

  const handleSave = async (data) => {
    // A new job site address means the weather location must be looked up again.
    const moved = ["address", "city", "state", "zip"].some(k => k in data && (data[k] || "") !== (project[k] || ""));
    await base44.entities.Project.update(projectId, moved ? { ...data, latitude: null, longitude: null } : data);
    setShowEdit(false);
    loadProject();
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!project) return <div className="text-center py-16 text-gray-400">Project not found.</div>;

  const tabs = ["overview", "sov", "subcontractors", "contracts", "reports"];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back */}
      <Link to={createPageUrl("Projects")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      {/* Project Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0f2a5e]">{project.name}</h1>
              <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-700"}>
                {project.status?.replace("_", " ")}
              </Badge>
              {project.project_type && (
                <Badge className="bg-[#0f2a5e] text-white">
                  {project.project_type}
                </Badge>
              )}
            </div>
            <p className="text-gray-500 mt-1">Job #{project.job_number}</p>
          </div>
          <Button onClick={() => setShowEdit(true)} variant="outline" className="text-[#1e3a8a] border-[#1e3a8a]">
            <Edit className="w-4 h-4 mr-1" /> Edit Project
          </Button>
        </div>

        {/* Quick info */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {project.contract_value && (
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="w-4 h-4 text-[#1e3a8a]" />
              <div>
                <div className="text-xs text-gray-400">Contract Value</div>
                <div className="font-semibold">${project.contract_value.toLocaleString()}</div>
              </div>
            </div>
          )}
          {(project.city || project.state) && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-[#1e3a8a]" />
              <div>
                <div className="text-xs text-gray-400">Location</div>
                <div className="font-semibold">{[project.city, project.state].filter(Boolean).join(", ")}</div>
              </div>
            </div>
          )}
          {project.project_manager && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4 text-[#1e3a8a]" />
              <div>
                <div className="text-xs text-gray-400">Project Manager</div>
                <div className="font-semibold">{project.project_manager}</div>
              </div>
            </div>
          )}
          {project.superintendent && (
            <div className="flex items-center gap-2 text-gray-600">
              <Building className="w-4 h-4 text-[#1e3a8a]" />
              <div>
                <div className="text-xs text-gray-400">Superintendent</div>
                <div className="font-semibold">{project.superintendent}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors -mb-px
              ${activeTab === t ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t === "sov" ? "Schedule of Values" : t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Owner Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-[#0f2a5e] mb-3">Owner Information</h3>
            {project.owner_company || project.owner_contact ? (
              <div className="space-y-2 text-sm">
                {project.owner_company && <div><span className="text-gray-500">Company:</span> <span className="font-medium">{project.owner_company}</span></div>}
                {project.owner_contact && <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{project.owner_contact}</span></div>}
                {project.owner_email && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Mail className="w-3.5 h-3.5" /> {project.owner_email}
                  </div>
                )}
                {project.owner_phone && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Phone className="w-3.5 h-3.5" /> {project.owner_phone}
                  </div>
                )}
                {project.owner_address && <div><span className="text-gray-500">Address:</span> {project.owner_address}</div>}
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic">No owner info added.</p>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-[#0f2a5e] mb-3">Project Schedule</h3>
            <div className="space-y-2 text-sm">
              {project.start_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-[#1e3a8a]" />
                  <span className="text-gray-500">Start:</span> <span className="font-medium">{project.start_date}</span>
                </div>
              )}
              {project.end_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-[#1e3a8a]" />
                  <span className="text-gray-500">End:</span> <span className="font-medium">{project.end_date}</span>
                </div>
              )}
              {!project.start_date && !project.end_date && (
                <p className="text-gray-400 italic">No schedule set.</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:col-span-2">
              <h3 className="font-bold text-[#0f2a5e] mb-2">Notes</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">{project.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "sov" && <SOVSection projectId={projectId} projectType={project.project_type} />}

      {activeTab === "subcontractors" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400">
          <p>Subcontractor management coming soon.</p>
        </div>
      )}

      {activeTab === "contracts" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400">
          <p>Contract management coming soon.</p>
        </div>
      )}

      {activeTab === "reports" && <ProjectReportsList projectId={projectId} />}

      {showEdit && (
        <ProjectFormModal project={project} onSave={handleSave} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}