import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEFAULT_PASSWORD ?? "";
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Developer Control Board")).toBeVisible();
}

test.beforeAll(() => {
  if (!password || !supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Stage 3 browser tests require live test credentials.");
  }
});

test("external intake appears with AI signals, deterministic workflow, alerts, and metrics", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  const marker = Date.now().toString();
  const leadName = `Stage Three E2E Buyer ${marker}`;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const user = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const login = await user.auth.signInWithPassword({
    email: "owner@propiq.local",
    password,
  });
  expect(login.error).toBeNull();
  const organization = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "propiq-demo-builders")
    .single();
  const project = await admin
    .from("projects")
    .select("id")
    .eq("organization_id", organization.data!.id)
    .eq("name", "PropIQ Heights")
    .single();
  expect(project.error).toBeNull();

  let leadId = "";
  let intakeEventId = "";
  try {
    const intake = await request.post("http://127.0.0.1:3001/api/intake/manual", {
      headers: {
        Authorization: `Bearer ${login.data.session!.access_token}`,
      },
      data: {
        buyer_name: leadName,
        phone: `+9198${marker.slice(-8)}`,
        email: `stage-three-e2e-${marker}@example.test`,
        project_id: project.data!.id,
        budget_text: "1.2 to 1.5 crore",
        preferred_location: "Pune",
        message:
          "Urgent site visit. Call me to negotiate price and explain RERA possession.",
        source: "WEBSITE",
        campaign: `stage-3-e2e-${marker}`,
        received_at: "2026-06-14T06:30:00.000Z",
      },
    });
    expect(intake.status()).toBe(201);
    const intakeBody = await intake.json();
    leadId = intakeBody.data.lead.id;
    intakeEventId = intakeBody.data.intakeEventId;

    await signIn(page, "owner@propiq.local");
    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await page
      .getByPlaceholder(/Search leads by buyer name/)
      .fill(leadName);
    const row = page.getByRole("row", { name: new RegExp(leadName) });
    await expect(row).toBeVisible();
    await expect(row).toContainText("AI COMPLETED");
    await expect(row).toContainText("AfterHrs");
    await row.click();

    await expect(page.getByText("External Intake And AI")).toBeVisible();
    await expect(page.getByText("COMPLETED", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("SITE VISIT REQUEST")).toBeVisible();
    await expect(page.getByText("NEGOTIATION INTENT")).toBeVisible();
    await expect(page.getByText(/Model stage-2-v1/)).toBeVisible();
    await expect(page.getByText("HOT PRIORITY")).toBeVisible();
    await expect(page.getByText("Handoff: SITE_VISIT_REQUEST")).toBeVisible();
    await expect(page.getByText(/Human Takeover Timer SLA/)).toBeVisible();
    await expect(page.getByText(/External intake received/)).toBeVisible();

    await page.getByRole("button", { name: "Internal Alerts" }).click();
    await expect(page.getByText("AFTER HOURS HIGH INTENT")).toBeVisible();
    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page.getByText("External Intake", { exact: true })).toBeVisible();
    await expect(page.getByText("HOT Intake", { exact: true })).toBeVisible();
  } finally {
    if (leadId && intakeEventId) {
      const alerts = await admin
        .from("internal_alerts")
        .select("id")
        .eq("organization_id", organization.data!.id)
        .eq("lead_id", leadId);
      const auditIds = [
        leadId,
        intakeEventId,
        ...(alerts.data?.map((alert) => alert.id) ?? []),
      ];
      await admin
        .from("audit_logs")
        .delete()
        .eq("organization_id", organization.data!.id)
        .in("entity_id", auditIds);
      await admin
        .from("integration_events")
        .delete()
        .eq("raw_payload_reference", intakeEventId);
      await admin.from("lead_intake_events").delete().eq("id", intakeEventId);
      await admin.from("leads").delete().eq("id", leadId);
    }
  }
});
