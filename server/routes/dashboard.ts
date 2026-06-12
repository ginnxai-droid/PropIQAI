import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import type { AppConfig } from "../config";
import { throwDatabaseError } from "../database";
import { asyncHandler } from "../errors";
import { summarizeSiteVisits } from "../../src/lib/siteVisitMetrics";
import { refreshSlaState } from "../workflow/orchestrator";
import { createAdminSupabaseClient } from "../supabase";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/summary",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:read");
    await refreshSlaState(
      request.app.locals.config as AppConfig,
      auth.organizationId,
    );
    const [
      { data: leads, error: leadsError },
      { data: visits, error: visitsError },
      { data: slaEvents, error: slaEventsError },
    ] =
      await Promise.all([
        auth.supabase
          .from("leads")
          .select(
            "id, source, status, priority, is_after_hours, created_at, received_at, first_response_at, sla_deadline, ai_qualification_status",
          )
          .eq("organization_id", auth.organizationId),
        auth.supabase
          .from("site_visits")
          .select("id, status")
          .eq("organization_id", auth.organizationId),
        auth.supabase
          .from("sla_events")
          .select("id, due_at, completed_at, breached")
          .eq("organization_id", auth.organizationId),
      ]);
    throwDatabaseError(leadsError, "Dashboard metrics could not be loaded.");
    throwDatabaseError(visitsError, "Dashboard metrics could not be loaded.");
    throwDatabaseError(slaEventsError, "Dashboard metrics could not be loaded.");

    const leadRows = leads ?? [];
    const visitRows = visits ?? [];
    const slaRows = slaEvents ?? [];
    const visitMetrics = summarizeSiteVisits(visitRows);
    const now = Date.now();
    const responseDurations = leadRows.flatMap((lead) => {
      if (!lead.first_response_at) {
        return [];
      }
      return [
        Math.max(
          0,
          new Date(lead.first_response_at).getTime() -
            new Date(lead.created_at).getTime(),
        ),
      ];
    });
    const averageFirstResponseSeconds =
      responseDurations.length > 0
        ? Math.round(
            responseDurations.reduce((total, value) => total + value, 0) /
              responseDurations.length /
              1000,
          )
        : null;

    const sourceDistribution = Object.entries(
      leadRows.reduce<Record<string, number>>((distribution, lead) => {
        distribution[lead.source] = (distribution[lead.source] ?? 0) + 1;
        return distribution;
      }, {}),
    ).map(([source, count]) => ({ source, count }));
    const admin = createAdminSupabaseClient(
      request.app.locals.config as AppConfig,
    );
    const { data: integrationEvents, error: integrationError } = await admin
      .from("integration_events")
      .select("processing_status")
      .eq("organization_id", auth.organizationId)
      .eq("event_type", "LEAD_RECEIVED");
    throwDatabaseError(integrationError, "Intake metrics could not be loaded.");
    const intakeRows = integrationEvents ?? [];

    response.json({
      data: {
        totalLeads: leadRows.length,
        newLeads: leadRows.filter((lead) => lead.status === "NEW").length,
        qualifiedLeads: leadRows.filter((lead) => lead.status === "QUALIFIED").length,
        hotLeads: leadRows.filter((lead) => lead.priority === "HOT").length,
        intakeCount: intakeRows.length,
        hotIntakeCount: leadRows.filter(
          (lead) => lead.received_at && lead.priority === "HOT",
        ).length,
        duplicateIntakeCount: intakeRows.filter(
          (event) => event.processing_status === "DUPLICATE",
        ).length,
        aiQualifiedIntakeCount: leadRows.filter(
          (lead) =>
            lead.received_at &&
            lead.ai_qualification_status === "COMPLETED",
        ).length,
        ...visitMetrics,
        slaBreaches: slaRows.filter(
          (event) =>
            event.breached ||
            (!event.completed_at &&
              new Date(event.due_at).getTime() < now),
        ).length,
        afterHoursLeads: leadRows.filter((lead) => lead.is_after_hours).length,
        missedCallsRecovered: leadRows.filter(
          (lead) => lead.source === "MISSED_CALL" && lead.first_response_at,
        ).length,
        averageFirstResponseSeconds,
        sourceDistribution,
        revenueOpportunity: null,
      },
    });
  }),
);
