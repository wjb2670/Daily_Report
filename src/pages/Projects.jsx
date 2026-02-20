import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FolderOpen, Search, ChevronRight, MapPin, User, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProjectFormModal from "@/components/projects/ProjectFormModal";

const statusColors = {
  bidding: "bg-yellow-100 text-yellow-800",
  awarded: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-gray-100 text-gray-700",
  complete: "bg-purple-100 text-purple-800",
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const data = await base44.entities.Project.list("-created_date");
    setProjects(data);
    setLoading(false);
  };

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.job_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data) => {
    if (editingProject) {
      await base44.entities.Project.update(editingProject.id, data);
    } else {
      await base44.entities.Project.create(data);
    }
    setShowModal(false);
    setEditingProject(null);
    loadProjects();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">{projects.length} total projects</p>
        </div>
        <Button
          onClick={() => { setEditingProject(null); setShowModal(true); }}
          className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold"
        >
          <Plus className="w-4 h-4 mr-1" /> New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, job number, or owner..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Project Cards */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No projects found</p>
          <p className="text-sm mt-1">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(project => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-[#0f2a5e] text-lg">{project.name}</h2>
                    <Badge className={`text-xs font-medium ${statusColors[project.status] || "bg-gray-100 text-gray-700"}`}>
                      {project.status?.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                    {project.job_number && (
                      <span className="flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" /> {project.job_number}
                      </span>
                    )}
                    {(project.city || project.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {[project.city, project.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {project.project_manager && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> PM: {project.project_manager}
                      </span>
                    )}
                    {project.owner_company && (
                      <span className="flex items-center gap-1">
                        Owner: {project.owner_company}
                      </span>
                    )}
                    {project.contract_value && (
                      <span className="font-medium text-[#0f2a5e]">
                        ${project.contract_value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingProject(project); setShowModal(true); }}
                    className="text-[#1e3a8a] border-[#1e3a8a]"
                  >
                    Edit
                  </Button>
                  <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                    <Button size="sm" className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white">
                      Open <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProjectFormModal
          project={editingProject}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProject(null); }}
        />
      )}
    </div>
  );
}