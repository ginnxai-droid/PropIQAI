import React from "react";
import { LogOut, ShieldCheck, Sparkles, User } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

export const Header: React.FC = () => {
  const { activePage, activeRole, organizationName } = useApp();
  const { user, signOut } = useAuth();

  const getPageTitle = () => {
    switch (activePage) {
      case "dashboard":
        return { main: "Developer Control Board", subtitle: "Lead and SLA command center" };
      case "inbox":
        return { main: "Unified Lead Inbox", subtitle: "Persisted and permission-scoped enquiries" };
      case "detail":
        return { main: "Lead Qualification Profile", subtitle: "Buyer context and engagement timeline" };
      case "visits":
        return { main: "Site Visits & Outcome Tracker", subtitle: "Scheduling, status, and visit outcomes" };
      case "tasks":
        return { main: "Executive Callback Queue", subtitle: "Persistent follow-up task tracking" };
      case "sla":
        return { main: "SLA Breach & Escalation Center", subtitle: "Response deadline monitoring" };
      case "pilot":
        return { main: "Pilot Report", subtitle: "Metrics calculated from persisted records" };
      case "projects":
        return { main: "RERA Project Inventory", subtitle: "Organization project configuration" };
      case "team":
        return { main: "Sales Operations Team", subtitle: "Organization memberships and access" };
      case "settings":
        return { main: "Secure Foundation Settings", subtitle: "Authentication and integration readiness" };
      default:
        return { main: "PropIQ AI", subtitle: "Revenue recovery platform" };
    }
  };

  const titleInfo = getPageTitle();

  return (
    <header className="sticky top-0 bg-[#09090b] border-b border-zinc-800 h-16 shrink-0 flex items-center justify-between px-6 z-20 select-none">
      <div>
        <h2 className="text-sm font-bold text-white tracking-tight leading-none flex items-center gap-1.5 uppercase font-mono">
          {titleInfo.main}
          {activePage === "detail" && <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
        </h2>
        <p className="text-[11px] text-zinc-500 mt-1.5 leading-none font-medium hidden sm:block">
          {titleInfo.subtitle}
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-zinc-500" />
          <span className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2.5 font-mono text-zinc-200">
            {activeRole}
          </span>
        </div>
        <div className="h-6 w-px bg-zinc-800" />
        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 md:py-1 md:pl-2 md:pr-3 rounded-full">
          <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center border border-zinc-700">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-left leading-none hidden md:block">
            <span className="block text-xs font-bold text-zinc-200">{organizationName}</span>
            <span className="text-[9px] text-zinc-500 font-medium font-mono">{user?.email}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
