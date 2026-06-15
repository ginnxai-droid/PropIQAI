import { expect, test, type Page } from "@playwright/test";
import {
  assertStage3Environment,
  installRuntimeGuard,
} from "./stage-3-helpers";

const password = process.env.SEED_DEFAULT_PASSWORD ?? "";

test.beforeAll(assertStage3Environment);

async function signIn(page: Page, email: string, role: string) {
  const pilotResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/pilot/overview") &&
      response.request().method() === "GET",
  );
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Developer Control Board")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText(role, { exact: true }).first()).toBeVisible();
  return pilotResponse;
}

test("owner sees persisted pilot metrics, queues, integrations, and health", async ({
  page,
}) => {
  const assertNoRuntimeIssues = installRuntimeGuard(page);
  const pilotResponse = await signIn(page, "owner@propiq.local", "OWNER");
  expect(pilotResponse.status()).toBe(200);
  const pilot = (await pilotResponse.json()).data;
  expect(pilot.role).toBe("OWNER");
  expect(pilot.profileId).toEqual(expect.any(String));
  expect(pilot.metrics).toMatchObject({
    totalLeads: expect.any(Number),
    hotLeads: expect.any(Number),
    slaBreaches: expect.any(Number),
    pendingHandoffs: expect.any(Number),
    revenueOpportunity: null,
  });
  expect(pilot.metrics.totalLeads).toBeGreaterThan(0);
  expect(Object.keys(pilot.queues)).toEqual(
    expect.arrayContaining([
      "HOT_LEADS",
      "SLA_BREACH",
      "MANAGER_ESCALATION",
      "DUPLICATE_REVIEW",
      "AFTER_HOURS",
      "SITE_VISIT_FOLLOW_UP",
      "AI_UNAVAILABLE",
    ]),
  );

  await expect(page.getByTestId("role-pilot-dashboard")).toContainText(
    "OWNER Pilot Operations",
  );
  await page.getByRole("button", { name: "Operational Queues" }).click();
  await expect(page.getByTestId("operational-queues")).toBeVisible();
  for (const queue of [
    "HOT Lead Queue",
    "SLA Breach Queue",
    "Manager Escalation Queue",
    "Duplicate Review Queue",
    "After-Hours Lead Queue",
    "Site Visit Follow-Up Queue",
    "AI Unavailable Review Queue",
  ]) {
    await expect(page.getByRole("button", { name: new RegExp(queue) })).toBeVisible();
  }
  await page.getByRole("button", { name: /HOT Lead Queue/ }).click();
  const firstOpenLead = page.getByRole("button", { name: "Open Lead" }).first();
  await expect(firstOpenLead).toBeVisible();
  const firstLeadName = await page
    .getByTestId("operational-queues")
    .locator("tbody tr")
    .first()
    .locator("td")
    .first()
    .locator("span")
    .first()
    .textContent();
  await firstOpenLead.click();
  await expect(page.getByText(firstLeadName?.trim() ?? "", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Pilot Report" }).click();
  await expect(page.getByText("SLA Breach Count")).toBeVisible();
  await expect(page.getByText("Handoff Effectiveness")).toBeVisible();
  await expect(
    page.getByText("Revenue Opportunity", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not available", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Integration Status" }).click();
  await expect(page.getByTestId("integration-status")).toBeVisible();
  await expect(page.getByText("Manual UI")).toBeVisible();
  await expect(
    page.getByText("WhatsApp Automation", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not available", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Health Status" }).click();
  await expect(page.getByTestId("health-status")).toBeVisible();
  await expect(page.getByText("reachable", { exact: true })).toBeVisible();
  await expect(page.getByText("Secret values are never returned.")).toBeVisible();
  assertNoRuntimeIssues();
});

test("manager sees management queues and reports but not owner health controls", async ({
  page,
}) => {
  const assertNoRuntimeIssues = installRuntimeGuard(page);
  const pilotResponse = await signIn(page, "manager@propiq.local", "MANAGER");
  const pilot = (await pilotResponse.json()).data;
  expect(pilot.role).toBe("MANAGER");
  expect(pilot.metrics.executiveWorkload).toEqual(expect.any(Array));

  await expect(page.getByTestId("role-pilot-dashboard")).toContainText(
    "MANAGER Pilot Operations",
  );
  await expect(
    page.getByRole("button", { name: "Operational Queues" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Pilot Report" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Integration Status" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Health Status" }),
  ).toHaveCount(0);
  assertNoRuntimeIssues();
});

test("executive sees only assigned workload and allowed operational navigation", async ({
  page,
}) => {
  const assertNoRuntimeIssues = installRuntimeGuard(page);
  const pilotResponse = await signIn(
    page,
    "executive@propiq.local",
    "EXECUTIVE",
  );
  const pilot = (await pilotResponse.json()).data;
  expect(pilot.role).toBe("EXECUTIVE");
  for (const rows of Object.values(pilot.queues) as Array<
    Array<{ assignedTo: string | null }>
  >) {
    expect(
      rows.every((row) => row.assignedTo === pilot.profileId),
    ).toBe(true);
  }

  await expect(page.getByTestId("role-pilot-dashboard")).toContainText(
    "EXECUTIVE Pilot Operations",
  );
  await expect(page.getByText("Assigned leads")).toBeVisible();
  await page.getByRole("button", { name: "Operational Queues" }).click();
  await expect(page.getByTestId("operational-queues")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pilot Report" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Integration Status" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Health Status" }),
  ).toHaveCount(0);
  assertNoRuntimeIssues();
});
