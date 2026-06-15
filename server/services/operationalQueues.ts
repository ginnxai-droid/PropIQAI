type Row = Record<string, any>;

export type QueueKind =
  | "HOT_LEADS"
  | "SLA_BREACH"
  | "MANAGER_ESCALATION"
  | "DUPLICATE_REVIEW"
  | "AFTER_HOURS"
  | "SITE_VISIT_FOLLOW_UP"
  | "AI_UNAVAILABLE";

function queueItem(
  kind: QueueKind,
  lead: Row,
  options: Partial<Record<string, unknown>> = {},
) {
  return {
    id: `${kind}:${lead.id}`,
    kind,
    leadId: lead.id,
    leadName: lead.name,
    status: lead.status,
    assignedTo: lead.assigned_to ?? null,
    assignedRole: options.assignedRole ?? null,
    severity: options.severity ?? "INFO",
    createdAt: lead.created_at,
    dueAt: options.dueAt ?? lead.sla_deadline ?? null,
    reason: options.reason ?? null,
  };
}

export function buildOperationalQueues(input: {
  leads: Row[];
  handoffs: Row[];
  visits: Row[];
  tasks: Row[];
  alerts: Row[];
  intakeEvents: Row[];
  role: string;
  profileId: string;
}) {
  const now = Date.now();
  const visibleLeads =
    input.role === "EXECUTIVE"
      ? input.leads.filter((lead) => lead.assigned_to === input.profileId)
      : input.leads;
  const byId = new Map(visibleLeads.map((lead) => [lead.id, lead]));
  const queues: Record<QueueKind, ReturnType<typeof queueItem>[]> = {
    HOT_LEADS: visibleLeads
      .filter(
        (lead) =>
          lead.priority === "HOT" &&
          !["BOOKED", "LOST"].includes(lead.status),
      )
      .map((lead) => queueItem("HOT_LEADS", lead, { severity: "HIGH" })),
    SLA_BREACH: visibleLeads
      .filter(
        (lead) =>
          lead.sla_deadline &&
          new Date(lead.sla_deadline).getTime() < now &&
          !["BOOKED", "LOST"].includes(lead.status),
      )
      .map((lead) =>
        queueItem("SLA_BREACH", lead, {
          severity: "CRITICAL",
          reason: "SLA deadline breached",
        }),
      ),
    MANAGER_ESCALATION: input.alerts
      .filter(
        (alert) =>
          alert.alert_type === "MANAGER_ESCALATION" &&
          alert.status !== "RESOLVED" &&
          alert.lead_id &&
          byId.has(alert.lead_id),
      )
      .map((alert) =>
        queueItem("MANAGER_ESCALATION", byId.get(alert.lead_id)!, {
          severity: alert.severity,
          assignedRole: alert.assigned_role,
          reason: alert.message,
        }),
      ),
    DUPLICATE_REVIEW: input.intakeEvents
      .filter(
        (event) =>
          event.processing_status === "DUPLICATE" &&
          event.duplicate_of_lead_id &&
          byId.has(event.duplicate_of_lead_id),
      )
      .map((event) =>
        queueItem(
          "DUPLICATE_REVIEW",
          byId.get(event.duplicate_of_lead_id)!,
          { severity: "WARNING", reason: "Duplicate intake requires review" },
        ),
      ),
    AFTER_HOURS: visibleLeads
      .filter((lead) => lead.is_after_hours)
      .map((lead) =>
        queueItem("AFTER_HOURS", lead, {
          severity: lead.priority === "HOT" ? "HIGH" : "WARNING",
        }),
      ),
    SITE_VISIT_FOLLOW_UP: input.visits
      .filter(
        (visit) =>
          ["COMPLETED", "MISSED"].includes(visit.status) &&
          byId.has(visit.lead_id) &&
          !input.tasks.some(
            (task) =>
              task.site_visit_id === visit.id &&
              task.task_type === "POST_VISIT_FEEDBACK" &&
              task.status === "COMPLETED",
          ),
      )
      .map((visit) =>
        queueItem(
          "SITE_VISIT_FOLLOW_UP",
          byId.get(visit.lead_id)!,
          {
            severity: visit.status === "MISSED" ? "HIGH" : "WARNING",
            reason: `${visit.status} visit needs follow-up`,
          },
        ),
      ),
    AI_UNAVAILABLE: visibleLeads
      .filter((lead) => lead.ai_qualification_status === "NOT_AVAILABLE")
      .map((lead) =>
        queueItem("AI_UNAVAILABLE", lead, {
          severity: "WARNING",
          reason: "Manual qualification review required",
        }),
      ),
  };

  return queues;
}
