import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FolderOpen,
  ClipboardList,
  Users,
  FileText,
  DollarSign,
  Menu,
  X,
  ChevronRight,
  Layers
} from "lucide-react";

const navItems = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Projects", page: "Projects", icon: FolderOpen },
  { label: "Scopes", page: "Scopes", icon: Layers },
  { label: "Daily Reports", page: "DailyReport", icon: ClipboardList },
  { label: "Subcontractors", page: "Subcontractors", icon: Users },
  { label: "Contracts", page: "Contracts", icon: FileText },
  { label: "Billing", page: "Billing", icon: DollarSign },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-blue-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f2a5e] text-white flex flex-col transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e3a8a]">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69986966442e93bb8f52d310/5f8462f80_whayland-logo-white1.png"
                              alt="Whayland"
                              className="h-16 w-auto"
          />
          <button className="md:hidden text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ label, page, icon: Icon }) => {
            const isActive = currentPageName === page;
            return (
              <Link
                key={page}
                to={createPageUrl(page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-[#1e3a8a] text-white"
                    : "text-blue-200 hover:bg-[#1e3a8a] hover:text-white"
                  }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[#1e3a8a] text-xs text-blue-300">
          Whayland Project Hub
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-[#0f2a5e]">
            <Menu className="w-6 h-6" />
          </button>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69986966442e93bb8f52d310/5f8462f80_whayland-logo-white1.png"
                              alt="Whayland"
                              className="h-8 w-auto"
          />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}