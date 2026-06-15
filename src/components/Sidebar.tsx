import React from "react";
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckSquare,
  FileSpreadsheet,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  Settings,
  ListChecks,
  PlugZap,
  UserCheck,
  Users,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { LeadStatus, Priority, Role } from "../types";

export const Sidebar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    leads,
    tasks,
    alerts,
    selectedLeadId,
    activeRole,
  } = useApp();

  const urgentAlertCount = leads.filter(
    (lead) =>
      lead.priority === Priority.HOT &&
      (lead.status === LeadStatus.NEW ||
        lead.status === LeadStatus.QUALIFIED) &&
      lead.sla_deadline &&
      new Date(lead.sla_deadline).getTime() < Date.now(),
  ).length;
  const tasksPendingCount = tasks.filter(
    (task) => task.status === "PENDING",
  ).length;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inbox", label: "Lead Inbox", icon: Inbox },
    {
      id: "detail",
      label: "Lead Detail",
      icon: UserCheck,
      disabled: !selectedLeadId,
      badge: selectedLeadId ? "Active" : null,
      badgeColor:
        "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10",
    },
    { id: "visits", label: "Site Visits", icon: Calendar },
    {
      id: "tasks",
      label: "Sales Tasks",
      icon: CheckSquare,
      badge: tasksPendingCount,
      badgeColor:
        "bg-amber-500/10 text-amber-400 border border-amber-500/10",
    },
    {
      id: "alerts",
      label: "Internal Alerts",
      icon: AlertTriangle,
      badge: alerts.filter((alert) => alert.status !== "RESOLVED").length,
      badgeColor:
        "bg-rose-500/10 text-rose-400 border border-rose-500/10 font-bold",
    },
    {
      id: "sla",
      label: "SLA Alerts",
      icon: AlertTriangle,
      badge: urgentAlertCount,
      badgeColor:
        "bg-rose-500/10 text-rose-400 border border-rose-500/10 font-bold animate-pulse",
      roles: [Role.OWNER, Role.MANAGER, Role.ADMIN],
    },
    {
      id: "pilot",
      label: "Pilot Report",
      icon: FileSpreadsheet,
      badge: "Calculated",
      badgeColor:
        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10",
      roles: [Role.OWNER, Role.MANAGER, Role.ADMIN],
    },
    {
      id: "queues",
      label: "Operational Queues",
      icon: ListChecks,
    },
    { id: "projects", label: "Projects", icon: Building },
    {
      id: "team",
      label: "Sales Team",
      icon: Users,
      roles: [Role.OWNER, Role.MANAGER, Role.ADMIN],
    },
    { id: "settings", label: "Settings & Webhook", icon: Settings },
    {
      id: "integrations",
      label: "Integration Status",
      icon: PlugZap,
      roles: [Role.OWNER, Role.MANAGER, Role.ADMIN],
    },
    {
      id: "health",
      label: "Health Status",
      icon: HeartPulse,
      roles: [Role.OWNER, Role.ADMIN],
    },
  ].filter((item) => !item.roles || item.roles.includes(activeRole));

  return (
    <aside
      data-testid="primary-sidebar"
      className="w-16 md:w-64 bg-[#0c0c0e] text-zinc-100 flex flex-col h-screen sticky top-0 border-r border-zinc-800 z-10 shrink-0 select-none"
    >
      <div className="h-16 flex items-center justify-center px-2 md:justify-start md:px-5 border-b border-zinc-800 bg-[#0c0c0e] shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center md:mr-3 shadow-lg shadow-indigo-500/20 shrink-0">
          <span className="text-xs font-bold text-white">PIQ</span>
        </div>
        <div className="hidden md:block">
          <h1 className="font-semibold tracking-tight text-white text-md leading-none">
            PropIQ AI
          </h1>
          <p className="text-[9px] text-zinc-500 font-bold font-mono uppercase tracking-widest mt-1.5 leading-none">
            Revenue Recovery
          </p>
        </div>
      </div>

      <div className="mx-2 my-3 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-2 py-3 md:mx-3 md:justify-between md:px-4 md:py-2.5">
        <div className="hidden flex-col md:flex">
          <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
            Role Context
          </span>
          <span className="text-xs font-semibold text-zinc-200 tracking-wide font-mono mt-0.5">
            {activeRole}
          </span>
        </div>
        <span
          className={`w-2 h-2 rounded-full ${
            activeRole === Role.OWNER
              ? "bg-purple-400"
              : activeRole === Role.MANAGER
                ? "bg-indigo-400"
                : "bg-emerald-400"
          }`}
        />
      </div>

      <nav className="flex-1 px-1.5 py-2 md:px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activePage === item.id;
          const isDisabled = item.disabled;

          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => setActivePage(item.id)}
              aria-label={item.label}
              title={item.label}
              className={`w-full flex items-center justify-center md:justify-between px-2 md:px-3 py-2 rounded-lg text-sm text-left transition-all duration-205 group ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-400 font-medium border border-indigo-500/20"
                  : isDisabled
                    ? "opacity-30 cursor-not-allowed text-zinc-600"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 border border-transparent"
              }`}
            >
              <div className="flex items-center md:space-x-3 truncate">
                <IconComponent
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 duration-250 ${
                    isActive
                      ? "text-indigo-400"
                      : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                />
                <span className="hidden truncate md:inline">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium truncate shrink-0 ml-2 ${
                    isActive
                      ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                      : item.badgeColor
                  } hidden md:inline`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden p-4 border-t border-zinc-800 bg-zinc-950/20 text-[11px] text-zinc-500 md:flex flex-col space-y-1 shrink-0">
        <div className="flex justify-between font-mono font-medium">
          <span>System Version</span>
          <span className="text-zinc-400 text-[10px]">1.0.0-Beta</span>
        </div>
        <div className="flex justify-between font-mono font-medium">
          <span>Foundation</span>
          <span className="text-amber-400 font-semibold">Secure Stage 1</span>
        </div>
      </div>
    </aside>
  );
};
