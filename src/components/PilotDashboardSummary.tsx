import { AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Role } from "../types";

export function PilotDashboardSummary() {
  const { activeRole, pilotOverview } = useApp();
  if (!pilotOverview) {
    return null;
  }
  const { metrics, queues, pilotHealth } = pilotOverview;
  const currentWorkload = metrics.executiveWorkload.find(
    (row) => row.profileId === pilotOverview.profileId,
  );
  const cards =
    activeRole === Role.EXECUTIVE
      ? [
          ["Assigned leads", currentWorkload?.assignedLeads ?? 0],
          ["HOT actions", currentWorkload?.hotLeads ?? 0],
          ["Today's follow-ups", currentWorkload?.todayFollowups ?? 0],
          ["Pending site visits", currentWorkload?.pendingSiteVisits ?? 0],
          ["SLA countdowns", currentWorkload?.slaCountdowns ?? 0],
          ["Post-visit tasks", queues.SITE_VISIT_FOLLOW_UP?.length ?? 0],
          ["Buyer intent signals", currentWorkload?.buyerIntentLeads ?? 0],
          ["Next best actions", currentWorkload?.nextBestActionCount ?? 0],
        ]
      : activeRole === Role.MANAGER
        ? [
            ["Team lead queue", metrics.totalLeads],
            ["Overdue handoffs", metrics.overdueHandoffs],
            ["SLA due soon", metrics.slaDueSoon],
            ["SLA breached", metrics.slaBreaches],
            [
              "Executive workload",
              metrics.executiveWorkload
                .filter((row) => row.role === Role.EXECUTIVE)
                .reduce((total, row) => total + row.assignedLeads, 0),
            ],
            ["Unassigned HOT", queues.HOT_LEADS?.filter((row) => !row.assignedTo).length ?? 0],
            ["Site visit follow-ups", queues.SITE_VISIT_FOLLOW_UP?.length ?? 0],
            ["Duplicate review", queues.DUPLICATE_REVIEW?.length ?? 0],
            ["Escalations", queues.MANAGER_ESCALATION?.length ?? 0],
          ]
        : [
            ["Total leads", metrics.totalLeads],
            ["HOT leads", metrics.hotLeads],
            ["Qualified leads", metrics.qualifiedLeads],
            ["Duplicate leads", metrics.duplicateLeads],
            ["After-hours leads", metrics.afterHoursLeads],
            ["SLA breaches", metrics.slaBreaches],
            ["Pending handoffs", metrics.pendingHandoffs],
            ["Completed visits", metrics.completedSiteVisits],
            ["Missed visits", metrics.missedSiteVisits],
            [
              "Source performance",
              `${Object.keys(metrics.sourceDistribution).length} sources`,
            ],
            [
              "Team assigned leads",
              metrics.executiveWorkload.reduce(
                (total, row) => total + row.assignedLeads,
                0,
              ),
            ],
          ];

  return (
    <section className="space-y-4" data-testid="role-pilot-dashboard">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">
            {activeRole} Pilot Operations
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Persisted organization records only. Revenue opportunity is Not available.
          </p>
        </div>
        <span
          className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold ${
            pilotHealth === "HEALTHY"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/20 bg-amber-500/10 text-amber-300"
          }`}
        >
          {pilotHealth === "HEALTHY" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {pilotHealth}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value], index) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-[#121214] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-zinc-500">{label}</span>
              {index % 2 === 0 ? (
                <Users className="h-4 w-4 text-indigo-400" />
              ) : (
                <Clock className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <span className="mt-3 block text-2xl font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
