import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import type { AppConfig } from "../server/config";

const shouldRun = process.env.RUN_SUPABASE_INTEGRATION_TESTS === "true";
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = process.env.SEED_DEFAULT_PASSWORD ?? "";
const webhookSecret = "stage-three-live-webhook-secret";

function userClient(): SupabaseClient {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe.skipIf(!shouldRun)("Stage 3 external intake and AI qualification", () => {
  const config: AppConfig = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    INTAKE_WEBHOOK_SECRET: webhookSecret,
    AI_QUALIFICATION_MODE: "local",
    APP_URL: process.env.APP_URL ?? "http://127.0.0.1:3000",
    API_PORT: Number(process.env.API_PORT ?? 3001),
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? "http://127.0.0.1:3000",
    NODE_ENV: "test",
  };
  const app = createApp({ config });
  const unavailableApp = createApp({
    config: { ...config, AI_QUALIFICATION_MODE: "unavailable" },
  });
  const marker = Date.now().toString();
  const campaign = `stage-3-${marker}`;
  const createdLeadIds: string[] = [];
  const intakeEventIds: string[] = [];
  let admin: SupabaseClient;
  let ownerToken = "";
  let organizationId = "";
  let organizationSlug = "";
  let projectId = "";
  let projectName = "";
  let primaryLeadId = "";
  let duplicateIntakeId = "";
  let crossTenantOrganizationId = "";

  beforeAll(async () => {
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !password) {
      throw new Error("Stage 3 integration tests require live test credentials.");
    }
    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const owner = userClient();
    const login = await owner.auth.signInWithPassword({
      email: "owner@propiq.local",
      password,
    });
    expect(login.error).toBeNull();
    ownerToken = login.data.session!.access_token;
    const session = await request(app)
      .get("/api/session")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(session.status).toBe(200);
    organizationId = session.body.data.membership.organization.id;
    organizationSlug = session.body.data.membership.organization.slug;
    const project = await admin
      .from("projects")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("name", "PropIQ Heights")
      .single();
    expect(project.error).toBeNull();
    projectId = project.data!.id;
    projectName = project.data!.name;
  }, 45_000);

  afterAll(async () => {
    if (!admin) return;
    const alertIds =
      createdLeadIds.length === 0
        ? []
        : (
            await admin
              .from("internal_alerts")
              .select("id")
              .eq("organization_id", organizationId)
              .in("lead_id", createdLeadIds)
          ).data?.map((row) => row.id) ?? [];
    const auditEntityIds = [...createdLeadIds, ...intakeEventIds, ...alertIds];
    if (auditEntityIds.length > 0) {
      await admin
        .from("audit_logs")
        .delete()
        .eq("organization_id", organizationId)
        .in("entity_id", auditEntityIds);
    }
    if (intakeEventIds.length > 0) {
      await admin
        .from("integration_events")
        .delete()
        .eq("organization_id", organizationId)
        .in("raw_payload_reference", intakeEventIds);
      await admin
        .from("lead_intake_events")
        .delete()
        .eq("organization_id", organizationId)
        .in("id", intakeEventIds);
    }
    if (createdLeadIds.length > 0) {
      await admin
        .from("leads")
        .delete()
        .eq("organization_id", organizationId)
        .in("id", createdLeadIds);
    }
    if (crossTenantOrganizationId) {
      await admin
        .from("organizations")
        .delete()
        .eq("id", crossTenantOrganizationId);
    }
  });

  it("rejects malformed, unauthenticated, and invalid-secret intake", async () => {
    await request(app).post("/api/intake/manual").send({}).expect(401);
    await request(app)
      .post("/api/intake/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ buyer_name: "A", phone: "bad" })
      .expect(400);
    const invalidSecret = await request(app)
      .post(`/api/intake/webhook/${organizationSlug}`)
      .set("x-propiq-webhook-secret", "invalid-secret-value")
      .send({ buyer_name: "Webhook Buyer", phone: "+919811111111" });
    expect(invalidSecret.status).toBe(401);
    expect(invalidSecret.body.error.code).toBe("INVALID_WEBHOOK_SECRET");
  });

  it("creates, normalizes, qualifies, scores, and alerts an after-hours lead", async () => {
    const phone = `+9195${marker.slice(-8)}`;
    const response = await request(app)
      .post("/api/intake/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buyer_name: `Stage Three Buyer ${marker}`,
        phone,
        email: `stage-three-${marker}@example.test`,
        project_id: projectId,
        project_interest: projectName,
        budget_text: "1.2 to 1.5 crore",
        preferred_location: "Pune",
        message:
          "Urgent site visit. Call me to negotiate price and explain RERA possession.",
        source: "WEBSITE",
        campaign,
        received_at: "2026-06-14T06:30:00.000Z",
        channel: "MANUAL_JSON",
        raw_payload: {
          form_id: marker,
          authorization: "must-not-be-stored",
        },
        score: 1,
        priority: "COLD",
      });
    expect(response.status).toBe(201);
    expect(response.body.data.outcome).toBe("CREATED");
    primaryLeadId = response.body.data.lead.id;
    createdLeadIds.push(primaryLeadId);
    intakeEventIds.push(response.body.data.intakeEventId);
    expect(response.body.data.lead).toMatchObject({
      priority: "HOT",
      scoring_version: "stage-2-v1",
      ai_qualification_status: "COMPLETED",
      is_after_hours: true,
      source: "WEBSITE",
      campaign,
    });
    expect(response.body.data.lead.score).toBeGreaterThanOrEqual(8);

    const [intake, handoffs, slaEvents, tasks, alerts] = await Promise.all([
      admin
        .from("lead_intake_events")
        .select("raw_payload, processing_status, ai_status")
        .eq("id", response.body.data.intakeEventId)
        .single(),
      admin
        .from("handoffs")
        .select("reason")
        .eq("organization_id", organizationId)
        .eq("lead_id", primaryLeadId),
      admin
        .from("sla_events")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("lead_id", primaryLeadId),
      admin
        .from("followup_tasks")
        .select("task_type")
        .eq("organization_id", organizationId)
        .eq("lead_id", primaryLeadId),
      admin
        .from("internal_alerts")
        .select("alert_type, status")
        .eq("organization_id", organizationId)
        .eq("lead_id", primaryLeadId),
    ]);
    expect(intake.error).toBeNull();
    expect(intake.data).toMatchObject({
      processing_status: "PROCESSED",
      ai_status: "COMPLETED",
      raw_payload: {
        raw_payload: {
          form_id: marker,
          authorization: "[REDACTED]",
        },
      },
    });
    expect(handoffs.data?.map((row) => row.reason)).toEqual(
      expect.arrayContaining([
        "HOT_LEAD",
        "SITE_VISIT_REQUEST",
        "PRICE_NEGOTIATION",
        "LEGAL_RERA_QUERY",
        "HUMAN_REQUESTED",
        "HIGH_BUDGET_BUYER",
      ]),
    );
    expect(slaEvents.data?.length).toBeGreaterThan(0);
    expect(tasks.data?.map((row) => row.task_type)).toContain("CALLBACK");
    expect(alerts.data?.map((row) => row.alert_type)).toEqual(
      expect.arrayContaining(["HOT_LEAD", "AFTER_HOURS_HIGH_INTENT"]),
    );
  });

  it("records duplicate evidence without overwriting the existing lead", async () => {
    const response = await request(app)
      .post("/api/intake/website")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buyer_name: "Duplicate Buyer",
        phone: `+9195${marker.slice(-8)}`,
        email: `duplicate-${marker}@example.test`,
        project_id: projectId,
        message: "Second form submission.",
        campaign,
      });
    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe("DUPLICATE");
    expect(response.body.data.lead.id).toBe(primaryLeadId);
    expect(response.body.data.duplicateReasons).toEqual(
      expect.arrayContaining(["SAME_PHONE", "SAME_PHONE_AND_PROJECT"]),
    );
    duplicateIntakeId = response.body.data.intakeEventId;
    intakeEventIds.push(duplicateIntakeId);
    const duplicateEvent = await admin
      .from("lead_duplicate_events")
      .select("existing_lead_id, match_reasons")
      .eq("intake_event_id", duplicateIntakeId)
      .single();
    expect(duplicateEvent.error).toBeNull();
    expect(duplicateEvent.data?.existing_lead_id).toBe(primaryLeadId);
  });

  it("uses validated manual signals when AI is unavailable", async () => {
    const unavailableMarker = `${marker}8`;
    const response = await request(unavailableApp)
      .post("/api/intake/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buyer_name: `Manual Fallback Buyer ${unavailableMarker}`,
        phone: `+9188${unavailableMarker.slice(-8)}`,
        email: `manual-fallback-${unavailableMarker}@example.test`,
        project_id: projectId,
        budget_min: 12_000_000,
        budget_max: 15_000_000,
        purchase_timeline: "IMMEDIATE",
        preferred_location: "Pune",
        message: "Manual reviewer captured qualification details.",
        source: "MANUAL",
        channel: "MANUAL_UI",
        site_visit_request: true,
        negotiation_intent: true,
        human_requested: true,
      });
    expect(response.status).toBe(201);
    createdLeadIds.push(response.body.data.lead.id);
    intakeEventIds.push(response.body.data.intakeEventId);
    expect(response.body.data.lead).toMatchObject({
      ai_qualification_status: "NOT_AVAILABLE",
      budget_min: 12_000_000,
      budget_max: 15_000_000,
      purchase_timeline: "IMMEDIATE",
      preferred_location: "Pune",
      site_visit_interest: true,
      priority: "HOT",
      ai_signals: {
        site_visit_request: true,
        negotiation_intent: true,
        human_requested: true,
      },
      handoff_signals: {
        price_negotiation: true,
        human_requested: true,
      },
    });
    expect(response.body.data.lead.score).toBeGreaterThanOrEqual(8);
  });

  it("does not leak or match a duplicate from another organization", async () => {
    const crossPhone = `+9196${marker.slice(-8)}`;
    const organization = await admin
      .from("organizations")
      .insert({
        name: `Stage Three Boundary ${marker}`,
        slug: `stage-three-boundary-${marker}`,
        active: true,
      })
      .select("id")
      .single();
    expect(organization.error).toBeNull();
    crossTenantOrganizationId = organization.data!.id;
    const project = await admin
      .from("projects")
      .insert({
        organization_id: crossTenantOrganizationId,
        name: `Boundary Project ${marker}`,
        location: "Delhi",
        developer_name: "Boundary Developer",
        rera_number: `BOUNDARY-${marker}`,
        price_min: 7_000_000,
        price_max: 12_000_000,
        description: "Temporary Stage 3 boundary project.",
      })
      .select("id")
      .single();
    expect(project.error).toBeNull();
    const otherLead = await admin.from("leads").insert({
      organization_id: crossTenantOrganizationId,
      project_id: project.data!.id,
      name: "Cross Tenant Buyer",
      phone: crossPhone,
      email: `cross-${marker}@example.test`,
      source: "WEBSITE",
      buyer_type: "UNKNOWN",
      apartment_preference: "",
      budget_min: 0,
      budget_max: 0,
      purchase_timeline: "UNKNOWN",
      site_visit_interest: false,
    });
    expect(otherLead.error).toBeNull();

    const response = await request(app)
      .post("/api/intake/manual")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        buyer_name: `Primary Tenant Buyer ${marker}`,
        phone: crossPhone,
        email: `primary-cross-${marker}@example.test`,
        project_id: projectId,
        message: "Primary organization intake.",
        campaign,
      });
    expect(response.status).toBe(201);
    expect(response.body.data.outcome).toBe("CREATED");
    createdLeadIds.push(response.body.data.lead.id);
    intakeEventIds.push(response.body.data.intakeEventId);
  });

  it("accepts a valid webhook and supports alert acknowledge and resolve", async () => {
    const response = await request(app)
      .post(`/api/intake/webhook/${organizationSlug}`)
      .set("x-propiq-webhook-secret", webhookSecret)
      .send({
        buyer_name: `Webhook Stage Three ${marker}`,
        phone: `+9197${marker.slice(-8)}`,
        email: `webhook-${marker}@example.test`,
        project_id: projectId,
        message: "Please call me for a site visit.",
        campaign,
      });
    expect(response.status).toBe(201);
    createdLeadIds.push(response.body.data.lead.id);
    intakeEventIds.push(response.body.data.intakeEventId);

    const list = await request(app)
      .get("/api/alerts")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(list.status).toBe(200);
    const alert = list.body.data.find(
      (candidate: { lead_id: string; status: string }) =>
        candidate.lead_id === primaryLeadId && candidate.status === "OPEN",
    );
    expect(alert).toBeTruthy();
    const acknowledged = await request(app)
      .patch(`/api/alerts/${alert.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "ACKNOWLEDGED" });
    expect(acknowledged.status).toBe(200);
    expect(acknowledged.body.data.status).toBe("ACKNOWLEDGED");
    const resolved = await request(app)
      .patch(`/api/alerts/${alert.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "RESOLVED" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe("RESOLVED");
  });
});
