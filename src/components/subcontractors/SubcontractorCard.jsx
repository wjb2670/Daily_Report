import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ContactFormModal from "./ContactFormModal";

const ROLE_LABELS = {
  estimating: "Estimating",
  administrative: "Administrative",
  accounting: "Accounting",
  field: "Field",
  owner: "Owner"
};

const ROLE_COLORS = {
  estimating: "bg-blue-100 text-blue-700",
  administrative: "bg-purple-100 text-purple-700",
  accounting: "bg-green-100 text-green-700",
  field: "bg-orange-100 text-orange-700",
  owner: "bg-gray-100 text-gray-700"
};

export default function SubcontractorCard({ sub, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  useEffect(() => {
    if (expanded) loadContacts();
  }, [expanded]);

  const loadContacts = async () => {
    const data = await base44.entities.SubcontractorContact.filter({ subcontractor_id: sub.id });
    setContacts(data);
  };

  const handleSaveContact = async (form) => {
    if (editingContact) {
      await base44.entities.SubcontractorContact.update(editingContact.id, form);
    } else {
      await base44.entities.SubcontractorContact.create({ ...form, subcontractor_id: sub.id });
    }
    setContactModal(false);
    setEditingContact(null);
    loadContacts();
  };

  const handleDeleteContact = async (id) => {
    await base44.entities.SubcontractorContact.delete(id);
    loadContacts();
  };

  const isInsuranceExpiring = sub.insurance_expiry && (() => {
    const days = (new Date(sub.insurance_expiry) - new Date()) / (1000 * 60 * 60 * 24);
    return days < 60;
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#0f2a5e]">{sub.company_name}</span>
            {sub.trade && <span className="text-sm text-gray-500">— {sub.trade}</span>}
            {sub.type === "professional" && (
              <Badge className="bg-indigo-100 text-indigo-700 text-xs">Professional</Badge>
            )}
            {isInsuranceExpiring && (
              <Badge className="bg-red-100 text-red-600 text-xs">Insurance Expiring</Badge>
            )}
          </div>
          {(sub.city || sub.phone) && (
            <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
              {sub.city && <span>{sub.city}{sub.state ? `, ${sub.state}` : ""}</span>}
              {sub.phone && <span>{sub.phone}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-blue-600"
            onClick={() => onEdit(sub)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-500"
            onClick={() => onDelete(sub.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded contacts */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</span>
            <Button size="sm" variant="outline" className="h-7 text-xs border-[#1e3a8a] text-[#1e3a8a]"
              onClick={() => { setEditingContact(null); setContactModal(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Contact
            </Button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No contacts added yet.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map(c => (
                <div key={c.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-200">
                  <User className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-800">{c.name}</span>
                      {c.title && <span className="text-xs text-gray-400">{c.title}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[c.role] || "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[c.role] || c.role}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Mail className="w-3 h-3" />{c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                          <Phone className="w-3 h-3" />{c.phone}
                        </a>
                      )}
                      {c.cell && (
                        <a href={`tel:${c.cell}`} className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                          <Phone className="w-3 h-3" />{c.cell} (cell)
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="text-gray-300 hover:text-blue-500 transition-colors"
                      onClick={() => { setEditingContact(c); setContactModal(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-gray-300 hover:text-red-500 transition-colors"
                      onClick={() => handleDeleteContact(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ContactFormModal
        open={contactModal}
        onClose={() => { setContactModal(false); setEditingContact(null); }}
        onSave={handleSaveContact}
        initial={editingContact}
      />
    </div>
  );
}