import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import type { AppConfig } from "../config";
import { throwDatabaseError } from "../database";
import { asyncHandler } from "../errors";
import { createAdminSupabaseClient } from "../supabase";
import { integrationRegistry } from "../services/integrationRegistry";
import { buildOperationalQueues } from "../services/operationalQueues";
import { buildPilotMetrics } from "../services/pilotMetrics";

export const pilotRouter = Router();

pilotRouter.get(
  "/overview",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    const organizationId = auth.organizationId;
    const [
      leadsResult,
      handoffsResult,
      visitsResult,
      tasksResult,
      slaResult,
      alertsResult,
      membersResult,
    ] = await Promise.all([
      auth.supabase.from("leads").select("*").eq("organization_id", organizationId),
      auth.supabase.from("handoffs").select("*").eq("organization_id", organizationId),
      auth.supabase.from("site_visits").select("*").eq("organization_id", organizationId),
      auth.supabase.from("followup_tasks").select("*").eq("organization_id", organizationId),
      auth.supabase.from("sla_events").select("*").eq("organization_id", organizationId),
      auth.supabase.from("internal_alerts").select("*").eq("organization_id", organizationId),
      auth.supabase
        .from("organization_members")
        .select("profile_id, role, active")
        .eq("organization_id", organizationId)
        .eq("active", true),
    ]);
    for (const result of [
      leadsResult,
      handoffsResult,
      visitsResult,
      tasksResult,
      slaResult,
      alertsResult,
      membersResult,
    ]) {
      throwDatabaseError(result.error, "Pilot operations data could not be loaded.");
    }

    const leads = leadsResult.data ?? [];
    const leadIds = leads.map((lead) => lead.id);
    const admin = createAdminSupabaseClient(
      request.app.locals.config as AppConfig,
    );
    const [intakeResult, integrationResult] = await Promise.all([
      leadIds.length > 0
        ? admin
            .from("lead_intake_events")
            .select("*")
            .eq("organization_id", organizationId)
            .or(
              `lead_id.in.(${leadIds.join(",")}),duplicate_of_lead_id.in.(${leadIds.join(",")})`,
            )
        : Promise.resolve({ data: [], error: null }),
      admin
        .from("integration_events")
        .select("*")
        .eq("organization_id", organizationId),
    ]);
    throwDatabaseError(intakeResult.error, "Pilot intake data could not be loaded.");
    throwDatabaseError(
      integrationResult.error,
      "Pilot integration data could not be loaded.",
    );

    const input = {
      leads,
      handoffs: handoffsResult.data ?? [],
      visits: visitsResult.data ?? [],
      tasks: tasksResult.data ?? [],
      slaEvents: slaResult.data ?? [],
      alerts: alertsResult.data ?? [],
      intakeEvents: intakeResult.data ?? [],
      integrationEvents: integrationResult.data ?? [],
      members: membersResult.data ?? [],
    };
    const metrics = buildPilotMetrics(input);
    const queues = buildOperationalQueues({
      ...input,
      role: auth.role,
      profileId: auth.profileId,
    });
    const integrationFailures = input.integrationEvents
      .filter((event) => event.processing_status === "FAILED")
      .slice(0, 25)
      .map((event) => ({
        id: event.id,
        provider: event.provider,
        eventType: event.event_type,
        status: event.processing_status,
        error: event.error_message ?? "Not available",
        createdAt: event.created_at,
      }));

    response.json({
      data: {
        role: auth.role,
        profileId: auth.profileId,
        organization: {
          id: auth.organizationId,
          name: auth.organizationName,
        },
        metrics,
        queues,
        integrations: integrationRegistry,
        integrationFailures,
        pilotHealth:
          metrics.integrationFailureCount > 0 ||
          metrics.slaBreaches > 0 ||
          metrics.unresolvedAlerts > 0
            ? "ATTENTION"
            : "HEALTHY",
      },
    });
  }),
);
