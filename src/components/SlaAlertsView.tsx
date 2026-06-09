import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Priority, LeadStatus } from "../types";
import {
  User,
  Users,
  Timer,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export const SlaAlertsView: React.FC = () => {
  const { leads, projects, users, assignLead, setSelectedLeadId, setActivePage } = useApp();

  const [overrideLeadId, setOverrideLeadId] = useState<string | null>(null);

  // SLA breach leads logic: priority hot/warm, incomplete, deadline in the past
  const breachedLeads = leads.filter((l) => {
    if (!l.sla_deadline) return false;
    if (l.status === LeadStatus.BOOKED || l.status === LeadStatus.LOST) return false;
    return new Date(l.sla_deadline).getTime() < Date.now();
  });

  const getEscalationDetails = (dueAtStr: string) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(dueAtStr).getTime()) / 60000);
    
    // Determine escalation levels (Level 1: <15m, Level 2: 15m-30m, Level 3: 30m-60m, Level 4: >60m)
    if (elapsedMinutes < 15) {
      return {
        level: 1,
        title: "Level 1: Rep Warning",
        desc: "Automated SMS buzzer dispatched to Sales Advisor's device queue.",
        color: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
      };
    } else if (elapsedMinutes < 30) {
      return {
        level: 2,
        title: "Level 2: Manager Alerted",
        desc: "Escalated to Priya Sharma (Senior Manager) for visual tracking review.",
        color: "bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold"
      };
    } else if (elapsedMinutes < 60) {
      return {
        level: 3,
        title: "Level 3: Auto-Reassignment",
        desc: "System is re-calculating other advisors available for automatic swap routing.",
        color: "bg-rose-500/10 text-rose-450 border border-rose-500/20 font-bold"
      };
    } else {
      return {
        level: 4,
        title: "Level 4: CXO Escalate",
        desc: "Hot lead ignored over 1 hour. Pushed onto Developer Director SMS digest.",
        color: "bg-red-650/20 text-red-450 border border-red-500/30 font-black animate-pulse"
      };
    }
  };

  const handleOverideAssign = (leadId: string, userId: string) => {
    assignLead(leadId, userId);
    setOverrideLeadId(null);
  };

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      
      {/* Upper warning banner */}
      <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-xl flex items-start space-x-4">
        <div className="p-3 bg-rose-500/10 text-rose-405 rounded-lg shrink-0">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="font-extrabold text-rose-400 text-sm">Active SLA Breach Resolution Center</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            PropIQ AI tracks reply speed. Ignored hot leads can be reassigned here immediately back into rotation. This reduces lost opportunities and boosts builder confidence.
          </p>
        </div>
      </div>

      {/* Grid count table */}
      <div className="bg-[#121214] rounded-xl border border-zinc-800 shadow-lg overflow-hidden flex flex-col">
        {/* Results Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs shrink-0 font-bold">
          <span className="text-rose-400 font-mono uppercase flex items-center gap-1.5 font-bold">
            <Timer className="w-4 h-4 text-rose-520 animate-spin" />
            Active Processes Breaches ({breachedLeads.length})
          </span>
          <span className="text-zinc-500 font-medium">Re-route to auto-fix and remove from queue alerts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-mono font-medium uppercase text-[10px] bg-zinc-900/40">
                <th className="py-3 px-4">Hot Lead Owner</th>
                <th>Assigned Executive</th>
                <th>SLA Target Time</th>
                <th>Delay Elapsed</th>
                <th>Escalation Phase</th>
                <th className="text-right px-4">Manager Intervention Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {breachedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500 font-semibold">
                    <CheckCircle className="w-12 h-12 text-emerald-500/20 mx-auto mb-2" />
                    <p className="text-zinc-200">No SLA alerts active! Rep operations are working cleanly.</p>
                    <p className="text-zinc-500 text-[11px] mt-1 italic">All incoming meta and phone callback queues were processed inside target caps.</p>
                  </td>
                </tr>
              ) : (
                breachedLeads.map((lead) => {
                  const assignee = users.find(u => u.id === lead.assigned_to);
                  const proj = projects.find(p => p.id === lead.project_id);
                  const esc = getEscalationDetails(lead.sla_deadline!);
                  const delayMins = Math.floor((Date.now() - new Date(lead.sla_deadline!).getTime()) / 60000);

                  return (
                    <tr key={lead.id} className="hover:bg-zinc-850/35 transition-colors">
                      {/* Buyer */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-zinc-250">{lead.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{proj?.name} • Priority: {lead.priority}</div>
                      </td>

                      {/* Rep */}
                      <td>
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <User className="w-4 h-4 text-zinc-500" />
                          <span>{assignee?.name || "Unassigned / Pending"}</span>
                        </div>
                      </td>

                      {/* SLA Target */}
                      <td className="font-mono text-zinc-400">
                        {new Date(lead.sla_deadline!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Delay count */}
                      <td className="text-rose-455 font-bold font-mono">
                        +{delayMins} min Late
                      </td>

                      {/* Action status */}
                      <td>
                        <div className="max-w-[210px] py-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-tight block uppercase text-center ${esc.color}`}>
                            {esc.title}
                          </span>
                          <span className="text-[9px] text-zinc-500 mt-1 leading-tight font-medium block">{esc.desc}</span>
                        </div>
                      </td>

                      {/* Override Trigger */}
                      <td className="px-4 text-right">
                        {overrideLeadId === lead.id ? (
                          <div className="flex items-center space-x-1.5 justify-end">
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleOverideAssign(lead.id, e.target.value);
                              }}
                              className="text-[10px] py-1 border border-zinc-750 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/50 p-1 bg-zinc-900 text-zinc-200 font-mono"
                              defaultValue=""
                            >
                              <option value="" disabled>-- Swap rep --</option>
                              {users.filter(u=>u.role==="EXECUTIVE" && u.id !== lead.assigned_to).map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setOverrideLeadId(null)}
                              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold p-1 px-1.5 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 justify-end">
                            <button
                              onClick={() => setOverrideLeadId(lead.id)}
                              className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1.5 rounded-lg shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Intervene / Swap Rep</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedLeadId(lead.id);
                                setActivePage("detail");
                              }}
                              className="p-1 px-1.5 border border-zinc-800 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 font-bold cursor-pointer transition-colors"
                              title="Review Takeover files"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-300" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
