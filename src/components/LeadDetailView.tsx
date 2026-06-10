import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Sparkles,
  Phone,
  Mail,
  Building,
  Clock,
  Compass,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  CalendarDays,
  Send,
  UserCheck,
  Tag,
} from "lucide-react";
import {
  BuyerType,
  HandoffReason,
  LeadStatus,
  Priority,
  PurchaseTimeline,
} from "../types";

export const LeadDetailView: React.FC = () => {
  const {
    selectedLeadId,
    leads,
    projects,
    users,
    conversations,
    handoffs,
    siteVisits,
    tasks,
    addConversationMessage,
    updateLeadStatus,
    updateLead,
    createHandoff,
    activeRole,
    setActivePage,
  } = useApp();

  const [manualText, setManualText] = useState("");

  // Handler if no lead is selected
  if (!selectedLeadId) {
    return (
      <div className="bg-[#121214] rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500 max-w-2xl mx-auto my-12 animate-fade-in select-none">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-md font-bold text-zinc-100">Select a Lead to review qualification</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
          Open the Unified Lead Inbox or Dashboard list to review a hot lead take-over files, AI summary context, objections logs, and live chats.
        </p>
      </div>
    );
  }

  const lead = leads.find((l) => l.id === selectedLeadId);
  if (!lead) {
    return <div className="p-4 text-rose-500 font-bold bg-[#121214] border border-zinc-800 rounded-xl">Lead record not found.</div>;
  }

  const project = projects.find((p) => p.id === lead.project_id);
  const assignee = users.find((u) => u.id === lead.assigned_to);
  const conversation = conversations.find((c) => c.lead_id === lead.id);
  const activeVisits = siteVisits.filter((v) => v.lead_id === lead.id);
  const activeHandoff = handoffs.find(
    (handoff) =>
      handoff.lead_id === lead.id &&
      ["PENDING", "CONTACTED", "ESCALATED"].includes(handoff.status),
  );
  const canCreateHandoff = activeRole !== "EXECUTIVE";

  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return `INR ${(val / 10000000).toFixed(2)} Crore`;
    }
    return `INR ${(val / 100000).toFixed(0)} Lakhs`;
  };

  const isSlaBreached = lead.sla_deadline && new Date(lead.sla_deadline).getTime() < Date.now();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    // Send message to visual transcript
    await addConversationMessage(lead.id, "human", manualText);
    setManualText("");

    // Automatically transition to CONTACTED if logging manual action
    if (lead.status === LeadStatus.NEW) {
      await updateLeadStatus(lead.id, LeadStatus.CONTACTED);
    }
  };

  const handleQualificationUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const score = Number(values.get("score"));
    await updateLead(lead.id, {
      buyer_type: values.get("buyer_type") as BuyerType,
      apartment_preference: String(values.get("apartment_preference") ?? ""),
      budget_min: Number(values.get("budget_min")),
      budget_max: Number(values.get("budget_max")),
      purchase_timeline: values.get("purchase_timeline") as PurchaseTimeline,
      site_visit_interest: values.get("site_visit_interest") === "on",
      score,
      priority:
        score >= 8
          ? Priority.HOT
          : score >= 6
            ? Priority.WARM
            : score >= 4
              ? Priority.NURTURE
              : Priority.COLD,
      recommended_next_action: String(
        values.get("recommended_next_action") ?? "",
      ),
    });
  };

  const handleHandoffCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const deadline = String(values.get("sla_deadline"));
    await createHandoff({
      lead_id: lead.id,
      assigned_to: String(values.get("assigned_to")),
      reason: values.get("reason") as HandoffReason,
      priority: lead.priority,
      sla_deadline: new Date(deadline).toISOString(),
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 select-none max-w-[1600px] mx-auto">
      
      {/* COLUMN 1: Profile Details */}
      <div className="space-y-6 xl:col-span-1">
        {/* Profile Card */}
        <div className="bg-[#121214] rounded-xl border border-zinc-800 shadow-md p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-center flex items-center justify-center shadow-lg shadow-indigo-505/10">
              <span className="text-lg">{lead.name.trim().charAt(0) || "?"}</span>
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-150 text-base flex items-center gap-1.5">
                {lead.name}
              </h3>
              <p className="text-[11px] font-mono font-medium text-zinc-500">{lead.id.toUpperCase()} • PILOT INGEST</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-zinc-350 font-semibold border-t border-zinc-800/80 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Phone Contact</span>
              <span className="text-zinc-200 font-mono tracking-normal flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                <Phone className="w-3 h-3 text-zinc-500" />
                {lead.phone}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Email Box</span>
              <span className="text-zinc-200 font-mono truncate max-w-[170px] flex items-center gap-1">
                <Mail className="w-3 h-3 text-zinc-500" />
                {lead.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Lead Source</span>
              <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 border border-indigo-500/20 rounded-full font-mono text-[9px] uppercase tracking-wider font-extrabold">
                {lead.source}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800/50 pt-2.5">
              <span className="text-zinc-500">RERA Project</span>
              <span className="text-zinc-200 flex items-center gap-1 font-bold">
                <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                {project?.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Buyer Type</span>
              <span className="text-zinc-300 font-mono text-[10px] uppercase font-bold">
                {lead.buyer_type.replace("_", " ")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Apart Preference</span>
              <span className="text-zinc-200 bg-zinc-900 px-2 py-0.5 rounded font-bold border border-zinc-850">{lead.apartment_preference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Target Budget</span>
              <span className="text-indigo-400 font-bold font-mono">
                {formatCurrency(lead.budget_max)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Time to Purchase</span>
              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded">
                {lead.purchase_timeline.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Score and Priority Panel */}
        <div className="bg-[#121214] rounded-xl border border-zinc-800 shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-550 font-mono font-medium uppercase">Qualification Rating</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-3xl font-black text-indigo-400 font-mono leading-none">{lead.score.toFixed(1)}</span>
              <span className="text-xs text-zinc-500 font-bold">/ 10</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-555 font-mono font-medium uppercase">Process Priority</span>
            <div className="mt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border block ${
                lead.priority === Priority.HOT
                  ? "bg-rose-500/10 text-rose-450 border-rose-505/20"
                  : lead.priority === Priority.WARM
                  ? "bg-amber-500/10 text-amber-400 border-amber-505/20"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
              }`}>
                {lead.priority} PRIORITY
              </span>
            </div>
          </div>
        </div>

        <form
          key={`qualification-${lead.id}`}
          onSubmit={handleQualificationUpdate}
          className="space-y-3 rounded-xl border border-zinc-800 bg-[#121214] p-5 text-xs"
        >
          <h4 className="font-bold uppercase tracking-wider text-zinc-300">
            Qualification Details
          </h4>
          <label className="block text-zinc-400">
            Buyer type
            <select
              name="buyer_type"
              defaultValue={lead.buyer_type}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
            >
              {Object.values(BuyerType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="block text-zinc-400">
            Apartment preference
            <input
              name="apartment_preference"
              defaultValue={lead.apartment_preference}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-zinc-400">
              Budget minimum
              <input
                name="budget_min"
                type="number"
                min="0"
                defaultValue={lead.budget_min}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
              />
            </label>
            <label className="text-zinc-400">
              Budget maximum
              <input
                name="budget_max"
                type="number"
                min="0"
                defaultValue={lead.budget_max}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
              />
            </label>
          </div>
          <label className="block text-zinc-400">
            Purchase timeline
            <select
              name="purchase_timeline"
              defaultValue={lead.purchase_timeline}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
            >
              {Object.values(PurchaseTimeline).map((timeline) => (
                <option key={timeline} value={timeline}>{timeline}</option>
              ))}
            </select>
          </label>
          <label className="block text-zinc-400">
            Qualification score
            <input
              name="score"
              type="number"
              min="1"
              max="10"
              step="0.1"
              defaultValue={lead.score}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
            />
          </label>
          <label className="flex items-center gap-2 text-zinc-400">
            <input
              name="site_visit_interest"
              type="checkbox"
              defaultChecked={lead.site_visit_interest}
            />
            Interested in a site visit
          </label>
          <label className="block text-zinc-400">
            Recommended next action
            <textarea
              name="recommended_next_action"
              defaultValue={lead.recommended_next_action}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
              rows={2}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white"
          >
            Save Qualification
          </button>
        </form>

        {/* Action Controls for Status */}
        <div className="bg-[#121214] rounded-xl border border-zinc-800 shadow-sm p-5 space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono mb-2">Executive Lead Status Action</h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Status updates */}
            <button
              onClick={() => void updateLeadStatus(lead.id, LeadStatus.QUALIFIED)}
              className={`p-2 border rounded-lg font-bold transition-all cursor-pointer ${
                lead.status === LeadStatus.QUALIFIED
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                  : "border-zinc-800 hover:bg-zinc-850/60 text-zinc-300"
              }`}
            >
              Mark Qualified
            </button>
            <button
              onClick={() => void updateLeadStatus(lead.id, LeadStatus.CONTACTED)}
              className={`p-2 border rounded-lg font-bold transition-all cursor-pointer ${
                lead.status === LeadStatus.CONTACTED
                  ? "bg-indigo-500/15 border-indigo-505/50 text-indigo-400"
                  : "border-zinc-800 hover:bg-zinc-850/60 text-zinc-300"
              }`}
            >
              Mark Contacted
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => void updateLeadStatus(lead.id, LeadStatus.BOOKED)}
              className="p-2 border border-emerald-500/30 hover:bg-emerald-600/20 hover:text-emerald-400 rounded-lg font-bold transition-all cursor-pointer bg-emerald-500/10 text-emerald-500"
            >
              ★ Mark Booked
            </button>
            <button
              onClick={() => void updateLeadStatus(lead.id, LeadStatus.LOST)}
              className="p-2 border border-rose-500/30 hover:bg-rose-600/20 hover:text-rose-450 rounded-lg font-bold transition-all cursor-pointer bg-rose-500/10 text-rose-500"
            >
              ✗ Move to Lost
            </button>
          </div>
        </div>
      </div>

      {/* COLUMN 2 & 3: Chat Timeline & AI Insights */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Handoff process warning if SLA active */}
        {lead.sla_deadline && lead.status !== LeadStatus.BOOKED && lead.status !== LeadStatus.LOST && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            isSlaBreached
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400 font-semibold"
              : "bg-indigo-500/10 border-indigo-505/20 text-indigo-400 font-semibold"
          }`}>
            <div className="flex items-center space-x-2.5">
              <AlertCircle className={`w-4 h-4 shrink-0 ${isSlaBreached ? "text-rose-400 animate-bounce" : "text-indigo-400"}`} />
              <div>
                <span className="font-extrabold">{isSlaBreached ? "SLA BREACH ALERT: " : "Human Takeover Timer SLA (Active): "}</span>
                <span className="opacity-90">
                  {isSlaBreached
                    ? "Hot lead response deadline is breached. Manager notified for escalation sequence."
                    : `Must trigger manual contact response callback before the high-priority deadline.`}
                </span>
              </div>
            </div>
            <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[10px] font-bold">
              {isSlaBreached ? "ESCALATED" : new Date(lead.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* AI INTEL SUMMARY WIDGET */}
        <div className="bg-[#16121f] border border-purple-500/20 rounded-xl p-5 shadow-sm relative">
          <div className="absolute top-2.5 right-3 flex items-center space-x-1 bg-purple-550/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 font-mono text-[9px] font-extrabold uppercase shrink-0">
            <Sparkles className="w-3 h-3 text-purple-400 fill-purple-500/20" />
            <span>AI Qualification Intel Summary</span>
          </div>

          <h4 className="font-extrabold text-purple-400 text-xs uppercase tracking-widest font-mono mb-2">Intelligent Synthesis</h4>
          
          <div className="space-y-3.5 text-xs text-zinc-300">
            {lead.ai_summary ? (
              <p className="italic text-zinc-300 pl-3 border-l-2 border-purple-500/40 text-xs leading-relaxed">
                "{lead.ai_summary}"
              </p>
            ) : (
              <p className="text-zinc-500 italic">No AI summary generated yet for this draft lead.</p>
            )}

            {/* Questions Objections and Next action lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-purple-500/10">
              <div className="space-y-1">
                <span className="block font-extrabold text-[10px] text-purple-400 uppercase tracking-widest font-mono">Objections Logged</span>
                {lead.objections && lead.objections.length > 0 ? (
                  <ul className="list-disc leading-tight list-inside text-rose-350 font-bold text-[11.5px] space-y-1 pl-1">
                    {lead.objections.map((obj, i) => <li key={i}>{obj}</li>)}
                  </ul>
                ) : (
                  <span className="text-zinc-500 font-medium text-[10px] italic">No active objections logged.</span>
                )}
              </div>

              <div className="space-y-1">
                <span className="block font-extrabold text-[10px] text-purple-400 uppercase tracking-widest font-mono">Buyer Core Interests</span>
                {lead.key_questions && lead.key_questions.length > 0 ? (
                  <ul className="list-disc leading-tight list-inside text-zinc-350 text-[11px] space-y-1 pl-1">
                    {lead.key_questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                ) : (
                  <span className="text-zinc-500 font-medium text-[10px] italic">No interests detected.</span>
                )}
              </div>
            </div>

            {lead.recommended_next_action && (
              <div className="bg-[#120f1a] p-3 rounded-lg border border-purple-500/20 mt-2">
                <span className="font-extrabold text-[10px] text-purple-400 uppercase tracking-wider block font-mono">Recommended Opening Line & Pitch Hook</span>
                <p className="text-[11px] text-zinc-200 italic mt-1 font-semibold leading-relaxed">
                  "{lead.recommended_next_action}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* LOG MESSAGE CHAT CONSOLE */}
        <div className="bg-[#121214] border border-zinc-805 rounded-xl shadow-sm flex flex-col h-[400px]">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/40">
            <h4 className="font-bold text-zinc-250 text-xs flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Qualification Conversation Transcript
            </h4>
            <span className="text-[10px] bg-zinc-800 border border-zinc-850 font-mono px-2 py-0.5 rounded text-zinc-400 font-medium uppercase">
              {conversation?.channel || "WhatsApp"}
            </span>
          </div>

          {/* Transcript bubble scrolling block */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-medium text-xs bg-zinc-950/20">
            {conversation ? (
              conversation.transcript.map((msg, i) => {
                const isBuyer = msg.speaker === "buyer";
                const isAi = msg.speaker === "ai";
                
                return (
                  <div
                    key={i}
                    className={`flex flex-col max-w-[85%] ${
                      isBuyer ? "mr-auto items-start" : "ml-auto items-end"
                    }`}
                  >
                    <span className="text-[9px] text-zinc-500 font-mono mb-0.5 font-bold uppercase">
                      {isBuyer ? lead.name : isAi ? "AI ASSISTANT" : assignee?.name || "REPRESENTATIVE"} • {msg.time}
                    </span>
                    <div className={`p-3 rounded-2xl leading-relaxed text-[11px] border ${
                      isBuyer
                        ? "bg-zinc-900 text-zinc-200 border-zinc-800 rounded-bl-none"
                        : isAi
                        ? "bg-purple-950/20 text-purple-300 border-purple-500/20 rounded-br-none"
                        : "bg-indigo-650 text-white border-indigo-700 rounded-br-none"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-zinc-500 py-16">
                No active transcript loops logged. Log a manual executive message below to begin.
              </div>
            )}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex items-center gap-2 bg-zinc-900/60 shrink-0">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Log executive callback discussion text (e.g. 'Customer confirmed site visit date change')"
              className="flex-1 text-xs border border-zinc-800 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/45 placeholder-zinc-600 bg-zinc-900 text-zinc-100"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-705 text-white p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Append message to timeline log"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* SECURE HANDOFF AND COMPLIANCE SUMMARY */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="font-extrabold text-zinc-200 text-xs uppercase tracking-widest font-mono border-b border-zinc-800/80 pb-2">Human Handoff & Scheduled Milestones</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400 font-bold">
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Assigned Executive</span>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-zinc-200">{assignee?.name || "Pending Auto-Allocation"}</span>
                  <span className="text-[10px] text-zinc-500 font-mono leading-none block mt-0.5">{assignee?.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Physical Site Visit Milestone</span>
              {activeVisits.length > 0 ? (
                activeVisits.map((vis, index) => (
                  <div key={index} className="flex items-center gap-2 border border-emerald-500/10 bg-emerald-500/5 p-2 rounded-lg">
                    <CalendarDays className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-extrabold text-zinc-250">{vis.preferred_date} @ {vis.preferred_time}</span>
                      <span className="text-[10px] uppercase text-emerald-400 font-bold block mt-0.5 font-mono">STATUS: {vis.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-zinc-500 italic block font-medium">No site visit booked for this client yet. Use "Site Visits" or Lead Inbox to schedule.</span>
              )}
            </div>
          </div>
          {canCreateHandoff && (
            <form
              onSubmit={handleHandoffCreate}
              className="grid grid-cols-1 gap-3 border-t border-zinc-800 pt-4 text-xs md:grid-cols-4"
            >
              <label className="text-zinc-400">
                Handoff assignee
                <select
                  name="assigned_to"
                  defaultValue={activeHandoff?.assigned_to ?? lead.assigned_to ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
                  required
                >
                  <option value="">Select representative</option>
                  {users.filter((user) => user.active).map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-zinc-400">
                Reason
                <select
                  name="reason"
                  defaultValue={activeHandoff?.reason ?? HandoffReason.HOT_LEAD}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
                >
                  {Object.values(HandoffReason).map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>
              <label className="text-zinc-400">
                SLA deadline
                <input
                  name="sla_deadline"
                  type="datetime-local"
                  defaultValue={new Date(Date.now() + 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 16)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-100"
                  required
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white"
                >
                  {activeHandoff ? "Update Handoff" : "Create Handoff"}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
