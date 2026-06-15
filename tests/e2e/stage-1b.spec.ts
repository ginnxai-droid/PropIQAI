import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEFAULT_PASSWORD ?? "";
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function signIn(page: Page, email: string, userPassword = password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Developer Control Board")).toBeVisible();
}

test.beforeAll(() => {
  if (!password || !supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Stage 1B browser tests require Supabase credentials and SEED_DEFAULT_PASSWORD.",
    );
  }
});

test("valid roles use database authorization, refresh sessions, and log out", async ({
  browser,
}) => {
  for (const account of [
    { email: "owner@propiq.local", role: "OWNER" },
    { email: "manager@propiq.local", role: "MANAGER" },
    { email: "executive@propiq.local", role: "EXECUTIVE" },
  ]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, account.email);
    await expect(page.getByText(account.role, { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Projects" }).click();
    await expect(page.getByRole("button", { name: "Add New Project" })).toHaveCount(
      account.role === "OWNER" ? 1 : 0,
    );
    if (account.role === "EXECUTIVE") {
      await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);
      await page.getByRole("button", { name: "Settings & Webhook" }).click();
      await expect(
        page.getByText(/Stage 3 website, manual UI, and authenticated webhook intake/),
      ).toBeVisible();
      await expect(page.locator("main input, main select, main textarea")).toHaveCount(
        0,
      );
      await expect(page.locator("main form, main button")).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Lead Inbox" }).click();
    await expect(page.getByRole("button", { name: "Add Lead" })).toHaveCount(
      account.role === "EXECUTIVE" ? 0 : 1,
    );

    await page.evaluate(() => localStorage.setItem("activeRole", "OWNER"));
    await page.reload();
    await expect(page.getByText(account.role, { exact: true }).first()).toBeVisible();

    await page.getByTitle("Sign out").click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await context.close();
  }
});

test("invalid credentials fail without exposing sensitive values", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@propiq.local");
  await page.getByLabel("Password").fill("incorrect-development-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(password);
});

test("an invalid stored access token returns the user to sign-in", async ({
  page,
}) => {
  await signIn(page, "owner@propiq.local");
  await page.evaluate(() => {
    const authKey = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
    if (!authKey) {
      throw new Error("Supabase auth storage was not found.");
    }
    const stored = JSON.parse(localStorage.getItem(authKey) ?? "{}") as {
      access_token?: string;
      expires_at?: number;
    };
    if (!stored.access_token) {
      throw new Error("Supabase access token was not found.");
    }
    const tokenParts = stored.access_token.split(".");
    if (tokenParts.length !== 3) {
      throw new Error("Supabase access token is not a JWT.");
    }
    tokenParts[2] = "invalidsignature";
    stored.access_token = tokenParts.join(".");
    stored.expires_at = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(authKey, JSON.stringify(stored));
  });

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Secure organization sign-in")).toBeVisible();
  await expect(page.getByText("Workspace unavailable")).toHaveCount(0);
});

test("project and lead workflow persists across reload and a new session", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const marker = Date.now().toString();
  const projectName = `Closure Project ${marker}`;
  const updatedProjectName = `${projectName} Updated`;
  const leadName = `Closure Buyer ${marker}`;

  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, "owner@propiq.local");

  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: "Add New Project" }).click();
  await page.getByPlaceholder("e.g. PropIQ Signature Towers").fill(projectName);
  await page.getByPlaceholder("e.g. Baner, Pune").fill("Pune");
  await page.getByPlaceholder("e.g. P52100085421").fill(`RERA-${marker}`);
  await page.getByPlaceholder("e.g. 7500000").fill("5000000");
  await page.getByPlaceholder("e.g. 15000000").fill("9000000");
  await page.getByRole("button", { name: "Save Approved Project" }).click();
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Edit ${projectName}` }).click();
  await page.getByLabel("Project name").fill(updatedProjectName);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText(updatedProjectName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Lead Inbox" }).click();
  await page.getByRole("button", { name: "Add Lead" }).click();
  await page.getByLabel("Buyer name").fill(leadName);
  await page
    .getByLabel("Phone", { exact: true })
    .fill(`+9193${marker.slice(-8)}`);
  await page.getByLabel("Email", { exact: true }).fill(`closure-${marker}@example.test`);
  await page.locator('select[name="project_id"]').selectOption({
    label: updatedProjectName,
  });
  await page.getByRole("button", { name: "Create Lead" }).click();
  await expect(page.getByText(leadName, { exact: true })).toBeVisible();

  await page.getByLabel("Buyer type").selectOption("FAMILY_BUYER");
  await page.getByLabel("Budget minimum").fill("6000000");
  await page.getByLabel("Budget maximum").fill("9000000");
  await page.getByLabel("Purchase timeline").selectOption("IMMEDIATE");
  await page.getByLabel("Engagement quality").selectOption("HIGH");
  await page
    .getByLabel("Callback responsiveness")
    .selectOption("RESPONSIVE");
  await page.getByLabel("Interested in a site visit").check();
  await page
    .locator('textarea[name="recommended_next_action"]')
    .fill(`Follow up ${marker}`);
  await page.getByRole("button", { name: "Save Qualification" }).click();
  await expect(page.getByText(/Model stage-2-v1/)).toBeVisible();
  await expect(page.getByText(/total: 9\.[0-9]\/10 \(HOT\)/)).toBeVisible();

  await page
    .getByPlaceholder(/Log executive callback discussion text/)
    .fill(`Persistence conversation ${marker}`);
  await page.getByTitle("Append message to timeline log").click();
  await expect(page.getByText(`Persistence conversation ${marker}`)).toBeVisible();

  await page.reload();
  const persistedLeadRow = page.getByRole("row", { name: new RegExp(leadName) });
  await expect(persistedLeadRow).toBeVisible();
  await persistedLeadRow.getByRole("button", { name: "Review Takeover" }).click();
  await expect(page.getByText(`Persistence conversation ${marker}`)).toBeVisible();
  await expect(page.getByText(/total: 9\.[0-9]\/10 \(HOT\)/)).toBeVisible();

  await page.getByTitle("Sign out").click();
  await context.close();

  const nextContext = await browser.newContext();
  const nextPage = await nextContext.newPage();
  await signIn(nextPage, "owner@propiq.local");
  await nextPage.getByRole("button", { name: "Lead Inbox" }).click();
  await nextPage
    .getByPlaceholder(/Search leads by buyer name/)
    .fill(leadName);
  await expect(nextPage.getByText(leadName, { exact: true })).toBeVisible();
  await nextContext.close();
});

test("recovery token changes the password and the original credential is restored", async ({
  page,
  baseURL,
}) => {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const recoveryRedirectUrl = new URL(
    "/reset-password",
    baseURL ?? process.env.APP_URL ?? "http://localhost:3000",
  ).toString();
  const generated = await admin.auth.admin.generateLink({
    type: "recovery",
    email: "owner@propiq.local",
    options: {
      redirectTo: recoveryRedirectUrl,
    },
  });
  expect(generated.error).toBeNull();
  expect(generated.data.properties?.action_link).toBeTruthy();
  const temporaryPassword = `Stage1B-${Date.now()}-Temporary!`;

  try {
    await page.goto(generated.data.properties!.action_link);
    await expect(page.getByText("Set a new password")).toBeVisible();
    await page.locator('input[type="password"]').fill(temporaryPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText(/Password updated/)).toBeVisible();

    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const oldLogin = await client.auth.signInWithPassword({
      email: "owner@propiq.local",
      password,
    });
    expect(oldLogin.error).not.toBeNull();
    const newLogin = await client.auth.signInWithPassword({
      email: "owner@propiq.local",
      password: temporaryPassword,
    });
    expect(newLogin.error).toBeNull();
  } finally {
    const userId = generated.data.user?.id;
    if (userId) {
      const restored = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      expect(restored.error).toBeNull();
    }
  }
});
