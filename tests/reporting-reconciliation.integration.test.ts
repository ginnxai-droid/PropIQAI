import { createClient } from "@supabase/supabase-js";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import type { AppConfig } from "../server/config";
import { summarizeSiteVisits } from "../src/lib/siteVisitMetrics";

const shouldRun = process.env.RUN_SUPABASE_INTEGRATION_TESTS === "true";
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = process.env.SEED_DEFAULT_PASSWORD ?? "";

describe.skipIf(!shouldRun)("live reporting reconciliation", () => {
  let token = "";
  let organizationId = "";

  const config: AppConfig = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    API_PORT: Number(process.env.API_PORT ?? 3001),
    ALLOWED_ORIGINS:
      process.env.ALLOWED_ORIGINS ?? "http://localhost:3000",
    NODE_ENV: "test",
  };

  beforeAll(async () => {
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !password) {
      throw new Error(
        "Reporting reconciliation requires Supabase credentials and the seed password.",
      );
    }
    const user = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const login = await user.auth.signInWithPassword({
      email: "owner@propiq.local",
      password,
    });
    expect(login.error).toBeNull();
    token = login.data.session!.access_token;

    const sessionResponse = await request(createApp({ config }))
      .get("/api/session")
      .set("Authorization", `Bearer ${token}`);
    expect(sessionResponse.status).toBe(200);
    organizationId =
      sessionResponse.body.data.membership.organization.id;
  });

  it("matches dashboard summary values to direct tenant-scoped queries", async () => {
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const [leadsResult, visitsResult, slaResult, integrationResult] = await Promise.all([
      service
        .from("leads")
        .select(
          "source, status, priority, is_after_hours, created_at, received_at, first_response_at, ai_qualification_status",
        )
        .eq("organization_id", organizationId),
      service
        .from("site_visits")
        .select("status")
        .eq("organization_id", organizationId),
      service
        .from("sla_events")
        .select("due_at, completed_at, breached")
        .eq("organization_id", organizationId),
      service
        .from("integration_events")
        .select("processing_status")
        .eq("organization_id", organizationId)
        .eq("event_type", "LEAD_RECEIVED"),
    ]);
    expect(leadsResult.error).toBeNull();
    expect(visitsResult.error).toBeNull();
    expect(slaResult.error).toBeNull();
    expect(integrationResult.error).toBeNull();

    const leads = leadsResult.data ?? [];
    const visits = visitsResult.data ?? [];
    const visitMetrics = summarizeSiteVisits(visits);
    const slaEvents = slaResult.data ?? [];
    const integrationEvents = integrationResult.data ?? [];
    const now = Date.now();
    const responseDurations = leads.flatMap((lead) =>
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
    const sourceDistribution = Object.entries(
      leads.reduce<Record<string, number>>((counts, lead) => {
        counts[lead.source] = (counts[lead.source] ?? 0) + 1;
        return counts;
      }, {}),
    )
      .map(([source, count]) => ({ source, count }))
      .sort((left, right) => left.source.localeCompare(right.source));

    const response = await request(createApp({ config }))
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);

    expect({
      ...response.body.data,
      sourceDistribution: [...response.body.data.sourceDistribution].sort(
        (left, right) => left.source.localeCompare(right.source),
      ),
    }).toEqual({
      totalLeads: leads.length,
      newLeads: leads.filter((lead) => lead.status === "NEW").length,
      qualifiedLeads: leads.filter((lead) => lead.status === "QUALIFIED").length,
      hotLeads: leads.filter((lead) => lead.priority === "HOT").length,
      intakeCount: integrationEvents.length,
      hotIntakeCount: leads.filter(
        (lead) => lead.received_at && lead.priority === "HOT",
      ).length,
      duplicateIntakeCount: integrationEvents.filter(
        (event) => event.processing_status === "DUPLICATE",
      ).length,
      aiQualifiedIntakeCount: leads.filter(
        (lead) =>
          lead.received_at &&
          lead.ai_qualification_status === "COMPLETED",
      ).length,
      ...visitMetrics,
      slaBreaches: slaEvents.filter(
        (event) =>
          event.breached ||
          (!event.completed_at && new Date(event.due_at).getTime() < now),
      ).length,
      afterHoursLeads: leads.filter((lead) => lead.is_after_hours).length,
      missedCallsRecovered: leads.filter(
        (lead) => lead.source === "MISSED_CALL" && lead.first_response_at,
      ).length,
      averageFirstResponseSeconds:
        responseDurations.length > 0
          ? Math.round(
              responseDurations.reduce((total, value) => total + value, 0) /
                responseDurations.length /
                1000,
            )
          : null,
      sourceDistribution,
      revenueOpportunity: null,
    });
  });
});
