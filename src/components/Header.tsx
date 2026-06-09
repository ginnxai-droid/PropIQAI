import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Role, LeadSource, LeadStatus, BuyerType, PurchaseTimeline } from "../types";
import { ShieldCheck, Plus, Sparkles, PhoneCall, Zap, User } from "lucide-react";

export const Header: React.FC = () => {
  const {
    activePage,
    activeRole,
    setActiveRole,
    addLead,
    projects,
    setSelectedLeadId,
    setActivePage,
  } = useApp();

  const [simulatedCount, setSimulatedCount] = useState(1);

  // Format header title elegantly based on current active screen
  const getPageTitle = () => {
    switch (activePage) {
      case "dashboard":
        return { main: "Developer Control Board", subtitle: "Missed Lead Recovery & SLA Command" };
      case "inbox":
        return { main: "Unified Lead Inbox", subtitle: "AI Qualified & Intent-Scored Enquiries" };
      case "detail":
        return { main: "Lead Qualification Profile", subtitle: "Deep Buyer Context & Engagement Timelines" };
      case "visits":
        return { main: "Site Visits & Outcome Tracker", subtitle: "Confirm scheduling, reminder status, and conversions" };
      case "tasks":
        return { main: "Executive Callback Queue", subtitle: "Active daily follow-up tasks & customer response tracking" };
      case "sla":
        return { main: "SLA Breach & Escalation Center", subtitle: "Real-time process delay alerts & hot-lead re-assignments" };
      case "pilot":
        return { main: "Launch Partner Pilot Report", subtitle: "Before-vs-After performance metrics and recovered revenue summaries" };
      case "projects":
        return { main: "RERA Project Inventory", subtitle: "Brochures, micro-specifications, price grids, and RERA pins" };
      case "team":
        return { main: "Sales Operations Team", subtitle: "Executive project assignments, daily caps, and active load monitoring" };
      case "settings":
        return { main: "Core Settings & Webhooks", subtitle: "n8n intake configurations, developer APIs, and mock test consoles" };
      default:
        return { main: "PropIQ AI Builder", subtitle: "Revenue Recovery Platform" };
    }
  };

  const titleInfo = getPageTitle();

  // Helper to trigger realistic simulated lead ingestion on-the-fly
  const triggerSimulation = (type: "missed_call" | "meta") => {
    let mockData;
    const countTag = simulatedCount;
    setSimulatedCount(prev => prev + 1);

    if (type === "missed_call") {
      mockData = {
        name: `Ramesh Sharma (Simulated MC-${countTag})`,
        phone: `+91 91520 ${Math.floor(10000 + Math.random() * 90000)}`,
        email: `ramesh.sharma_${countTag}@yahoo.co.in`,
        source: LeadSource.MISSED_CALL,
        project_id: "proj_1", // Baner
        status: LeadStatus.NEW,
        buyer_type: BuyerType.FAMILY_BUYER,
        apartment_preference: "2BHK",
        budget_min: 8000000,
        budget_max: 10000000,
        purchase_timeline: PurchaseTimeline.IMMEDIATE,
        site_visit_interest: true,
        score: 8.7, // hot!
        ai_summary: "Automated missed call recovery trigger. System initiated call. Chose 2BHK. High intent family buyer.",
        recommended_next_action: "SLA timer active (10m). Introduce custom layout.",
        key_questions: ["RERA carpet delivery date?", "Pre-EMI options?"],
        objections: ["Possession timeline is too far"],
        isAfterHours: false,
      };
    } else {
      mockData = {
        name: `Jyoti Patel (Simulated Meta-${countTag})`,
        phone: `+91 97890 ${Math.floor(10000 + Math.random() * 90000)}`,
        email: `jyoti.patel_${countTag}@gmail.com`,
        source: LeadSource.META,
        project_id: "proj_2", // Wakad
        status: LeadStatus.NEW,
        buyer_type: BuyerType.INVESTOR,
        apartment_preference: "3BHK",
        budget_min: 11000000,
        budget_max: 13500000,
        purchase_timeline: PurchaseTimeline.WITHIN_3_MONTHS,
        site_visit_interest: true,
        score: 9.1,
        ai_summary: "Meta Facebook Lead Ads capture. AI auto-qualified on WhatsApp. High capital appreciation budget fit.",
        recommended_next_action: "Call immediately to finalize site visit scheduled for this Sunday.",
        key_questions: ["Construction stage status?", "Rental yields?"],
        objections: ["High downpayment"],
        isAfterHours: true,
      };
    }

    const newId = addLead(mockData);
    
    // Set active route and go see the fresh lead detail immediately!
    setSelectedLeadId(newId);
    setActivePage("detail");
  };

  return (
    <header className="sticky top-0 bg-[#09090b] border-b border-zinc-800 h-16 shrink-0 flex items-center justify-between px-6 z-20 select-none">
      {/* Title block */}
      <div>
        <h2 className="text-sm font-bold text-white tracking-tight leading-none flex items-center gap-1.5 uppercase font-mono">
          {titleInfo.main}
          {activePage === "detail" && <Sparkles className="w-3.5 h-3.5 text-indigo-400 font-bold" />}
        </h2>
        <p className="text-[11px] text-zinc-500 mt-1.5 leading-none font-medium hidden sm:block">{titleInfo.subtitle}</p>
      </div>

      {/* Header Utilities/Simulators */}
      <div className="flex items-center space-x-3">
        {/* Quick Lead Simulators (Super useful for demo!) */}
        <div className="hidden lg:flex items-center space-x-2 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-mono font-medium uppercase px-2">Simulate Intake:</span>
          <button
            onClick={() => triggerSimulation("missed_call")}
            className="flex items-center gap-1 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-medium px-2.5 py-1 rounded-md shadow-xs transition-colors cursor-pointer"
            title="Injest a simulated voice missed call lead"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Missed Call</span>
          </button>
          <button
            onClick={() => triggerSimulation("meta")}
            className="flex items-center gap-1 text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-medium px-2.5 py-1 rounded-md shadow-xs transition-colors cursor-pointer"
            title="Injest a simulated Meta FB Lead Ads webhook lead"
          >
            <Zap className="w-3 h-3" />
            <span>Meta Ad</span>
          </button>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-zinc-800 hidden lg:block" />

        {/* Role Switcher Grid */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-1 text-zinc-450" title="Switch User Role Persona">
            <ShieldCheck className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-medium hidden md:block text-zinc-400">Role Context:</span>
          </div>
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as Role)}
            className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2.5 font-sans font-medium text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-800 transition-colors"
          >
            <option value={Role.OWNER}>Owner (Builder CXO)</option>
            <option value={Role.MANAGER}>Sales Manager</option>
            <option value={Role.EXECUTIVE}>Sales Executive</option>
            <option value={Role.ADMIN}>System Admin</option>
          </select>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-zinc-800" />

        {/* User Badge Profile info */}
        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-850 md:py-1 md:pl-2 md:pr-3 rounded-full">
          <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-100 text-xs font-semibold flex items-center justify-center border border-zinc-700">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-left leading-none hidden md:block">
            <span className="block text-xs font-bold text-zinc-200">Demo User</span>
            <span className="text-[9px] text-zinc-500 font-medium font-mono">ginnxai@gmail</span>
          </div>
        </div>
      </div>
    </header>
  );
};
