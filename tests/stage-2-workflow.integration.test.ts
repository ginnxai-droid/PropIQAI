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

function userClient(): SupabaseClient {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe.skipIf(!shouldRun)("Stage 2 core revenue recovery workflow", () => {
  const config: AppConfig = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    API_PORT: Number(process.env.API_PORT ?? 3001),
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? "http://localhost:3000",
    NODE_ENV: "test",
  };
  const app = createApp({ config });
  let admin: SupabaseClient;
  let ownerToken = "";
  let managerToken = "";
  let executiveToken = "";
  let organizationId = "";
  let projectId = "";
  let executiveProfileId = "";
  let leadId = "";
  let visitId = "";

  beforeAll(async () => {
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !password) {
      throw new Error("Stage 2 integration tests require live test credentials.");
    }
    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const owner = userClient();
    const manager = userClient();
    const executive = userClient();
    const [ownerLogin, managerLogin, executiveLogin] = await Promise.all([
      owner.auth.signInWithPassword({ email: "owner@propiq.local", password }),
      manager.auth.signInWithPassword({ email: "manager@propiq.local", password }),
      executive.auth.signInWithPassword({
        email: "executive@propiq.local",
        password,
      }),
    ]);
    expect(ownerLogin.error).toBeNull();
    expect(managerLogin.error).toBeNull();
    expect(executiveLogin.error).toBeNull();
    ownerToken = ownerLogin.data.session!.access_token;
    managerToken = managerLogin.data.session!.access_token;
    executiveToken = executiveLogin.data.session!.access_token;

    const session = await request(app)
      .get("/api/session")
      .set("Authorization", `Bearer ${ownerToken}`);
    organizationId = session.body.data.membership.organization.id;
    const [project, executiveProfile] = await Promise.all([
      admin
        .from("projects")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("name", "PropIQ Heights")
        .single(),
      admin
        .from("profiles")
        .select("id")
        .eq("email", "executive@propiq.local")
        .single(),
    ]);
    expect(project.error).toBeNull();
    expect(executiveProfile.error).toBeNull();
    projectId = project.data!.id;
    executiveProfileId = executiveProfile.data!.id;
  }, 45_000);

  afterAll(async () => {
    if (!admin || !leadId) return;
    const childIds = [visitId].filter(Boolean);
    await admin
      .from("audit_logs")
      .delete()
      .eq("organization_id", organizationId)
      .or(
        `entity_id.eq.${leadId}${
          childIds.length ? `,entity_id.in.(${childIds.join(",")})` : ""
        }`,
      );
    await admin.from("leads").delete().eq("id", leadId);
  });

  it("creates a lead and persists an explainable server-calculated score", async () => {
    const marker = Date.now();
    const response = await request(app)
      .post("/api/leads")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        project_id: projectId,
        name: `Stage Two Buyer ${marker}`,
        phone: `+9193${String(marker).slice(-8)}`,
        email: `stage-two-${marker}@example.test`,
        source: "PHONE",
        status: "NEW",
        buyer_type: "FAMILY_BUYER",
        apartment_preference: "3BHK",
        budget_min: 8_000_000,
        budget_max: 15_000_000,
        purchase_timeline: "IMMEDIATE",
        site_visit_interest: true,
        engagement_quality: "HIGH",
        callback_responsiveness: "RESPONSIVE",
        handoff_signals: {
          human_requested: true,
          price_negotiation: true,
        },
        recommended_next_action: "Call and schedule a visit.",
        key_questions: [],
        objections: [],
        is_after_hours: false,
      });
    expect(response.status).toBe(201);
    leadId = response.body.data.id;
    expect(response.body.data).toMatchObject({
      priority: "HOT",
      scoring_version: "stage-2-v1",
    });
    expect(response.body.data.score).toBeGreaterThanOrEqual(8);
    expect(response.body.data.score_components).toHaveProperty("budget_fit");
    expect(response.body.data.score_explanation).toContain("total:");
    expect(response.body.data.recalculated_at).toBeTruthy();
  });

  it("lets a manager assign the lead and creates handoffs, SLA, and callback task", async () => {
    const before = Date.now();
    const assigned = await request(app)
      .post(`/api/leads/${leadId}/assign`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ assigned_to: executiveProfileId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.assigned_to).toBe(executiveProfileId);

    const [handoffs, slaEvents, tasks] = await Promise.all([
      admin
        .from("handoffs")
        .select("reason, assigned_to, escalation_level, sla_deadline")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId),
      admin
        .from("sla_events")
        .select("due_at, breached, escalation_level")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId)
        .is("completed_at", null),
      admin
        .from("followup_tasks")
        .select("task_type, assigned_to")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId)
        .eq("task_type", "CALLBACK"),
    ]);
    expect(handoffs.error).toBeNull();
    expect(handoffs.data?.map((row) => row.reason)).toEqual(
      expect.arrayContaining([
        "HOT_LEAD",
        "SITE_VISIT_REQUEST",
        "PRICE_NEGOTIATION",
        "HUMAN_REQUESTED",
        "HIGH_BUDGET_BUYER",
      ]),
    );
    expect(slaEvents.data).toHaveLength(1);
    const [slaEvent] = slaEvents.data ?? [];
    if (!slaEvent) {
      throw new Error("Expected one active Stage 2 SLA event.");
    }
    const deadline = new Date(slaEvent.due_at).getTime();
    expect(deadline - before).toBeGreaterThanOrEqual(4 * 60_000);
    expect(deadline - before).toBeLessThanOrEqual(6 * 60_000);
    expect(tasks.data).toHaveLength(1);
  });

  it("suppresses duplicate active handoffs for the same reason", async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(app)
        .post("/api/handoffs")
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          lead_id: leadId,
          assigned_to: executiveProfileId,
          reason: "HUMAN_REQUESTED",
        });
      expect(response.status).toBe(201);
    }
    const active = await admin
      .from("handoffs")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .eq("reason", "HUMAN_REQUESTED")
      .in("status", ["PENDING", "CONTACTED", "ESCALATED"]);
    expect(active.error).toBeNull();
    expect(active.data).toHaveLength(1);
  });

  it("creates and completes a site visit with one post-visit task", async () => {
    const created = await request(app)
      .post("/api/site-visits")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        lead_id: leadId,
        project_id: projectId,
        assigned_to: executiveProfileId,
        preferred_date: "2030-04-10",
        preferred_time: "11:00",
        visitors_count: 2,
        status: "CONFIRMED",
        reminder_status: "PENDING",
      });
    expect(created.status).toBe(201);
    visitId = created.body.data.id;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const completed = await request(app)
        .patch(`/api/site-visits/${visitId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          status: "COMPLETED",
          outcome: "Buyer requested final commercial discussion.",
        });
      expect(completed.status).toBe(200);
    }
    const postVisitTasks = await admin
      .from("followup_tasks")
      .select("id, task_type, site_visit_id")
      .eq("organization_id", organizationId)
      .eq("site_visit_id", visitId)
      .eq("task_type", "POST_VISIT_FEEDBACK");
    expect(postVisitTasks.error).toBeNull();
    expect(postVisitTasks.data).toHaveLength(1);
  });

  it("returns the persisted timeline and allows the assigned Executive to view it", async () => {
    const timeline = await request(app)
      .get(`/api/leads/${leadId}/timeline`)
      .set("Authorization", `Bearer ${executiveToken}`);
    expect(timeline.status).toBe(200);
    expect(timeline.body.data.map((event: { type: string }) => event.type)).toEqual(
      expect.arrayContaining([
        "LEAD_CREATED",
        "HANDOFF",
        "SLA",
        "TASK",
        "SITE_VISIT",
        "AUDIT",
      ]),
    );
  });
});
