import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  LeadSource,
  LeadStatus,
  Priority,
  BuyerType,
  PurchaseTimeline,
  SiteVisitStatus,
} from "../types";
import {
  Search,
  Filter,
  UserCheck,
  Calendar,
  Sparkles,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  X,
  PhoneCall,
  MapPin,
  CircleAlert,
} from "lucide-react";

export const LeadInboxView: React.FC = () => {
  const {
    leads,
    intakeEvents,
    projects,
    users,
    setActivePage,
    setSelectedLeadId,
    updateLeadStatus,
    assignLead,
    scheduleSiteVisit,
    addExternalIntake,
    activeRole,
  } = useApp();
  const canCreateLead = activeRole !== "EXECUTIVE";

  // Filter States
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showBreachedOnly, setShowBreachedOnly] = useState(false);

  // Modal Interactive States
  const [activeAssignLeadId, setActiveAssignLeadId] = useState<string | null>(null);
  const [activeVisitLeadId, setActiveVisitLeadId] = useState<string | null>(null);

  // Site visit form temp states
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [visitorsCount, setVisitorsCount] = useState(2);
  const [familyAttending, setFamilyAttending] = useState(true);
  const [buyerLocation, setBuyerLocation] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [intakeResult, setIntakeResult] = useState<string | null>(null);

  const formatPriceRange = (min: number, max: number) => {
    const minLakhs = min / 100000;
    const maxCrores = max / 10000000;
    
    let minText = minLakhs >= 100 ? `${(min / 10000000).toFixed(1)} Cr` : `${minLakhs} L`;
    let maxText = max / 10000000 >= 1 ? `${maxCrores.toFixed(1)} Cr` : `${max / 100000} L`;
    return `${minText} - ${maxText}`;
  };

  // Main Lead Filtering Logic
  const filteredLeads = leads.filter((lead) => {
    const matchSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.email.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === "ALL" || lead.status === filterStatus;
    const matchPriority = filterPriority === "ALL" || lead.priority === filterPriority;
    const matchSource = filterSource === "ALL" || lead.source === filterSource;
    const matchProject = filterProject === "ALL" || lead.project_id === filterProject;
    const matchAssignee =
      filterAssignee === "ALL" ||
      (filterAssignee === "UNASSIGNED" && !lead.assigned_to) ||
      lead.assigned_to === filterAssignee;
    const matchType = filterType === "ALL" || lead.buyer_type === filterType;

    const isSlaBreached = lead.sla_deadline && new Date(lead.sla_deadline).getTime() < Date.now();
    const matchBreach = !showBreachedOnly || (isSlaBreached && lead.status !== LeadStatus.BOOKED && lead.status !== LeadStatus.LOST);

    return (
      matchSearch &&
      matchStatus &&
      matchPriority &&
      matchSource &&
      matchProject &&
      matchAssignee &&
      matchType &&
      matchBreach
    );
  });

  const getSourceBadgeColor = (source: LeadSource) => {
    switch (source) {
      case LeadSource.META: return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case LeadSource.MISSED_CALL: return "bg-amber-500/10 text-amber-400 border border-amber-500/25 font-bold animate-pulse";
      case LeadSource.WHATSAPP: return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case LeadSource.WEBSITE: return "bg-pink-500/10 text-pink-400 border border-pink-500/20";
      case LeadSource.PORTAL: return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      default: return "bg-zinc-800 text-zinc-400 border border-zinc-700/60";
    }
  };

  const getPriorityBadgeColor = (p: Priority) => {
    switch (p) {
      case Priority.HOT: return "bg-rose-500/10 text-rose-450 border border-rose-500/20 font-bold";
      case Priority.WARM: return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case Priority.NURTURE: return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      default: return "bg-zinc-805 text-zinc-500 border border-zinc-700/50";
    }
  };

  const getStatusBadgeColor = (s: LeadStatus) => {
    switch (s) {
      case LeadStatus.NEW: return "bg-red-500/10 text-red-400 border border-red-500/20 border";
      case LeadStatus.CONTACTED: return "bg-zinc-800 text-zinc-350 border border-zinc-750 border";
      case LeadStatus.QUALIFIED: return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium border";
      case LeadStatus.SITE_VISIT_SCHEDULED: return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium border";
      case LeadStatus.SITE_VISITED: return "bg-purple-500/10 text-purple-400 border border-purple-500/20 border";
      case LeadStatus.BOOKED: return "bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 font-bold border";
      case LeadStatus.LOST: return "bg-zinc-800 text-zinc-550 border border-zinc-700/60 border line-through";
      default: return "bg-zinc-800 text-zinc-300 border border-zinc-750 border";
    }
  };

  const handleQuickAssign = async (leadId: string, assigneeId: string) => {
    await assignLead(leadId, assigneeId);
    setActiveAssignLeadId(null);
  };

  const handleScheduleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisitLeadId) return;

    const lead = leads.find((l) => l.id === activeVisitLeadId);
    if (!lead) return;

    await scheduleSiteVisit({
      lead_id: activeVisitLeadId,
      project_id: lead.project_id,
      preferred_date: preferredDate || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0]!,
      preferred_time: preferredTime || "11:00",
      visitors_count: Number(visitorsCount),
      family_attending: familyAttending,
      needs_directions: true,
      buyer_location: buyerLocation || "Pune Local",
      status: SiteVisitStatus.CONFIRMED,
      reminder_status: "PENDING",
    });

    // Reset Form
    setActiveVisitLeadId(null);
    setPreferredDate("");
    setPreferredTime("");
    setVisitorsCount(2);
    setFamilyAttending(true);
    setBuyerLocation("");
  };

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const values = new FormData(form);
    const projectId = String(values.get("project_id") ?? "");
    if (!projectId) {
      return;
    }
    const optionalNumber = (name: string) => {
      const value = String(values.get(name) ?? "").trim();
      return value ? Number(value) : undefined;
    };
    const receivedAt = String(values.get("received_at") ?? "").trim();
    try {
      const result = await addExternalIntake({
        buyer_name: String(values.get("buyer_name") ?? ""),
        phone: String(values.get("phone") ?? ""),
        email: String(values.get("email") ?? ""),
        project_id: projectId,
        budget_text: String(values.get("budget_text") ?? ""),
        budget_min: optionalNumber("budget_min"),
        budget_max: optionalNumber("budget_max"),
        purchase_timeline: values.get("purchase_timeline") as PurchaseTimeline,
        preferred_location: String(values.get("preferred_location") ?? ""),
        message: String(values.get("message") ?? ""),
        source: values.get("source") as LeadSource,
        campaign: String(values.get("campaign") ?? ""),
        received_at: receivedAt ? new Date(receivedAt).toISOString() : undefined,
        channel: String(values.get("channel") ?? "MANUAL_UI"),
        site_visit_request: values.get("site_visit_request") === "on",
        negotiation_intent: values.get("negotiation_intent") === "on",
        booking_intent: values.get("booking_intent") === "on",
        compliance_question: values.get("compliance_question") === "on",
        human_requested: values.get("human_requested") === "on",
        angry_or_confused: values.get("angry_or_confused") === "on",
        competitor_comparison: values.get("competitor_comparison") === "on",
      });
      setIntakeResult(
        result.outcome === "DUPLICATE"
          ? `Duplicate detected. Opened existing lead. Matches: ${result.duplicateReasons?.join(", ") ?? "existing contact"}.`
          : `Stage 3 intake created. AI status: ${result.aiStatus ?? result.lead.ai_qualification_status}.`,
      );
      form.reset();
      setShowAddLead(false);
      setSelectedLeadId(result.lead.id);
      setActivePage("detail");
    } catch {
      // apiRequest publishes the user-facing operation error through AppContext.
    }
  };

  return (
    <div className="space-y-6 select-none relative">
      {/* Top action block */}
      <div className="bg-[#121214] p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by buyer name, phone, email..."
            className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-800 rounded-lg bg-zinc-905 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:bg-zinc-850"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 hover:text-zinc-200 text-zinc-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Breach and general actions */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-xs font-semibold text-rose-400 cursor-pointer bg-rose-500/10 border border-rose-500/25 py-1.5 px-3 rounded-lg hover:bg-rose-500/20 transition-colors">
            <input
              type="checkbox"
              checked={showBreachedOnly}
              onChange={(e) => setShowBreachedOnly(e.target.checked)}
              className="rounded border-rose-500/30 text-rose-500 focus:ring-rose-500/30 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <CircleAlert className="w-3.5 h-3.5 animate-pulse" />
              SLA Breached Only
            </span>
          </label>

          <button
            onClick={() => {
              setSearch("");
              setFilterStatus("ALL");
              setFilterPriority("ALL");
              setFilterSource("ALL");
              setFilterProject("ALL");
              setFilterAssignee("ALL");
              setFilterType("ALL");
              setShowBreachedOnly(false);
            }}
            className="text-xs bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold px-3 py-2 rounded-lg transition-colors border border-zinc-700/60 cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
          {canCreateLead && (
            <button
              type="button"
              onClick={() => setShowAddLead((visible) => !visible)}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Lead
            </button>
          )}
        </div>
      </div>

      {showAddLead && (
        <form
          onSubmit={handleCreateLead}
          className="space-y-4 rounded-xl border border-indigo-500/25 bg-[#121214] p-5 text-xs"
        >
          <div>
            <h3 className="font-bold text-indigo-300">
              Stage 3 Manual Intake
            </h3>
            <p className="mt-1 text-zinc-500">
              This visible test flow uses the Stage 3 intake pipeline, including
              duplicate checks, AI status, deterministic scoring, timeline,
              metrics, and alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-zinc-400">
              Buyer name
              <input name="buyer_name" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" required />
            </label>
            <label className="text-zinc-400">
              Phone
              <input name="phone" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" required />
            </label>
            <label className="text-zinc-400">
              Email
              <input name="email" type="email" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
            <label className="text-zinc-400">
              Project
              <select name="project_id" aria-label="Project" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" required>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-zinc-400">
              Budget minimum (INR)
              <input name="budget_min" type="number" min="0" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
            <label className="text-zinc-400">
              Budget maximum (INR)
              <input name="budget_max" type="number" min="0" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
            <label className="text-zinc-400">
              Budget description
              <input name="budget_text" placeholder="Example: 1.2 to 1.5 crore" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
            <label className="text-zinc-400">
              Purchase timeline
              <select name="purchase_timeline" aria-label="Purchase timeline" defaultValue={PurchaseTimeline.UNKNOWN} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100">
                {Object.values(PurchaseTimeline).map((timeline) => (
                  <option key={timeline} value={timeline}>{timeline.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-zinc-400">
              Source
              <select name="source" aria-label="Source" defaultValue={LeadSource.MANUAL} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100">
                {Object.values(LeadSource).map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </label>
            <label className="text-zinc-400">
              Channel
              <select name="channel" aria-label="Channel" defaultValue="MANUAL_UI" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100">
                <option value="MANUAL_UI">MANUAL UI</option>
                <option value="WEBSITE_FORM">WEBSITE FORM</option>
                <option value="WEBHOOK">WEBHOOK SIMULATION</option>
                <option value="EMAIL">EMAIL</option>
                <option value="PHONE">PHONE</option>
              </select>
            </label>
            <label className="text-zinc-400">
              Campaign
              <input name="campaign" placeholder="Campaign or form name" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
            <label className="text-zinc-400">
              Received time
              <input name="received_at" type="datetime-local" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-zinc-400">
              Preferred location
              <input name="preferred_location" placeholder="Example: Pune" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
            <label className="text-zinc-400">
              Enquiry message
              <textarea name="message" rows={3} placeholder="Buyer enquiry, requirements, questions, or intent" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100" />
            </label>
          </div>

          <fieldset className="rounded-lg border border-zinc-800 p-3">
            <legend className="px-2 font-bold text-zinc-300">
              Validated manual qualification signals
            </legend>
            <div className="grid grid-cols-1 gap-2 text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["site_visit_request", "Site visit request"],
                ["negotiation_intent", "Negotiation intent"],
                ["booking_intent", "Booking intent"],
                ["compliance_question", "Legal or RERA question"],
                ["human_requested", "Human requested"],
                ["angry_or_confused", "Angry or confused"],
                ["competitor_comparison", "Competitor comparison"],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-2">
                  <input name={name} type="checkbox" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between gap-3">
            <p className="text-zinc-500">
              If AI is unavailable, these validated inputs still feed the
              deterministic Stage 2 workflow.
            </p>
            <div className="flex gap-2">
            <button
              type="submit"
              aria-label="Create Lead"
              className="rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white"
            >
              Submit Stage 3 Intake
            </button>
            <button
              type="button"
              onClick={() => setShowAddLead(false)}
              className="px-2 py-2 text-zinc-400"
            >
              Cancel
            </button>
            </div>
          </div>
        </form>
      )}

      {intakeResult && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
          {intakeResult}
        </div>
      )}

      {/* Grid Filter Panel */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-[#121214] p-4 rounded-xl border border-zinc-800 text-xs">
        {/* Status */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-400 font-mono text-[10px] uppercase">Lead Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-zinc-900 font-semibold text-zinc-300 py-1.5 px-2 border border-zinc-805 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="ALL">All Statuses</option>
            {Object.values(LeadStatus).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-400 font-mono text-[10px] uppercase">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full bg-zinc-900 font-semibold text-zinc-300 py-1.5 px-2 border border-zinc-805 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="ALL">All Priorities</option>
            {Object.values(Priority).map((pr) => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>
        </div>

        {/* Channel Source */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-400 font-mono text-[10px] uppercase">Source Channel</label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="w-full bg-zinc-900 font-semibold text-zinc-300 py-1.5 px-2 border border-zinc-805 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="ALL">All Channels</option>
            {Object.values(LeadSource).map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>

        {/* Project Context */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-400 font-mono text-[10px] uppercase">RERA Project</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full bg-zinc-900 font-semibold text-zinc-300 py-1.5 px-2 border border-zinc-805 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="ALL">All Projects</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>
        </div>

        {/* Assignee Executive */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-400 font-mono text-[10px] uppercase">Sales Rep</label>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="w-full bg-zinc-900 font-semibold text-zinc-300 py-1.5 px-2 border border-zinc-805 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="ALL">All Executives</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {users.map((usr) => (
              <option key={usr.id} value={usr.id}>{usr.name}</option>
            ))}
          </select>
        </div>

        {/* Buyer Type */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-400 font-mono text-[10px] uppercase">Buyer Persona</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-zinc-900 font-semibold text-zinc-300 py-1.5 px-2 border border-zinc-805 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="ALL">All Personas</option>
            {Object.values(BuyerType).map((bt) => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="bg-[#121214] rounded-xl border border-zinc-800 shadow-lg overflow-hidden flex flex-col">
        {/* Results Counter Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-zinc-400 font-mono uppercase">
            Showing <span className="text-indigo-400 font-black">{filteredLeads.length}</span> out of {leads.length} Platform Leads
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">Click row to view profile</span>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-mono font-medium uppercase text-[10px] bg-zinc-900/40">
                <th className="py-3 px-4">Lead Name / Contact</th>
                <th>Channel</th>
                <th>Project Context</th>
                <th>Buyer Type</th>
                <th>Apartment & Budget</th>
                <th className="text-center">Score</th>
                <th>Priority</th>
                <th>SLA Deadline</th>
                <th>Status</th>
                <th>Assigned Rep</th>
                <th className="text-right px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-500">
                    <UserCheck className="w-12 h-12 mx-auto text-zinc-700 stroke-1 mb-2" />
                    <p className="font-bold text-zinc-405">No Leads Found matching those active filters.</p>
                    <p className="text-xs mt-1 text-zinc-600">Try resetting the filters or add a lead through an authenticated intake flow.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const proj = projects.find((p) => p.id === lead.project_id);
                  const assignee = users.find((u) => u.id === lead.assigned_to);
                  const isSlaBreached = lead.sla_deadline && new Date(lead.sla_deadline).getTime() < Date.now();
                  const duplicateIntake = intakeEvents.some(
                    (event) =>
                      event.duplicate_of_lead_id === lead.id &&
                      event.processing_status === "DUPLICATE",
                  );
                  
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-850/30 transition-all cursor-pointer group"
                      onClick={(e) => {
                        // Prevent row click if clicking action button elements
                        const target = e.target as HTMLElement;
                        if (target.closest(".action-element")) return;
                        setSelectedLeadId(lead.id);
                        setActivePage("detail");
                      }}
                    >
                      {/* Name profile */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-200 leading-tight flex items-center gap-1.5">
                          {lead.name}
                          {lead.isAfterHours && (
                            <span className="text-[8px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1 rounded font-mono font-bold uppercase shrink-0">
                              AfterHrs
                            </span>
                          )}
                          {duplicateIntake && (
                            <span className="shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-1 text-[8px] font-bold uppercase text-amber-300">
                              Duplicate
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-550 font-mono tracking-tight mt-0.5">{lead.phone} • {lead.email}</div>
                      </td>

                      {/* Source */}
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] border font-semibold font-mono uppercase tracking-wider ${getSourceBadgeColor(lead.source)}`}>
                          {lead.source}
                        </span>
                        <span
                          className={`mt-1 block text-[8px] font-bold uppercase ${
                            lead.ai_qualification_status === "COMPLETED"
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }`}
                        >
                          AI {lead.ai_qualification_status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Project */}
                      <td>
                        <div className="text-zinc-300 font-bold max-w-[120px] truncate">{proj?.name || "Unknown"}</div>
                        <div className="text-[9px] text-zinc-500 font-mono">{proj?.location || ""}</div>
                      </td>

                      {/* Buyer Type */}
                      <td>
                        <span className="text-zinc-450 font-mono text-[10px] uppercase font-semibold">
                          {lead.buyer_type.replace("_", " ")}
                        </span>
                      </td>

                      {/* Preference & Budget */}
                      <td>
                        <div className="text-zinc-355 font-bold text-zinc-300">{lead.apartment_preference}</div>
                        <div className="text-[10px] text-indigo-400 font-mono font-bold">
                          {formatPriceRange(lead.budget_min, lead.budget_max)}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="text-center">
                        <span className="font-mono bg-indigo-550/10 text-indigo-400 px-1.5 py-0.5 rounded-md font-extrabold text-xs border border-indigo-500/20 shadow-2xs">
                          {lead.score.toFixed(1)}
                        </span>
                      </td>

                      {/* Priority */}
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] border uppercase ${getPriorityBadgeColor(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      </td>

                      {/* SLA */}
                      <td>
                        {lead.sla_deadline && lead.status !== LeadStatus.BOOKED && lead.status !== LeadStatus.LOST ? (
                          <div className={`flex items-center gap-0.5 font-mono text-[10px] ${isSlaBreached ? "text-rose-455 font-bold animate-pulse" : "text-emerald-405 font-bold"}`}>
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>
                              {isSlaBreached ? "BREACHED" : new Date(lead.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-550 font-mono text-[10px]">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] border font-bold ${getStatusBadgeColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td>
                        <div className="text-zinc-300 max-w-[100px] truncate font-semibold">
                          {assignee ? assignee.name : (
                            <span className="text-[10px] text-amber-400 bg-amber-550/10 border border-amber-500/20 rounded px-1.5 py-0.5 font-mono font-bold uppercase animate-pulse">
                              Pending
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions row */}
                      <td className="px-4 text-right action-element">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Assign button */}
                          <button
                            onClick={() => setActiveAssignLeadId(lead.id)}
                            className="p-1 px-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-705 text-zinc-300 rounded-md transition-colors font-bold text-[10px] cursor-pointer flex items-center gap-1"
                            title="Assign to executive"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden xl:inline">Assign</span>
                          </button>

                          {/* Site Visit schedule button */}
                          <button
                            onClick={() => {
                              setActiveVisitLeadId(lead.id);
                              
                              // Set default date range for visit scheduler
                              const someDate = new Date();
                              someDate.setDate(someDate.getDate() + 3);
                              setPreferredDate(someDate.toISOString().split("T")[0]!);
                              setPreferredTime("11:00");
                            }}
                            className="p-1 px-1.5 bg-zinc-800 hover:bg-emerald-600/10 hover:text-emerald-400 hover:border-emerald-500/20 border border-zinc-705 text-zinc-300 rounded-md transition-colors font-bold text-[10px] cursor-pointer flex items-center gap-1"
                            title="Schedule physical site visit"
                          >
                            <Calendar className="w-3.5 h-3.5 text-emerald-405" />
                            <span className="hidden xl:inline">Visit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK ASSIGN EXECUTIVE CONNOTATIVE OVERLAY PANEL */}
      {activeAssignLeadId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#121214] rounded-xl shadow-2xl border border-zinc-800 w-full max-w-md p-6 relative">
            <button
              onClick={() => setActiveAssignLeadId(null)}
              className="absolute right-4 top-4 hover:bg-zinc-800 p-1 rounded-full text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-zinc-100 text-md flex items-center gap-1.5">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              Assign Sales Executive Advisor
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select an active advisor. Assigning a lead generates an immediate 10-minute SLA countdown and follow-up callback dispatch.
            </p>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
              {users
                .filter((r) => r.role === "EXECUTIVE")
                .map((usr) => {
                  const lead = leads.find((l) => l.id === activeAssignLeadId);
                  const isAssigned = lead?.assigned_to === usr.id;
                  
                  return (
                    <button
                      key={usr.id}
                      onClick={() => void handleQuickAssign(activeAssignLeadId, usr.id)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                        isAssigned
                          ? "bg-indigo-950/20 border-indigo-500 ring-1 ring-indigo-500"
                          : "border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-zinc-200">{usr.name}</div>
                        <div className="text-[10px] text-zinc-550 mt-1">Project assignments: {usr.project_assignments.map(id => projects.find(p=>p.id===id)?.name).join(", ")}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold border border-zinc-850">
                          Cap: {usr.max_hot_leads_per_day} hot/day
                        </span>
                        {isAssigned && (
                          <div className="text-indigo-400 font-bold text-[10px] uppercase mt-1">★ Currently Assigned</div>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveAssignLeadId(null)}
                className="text-xs text-zinc-400 hover:text-zinc-250 font-bold px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE SITE VISIT OVERLAY FORM MODAL */}
      {activeVisitLeadId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#121214] rounded-xl shadow-2xl border border-zinc-800 w-full max-w-lg p-6 relative">
            <button
              onClick={() => setActiveVisitLeadId(null)}
              className="absolute right-4 top-4 hover:bg-zinc-800 p-1 rounded-full text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="font-bold text-zinc-100 text-md flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Schedule Site Visit
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Input visitor constraints. The visit and lead status are persisted; external reminders are Not available.
            </p>

            <form onSubmit={handleScheduleVisitSubmit} className="mt-4 space-y-4 text-xs font-semibold text-zinc-300">
              {/* Project display info */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Target Project</span>
                  <div className="font-bold text-zinc-200 mt-0.5">
                    {projects.find((p) => p.id === leads.find((l) => l.id === activeVisitLeadId)?.project_id)?.name}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Buyer Target</span>
                  <div className="font-bold text-zinc-200 mt-0.5">
                    {leads.find((l) => l.id === activeVisitLeadId)?.name}
                  </div>
                </div>
              </div>

              {/* Grid Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-zinc-400">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-zinc-400">Preferred Time</label>
                  <input
                    type="time"
                    required
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none"
                  />
                </div>
              </div>

              {/* Visitors & Attending */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-zinc-400">Visitors Count</label>
                  <select
                    value={visitorsCount}
                    onChange={(e) => setVisitorsCount(Number(e.target.value))}
                    className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-200 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Visitors</option>)}
                  </select>
                </div>
                <div className="flex flex-col space-y-2 justify-end pb-1.5">
                  <label className="flex items-center space-x-2 text-zinc-350 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={familyAttending}
                      onChange={(e) => setFamilyAttending(e.target.checked)}
                      className="rounded border-zinc-800 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 bg-zinc-900 focus:outline-none"
                    />
                    <span>Family Attending</span>
                  </label>
                </div>
              </div>

              {/* Location */}
              <div className="flex flex-col space-y-1">
                <label className="text-zinc-400">Buyer Current Location (For Cab dispatch)</label>
                <input
                  type="text"
                  placeholder="e.g. Baner, Pune or Outstation / Airport"
                  value={buyerLocation}
                  onChange={(e) => setBuyerLocation(e.target.value)}
                  className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2 border-t border-zinc-850 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveVisitLeadId(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-205 font-bold px-4 py-2 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Confirm Saturday visit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
