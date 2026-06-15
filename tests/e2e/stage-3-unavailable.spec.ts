import { expect, test } from "@playwright/test";
import {
  assertStage3Environment,
  assertStage3FieldsVisible,
  cleanupStage3Lead,
  getStage3Project,
  installRuntimeGuard,
  readMetric,
  signInAsAdmin,
} from "./stage-3-helpers";

test.beforeAll(assertStage3Environment);

test("AI unavailable still persists visible intake metadata and deterministic qualification", async ({
  page,
}) => {
  const assertNoRuntimeIssues = installRuntimeGuard(page);
  const marker = Date.now().toString();
  const leadName = `Stage Three AI Fallback ${marker}`;
  const campaign = `stage-3-fallback-${marker}`;
  const { projectId, organizationId } = await getStage3Project();
  let leadId = "";
  try {
    await signInAsAdmin(page);
    const baseline = {
      external: await readMetric(page, "stage3-metric-external-intake"),
      hot: await readMetric(page, "stage3-metric-hot-intake"),
      ai: await readMetric(page, "stage3-metric-ai-qualified"),
    };
    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await page.getByRole("button", { name: "Add Lead" }).click();
    await assertStage3FieldsVisible(page);
    await page.getByLabel("Buyer name").fill(leadName);
    await page
      .getByLabel("Phone", { exact: true })
      .fill(`+9188${marker.slice(-8)}`);
    await page
      .getByLabel("Email", { exact: true })
      .fill(`stage-three-fallback-${marker}@example.test`);
    await page.locator('select[name="project_id"]').selectOption(projectId);
    await page.getByLabel("Budget minimum (INR)").fill("12000000");
    await page.getByLabel("Budget maximum (INR)").fill("15000000");
    await page.getByLabel("Budget description").fill("1.2 to 1.5 crore");
    await page.getByLabel("Purchase timeline").selectOption("IMMEDIATE");
    await page.getByLabel("Source").selectOption("MANUAL");
    await page.getByLabel("Channel").selectOption("MANUAL_UI");
    await page.getByLabel("Campaign").fill(campaign);
    await page.getByLabel("Preferred location").fill("Pune");
    await page
      .getByLabel("Enquiry message")
      .fill("Manual reviewer captured urgent high-intent qualification.");
    for (const signal of [
      "Site visit request",
      "Negotiation intent",
      "Booking intent",
      "Legal or RERA question",
      "Human requested",
      "Competitor comparison",
    ]) {
      await page.getByLabel(signal, { exact: true }).check();
    }

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/intake/manual") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create Lead" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const body = await response.json();
    leadId = body.data.lead.id;
    expect(body.data.aiStatus).toBe("NOT_AVAILABLE");
    expect(body.data.lead).toMatchObject({
      source: "MANUAL",
      intake_channel: "MANUAL_UI",
      campaign,
      preferred_location: "Pune",
      purchase_timeline: "IMMEDIATE",
      ai_qualification_status: "NOT_AVAILABLE",
      budget_min: 12_000_000,
      budget_max: 15_000_000,
      priority: "HOT",
      site_visit_interest: true,
    });
    expect(body.data.lead.received_at).toBeTruthy();
    expect(body.data.lead.ai_signals).toMatchObject({
      site_visit_request: true,
      negotiation_intent: true,
      booking_intent: true,
      legal_or_rera_question: true,
      human_requested: true,
      competitor_comparison: true,
    });

    const panel = page.getByTestId("external-intake-ai-panel");
    await expect(page.getByTestId("stage3-field-source")).toHaveText("MANUAL");
    await expect(page.getByTestId("stage3-field-channel")).toHaveText("MANUAL_UI");
    await expect(page.getByTestId("stage3-field-campaign")).toHaveText(campaign);
    await expect(page.getByTestId("stage3-field-received")).not.toHaveText("Not available");
    await expect(page.getByTestId("stage3-field-preferred-location")).toHaveText("Pune");
    await expect(page.getByTestId("stage3-field-duplicate-state")).toHaveText("No duplicate detected");
    await expect(page.getByTestId("stage3-field-ai-confidence")).toHaveText("Not available");
    await expect(panel).toContainText("NOT AVAILABLE");
    await expect(panel).toContainText("AI confidence");
    await expect(panel).toContainText("Not available");
    await expect(panel).toContainText(
      "AI provider is not available. Intake metadata and validated manual qualification signals remain persisted",
    );
    for (const signal of [
      "SITE VISIT REQUEST",
      "NEGOTIATION INTENT",
      "BOOKING INTENT",
      "LEGAL OR RERA QUESTION",
      "HUMAN REQUESTED",
      "COMPETITOR COMPARISON",
    ]) {
      await expect(
        panel.getByText(signal, { exact: true }).or(
          panel.getByText(signal.toLowerCase(), { exact: true }),
        ),
      ).toBeVisible();
    }
    await expect(panel).not.toContainText("No validated boolean qualification signals.");
    await expect(page.getByText("Persisted Lead Timeline")).toBeVisible();
    await expect(page.getByText("HOT PRIORITY")).toBeVisible();
    await expect(page.getByText(/External intake received/)).toBeVisible();

    await page.getByRole("button", { name: "Internal Alerts" }).click();
    await expect(page.getByText("Internal Alert Queue", { exact: true })).toBeVisible();
    await expect(page.getByText(/Active alerts \(\d+\)/i)).toBeVisible();
    const leadAlert = page
      .getByText(new RegExp(leadName))
      .first()
      .locator("xpath=ancestor::div[contains(@class,'grid')]")
      .first();
    await expect(leadAlert).toBeVisible();
    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect
      .poll(() => readMetric(page, "stage3-metric-external-intake"))
      .toBe(baseline.external + 1);
    expect(await readMetric(page, "stage3-metric-hot-intake")).toBe(
      baseline.hot + 1,
    );
    expect(await readMetric(page, "stage3-metric-ai-qualified")).toBe(
      baseline.ai,
    );
    assertNoRuntimeIssues();
  } finally {
    await cleanupStage3Lead(leadId, organizationId);
  }
});
