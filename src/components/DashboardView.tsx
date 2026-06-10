import React from "react";
import { useApp } from "../context/AppContext";
import {
  TrendingUp,
  Clock,
  PhoneCall,
  CalendarCheck,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Sparkles,
  Inbox,
  User,
} from "lucide-react";
import { Priority, LeadStatus, LeadSource } from "../types";
import { summarizeSiteVisits } from "../lib/siteVisitMetrics";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export const DashboardView: React.FC = () => {
  const { leads, siteVisits, slaEvents, projects, users, setActivePage, setSelectedLeadId } = useApp();

  // Dynamic calculations from context
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === LeadStatus.NEW).length;
  const qualifiedLeads = leads.filter((l) => l.status === LeadStatus.QUALIFIED).length;
  const hotLeads = leads.filter((l) => l.priority === Priority.HOT).length;
  
  const afterHoursLeads = leads.filter((l) => l.isAfterHours).length;
  
  const missedCallsRecovered = leads.filter(
    (l) => l.source === LeadSource.MISSED_CALL && Boolean(l.first_response_at)
  ).length;
  
  const { confirmedSiteVisits } = summarizeSiteVisits(siteVisits);

  const slaBreaches = slaEvents.filter(
    (event) =>
      event.breached ||
      (!event.completed_at && new Date(event.due_at).getTime() < Date.now()),
  ).length;

  // 1. Chart Data: Lead Status distribution
  const statusData = [
    { name: "New", count: leads.filter((l) => l.status === LeadStatus.NEW).length },
    { name: "Contacted", count: leads.filter((l) => l.status === LeadStatus.CONTACTED).length },
    { name: "Qualified", count: leads.filter((l) => l.status === LeadStatus.QUALIFIED).length },
    { name: "Visit Scheduled", count: leads.filter((l) => l.status === LeadStatus.SITE_VISIT_SCHEDULED).length },
    { name: "Visited", count: leads.filter((l) => l.status === LeadStatus.SITE_VISITED).length },
    { name: "Booked (Won)", count: leads.filter((l) => l.status === LeadStatus.BOOKED).length },
  ];

  // 2. Chart Data: Source Breakdown
  const sourceColors: Record<LeadSource, string> = {
    [LeadSource.PHONE]: "#3b82f6",
    [LeadSource.MISSED_CALL]: "#f59e0b",
    [LeadSource.WHATSAPP]: "#10b981",
    [LeadSource.WEBSITE]: "#ec4899",
    [LeadSource.META]: "#4f46e5",
    [LeadSource.GOOGLE]: "#22c55e",
    [LeadSource.EMAIL]: "#06b6d4",
    [LeadSource.PORTAL]: "#8b5cf6",
    [LeadSource.MANUAL]: "#71717a",
  };
  const sourceBreakdown = Object.values(LeadSource)
    .map((source) => ({
      name: source.replace(/_/g, " "),
      value: leads.filter((lead) => lead.source === source).length,
      color: sourceColors[source],
    }))
    .filter((source) => source.value > 0);

  const slaTrendData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dailyEvents = slaEvents.filter((event) => {
      const createdAt = new Date(event.created_at).getTime();
      return createdAt >= day.getTime() && createdAt < nextDay.getTime();
    });
    return {
      date: day.toLocaleDateString([], { month: "short", day: "numeric" }),
      TotalEvents: dailyEvents.length,
      Breached: dailyEvents.filter(
        (event) =>
          event.breached ||
          (!event.completed_at &&
            new Date(event.due_at).getTime() < Date.now()),
      ).length,
    };
  });

  // Filter 5 of "Today's Hot Leads" for quick status dashboard table
  const hotLeadsList = leads
    .filter((l) => l.priority === Priority.HOT && l.status !== LeadStatus.BOOKED && l.status !== LeadStatus.LOST)
    .slice(0, 5);

  const getSourceIconColor = (source: LeadSource) => {
    switch (source) {
      case LeadSource.META: return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case LeadSource.MISSED_CALL: return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case LeadSource.WHATSAPP: return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case LeadSource.WEBSITE: return "bg-pink-500/10 text-pink-400 border border-pink-500/20";
      default: return "bg-zinc-800 text-zinc-350 border border-zinc-700/60";
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Audience Warning Bar */}
      <div className="flex bg-indigo-950/20 border-l-2 border-indigo-500 p-4 rounded-xl items-center justify-between border border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Operational Lead Overview</h4>
            <p className="text-xs text-zinc-400 mt-1">Metrics below are calculated from persisted leads, assignments, visits, and response timestamps.</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-350 border border-indigo-500/25 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Milestone 1 Active</span>
        </div>
      </div>

      {/* Grid count stats (8 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Leads</span>
            <span className="p-1.5 bg-indigo-550/10 text-indigo-400 border border-indigo-550/20 rounded-lg">
              <Inbox className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">{totalLeads}</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center">
              Persisted
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Leads</span>
            <span className="p-1.5 bg-zinc-800 text-zinc-350 border border-zinc-700/50 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">{newLeads}</span>
            <span className="text-xs font-mono text-zinc-500 font-medium">Pending Call</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Qualified</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">{qualifiedLeads}</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
              High Intent
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hot Priority</span>
            <span className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">{hotLeads}</span>
            <span className="text-[10px] font-semibold text-rose-450 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md animate-pulse">
              Needs Handoff
            </span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">After-Hours</span>
            <span className="p-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">{afterHoursLeads}</span>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-md font-semibold">
              Captured
            </span>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Missed Calls Responded</span>
            <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
              <PhoneCall className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">{missedCallsRecovered}</span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-semibold">
              Responded
            </span>
          </div>
        </div>

        {/* Metric 7 */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirmed Site Visits</span>
            <span className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">{confirmedSiteVisits}</span>
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md font-medium">
              Persisted
            </span>
          </div>
        </div>

        {/* Metric 8 */}
        <div className="bg-rose-950/10 p-5 rounded-xl border border-rose-500/20 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-450 uppercase tracking-wider">SLA Breached</span>
            <span className="p-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-rose-400">{slaBreaches}</span>
            <span className="text-[9px] font-mono text-rose-350 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-bold text-center">
              Needs Review
            </span>
          </div>
        </div>
      </div>

      {/* Visual Recharts graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Lead funnel */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
            <h3 className="font-bold text-zinc-100 text-sm">Lead Conversion Status Funnel</h3>
            <span className="text-[10px] font-mono bg-zinc-800/60 border border-zinc-700/60 px-2 py-0.5 rounded-md text-zinc-400 font-medium">Real-Time Core Metrics</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderRadius: "8px", border: "1px solid #27272a", color: "#f4f4f5" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === statusData.length - 1 ? "#10b981" : "#4f46e5"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Source Breakdown donut */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
            <h3 className="font-bold text-zinc-100 text-sm">Lead Generation Channel Volume</h3>
            <span className="text-[10px] font-mono bg-zinc-800/60 border border-zinc-700/60 px-2 py-0.5 rounded-md text-zinc-400 font-medium">Capture Ratio</span>
          </div>
          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color === "#2563eb" ? "#4f46e5" : entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="block text-2xl font-extrabold text-white leading-none">{totalLeads}</span>
              <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider font-mono mt-1">Channel Sum</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
            {sourceBreakdown.map((s, idx) => {
              const displayColor = s.color === "#2563eb" ? "#4f46e5" : s.color;
              return (
                <div key={idx} className="flex items-center space-x-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: displayColor }} />
                  <span className="text-zinc-400 truncate font-medium">{s.name} ({s.value})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 3: SLA Breach trend */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
            <h3 className="font-bold text-zinc-100 text-sm">Follow-up Speed & Breach SLA Trend</h3>
            <span className="text-xs text-rose-450 font-mono font-bold">Current Records</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBreached" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                <XAxis dataKey="date" stroke="#52525b" fontSize={9} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Breached" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBreached)" name="Breaches" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column list: "Today's Hot Leads" */}
        <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-3 shrink-0">
            <div>
              <h3 className="font-bold text-zinc-150 text-sm flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                Today's Live Hot Leads
              </h3>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Interactive table. Click details to test lead handoff profile logs</p>
            </div>
            <button
              onClick={() => setActivePage("inbox")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>View All Inbox</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-550 font-mono font-medium uppercase text-[10px]">
                  <th className="py-2.5">Buyer Name</th>
                  <th>Source</th>
                  <th>Project Location</th>
                  <th className="text-center">Score</th>
                  <th>SLA Deadline</th>
                  <th>Assigned Executive</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60 font-medium">
                {hotLeadsList.map((lead) => {
                  const projName = projects.find((p) => p.id === lead.project_id)?.name || "Unknown";
                  const assignee = users.find((u) => u.id === lead.assigned_to)?.name || "Unassigned";
                  const isSlaBreached = lead.sla_deadline && new Date(lead.sla_deadline).getTime() < Date.now();

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-800/20 transition-all duration-150 group"
                    >
                      <td className="py-3">
                        <div className="font-bold text-zinc-250 flex items-center gap-1">
                          {lead.name}
                          {lead.isAfterHours && (
                            <span className="text-[8px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1 py-0.1 rounded font-mono uppercase font-bold" title="Inquired after hours (6pm-9am)">
                              AfterHrs
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">{lead.phone}</div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider ${getSourceIconColor(lead.source)}`}>
                          {lead.source}
                        </span>
                      </td>
                      <td>
                        <span className="text-zinc-400 font-semibold">{projName}</span>
                      </td>
                      <td className="text-center">
                        <span className="font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 border border-indigo-500/20 rounded-md font-bold text-xs shadow-2xs">
                          {lead.score.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        {lead.sla_deadline ? (
                          <div className={`flex items-center gap-1 font-mono text-[10px] ${isSlaBreached ? "text-rose-400 font-bold animate-pulse" : "text-emerald-400 font-semibold"}`}>
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>
                              {isSlaBreached ? "Breached SLA" : new Date(lead.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-550 font-mono text-[10px]">No Timer</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-zinc-400 font-semibold">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{assignee}</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setActivePage("detail");
                          }}
                          className="text-xs bg-zinc-800 hover:bg-indigo-600 text-zinc-150 font-bold px-2.5 py-1.5 rounded-lg border border-zinc-700 hover:border-indigo-500 transition-all cursor-pointer flex items-center gap-0.5 ml-auto"
                        >
                          <span>Review Takeover</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
