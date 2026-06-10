import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const shouldRun = process.env.RUN_SUPABASE_INTEGRATION_TESTS === "true";
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = process.env.SEED_DEFAULT_PASSWORD ?? "";

const seededTables = [
  "organizations",
  "profiles",
  "organization_members",
  "organization_member_projects",
  "projects",
  "leads",
  "conversations",
  "handoffs",
  "site_visits",
  "followup_tasks",
  "sla_events",
  "audit_logs",
] as const;

async function runSeed() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("npm_execpath is required to run the seed integration test.");
  }
  const result = await execFileAsync(process.execPath, [npmCli, "run", "seed"], {
    cwd: process.cwd(),
    env: process.env,
    timeout: 120_000,
    windowsHide: true,
  });
  expect(result.stdout).toContain("Development seed complete.");
}

describe.skipIf(!shouldRun)("live seed idempotency", () => {
  it(
    "runs twice without duplicating seeded records and refreshes auth credentials",
    async () => {
      if (!supabaseUrl || !anonKey || !serviceRoleKey || !password) {
        throw new Error(
          "Live seed tests require the Supabase URL, anon key, service-role key, and SEED_DEFAULT_PASSWORD.",
        );
      }

      const serviceRole = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await runSeed();
      const firstCounts = await Promise.all(
        seededTables.map(async (table) => {
          const result = await serviceRole
            .from(table)
            .select("*", { count: "exact", head: true });
          expect(result.error).toBeNull();
          return result.count;
        }),
      );

      await runSeed();
      const secondCounts = await Promise.all(
        seededTables.map(async (table) => {
          const result = await serviceRole
            .from(table)
            .select("*", { count: "exact", head: true });
          expect(result.error).toBeNull();
          return result.count;
        }),
      );

      expect(secondCounts).toEqual(firstCounts);

      const loginClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const login = await loginClient.auth.signInWithPassword({
        email: "owner@propiq.local",
        password,
      });
      expect(login.error).toBeNull();
      expect(login.data.user?.email_confirmed_at).toBeTruthy();
      await loginClient.auth.signOut();
    },
    180_000,
  );
});
