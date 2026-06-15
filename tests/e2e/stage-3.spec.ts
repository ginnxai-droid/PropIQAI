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

test("admin completes the visible Stage 3 intake, workflow, duplicate, alerts, and metrics journey", async ({
  page,
}) => {
  const assertNoRuntimeIssues = installRuntimeGuard(page);
  const marker = Date.now().toString();
  const leadName = `Stage Three Admin Buyer ${marker}`;
  const campaign = `stage-3-admin-${marker}`;
  const phone = `+9198${marker.slice(-8)}`;
  const { projectId, organizationId } = await getStage3Project();
  let leadId = "";

  try {
    await signInAsAdmin(page);
    const baseline = {
      external: await readMetric(page, "stage3-metric-external-intake"),
      hot: await readMetric(page, "stage3-metric-hot-intake"),
      duplicate: await readMetric(page, "stage3-metric-duplicate-intake"),
      ai: await readMetric(page, "stage3-metric-ai-qualified"),
    };

    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await page.getByRole("button", { name: "Add Lead" }).click();
    await expect(page.getByText("Stage 3 Manual Intake")).toBeVisible();
    await assertStage3FieldsVisible(page);
    await page.getByLabel("Buyer name").fill(leadName);
    await page.getByLabel("Phone", { exact: true }).fill(phone);
    await page
      .getByLabel("Email", { exact: true })
      .fill(`stage-three-admin-${marker}@example.test`);
    await page.locator('select[name="project_id"]').selectOption(projectId);
    await page.getByLabel("Budget minimum (INR)").fill("12000000");
    await page.getByLabel("Budget maximum (INR)").fill("15000000");
    await page.getByLabel("Budget description").fill("1.2 to 1.5 crore");
    await page.getByLabel("Purchase timeline").selectOption("IMMEDIATE");
    await page.getByLabel("Source").selectOption("WEBSITE");
    await page.getByLabel("Channel").selectOption("WEBSITE_FORM");
    await page.getByLabel("Campaign").fill(campaign);
    await page.getByLabel("Received time").fill("2026-06-14T12:00");
    await page.getByLabel("Preferred location").fill("Pune");
    await page
      .getByLabel("Enquiry message")
      .fill(
        "Urgent site visit. I want to negotiate, block a unit, compare a competitor, and clarify RERA possession with a human.",
      );
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

    const intakeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/intake/manual") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create Lead" }).click();
    const intakeResponse = await intakeResponsePromise;
    expect(intakeResponse.status()).toBe(201);
    const intakeBody = await intakeResponse.json();
    expect(intakeBody.data.outcome).toBe("CREATED");
    expect(intakeBody.data.aiStatus).toBe("COMPLETED");
    expect(intakeBody.data.lead).toMatchObject({
      source: "WEBSITE",
      campaign,
      preferred_location: "Pune",
      purchase_timeline: "IMMEDIATE",
      ai_qualification_status: "COMPLETED",
      is_after_hours: true,
      priority: "HOT",
    });
    expect(intakeBody.data.lead.intake_channel).toBe("WEBSITE_FORM");
    expect(intakeBody.data.lead.received_at).toBeTruthy();
    expect(intakeBody.data.lead.ai_confidence).not.toBeNull();
    expect(intakeBody.data.lead.ai_signals).toMatchObject({
      site_visit_request: true,
      negotiation_intent: true,
      booking_intent: true,
      legal_or_rera_question: true,
      human_requested: true,
      competitor_comparison: true,
    });
    leadId = intakeBody.data.lead.id;

    const panel = page.getByTestId("external-intake-ai-panel");
    await expect(page.getByTestId("stage3-field-source")).toHaveText("WEBSITE");
    await expect(page.getByTestId("stage3-field-channel")).toHaveText("WEBSITE_FORM");
    await expect(page.getByTestId("stage3-field-campaign")).toHaveText(campaign);
    await expect(page.getByTestId("stage3-field-received")).not.toHaveText("Not available");
    await expect(page.getByTestId("stage3-field-preferred-location")).toHaveText("Pune");
    await expect(page.getByTestId("stage3-field-duplicate-state")).toHaveText("No duplicate detected");
    await expect(page.getByTestId("stage3-field-after-hours-state")).toHaveText("After-hours intake");
    await expect(page.getByTestId("stage3-field-ai-confidence")).not.toHaveText("Not available");
    await expect(panel).toContainText("COMPLETED");
    await expect(panel).not.toContainText("No validated boolean qualification signals.");
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
    await expect(page.getByText("Persisted Lead Timeline")).toBeVisible();
    await expect(page.getByText(/External intake received/)).toBeVisible();
    await expect(page.getByText("HOT PRIORITY")).toBeVisible();

    await page.getByLabel("Apartment preference").fill("3 BHK east-facing");
    const qualificationResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/leads/${leadId}`) &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Save Qualification" }).click();
    expect((await qualificationResponse).status()).toBe(200);
    await expect(page.getByRole("status")).toContainText(
      "Lead profile and qualification saved",
    );

    const handoffResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/handoffs") &&
        ["POST", "PATCH"].includes(response.request().method()),
    );
    await page.getByRole("button", { name: /Handoff/ }).click();
    expect((await handoffResponse).status()).toBeLessThan(300);
    await expect(page.getByRole("status")).toContainText(
      "Handoff and SLA workflow updated",
    );

    for (const [button, message] of [
      ["Mark Qualified", "Lead marked qualified."],
      ["Mark Contacted", "Lead marked contacted."],
      ["Mark Booked", "Lead marked booked."],
      ["Move to Lost", "Lead moved to lost."],
    ] as const) {
      const statusResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/leads/${leadId}/status`) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: new RegExp(button) }).click();
      expect((await statusResponse).status()).toBe(200);
      await expect(page.getByRole("status")).toContainText(message);
    }

    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await page.getByRole("button", { name: "Add Lead" }).click();
    await assertStage3FieldsVisible(page);
    await page.getByLabel("Buyer name").fill(`${leadName} Duplicate`);
    await page.getByLabel("Phone", { exact: true }).fill(phone);
    await page
      .getByLabel("Email", { exact: true })
      .fill(`duplicate-stage-three-${marker}@example.test`);
    await page.locator('select[name="project_id"]').selectOption(projectId);
    await page.getByLabel("Channel").selectOption("WEBSITE_FORM");
    await page.getByLabel("Campaign").fill(`${campaign}-duplicate`);
    await page.getByLabel("Enquiry message").fill("Duplicate follow-up.");
    const duplicateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/intake/manual") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create Lead" }).click();
    const duplicateResponse = await duplicateResponsePromise;
    expect(duplicateResponse.status()).toBe(200);
    const duplicateBody = await duplicateResponse.json();
    expect(duplicateBody.data.outcome).toBe("DUPLICATE");
    expect(duplicateBody.data.lead.id).toBe(leadId);
    expect(duplicateBody.data.duplicateReasons).toEqual(
      expect.arrayContaining(["SAME_PHONE", "SAME_PHONE_AND_PROJECT"]),
    );
    await expect(page.getByTestId("stage3-field-duplicate-state")).toHaveText(
      "Duplicate intake detected",
    );
    await expect(page.getByText(/Duplicate intake received/)).toBeVisible();

    await page.getByRole("button", { name: "Internal Alerts" }).click();
    await expect(page.getByText("Internal Alert Queue", { exact: true })).toBeVisible();
    await expect(page.getByText(/Active alerts \(\d+\)/i)).toBeVisible();
    const duplicateAlert = page
      .locator("div.grid.gap-4.p-4")
      .filter({ hasText: leadName })
      .filter({ hasText: "DUPLICATE LEAD DETECTED" })
      .first();
    await expect(duplicateAlert).toContainText("DUPLICATE LEAD DETECTED");
    await expect(duplicateAlert).toContainText(leadName);
    const acknowledgeResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/alerts/") &&
        response.request().method() === "PATCH",
    );
    await duplicateAlert.getByRole("button", { name: "Acknowledge" }).click();
    expect((await acknowledgeResponse).status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("Alert acknowledged.");
    await expect(duplicateAlert).toContainText("ACKNOWLEDGED");
    const resolveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/alerts/") &&
        response.request().method() === "PATCH",
    );
    await duplicateAlert.getByRole("button", { name: "Resolve" }).click();
    expect((await resolveResponse).status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("Alert resolved.");
    await expect(duplicateAlert).toHaveCount(0);

    await page.getByRole("button", { name: "SLA Alerts" }).click();
    await expect(
      page.getByText("Active SLA Breach Resolution Center"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Settings & Webhook" }).click();
    await expect(page.getByText("Secure Foundation Settings")).toBeVisible();
    await expect(
      page.getByText(
        /Stage 3 website, manual UI, and authenticated webhook intake/,
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect
      .poll(() => readMetric(page, "stage3-metric-external-intake"))
      .toBe(baseline.external + 2);
    expect(await readMetric(page, "stage3-metric-hot-intake")).toBe(
      baseline.hot + 1,
    );
    expect(await readMetric(page, "stage3-metric-duplicate-intake")).toBe(
      baseline.duplicate + 1,
    );
    expect(await readMetric(page, "stage3-metric-ai-qualified")).toBe(
      baseline.ai + 1,
    );
    expect(await readMetric(page, "metric-after-hours")).toBeGreaterThanOrEqual(
      1,
    );

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await page.getByRole("button", { name: "Add Lead" }).click();
    await assertStage3FieldsVisible(page);
    const budgetWidth = await page
      .getByLabel("Budget minimum (INR)")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(budgetWidth).toBeGreaterThan(140);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await assertStage3FieldsVisible(page);
    const mobileBudgetWidth = await page
      .getByLabel("Budget minimum (INR)")
      .evaluate((element) => element.getBoundingClientRect().width);
    const mobileSidebarWidth = await page
      .getByTestId("primary-sidebar")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(mobileBudgetWidth).toBeGreaterThan(200);
    expect(mobileSidebarWidth).toBeLessThanOrEqual(64);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    assertNoRuntimeIssues();
  } finally {
    await cleanupStage3Lead(leadId, organizationId);
  }
});

test("failed qualification action shows an error instead of silently doing nothing", async ({
  page,
}) => {
  const marker = Date.now().toString();
  const { admin, projectId, organizationId } = await getStage3Project();
  const lead = await admin
    .from("leads")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      name: `Stage Three Failure Buyer ${marker}`,
      phone: `+9177${marker.slice(-8)}`,
      source: "MANUAL",
      status: "NEW",
      priority: "WARM",
      score: 5,
      ai_qualification_status: "NOT_AVAILABLE",
    })
    .select("id")
    .single();
  expect(lead.error).toBeNull();
  const leadId = lead.data!.id;
  const assertNoUnexpectedRuntimeIssues = installRuntimeGuard(page, [
    { path: new RegExp(`/api/leads/${leadId}$`), status: 500 },
  ]);
  try {
    await signInAsAdmin(page);
    await page.route(`**/api/leads/${leadId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "TEST_FAILURE",
              message: "Qualification could not be saved.",
            },
          }),
        });
        return;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await page.getByText(`Stage Three Failure Buyer ${marker}`).click();
    await expect(page.getByText("External Intake And AI")).toBeVisible();
    await page.getByRole("button", { name: "Save Qualification" }).click();
    await expect(
      page.getByText("Qualification could not be saved.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    assertNoUnexpectedRuntimeIssues();
  } finally {
    await cleanupStage3Lead(leadId, organizationId);
  }
});
