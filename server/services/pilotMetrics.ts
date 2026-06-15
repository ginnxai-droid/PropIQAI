type Row = Record<string, any>;

const priorities = ["HOT", "WARM", "NURTURE", "COLD"] as const;

function countBy(rows: Row[], field: string) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[field] ?? "UNKNOWN");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildPilotMetrics(input: {
  leads: Row[];
  handoffs: Row[];
  visits: Row[];
  tasks: Row[];
  slaEvents: Row[];
  alerts: Row[];
  intakeEvents: Row[];
  integrationEvents: Row[];
  members: Row[];
}) {
  const now = Date.now();
  const dueSoonLimit = now + 24 * 60 * 60_000;
  const today = new Date().toISOString().slice(0, 10);
  const breachedSlas = input.slaEvents.filter(
    (event) =>
      event.breached ||
      (!event.completed_at && new Date(event.due_at).getTime() < now),
  );
  const completedOnTime = input.slaEvents.filter(
    (event) =>
      event.completed_at &&
      new Date(event.completed_at).getTime() <=
        new Date(event.due_at).getTime(),
  );
  const measurableSlas = input.slaEvents.filter(
    (event) => event.completed_at || event.breached,
  );
  const responseDelays = input.leads.flatMap((lead) =>
    lead.first_response_at
      ? [
          Math.max(
            0,
            new Date(lead.first_response_at).getTime() -
              new Date(lead.created_at).getTime(),
          ),
        ]
      : [],
  );
  const workload = input.members.map((member) => {
    const assignedLeads = input.leads.filter(
      (lead) => lead.assigned_to === member.profile_id,
    );
    const assignedLeadIds = new Set(assignedLeads.map((lead) => lead.id));
    return {
      profileId: member.profile_id,
      role: member.role,
      assignedLeads: assignedLeads.length,
      hotLeads: assignedLeads.filter(
        (lead) =>
          lead.priority === "HOT" &&
          !["BOOKED", "LOST"].includes(lead.status),
      ).length,
      pendingTasks: input.tasks.filter(
        (task) =>
          task.assigned_to === member.profile_id &&
          ["PENDING", "OVERDUE"].includes(task.status),
      ).length,
      todayFollowups: input.tasks.filter(
        (task) =>
          task.assigned_to === member.profile_id &&
          ["PENDING", "OVERDUE"].includes(task.status) &&
          String(task.due_at).slice(0, 10) === today,
      ).length,
      pendingSiteVisits: input.visits.filter(
        (visit) =>
          assignedLeadIds.has(visit.lead_id) &&
          ["REQUESTED", "TENTATIVE", "CONFIRMED", "RESCHEDULED"].includes(
            visit.status,
          ),
      ).length,
      slaCountdowns: assignedLeads.filter(
        (lead) =>
          lead.sla_deadline &&
          !["BOOKED", "LOST"].includes(lead.status),
      ).length,
      buyerIntentLeads: assignedLeads.filter((lead) =>
        Object.values(lead.handoff_signals ?? {}).some(Boolean),
      ).length,
      nextBestActionCount: assignedLeads.filter((lead) =>
        Boolean(lead.recommended_next_action),
      ).length,
    };
  });
  const priorityDistribution = Object.fromEntries(
    priorities.map((priority) => [
      priority,
      input.leads.filter((lead) => lead.priority === priority).length,
    ]),
  );

  return {
    totalLeads: input.leads.length,
    hotLeads: priorityDistribution.HOT,
    qualifiedLeads: input.leads.filter(
      (lead) => lead.status === "QUALIFIED",
    ).length,
    duplicateLeads: input.intakeEvents.filter(
      (event) => event.processing_status === "DUPLICATE",
    ).length,
    afterHoursLeads: input.leads.filter((lead) => lead.is_after_hours).length,
    slaBreaches: breachedSlas.length,
    pendingHandoffs: input.handoffs.filter((handoff) =>
      ["PENDING", "ESCALATED"].includes(handoff.status),
    ).length,
    overdueHandoffs: input.handoffs.filter(
      (handoff) =>
        ["PENDING", "ESCALATED"].includes(handoff.status) &&
        handoff.sla_deadline &&
        new Date(handoff.sla_deadline).getTime() < now,
    ).length,
    slaDueSoon: input.slaEvents.filter((event) => {
      const dueAt = new Date(event.due_at).getTime();
      return !event.completed_at && !event.breached && dueAt >= now && dueAt <= dueSoonLimit;
    }).length,
    completedSiteVisits: input.visits.filter(
      (visit) => visit.status === "COMPLETED",
    ).length,
    missedSiteVisits: input.visits.filter(
      (visit) => visit.status === "MISSED",
    ).length,
    pendingSiteVisits: input.visits.filter((visit) =>
      ["REQUESTED", "TENTATIVE", "CONFIRMED", "RESCHEDULED"].includes(
        visit.status,
      ),
    ).length,
    todayFollowups: input.tasks.filter(
      (task) =>
        ["PENDING", "OVERDUE"].includes(task.status) &&
        String(task.due_at).slice(0, 10) === today,
    ).length,
    buyerIntentLeads: input.leads.filter((lead) =>
      Object.values(lead.handoff_signals ?? {}).some(Boolean),
    ).length,
    nextBestActionCount: input.leads.filter(
      (lead) => Boolean(lead.recommended_next_action),
    ).length,
    unresolvedAlerts: input.alerts.filter(
      (alert) => alert.status !== "RESOLVED",
    ).length,
    aiQualifiedCount: input.leads.filter(
      (lead) => lead.ai_qualification_status === "COMPLETED",
    ).length,
    aiUnavailableCount: input.leads.filter(
      (lead) => lead.ai_qualification_status === "NOT_AVAILABLE",
    ).length,
    integrationFailureCount: input.integrationEvents.filter(
      (event) => event.processing_status === "FAILED",
    ).length,
    sourceDistribution: countBy(input.leads, "source"),
    priorityDistribution,
    siteVisitFunnel: countBy(input.visits, "status"),
    executiveWorkload: workload,
    slaCompliancePercent:
      measurableSlas.length > 0
        ? Math.round((completedOnTime.length / measurableSlas.length) * 100)
        : null,
    averageResponseDelaySeconds:
      responseDelays.length > 0
        ? Math.round(
            responseDelays.reduce((total, value) => total + value, 0) /
              responseDelays.length /
              1000,
          )
        : null,
    handoffEffectivenessPercent:
      input.handoffs.length > 0
        ? Math.round(
            (input.handoffs.filter(
              (handoff) => handoff.status === "RESOLVED",
            ).length /
              input.handoffs.length) *
              100,
          )
        : null,
    revenueOpportunity: null,
  };
}
