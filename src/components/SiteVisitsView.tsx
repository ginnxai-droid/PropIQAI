import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { SiteVisitStatus } from "../types";
import {
  CalendarDays,
  Building,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  MapPin,
} from "lucide-react";

export const SiteVisitsView: React.FC = () => {
  const { siteVisits, leads, projects, users, updateSiteVisitStatus } = useApp();

  const [filterVisitStatus, setFilterVisitStatus] = useState<string>("ALL");
  const [outcomeNotes, setOutcomeNotes] = useState<{ [key: string]: string }>({});
  const [activeNoteEditId, setActiveNoteEditId] = useState<string | null>(null);

  const getStatusStyle = (st: SiteVisitStatus) => {
    switch (st) {
      case SiteVisitStatus.REQUESTED: return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case SiteVisitStatus.CONFIRMED: return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse";
      case SiteVisitStatus.COMPLETED: return "bg-emerald-500/10 text-emerald-400 border border-emerald-555/20 font-bold";
      case SiteVisitStatus.MISSED: return "bg-rose-500/10 text-rose-455 border border-rose-500/20";
      case SiteVisitStatus.CANCELLED: return "bg-zinc-800 text-zinc-500 line-through border border-zinc-700/60";
      default: return "bg-zinc-800 text-zinc-300 border border-zinc-700/60";
    }
  };

  const handleUpdateStatus = (visitId: string, status: SiteVisitStatus) => {
    updateSiteVisitStatus(visitId, status);
  };

  const handleSaveNotes = (visitId: string) => {
    const rawNotes = outcomeNotes[visitId] || "";
    const visitObj = siteVisits.find(v => v.id === visitId);
    if (visitObj) {
      visitObj.outcome = rawNotes;
    }
    setActiveNoteEditId(null);
  };

  const filteredVisits = siteVisits.filter(v => {
    if (filterVisitStatus === "ALL") return true;
    return v.status === filterVisitStatus;
  });

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto">
      
      {/* Upper overview box */}
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-805 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-zinc-150 text-base flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            Physical Site Visit Operations Console
          </h3>
          <p className="text-xs text-zinc-400 mt-1 pb-0.5">
            Indian buyers buy when they touch the brick. Standardize weekend schedules, direction GPS links, and reminder sequences.
          </p>
        </div>

        {/* Quick status selection filters */}
        <div className="flex items-center space-x-2.5 text-xs">
          <span className="font-semibold text-zinc-400">Filter Status:</span>
          <select
            value={filterVisitStatus}
            onChange={(e) => setFilterVisitStatus(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 focus:outline-none font-semibold text-zinc-200"
          >
            <option value="ALL">All Visits</option>
            {Object.values(SiteVisitStatus).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of site visits */}
      <div className="space-y-4">
        {filteredVisits.length === 0 ? (
          <div className="bg-[#121214] p-12 text-center rounded-xl border border-dashed border-zinc-800 text-zinc-500 font-semibold text-xs animate-fade-in">
            <CalendarDays className="w-12 h-12 text-zinc-700 mx-auto mb-2 font-light" />
            <p className="text-zinc-300">No site visits scheduled under selected filters.</p>
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const lead = leads.find(l => l.id === visit.lead_id);
            const project = projects.find(p => p.id === visit.project_id);
            const assignee = lead && users.find(u => u.id === lead.assigned_to);

            return (
              <div key={visit.id} className="bg-[#121214] rounded-xl border border-zinc-805 shadow-md overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-805/60">
                
                {/* Left profile section */}
                <div className="p-5 lg:w-1/3 flex flex-col justify-between shrink-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold uppercase">
                        {visit.id.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${getStatusStyle(visit.status)}`}>
                        {visit.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-zinc-200 text-sm leading-tight">{lead?.name || "Unknown Buyer"}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{lead?.phone}</p>
                    </div>

                    <div className="text-xs space-y-1.5 text-zinc-350 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-zinc-200 font-bold">{project?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{project?.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-sans">
                        <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-indigo-400 font-bold">{visit.preferred_date} @ {visit.preferred_time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-805 pt-3.5 mt-4 text-[11px] text-zinc-500 font-bold">
                    Assigned Rep: <span className="text-zinc-350">{assignee?.name || "Pending Selection"}</span>
                  </div>
                </div>

                {/* Center details section */}
                <div className="p-5 flex-1 space-y-4">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono font-semibold">Visit Requirements & Custom Notes</span>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                      <span className="block text-[10px] text-zinc-500 font-mono">Head Count</span>
                      <span className="font-extrabold text-zinc-200">{visit.visitors_count} Attendees</span>
                    </div>
                    <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                      <span className="block text-[10px] text-zinc-500 font-mono">Cab Facility</span>
                      <span className="font-bold text-zinc-200 text-[11px]">
                        {visit.buyer_location ? `Dispatch Code (${visit.buyer_location.split(",")[0]})` : "Self Drive"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                      <span className="block text-[10px] text-zinc-500 font-mono">Companion</span>
                      <span className="font-extrabold text-zinc-200">{visit.family_attending ? "Yes, Attending" : "Single Buyer"}</span>
                    </div>
                    <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 font-sans">
                      <span className="block text-[10px] text-zinc-500 font-mono">Direction Pin</span>
                      <span className="font-bold text-emerald-400 block truncate" title="Pin Sent">Sent on WhatsApp</span>
                    </div>
                  </div>

                  {/* Outcome Notes */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono font-semibold">Post-Visit Log Notes</span>
                    {activeNoteEditId === visit.id ? (
                      <div className="flex gap-2">
                        <textarea
                          placeholder="Log notes (e.g. 'Highly interested in tower B high floor. Looking for bank loans')"
                          value={outcomeNotes[visit.id] || visit.outcome || ""}
                          onChange={(e) => setOutcomeNotes({ ...outcomeNotes, [visit.id]: e.target.value })}
                          className="flex-1 text-xs border border-zinc-800 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 bg-zinc-900 text-zinc-100 placeholder-zinc-650"
                          rows={2}
                        />
                        <div className="flex flex-col gap-1.5 shrink-0 justify-end">
                          <button
                            onClick={() => handleSaveNotes(visit.id)}
                            className="bg-emerald-600 text-white rounded px-2.5 py-1 text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setActiveNoteEditId(null)}
                            className="bg-zinc-800 text-zinc-300 rounded px-2.5 py-1 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setActiveNoteEditId(visit.id);
                          setOutcomeNotes({ ...outcomeNotes, [visit.id]: visit.outcome || "" });
                        }}
                        className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-lg text-zinc-400 text-xs italic cursor-pointer min-h-12 flex items-center justify-between group transition-colors"
                      >
                        <span>{visit.outcome ? `"${visit.outcome}"` : "Click here to record client interest, layout choices, or pricing objections logged during visit..."}</span>
                        <FileText className="w-4 h-4 text-zinc-550 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Interactive operations queue panel */}
                <div className="p-5 lg:w-1/4 shrink-0 flex flex-col justify-between space-y-4">
                  <div className="space-y-1 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-805 text-[11px] font-semibold text-zinc-400">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold mb-1 font-mono">WhatsApp Reminder Schedule</span>
                    <div className="flex items-center justify-between text-emerald-430">
                      <span>✓ Confirmation (SMS)</span>
                      <span className="font-mono text-[9px] font-bold">Sent</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>• T-24h (WhatsApp Reminder)</span>
                      <span className="font-mono text-[9px]">Pending</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>• T-2h (Direction GPS & Cab)</span>
                      <span className="font-mono text-[9px]">Pending</span>
                    </div>
                  </div>

                  {/* Actions status line toggles */}
                  <div className="space-y-1.5 font-sans">
                    <span className="text-[9px] text-zinc-550 uppercase tracking-wider block font-semibold font-mono">Change Status Line</span>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        onClick={() => handleUpdateStatus(visit.id, SiteVisitStatus.COMPLETED)}
                        className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 text-[10px] font-bold p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Completed</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(visit.id, SiteVisitStatus.MISSED)}
                        className="flex-1 bg-rose-500/10 text-rose-455 border border-rose-500/20 hover:bg-rose-600/30 text-[10px] font-bold p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Missed</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleUpdateStatus(visit.id, SiteVisitStatus.CANCELLED)}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-bold py-1.5 rounded transition-colors cursor-pointer border border-zinc-750"
                    >
                      ✗ Cancel Schedule Group
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
