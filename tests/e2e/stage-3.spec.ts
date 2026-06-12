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
}) => {
  test.setTimeout(240_000);
  const marker = Date.now().toString();
  const leadName = `Stage Three E2E Buyer ${marker}`;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
    await signIn(page, "owner@propiq.local");
    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await page.getByRole("button", { name: "Add Lead" }).click();
    await expect(page.getByText("Stage 3 Manual Intake")).toBeVisible();
    await page.getByLabel("Buyer name").fill(leadName);
    await page.getByLabel("Phone", { exact: true }).fill(`+9198${marker.slice(-8)}`);
    await page
      .getByLabel("Email", { exact: true })
      .fill(`stage-three-e2e-${marker}@example.test`);
    await page.locator('select[name="project_id"]').selectOption(project.data!.id);
    await page.getByLabel("Budget minimum (INR)").fill("12000000");
    await page.getByLabel("Budget maximum (INR)").fill("15000000");
    await page.getByLabel("Budget description").fill("1.2 to 1.5 crore");
    await page.getByLabel("Purchase timeline").selectOption("IMMEDIATE");
    await page.getByLabel("Source").selectOption("WEBSITE");
    await page.getByLabel("Channel").selectOption("WEBSITE_FORM");
    await page.getByLabel("Campaign").fill(`stage-3-e2e-${marker}`);
    await page.getByLabel("Received time").fill("2026-06-14T12:00");
    await page.getByLabel("Preferred location").fill("Pune");
    await page
      .getByLabel("Enquiry message")
      .fill("Urgent site visit. Call me to negotiate price and explain RERA possession.");
    await page.getByLabel("Site visit request").check();
    await page.getByLabel("Negotiation intent").check();
    await page.getByLabel("Legal or RERA question").check();
    await page.getByLabel("Human requested").check();

    const intakeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/intake/manual") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create Lead" }).click();
    const intake = await intakeResponsePromise;
    expect(intake.status()).toBe(201);
    const intakeBody = await intake.json();
    leadId = intakeBody.data.lead.id;
    intakeEventId = intakeBody.data.intakeEventId;

    await expect(page.getByText("External Intake And AI")).toBeVisible();
    await expect(page.getByText("WEBSITE_FORM", { exact: true })).toBeVisible();
    await expect(page.getByText(`stage-3-e2e-${marker}`, { exact: true })).toBeVisible();
    await expect(page.getByText("Pune", { exact: true })).toBeVisible();
    await expect(page.getByText("No duplicate detected")).toBeVisible();
    await expect(page.getByText("COMPLETED", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("SITE VISIT REQUEST")).toBeVisible();
    await expect(page.getByText("NEGOTIATION INTENT")).toBeVisible();
    await expect(page.getByText(/Model stage-2-v1/)).toBeVisible();
    await expect(page.getByText("HOT PRIORITY")).toBeVisible();
    await expect(page.getByText("Handoff: SITE_VISIT_REQUEST")).toBeVisible();
    await expect(page.getByText(/Human Takeover Timer SLA/)).toBeVisible();
    await expect(page.getByText(/External intake received/)).toBeVisible();

    await page.getByRole("button", { name: "Save Qualification" }).click();
    await expect(
      page.getByRole("status").getByText(/Qualification saved/),
    ).toBeVisible();

    await page.getByRole("button", { name: /Handoff/ }).click();
    await expect(
      page.getByRole("status").getByText(/Handoff and SLA workflow updated/),
    ).toBeVisible();

    for (const [button, message] of [
      ["Mark Qualified", "Lead marked qualified."],
      ["Mark Contacted", "Lead marked contacted."],
      ["Mark Booked", "Lead marked booked."],
      ["Move to Lost", "Lead moved to lost."],
    ] as const) {
      await page.getByRole("button", { name: new RegExp(button) }).click();
      await expect(page.getByRole("status")).toContainText(message);
    }

    await page.getByRole("button", { name: "Internal Alerts" }).click();
    await expect(page.getByText("AFTER HOURS HIGH INTENT")).toBeVisible();
    await page.getByRole("button", { name: "SLA Alerts" }).click();
    await expect(page.getByText("Active SLA Breach Resolution Center")).toBeVisible();
    await page.getByRole("button", { name: "Settings & Webhook" }).click();
    await expect(page.getByText("Secure Foundation Settings")).toBeVisible();
    await expect(
      page.getByText(/Stage 3 website, manual UI, and authenticated webhook intake/),
    ).toBeVisible();
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
