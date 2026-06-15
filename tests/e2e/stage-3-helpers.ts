import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

const password = process.env.SEED_DEFAULT_PASSWORD ?? "";
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function assertStage3Environment() {
  if (!password || !supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Stage 3 browser tests require live test credentials.");
  }
}

export async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@propiq.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Developer Control Board")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("ADMIN", { exact: true }).first()).toBeVisible();
}

export function createStage3Admin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getStage3Project() {
  const admin = createStage3Admin();
  const organization = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "propiq-demo-builders")
    .single();
  expect(organization.error).toBeNull();
  const project = await admin
    .from("projects")
    .select("id")
    .eq("organization_id", organization.data!.id)
    .eq("name", "PropIQ Heights")
    .single();
  expect(project.error).toBeNull();
  return {
    admin,
    organizationId: organization.data!.id,
    projectId: project.data!.id,
  };
}

export async function cleanupStage3Lead(
  leadId: string,
  organizationId: string,
) {
  if (!leadId) return;
  const admin = createStage3Admin();
  const [intakes, alerts] = await Promise.all([
    admin
      .from("lead_intake_events")
      .select("id")
      .eq("organization_id", organizationId)
      .or(`lead_id.eq.${leadId},duplicate_of_lead_id.eq.${leadId}`),
    admin
      .from("internal_alerts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId),
  ]);
  const intakeIds = intakes.data?.map((row) => row.id) ?? [];
  const alertIds = alerts.data?.map((row) => row.id) ?? [];
  const auditEntityIds = [leadId, ...intakeIds, ...alertIds];
  if (auditEntityIds.length > 0) {
    await admin
      .from("audit_logs")
      .delete()
      .eq("organization_id", organizationId)
      .in("entity_id", auditEntityIds);
  }
  if (intakeIds.length > 0) {
    await admin
      .from("integration_events")
      .delete()
      .in("raw_payload_reference", intakeIds);
    await admin.from("lead_intake_events").delete().in("id", intakeIds);
  }
  await admin.from("leads").delete().eq("id", leadId);
}

export function installRuntimeGuard(
  page: Page,
  allowedApiFailures: Array<{ path: RegExp; status: number }> = [],
) {
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      if (message.text().startsWith("Failed to load resource:")) {
        return;
      }
      issues.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/")) {
      issues.push(
        `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
      );
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const pathname = new URL(response.url()).pathname;
    if (pathname === "/favicon.ico") return;
    const allowed = allowedApiFailures.some(
      (failure) =>
        failure.status === response.status() &&
        failure.path.test(pathname),
    );
    if (!allowed) {
      issues.push(
        `api response: ${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });
  return () => expect(issues, issues.join("\n")).toEqual([]);
}

export async function readMetric(page: Page, testId: string) {
  const value = await page
    .getByTestId(testId)
    .locator(".text-2xl")
    .first()
    .textContent();
  return Number(value?.trim());
}

export async function assertStage3FieldsVisible(page: Page) {
  for (const label of [
    "Buyer name",
    "Phone",
    "Email",
    "Budget minimum (INR)",
    "Budget maximum (INR)",
    "Budget description",
    "Purchase timeline",
    "Source",
    "Channel",
    "Campaign",
    "Received time",
    "Preferred location",
    "Enquiry message",
    "Site visit request",
    "Negotiation intent",
    "Booking intent",
    "Legal or RERA question",
    "Human requested",
    "Competitor comparison",
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.locator('select[name="project_id"]')).toBeVisible();
}
