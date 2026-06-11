import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEFAULT_PASSWORD ?? "";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Developer Control Board")).toBeVisible();
}

test.beforeAll(() => {
  if (!password) {
    throw new Error("Stage 2 browser tests require SEED_DEFAULT_PASSWORD.");
  }
});

test("owner-to-manager-to-executive revenue recovery workflow", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const marker = Date.now().toString();
  const leadName = `Stage Two E2E Buyer ${marker}`;

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, "owner@propiq.local");
  await ownerPage.getByRole("button", { name: "Lead Inbox" }).click();
  await ownerPage.getByRole("button", { name: "Add Lead" }).click();
  await ownerPage.getByLabel("Buyer name").fill(leadName);
  await ownerPage.getByLabel("Phone", { exact: true }).fill(`+9194${marker.slice(-8)}`);
  await ownerPage
    .getByLabel("Email", { exact: true })
    .fill(`stage-two-e2e-${marker}@example.test`);
  await ownerPage
    .locator("form", {
      has: ownerPage.getByRole("button", { name: "Create Lead" }),
    })
    .locator("select")
    .selectOption({ label: "PropIQ Heights" });
  await ownerPage.getByRole("button", { name: "Create Lead" }).click();
  await expect(ownerPage.getByText(leadName, { exact: true })).toBeVisible();

  await ownerPage.getByLabel("Buyer type").selectOption("FAMILY_BUYER");
  await ownerPage.getByLabel("Budget minimum").fill("8000000");
  await ownerPage.getByLabel("Budget maximum").fill("15000000");
  await ownerPage.getByLabel("Purchase timeline").selectOption("IMMEDIATE");
  await ownerPage.getByLabel("Engagement quality").selectOption("HIGH");
  await ownerPage
    .getByLabel("Callback responsiveness")
    .selectOption("RESPONSIVE");
  await ownerPage.getByLabel("Interested in a site visit").check();
  await ownerPage.getByLabel("Human requested").check();
  await ownerPage.getByLabel("Price negotiation").check();
  await ownerPage.getByRole("button", { name: "Save Qualification" }).click();
  await expect(ownerPage.getByText(/Model stage-2-v1/)).toBeVisible();
  await expect(ownerPage.getByText("HOT PRIORITY")).toBeVisible();
  await ownerPage.getByTitle("Sign out").click();
  await ownerContext.close();

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await signIn(managerPage, "manager@propiq.local");
  await managerPage.getByRole("button", { name: "Lead Inbox" }).click();
  await managerPage
    .getByPlaceholder(/Search leads by buyer name/)
    .fill(leadName);
  const managerRow = managerPage.getByRole("row", { name: new RegExp(leadName) });
  await expect(managerRow).toBeVisible();
  await managerRow.getByTitle("Assign to executive").click();
  await managerPage
    .getByRole("button", { name: /Demo Executive/ })
    .click();
  await expect(managerRow).toContainText("Demo Executive");

  await managerRow.getByTitle("Schedule physical site visit").click();
  await managerPage
    .getByPlaceholder("e.g. Baner, Pune or Outstation / Airport")
    .fill("Pune");
  await managerPage
    .getByRole("button", { name: "Confirm Saturday visit" })
    .click();
  await expect(managerRow).toContainText("SITE_VISIT_SCHEDULED");

  await managerRow.click();
  await expect(managerPage.getByText("Handoff: HUMAN_REQUESTED")).toBeVisible();
  await expect(managerPage.getByText(/Human Takeover Timer SLA/)).toBeVisible();
  await expect(managerPage.getByText("Persisted Lead Timeline")).toBeVisible();
  await managerPage.getByRole("button", { name: "Dashboard" }).click();
  await expect(
    managerPage.getByText("Confirmed Site Visits", { exact: true }),
  ).toBeVisible();
  await managerPage.getByTitle("Sign out").click();
  await managerContext.close();

  const executiveContext = await browser.newContext();
  const executivePage = await executiveContext.newPage();
  await signIn(executivePage, "executive@propiq.local");
  await executivePage.getByRole("button", { name: "Lead Inbox" }).click();
  await executivePage
    .getByPlaceholder(/Search leads by buyer name/)
    .fill(leadName);
  const executiveRow = executivePage.getByRole("row", {
    name: new RegExp(leadName),
  });
  await expect(executiveRow).toBeVisible();
  await executiveRow.click();
  await expect(executivePage.getByText(/Model stage-2-v1/)).toBeVisible();
  await expect(executivePage.getByText("Handoff: HUMAN_REQUESTED")).toBeVisible();
  await expect(executivePage.getByText("Persisted Lead Timeline")).toBeVisible();
  await executiveContext.close();
});
