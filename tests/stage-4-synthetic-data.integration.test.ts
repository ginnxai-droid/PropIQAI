import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const shouldRun = process.env.RUN_SUPABASE_INTEGRATION_TESTS === "true";
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function runPilotData() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("npm_execpath is required to run the pilot data test.");
  }
  const result = await execFileAsync(
    process.execPath,
    [npmCli, "run", "pilot-data"],
    {
      cwd: process.cwd(),
      env: { ...process.env, PILOT_DATA_MODE: "development" },
      timeout: 120_000,
      windowsHide: true,
    },
  );
  expect(result.stdout).toContain('"fakeDataOnly":true');
}

describe.skipIf(!shouldRun)("Stage 4 synthetic pilot data", () => {
  it(
    "is repeatable, reset-safe, and contains fake multi-tenant pilot records",
    async () => {
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
          "Synthetic pilot data tests require Supabase URL and service-role key.",
        );
      }
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await runPilotData();
      const first = await admin
        .from("lead_intake_events")
        .select("id, lead_id, duplicate_of_lead_id, processing_status")
        .like("campaign", "stage4-pilot-%");
      expect(first.error).toBeNull();
      expect(first.data).toHaveLength(4);

      await runPilotData();
      const second = await admin
        .from("lead_intake_events")
        .select(
          "id, lead_id, duplicate_of_lead_id, processing_status, ai_status",
        )
        .like("campaign", "stage4-pilot-%");
      expect(second.error).toBeNull();
      expect(second.data).toHaveLength(4);
      expect(
        second.data?.filter((row) => row.processing_status === "DUPLICATE"),
      ).toHaveLength(1);
      expect(
        second.data?.filter(
          (row) =>
            row.processing_status === "PROCESSED" &&
            row.ai_status === "NOT_AVAILABLE",
        ),
      ).toHaveLength(1);

      const leadIds = [
        ...new Set(
          (second.data ?? [])
            .flatMap((row) => [row.lead_id, row.duplicate_of_lead_id])
            .filter(Boolean),
        ),
      ] as string[];
      const [organizations, projects, leads, visits, slas, alerts, failures] =
        await Promise.all([
        admin.from("organizations").select("id"),
        admin.from("projects").select("id"),
        admin
          .from("leads")
          .select("id, email, phone, ai_qualification_status")
          .in("id", leadIds),
        admin.from("site_visits").select("status").in("lead_id", leadIds),
        admin
          .from("sla_events")
          .select("breached")
          .in("lead_id", leadIds)
          .eq("breached", true),
        admin
          .from("internal_alerts")
          .select("alert_type")
          .in("lead_id", leadIds),
        admin
          .from("integration_events")
          .select("processing_status, retry_count")
          .in("lead_id", leadIds)
          .eq("processing_status", "FAILED"),
      ]);
      expect(organizations.error).toBeNull();
      expect(projects.error).toBeNull();
      expect(leads.error).toBeNull();
      expect(visits.error).toBeNull();
      expect(slas.error).toBeNull();
      expect(alerts.error).toBeNull();
      expect(failures.error).toBeNull();
      expect(organizations.data!.length).toBeGreaterThanOrEqual(2);
      expect(projects.data!.length).toBeGreaterThanOrEqual(2);
      expect(leads.data).toHaveLength(3);
      expect(
        leads.data!.every(
          (lead) =>
            lead.email?.endsWith("@example.test") &&
            lead.phone?.startsWith("+919800004"),
        ),
      ).toBe(true);
      expect(
        leads.data?.filter(
          (lead) => lead.ai_qualification_status === "NOT_AVAILABLE",
        ),
      ).toHaveLength(1);
      expect(visits.data?.map((visit) => visit.status)).toEqual(
        expect.arrayContaining(["COMPLETED", "MISSED"]),
      );
      expect(slas.data!.length).toBeGreaterThanOrEqual(1);
      expect(alerts.data?.map((alert) => alert.alert_type)).toContain(
        "SLA_BREACHED",
      );
      expect(failures.data).toEqual([
        { processing_status: "FAILED", retry_count: 2 },
      ]);
    },
    180_000,
  );
});
