import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  assertStage3Environment,
  assertStage3FieldsVisible,
  installRuntimeGuard,
} from "./stage-3-helpers";

const password = process.env.SEED_DEFAULT_PASSWORD ?? "";
const evidenceDirectory = path.resolve(
  "test-results",
  "deep-e2e-evidence",
);

test.beforeAll(async () => {
  assertStage3Environment();
  await mkdir(evidenceDirectory, { recursive: true });
});

async function signIn(page: Page, email: string, role: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Developer Control Board")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText(role, { exact: true }).first()).toBeVisible();
}

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: path.join(evidenceDirectory, `${name}.png`),
    fullPage: true,
  });
}

test("captures deep Stage 4 role and operational evidence", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const assertOwnerRuntime = installRuntimeGuard(owner);
  await signIn(owner, "owner@propiq.local", "OWNER");
  await expect(owner.getByTestId("role-pilot-dashboard")).toContainText(
    "OWNER Pilot Operations",
  );
  await capture(owner, "01-owner-dashboard");

  await owner.getByRole("button", { name: "Operational Queues" }).click();
  await expect(owner.getByTestId("operational-queues")).toBeVisible();
  await owner.getByLabel("Severity").selectOption("CRITICAL");
  await expect(owner.getByLabel("Severity")).toHaveValue("CRITICAL");
  await capture(owner, "02-operational-queues-critical-filter");

  await owner.getByRole("button", { name: "Pilot Report" }).click();
  await expect(owner.getByText("Lead Volume By Source")).toBeVisible();
  await expect(
    owner.getByText("Revenue Opportunity", { exact: true }),
  ).toBeVisible();
  await capture(owner, "03-pilot-kpi-report");

  await owner.getByRole("button", { name: "Health Status" }).click();
  await expect(owner.getByTestId("health-status")).toBeVisible();
  await expect(owner.getByText("reachable", { exact: true })).toBeVisible();
  await capture(owner, "04-health-status");

  await owner.getByRole("button", { name: "Integration Status" }).click();
  await expect(owner.getByTestId("integration-status")).toBeVisible();
  for (const provider of [
    "WhatsApp Automation",
    "Telephony",
    "Meta Lead Ads Sync",
    "External CRM Sync",
  ]) {
    await expect(owner.getByText(provider, { exact: true })).toBeVisible();
  }
  await capture(owner, "05-integration-readiness");
  assertOwnerRuntime();
  await ownerContext.close();

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  const assertAdminRuntime = installRuntimeGuard(admin);
  await signIn(admin, "admin@propiq.local", "ADMIN");
  await admin.getByRole("button", { name: "Lead Inbox" }).click();
  await admin.getByRole("button", { name: "Add Lead" }).click();
  await expect(admin.getByText("Stage 3 Manual Intake")).toBeVisible();
  await assertStage3FieldsVisible(admin);
  await capture(admin, "06-admin-stage3-intake");
  assertAdminRuntime();
  await adminContext.close();

  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  const assertManagerRuntime = installRuntimeGuard(manager);
  await signIn(manager, "manager@propiq.local", "MANAGER");
  await expect(manager.getByTestId("role-pilot-dashboard")).toContainText(
    "MANAGER Pilot Operations",
  );
  await expect(
    manager.getByRole("button", { name: "Health Status" }),
  ).toHaveCount(0);
  await capture(manager, "07-manager-dashboard");
  assertManagerRuntime();
  await managerContext.close();

  const executiveContext = await browser.newContext();
  const executive = await executiveContext.newPage();
  const assertExecutiveRuntime = installRuntimeGuard(executive);
  await signIn(executive, "executive@propiq.local", "EXECUTIVE");
  await expect(executive.getByTestId("role-pilot-dashboard")).toContainText(
    "EXECUTIVE Pilot Operations",
  );
  await expect(
    executive.getByRole("button", { name: "Pilot Report" }),
  ).toHaveCount(0);
  await expect(
    executive.getByRole("button", { name: "Integration Status" }),
  ).toHaveCount(0);
  await capture(executive, "08-executive-dashboard");
  assertExecutiveRuntime();
  await executiveContext.close();
});
