import { describe, expect, it } from "vitest";
import { buildOperationalQueues } from "../server/services/operationalQueues";
import { assertPilotDataGuard } from "../server/services/pilotDataGuard";
import { buildPilotMetrics } from "../server/services/pilotMetrics";

const lead = {
  id: "lead-1",
  name: "Pilot Buyer",
  status: "NEW",
  priority: "HOT",
  source: "WEBSITE",
  assigned_to: "executive-1",
  created_at: "2026-06-15T04:00:00.000Z",
  first_response_at: "2026-06-15T04:05:00.000Z",
  sla_deadline: "2020-01-01T00:00:00.000Z",
  is_after_hours: true,
  ai_qualification_status: "NOT_AVAILABLE",
};

describe("Stage 4 pilot metrics", () => {
  it("derives persisted KPIs without inventing revenue", () => {
    const metrics = buildPilotMetrics({
      leads: [lead],
      handoffs: [{ status: "PENDING" }],
      visits: [{ status: "MISSED" }, { status: "COMPLETED" }],
      tasks: [{ assigned_to: "executive-1", status: "PENDING" }],
      slaEvents: [
        {
          breached: true,
          due_at: "2020-01-01T00:00:00.000Z",
          completed_at: null,
        },
      ],
      alerts: [{ status: "OPEN" }],
      intakeEvents: [{ processing_status: "DUPLICATE" }],
      integrationEvents: [{ processing_status: "FAILED" }],
      members: [{ profile_id: "executive-1", role: "EXECUTIVE" }],
    });

    expect(metrics).toMatchObject({
      totalLeads: 1,
      hotLeads: 1,
      duplicateLeads: 1,
      afterHoursLeads: 1,
      slaBreaches: 1,
      pendingHandoffs: 1,
      overdueHandoffs: 0,
      completedSiteVisits: 1,
      missedSiteVisits: 1,
      unresolvedAlerts: 1,
      aiUnavailableCount: 1,
      integrationFailureCount: 1,
      averageResponseDelaySeconds: 300,
      revenueOpportunity: null,
    });
  });

  it("builds actionable queues and limits executives to assigned leads", () => {
    const queues = buildOperationalQueues({
      leads: [
        lead,
        {
          ...lead,
          id: "lead-2",
          name: "Another Executive Lead",
          assigned_to: "executive-2",
        },
      ],
      handoffs: [],
      visits: [{ id: "visit-1", lead_id: "lead-1", status: "MISSED" }],
      tasks: [],
      alerts: [
        {
          alert_type: "MANAGER_ESCALATION",
          status: "OPEN",
          lead_id: "lead-1",
          severity: "CRITICAL",
          assigned_role: "MANAGER",
          message: "SLA escalation",
        },
      ],
      intakeEvents: [
        {
          processing_status: "DUPLICATE",
          duplicate_of_lead_id: "lead-1",
        },
      ],
      role: "EXECUTIVE",
      profileId: "executive-1",
    });

    expect(queues.HOT_LEADS).toHaveLength(1);
    expect(queues.SLA_BREACH[0]).toMatchObject({
      leadId: "lead-1",
      severity: "CRITICAL",
    });
    expect(queues.DUPLICATE_REVIEW).toHaveLength(1);
    expect(queues.AFTER_HOURS).toHaveLength(1);
    expect(queues.SITE_VISIT_FOLLOW_UP).toHaveLength(1);
    expect(queues.AI_UNAVAILABLE).toHaveLength(1);
  });
});

describe("Stage 4 synthetic data safety", () => {
  it("requires an explicit development-only switch", () => {
    expect(() =>
      assertPilotDataGuard({
        NODE_ENV: "development",
        PILOT_DATA_MODE: "development",
      }),
    ).not.toThrow();
    expect(() =>
      assertPilotDataGuard({
        NODE_ENV: "production",
        PILOT_DATA_MODE: "development",
      }),
    ).toThrow(/cannot run in production/i);
    expect(() =>
      assertPilotDataGuard({ NODE_ENV: "development" }),
    ).toThrow(/requires PILOT_DATA_MODE=development/i);
  });
});
