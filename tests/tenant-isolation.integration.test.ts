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

describe.skipIf(!shouldRun)("live Supabase tenant isolation", () => {
  let alphaOwner: SupabaseClient;
  let alphaManager: SupabaseClient;
  let alphaExecutive: SupabaseClient;
  let alphaAdmin: SupabaseClient;
  let betaOwner: SupabaseClient;
  let serviceRole: SupabaseClient;
  let alphaOwnerToken = "";
  let executiveToken = "";
  let alphaOrganizationId = "";
  let betaOrganizationId = "";
  let betaLeadId = "";
  let betaProjectId = "";
  let alphaProjectId = "";
  let restrictedLeadId = "";
  let executiveMembershipId = "";
  let executiveProfileId = "";
  let seededAuditLogId = "";

  const config = (): AppConfig => ({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    API_PORT: Number(process.env.API_PORT ?? 3001),
    ALLOWED_ORIGINS:
      process.env.ALLOWED_ORIGINS ?? "http://localhost:3000",
    NODE_ENV: "test",
  });

  beforeAll(async () => {
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !password) {
      throw new Error(
        "Live integration tests require the Supabase URL, anon key, service-role key, and SEED_DEFAULT_PASSWORD.",
      );
    }

    alphaOwner = userClient();
    alphaManager = userClient();
    alphaExecutive = userClient();
    alphaAdmin = userClient();
    betaOwner = userClient();
    serviceRole = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [
      alphaOwnerLogin,
      alphaManagerLogin,
      alphaExecutiveLogin,
      alphaAdminLogin,
      betaOwnerLogin,
    ] = await Promise.all([
      alphaOwner.auth.signInWithPassword({
        email: "owner@propiq.local",
        password,
      }),
      alphaManager.auth.signInWithPassword({
        email: "manager@propiq.local",
        password,
      }),
      alphaExecutive.auth.signInWithPassword({
        email: "executive@propiq.local",
        password,
      }),
      alphaAdmin.auth.signInWithPassword({
        email: "admin@propiq.local",
        password,
      }),
      betaOwner.auth.signInWithPassword({
        email: "owner@boundary.local",
        password,
      }),
    ]);

    for (const login of [
      alphaOwnerLogin,
      alphaManagerLogin,
      alphaExecutiveLogin,
      alphaAdminLogin,
      betaOwnerLogin,
    ]) {
      expect(login.error).toBeNull();
      expect(login.data.session?.access_token).toBeTruthy();
    }
    alphaOwnerToken = alphaOwnerLogin.data.session!.access_token;
    executiveToken = alphaExecutiveLogin.data.session!.access_token;

    const alphaOrganizations = await alphaOwner
      .from("organizations")
      .select("id, slug");
    const betaOrganizations = await betaOwner
      .from("organizations")
      .select("id, slug");
    expect(alphaOrganizations.error).toBeNull();
    expect(betaOrganizations.error).toBeNull();
    expect(alphaOrganizations.data).toHaveLength(1);
    expect(betaOrganizations.data).toHaveLength(1);
    alphaOrganizationId = alphaOrganizations.data![0]!.id;
    betaOrganizationId = betaOrganizations.data![0]!.id;

    const betaLead = await betaOwner
      .from("leads")
      .select("id, project_id")
      .eq("organization_id", betaOrganizationId)
      .single();
    expect(betaLead.error).toBeNull();
    betaLeadId = betaLead.data!.id;
    betaProjectId = betaLead.data!.project_id;

    const restrictedLead = await alphaManager
      .from("leads")
      .select("id, project_id")
      .eq("organization_id", alphaOrganizationId)
      .eq("name", "Manager Restricted Lead")
      .single();
    expect(restrictedLead.error).toBeNull();
    restrictedLeadId = restrictedLead.data!.id;
    alphaProjectId = restrictedLead.data!.project_id;

    const executiveProfile = await serviceRole
      .from("profiles")
      .select("id")
      .eq("email", "executive@propiq.local")
      .single();
    expect(executiveProfile.error).toBeNull();
    executiveProfileId = executiveProfile.data!.id;

    const executiveMembership = await serviceRole
      .from("organization_members")
      .select("id")
      .eq("organization_id", alphaOrganizationId)
      .eq("profile_id", executiveProfileId)
      .single();
    expect(executiveMembership.error).toBeNull();
    executiveMembershipId = executiveMembership.data!.id;

    const auditLog = await alphaOwner
      .from("audit_logs")
      .select("id")
      .eq("organization_id", alphaOrganizationId)
      .eq("action", "DEVELOPMENT_SEED_VERIFIED")
      .single();
    expect(auditLog.error).toBeNull();
    seededAuditLogId = auditLog.data!.id;
  }, 45_000);

  afterAll(async () => {
    if (serviceRole && executiveMembershipId) {
      await serviceRole
        .from("organization_members")
        .update({ active: true })
        .eq("id", executiveMembershipId);
    }
    await Promise.all(
      [
        alphaOwner,
        alphaManager,
        alphaExecutive,
        alphaAdmin,
        betaOwner,
      ]
        .filter(Boolean)
        .map((client) => client.auth.signOut()),
    );
  });

  it("returns only the authenticated user's organization", () => {
    expect(alphaOrganizationId).not.toBe(betaOrganizationId);
  });

  it("prevents Organization A from reading Organization B leads", async () => {
    const result = await alphaOwner
      .from("leads")
      .select("id")
      .eq("organization_id", betaOrganizationId);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("prevents Organization A from updating Organization B leads", async () => {
    const result = await alphaOwner
      .from("leads")
      .update({ name: "Cross tenant overwrite" })
      .eq("id", betaLeadId)
      .select("id");
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);

    const unchanged = await betaOwner
      .from("leads")
      .select("name")
      .eq("id", betaLeadId)
      .single();
    expect(unchanged.data?.name).toBe("Other Organization Lead");
  });

  it("prevents Organization A from accessing Organization B projects", async () => {
    const result = await alphaOwner
      .from("projects")
      .select("id")
      .eq("id", betaProjectId);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("limits executives to assigned or permitted project leads", async () => {
    const leadResult = await alphaExecutive
      .from("leads")
      .select("id")
      .eq("id", restrictedLeadId);
    expect(leadResult.error).toBeNull();
    expect(leadResult.data).toEqual([]);

    const projectResult = await alphaExecutive
      .from("projects")
      .select("id")
      .eq("name", "PropIQ Residences");
    expect(projectResult.error).toBeNull();
    expect(projectResult.data).toEqual([]);
  });

  it("rejects executive project and organization-management API mutations", async () => {
    const projectCreate = await request(createApp({ config: config() }))
      .post("/api/projects")
      .set("Authorization", `Bearer ${executiveToken}`)
      .send({
        name: "Executive mutation attempt",
        location: "Pune",
        developer_name: "Unauthorized",
        rera_number: "UNAUTHORIZED-001",
        price_min: 1,
        price_max: 2,
        description: "",
        active: true,
        amenities: [],
        faqs: [],
      })
      .expect(403);
    expect(projectCreate.body.error.code).toBe("FORBIDDEN");

    const projectUpdate = await request(createApp({ config: config() }))
      .patch(`/api/projects/${alphaProjectId}`)
      .set("Authorization", `Bearer ${executiveToken}`)
      .send({ name: "Executive overwrite attempt" })
      .expect(403);
    expect(projectUpdate.body.error.code).toBe("FORBIDDEN");

    const memberRead = await request(createApp({ config: config() }))
      .get("/api/organization/members")
      .set("Authorization", `Bearer ${executiveToken}`)
      .expect(403);
    expect(memberRead.body.error.code).toBe("FORBIDDEN");

    const memberCreate = await request(createApp({ config: config() }))
      .post("/api/organization/members")
      .set("Authorization", `Bearer ${executiveToken}`)
      .send({
        full_name: "Unauthorized User",
        email: "unauthorized@example.com",
        role: "EXECUTIVE",
        project_ids: [],
      })
      .expect(403);
    expect(memberCreate.body.error.code).toBe("FORBIDDEN");
  });

  it("keeps managers and admins scoped to their organization", async () => {
    for (const client of [alphaManager, alphaAdmin]) {
      const result = await client
        .from("projects")
        .update({ name: "Cross tenant project overwrite" })
        .eq("id", betaProjectId)
        .select("id");
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }
  });

  it("prevents admins from granting OWNER", async () => {
    const result = await alphaAdmin
      .from("organization_members")
      .update({ role: "OWNER" })
      .eq("id", executiveMembershipId)
      .select("id");
    expect(result.error).not.toBeNull();

    const membership = await serviceRole
      .from("organization_members")
      .select("role")
      .eq("id", executiveMembershipId)
      .single();
    expect(membership.data?.role).toBe("EXECUTIVE");
  });

  it("rejects unauthenticated API requests", async () => {
    const response = await request(createApp({ config: config() }))
      .get("/api/bootstrap")
      .expect(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("does not expose cross-tenant records through manipulated IDs or organization headers", async () => {
    await request(createApp({ config: config() }))
      .get(`/api/leads/${betaLeadId}`)
      .set("Authorization", `Bearer ${alphaOwnerToken}`)
      .expect(404);

    const switchedOrganization = await request(createApp({ config: config() }))
      .get(`/api/leads/${betaLeadId}`)
      .set("Authorization", `Bearer ${alphaOwnerToken}`)
      .set("x-organization-id", betaOrganizationId)
      .expect(403);
    expect(switchedOrganization.body.error.code).toBe("MEMBERSHIP_DENIED");
  });

  it("returns not found when an executive requests another organization's lead", async () => {
    const response = await request(createApp({ config: config() }))
      .get(`/api/leads/${betaLeadId}`)
      .set("Authorization", `Bearer ${executiveToken}`)
      .expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("revokes direct database and API access when membership is disabled", async () => {
    const disabled = await serviceRole
      .from("organization_members")
      .update({ active: false })
      .eq("id", executiveMembershipId)
      .select("id")
      .single();
    expect(disabled.error).toBeNull();

    try {
      const organizations = await alphaExecutive
        .from("organizations")
        .select("id");
      expect(organizations.error).toBeNull();
      expect(organizations.data).toEqual([]);

      const response = await request(createApp({ config: config() }))
        .get("/api/bootstrap")
        .set("Authorization", `Bearer ${executiveToken}`)
        .expect(403);
      expect(response.body.error.code).toBe("MEMBERSHIP_DENIED");
    } finally {
      const restored = await serviceRole
        .from("organization_members")
        .update({ active: true })
        .eq("id", executiveMembershipId);
      expect(restored.error).toBeNull();
    }
  });

  it("keeps audit logs append-only for authenticated users", async () => {
    const updateResult = await alphaOwner
      .from("audit_logs")
      .update({ action: "TAMPERED" })
      .eq("id", seededAuditLogId)
      .select("id");
    expect(updateResult.error).not.toBeNull();

    const deleteResult = await alphaOwner
      .from("audit_logs")
      .delete()
      .eq("id", seededAuditLogId);
    expect(deleteResult.error).not.toBeNull();

    const unchanged = await alphaOwner
      .from("audit_logs")
      .select("action")
      .eq("id", seededAuditLogId)
      .single();
    expect(unchanged.data?.action).toBe("DEVELOPMENT_SEED_VERIFIED");
  });
});
