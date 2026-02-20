import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, DollarSign, ChevronDown, ChevronUp, Edit, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScopeFormModal from "@/components/scopes/ScopeFormModal.jsx";
import ScopeImportModal from "@/components/scopes/ScopeImportModal.jsx";

const statusColors = {
  bidding: "bg-yellow-100 text-yellow-800",
  awarded: "bg-blue-100 text-blue-800",
  contract_sent: "bg-orange-100 text-orange-800",
  contract_signed: "bg-teal-100 text-teal-800",
  active: "bg-green-100 text-green-800",
  complete: "bg-purple-100 text-purple-800",
};

export default function Scopes() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("project_id");

  const [scopes, setScopes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || "all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingScope, setEditingScope] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list("-created_date"),
      loadScopes(),
    ]).then(([projectData]) => {
      setProjects(projectData);
    });
  }, []);

  useEffect(() => {
    loadScopes();
  }, [selectedProject]);

  const loadScopes = async () => {
    setLoading(true);
    const filter = selectedProject && selectedProject !== "all" ? { project_id: selectedProject } : {};
    const data = await base44.entities.Scope.filter(filter, "cost_code");
    setScopes(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this scope?")) return;
    await base44.entities.Scope.delete(id);
    loadScopes();
  };

  const handleSave = async (data) => {
    if (editingScope) {
      await base44.entities.Scope.update(editingScope.id, data);
    } else {
      await base44.entities.Scope.create({ ...data, project_id: selectedProject !== "all" ? selectedProject : data.project_id });
    }
    setShowModal(false);
    setEditingScope(null);
    loadScopes();
  };

  const filtered = scopes.filter(s =>
    s.description?.toLowerCase().includes(search.toLowerCase()) ||
    s.cost_code?.toLowerCase().includes(search.toLowerCase()) ||
    s.subcontractor_company?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAwarded = filtered.reduce((sum, s) => sum + (s.awarded_amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Scopes of Work</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} scopes · Total: <span className="font-semibold text-[#0f2a5e]">${totalAwarded.toLocaleString()}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} className="text-[#1e3a8a] border-[#1e3a8a]">
            <Upload className="w-4 h-4 mr-1" /> Import
          </Button>
          <Button onClick={() => { setEditingScope(null); setShowModal(true); }} className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold">
            <Plus className="w-4 h-4 mr-1" /> Add Scope
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search scopes, cost codes, subcontractors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scope List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading scopes...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No scopes found</p>
          <p className="text-sm mt-1">Add a scope manually or import from your Excel file.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(scope => (
            <div key={scope.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Scope Header Row */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [scope.id]: !prev[scope.id] }))}
                  className="text-gray-400 hover:text-[#1e3a8a] flex-shrink-0"
                >
                  {expanded[scope.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{scope.cost_code}</span>
                    <span className="font-semibold text-[#0f2a5e]">{scope.description}</span>
                    <Badge className={`text-xs ${statusColors[scope.status] || "bg-gray-100 text-gray-700"}`}>
                      {scope.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {scope.subcontractor_company && (
                    <p className="text-sm text-gray-500 mt-0.5">{scope.subcontractor_company}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {scope.awarded_amount && (
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-400">Awarded</div>
                      <div className="font-bold text-[#0f2a5e]">${scope.awarded_amount.toLocaleString()}</div>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#1e3a8a] h-8 w-8"
                    onClick={() => { setEditingScope(scope); setShowModal(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 h-8 w-8"
                    onClick={() => handleDelete(scope.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile amount */}
              {scope.awarded_amount && (
                <div className="sm:hidden px-4 pb-2 text-sm font-semibold text-[#0f2a5e] flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> {scope.awarded_amount.toLocaleString()}
                </div>
              )}

              {/* Expanded Scope of Work */}
              {expanded[scope.id] && scope.scope_of_work && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Scope of Work</p>
                  <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {scope.scope_of_work}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ScopeFormModal
          scope={editingScope}
          projects={projects}
          defaultProjectId={selectedProject !== "all" ? selectedProject : undefined}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingScope(null); }}
        />
      )}

      {showImport && (
        <ScopeImportModal
          projects={projects}
          defaultProjectId={selectedProject !== "all" ? selectedProject : undefined}
          onImported={() => { setShowImport(false); loadScopes(); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}