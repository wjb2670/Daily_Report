import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SubcontractorCard from "@/components/subcontractors/SubcontractorCard";
import SubcontractorFormModal from "@/components/subcontractors/SubcontractorFormModal";

const TABS = [
  { key: "all", label: "All" },
  { key: "subcontractor", label: "Subcontractors" },
  { key: "professional", label: "Professionals" },
];

export default function Subcontractors() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    loadSubs();
  }, []);

  const loadSubs = async () => {
    const data = await base44.entities.Subcontractor.list("-company_name");
    setSubs(data);
    setLoading(false);
  };

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.Subcontractor.update(editing.id, form);
    } else {
      await base44.entities.Subcontractor.create(form);
    }
    setModalOpen(false);
    setEditing(null);
    loadSubs();
  };

  const handleEdit = (sub) => {
    setEditing(sub);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Subcontractor.delete(id);
    loadSubs();
  };

  const filtered = subs.filter(s => {
    const matchTab = activeTab === "all" || s.type === activeTab;
    const q = search.toLowerCase();
    const matchSearch = !q || s.company_name?.toLowerCase().includes(q) || s.trade?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = {
    all: subs.length,
    subcontractor: subs.filter(s => s.type === "subcontractor").length,
    professional: subs.filter(s => s.type === "professional").length,
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a5e]">Subcontractors</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subs.length} companies in database</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-[#0f2a5e] hover:bg-[#1e3a8a] text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Company
        </Button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${activeTab === t.key ? "bg-white text-[#0f2a5e] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-gray-400">({counts[t.key]})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            className="pl-8"
            placeholder="Search by name, trade, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No companies found</p>
          <p className="text-sm">Add your first subcontractor or professional above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => (
            <SubcontractorCard
              key={sub.id}
              sub={sub}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <SubcontractorFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}