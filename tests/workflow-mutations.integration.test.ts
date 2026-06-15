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

describe.skipIf(!shouldRun)("live task and site-visit mutations", () => {
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
  const app = createApp({ config });

  let serviceRole: SupabaseClient;
  let ownerToken = "";
  let executiveToken = "";
  let alphaOrganizationId = "";
  let alphaLeadId = "";
  let alphaProjectId = "";
  let executiveProfileId = "";
  let betaOrganizationId = "";
  let betaLeadId = "";
  let betaProjectId = "";
  let betaProfileId = "";
  let betaTaskId = "";
  let betaVisitId = "";
  let createdTaskId = "";
  let createdVisitId = "";

  beforeAll(async () => {
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !password) {
      throw new Error(
        "Mutation tests require Supabase credentials and the seed password.",
      );
    }

    serviceRole = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const owner = userClient();
    const executive = userClient();
    const betaOwner = userClient();
    const [ownerLogin, executiveLogin, betaLogin] = await Promise.all([
      owner.auth.signInWithPassword({
        email: "owner@propiq.local",
        password,
      }),
      executive.auth.signInWithPassword({
        email: "executive@propiq.local",
        password,
      }),
      betaOwner.auth.signInWithPassword({
        email: "owner@boundary.local",
        password,
      }),
    ]);
    expect(ownerLogin.error).toBeNull();
    expect(executiveLogin.error).toBeNull();
    expect(betaLogin.error).toBeNull();
    ownerToken = ownerLogin.data.session!.access_token;
    executiveToken = executiveLogin.data.session!.access_token;

    const [ownerSession, betaSession] = await Promise.all([
      request(app)
        .get("/api/session")
        .set("Authorization", `Bearer ${ownerToken}`),
      request(app)
        .get("/api/session")
        .set("Authorization", `Bearer ${betaLogin.data.session!.access_token}`),
    ]);
    expect(ownerSession.status).toBe(200);
    expect(betaSession.status).toBe(200);
    alphaOrganizationId =
      ownerSession.body.data.membership.organization.id;
    betaOrganizationId =
      betaSession.body.data.membership.organization.id;
    betaProfileId = betaSession.body.data.profile.id;

    const [alphaLead, betaLead, executiveProfile] = await Promise.all([
      serviceRole
        .from("leads")
        .select("id, project_id")
        .eq("organization_id", alphaOrganizationId)
        .eq("name", "Hot Missed Call")
        .single(),
      serviceRole
        .from("leads")
        .select("id, project_id")
        .eq("organization_id", betaOrganizationId)
        .eq("name", "Other Organization Lead")
        .single(),
      serviceRole
        .from("profiles")
        .select("id")
        .eq("email", "executive@propiq.local")
        .single(),
    ]);
    expect(alphaLead.error).toBeNull();
    expect(betaLead.error).toBeNull();
    expect(executiveProfile.error).toBeNull();
    alphaLeadId = alphaLead.data!.id;
    alphaProjectId = alphaLead.data!.project_id;
    betaLeadId = betaLead.data!.id;
    betaProjectId = betaLead.data!.project_id;
    executiveProfileId = executiveProfile.data!.id;

    const marker = Date.now();
    const [betaTask, betaVisit] = await Promise.all([
      serviceRole
        .from("followup_tasks")
        .insert({
          organization_id: betaOrganizationId,
          lead_id: betaLeadId,
          assigned_to: betaProfileId,
          task_type: "CUSTOM",
          due_at: new Date(marker + 3_600_000).toISOString(),
          status: "PENDING",
          notes: `Cross-tenant task ${marker}`,
        })
        .select("id")
        .single(),
      serviceRole
        .from("site_visits")
        .insert({
          organization_id: betaOrganizationId,
          lead_id: betaLeadId,
          project_id: betaProjectId,
          assigned_to: betaProfileId,
          preferred_date: "2030-01-10",
          preferred_time: "10:00",
          visitors_count: 1,
          status: "REQUESTED",
          reminder_status: "PENDING",
        })
        .select("id")
        .single(),
    ]);
    expect(betaTask.error).toBeNull();
    expect(betaVisit.error).toBeNull();
    betaTaskId = betaTask.data!.id;
    betaVisitId = betaVisit.data!.id;
  }, 45_000);

  afterAll(async () => {
    if (!serviceRole) {
      return;
    }
    const entityIds = [
      createdTaskId,
      createdVisitId,
      betaTaskId,
      betaVisitId,
    ].filter(Boolean);
    if (entityIds.length > 0) {
      await serviceRole.from("audit_logs").delete().in("entity_id", entityIds);
    }
    if (createdTaskId || betaTaskId) {
      await serviceRole
        .from("followup_tasks")
        .delete()
        .in("id", [createdTaskId, betaTaskId].filter(Boolean));
    }
    if (createdVisitId || betaVisitId) {
      await serviceRole
        .from("site_visits")
        .delete()
        .in("id", [createdVisitId, betaVisitId].filter(Boolean));
    }
  });

  it("creates and updates a task, including notes, and persists after re-login", async () => {
    const marker = Date.now();
    const created = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        lead_id: alphaLeadId,
        assigned_to: executiveProfileId,
        task_type: "CUSTOM",
        due_at: new Date(marker + 7_200_000).toISOString(),
        status: "PENDING",
        notes: `Initial task note ${marker}`,
      });
    expect(created.status).toBe(201);
    createdTaskId = created.body.data.id;

    const updated = await request(app)
      .patch(`/api/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        status: "COMPLETED",
        notes: `Completed task note ${marker}`,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      id: createdTaskId,
      status: "COMPLETED",
      notes: `Completed task note ${marker}`,
    });

    const persisted = await serviceRole
      .from("followup_tasks")
      .select("status, notes")
      .eq("id", createdTaskId)
      .single();
    expect(persisted.error).toBeNull();
    expect(persisted.data).toEqual({
      status: "COMPLETED",
      notes: `Completed task note ${marker}`,
    });

    const freshOwner = userClient();
    const login = await freshOwner.auth.signInWithPassword({
      email: "owner@propiq.local",
      password,
    });
    expect(login.error).toBeNull();
    const bootstrap = await request(app)
      .get("/api/bootstrap")
      .set("Authorization", `Bearer ${login.data.session!.access_token}`);
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body.data.tasks).toContainEqual(
      expect.objectContaining({
        id: createdTaskId,
        status: "COMPLETED",
        notes: `Completed task note ${marker}`,
      }),
    );
    ownerToken = login.data.session!.access_token;
  });

  it("enforces task role authorization", async () => {
    const response = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${executiveToken}`)
      .send({
        lead_id: alphaLeadId,
        assigned_to: executiveProfileId,
        task_type: "CUSTOM",
        due_at: new Date(Date.now() + 7_200_000).toISOString(),
        status: "PENDING",
        notes: "Executive must not create tasks.",
      });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects cross-tenant task creation and mutation", async () => {
    const createResponse = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        lead_id: betaLeadId,
        assigned_to: executiveProfileId,
        task_type: "CUSTOM",
        due_at: new Date(Date.now() + 7_200_000).toISOString(),
        status: "PENDING",
        notes: "Cross-tenant create attempt.",
      });
    expect(createResponse.status).toBe(400);
    expect(createResponse.body.error.code).toBe("INVALID_TASK_RELATION");

    const updateResponse = await request(app)
      .patch(`/api/tasks/${betaTaskId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "COMPLETED", notes: "Cross-tenant update attempt." });
    expect(updateResponse.status).toBe(404);

    const unchanged = await serviceRole
      .from("followup_tasks")
      .select("status")
      .eq("id", betaTaskId)
      .single();
    expect(unchanged.data?.status).toBe("PENDING");
  });

  it(
    "creates, confirms, records outcome, reschedules, and persists a site visit",
    async () => {
      const marker = Date.now();
      const created = await request(app)
        .post("/api/site-visits")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          lead_id: alphaLeadId,
          project_id: alphaProjectId,
          assigned_to: executiveProfileId,
          preferred_date: "2030-02-10",
          preferred_time: "11:30",
          visitors_count: 2,
          buyer_location: "Pune",
          needs_directions: true,
          family_attending: true,
          status: "REQUESTED",
          reminder_status: "PENDING",
        });
      expect(created.status).toBe(201);
      createdVisitId = created.body.data.id;

      const confirmed = await request(app)
        .patch(`/api/site-visits/${createdVisitId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ status: "CONFIRMED" });
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.data.status).toBe("CONFIRMED");

      const withOutcome = await request(app)
        .patch(`/api/site-visits/${createdVisitId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ outcome: `Buyer requested reschedule ${marker}` });
      expect(withOutcome.status).toBe(200);
      expect(withOutcome.body.data.outcome).toBe(
        `Buyer requested reschedule ${marker}`,
      );

      const rescheduled = await request(app)
        .patch(`/api/site-visits/${createdVisitId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          status: "RESCHEDULED",
          preferred_date: "2030-02-12",
          preferred_time: "15:45",
        });
      expect(rescheduled.status).toBe(200);
      expect(rescheduled.body.data).toMatchObject({
        status: "RESCHEDULED",
        preferred_date: "2030-02-12",
        preferred_time: "15:45:00",
        outcome: `Buyer requested reschedule ${marker}`,
      });

      const freshOwner = userClient();
      const login = await freshOwner.auth.signInWithPassword({
        email: "owner@propiq.local",
        password,
      });
      expect(login.error).toBeNull();
      const bootstrap = await request(app)
        .get("/api/bootstrap")
        .set("Authorization", `Bearer ${login.data.session!.access_token}`);
      expect(bootstrap.status).toBe(200);
      expect(bootstrap.body.data.siteVisits).toContainEqual(
        expect.objectContaining({
          id: createdVisitId,
          status: "RESCHEDULED",
          preferred_date: "2030-02-12",
          outcome: `Buyer requested reschedule ${marker}`,
        }),
      );
      ownerToken = login.data.session!.access_token;
    },
    30_000,
  );

  it("rejects unauthenticated site-visit mutation", async () => {
    const response = await request(app)
      .patch(`/api/site-visits/${createdVisitId}`)
      .send({ status: "CANCELLED" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects cross-tenant site-visit creation and mutation", async () => {
    const createResponse = await request(app)
      .post("/api/site-visits")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        lead_id: betaLeadId,
        project_id: betaProjectId,
        assigned_to: executiveProfileId,
        preferred_date: "2030-03-10",
        preferred_time: "12:00",
        visitors_count: 1,
        status: "REQUESTED",
        reminder_status: "PENDING",
      });
    expect(createResponse.status).toBe(400);
    expect(createResponse.body.error.code).toBe("INVALID_PROJECT");

    const updateResponse = await request(app)
      .patch(`/api/site-visits/${betaVisitId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "CANCELLED" });
    expect(updateResponse.status).toBe(404);

    const unchanged = await serviceRole
      .from("site_visits")
      .select("status")
      .eq("id", betaVisitId)
      .single();
    expect(unchanged.data?.status).toBe("REQUESTED");
  });
});
