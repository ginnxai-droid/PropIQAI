import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import type { AppConfig } from "../server/config";
import { integrationRegistry } from "../server/services/integrationRegistry";
import { assertPilotDataGuard } from "../server/services/pilotDataGuard";

const execFileAsync = promisify(execFile);

const docs = [
  "docs/STAGE_5A_SECURE_DEMO_ENVIRONMENT_PLAN.md",
  "docs/STAGE_5A_SECURE_DEMO_ENVIRONMENT_REPORT.md",
  "docs/deployment/DEMO_ENVIRONMENT_SETUP.md",
  "docs/deployment/ENVIRONMENT_VARIABLES.md",
  "docs/deployment/SECRET_HANDLING.md",
  "docs/deployment/DEMO_DATA_RESET_RUNBOOK.md",
  "docs/deployment/POST_DEPLOYMENT_SMOKE_TEST.md",
  "docs/deployment/ROLLBACK_RUNBOOK.md",
  "docs/deployment/DEMO_ACCESS_CHECKLIST.md",
  "docs/deployment/HOSTING_OPTIONS.md",
];

const placeholderDocs = docs.map((file) => ({
  file,
  text: readFileSync(path.join(process.cwd(), file), "utf8"),
}));

const config: AppConfig = {
  SUPABASE_URL: "https://demo-project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-that-is-long-enough-for-tests",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-that-is-long-enough-for-tests",
  APP_URL: "https://demo.propiq.example",
  API_PORT: 3001,
  ALLOWED_ORIGINS: "https://demo.propiq.example",
  NODE_ENV: "test",
  INTAKE_WEBHOOK_SECRET: "stage-five-a-webhook-secret",
  AI_QUALIFICATION_MODE: "unavailable",
};

const allowAuth: RequestHandler = (_request, _response, next) => next();

describe("Stage 5A demo readiness", () => {
  it("keeps required Stage 5A documentation present and placeholder-only", () => {
    for (const { file, text } of placeholderDocs) {
      expect(text, file).toMatch(/demo/i);
      expect(text, file).not.toMatch(/postgres(?:ql)?:\/\//i);
      expect(text, file).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
      expect(text, file).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/);
      expect(text, file).not.toMatch(/SEED_DEFAULT_PASSWORD\s*=\s*\S+/);
      expect(text, file).not.toMatch(/INTAKE_WEBHOOK_SECRET\s*=\s*\S+/);
    }
  });

  it("confirms local and staging environment files stay ignored", () => {
    const gitignore = readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
    expect(gitignore).toContain(".env*");
    expect(gitignore).toContain("!.env.example");
    expect(gitignore).toContain(".env.database-closure.local");
  });

  it("guards demo data reset from production or missing mode", () => {
    expect(() =>
      assertPilotDataGuard({
        NODE_ENV: "development",
        PILOT_DATA_MODE: "development",
      }),
    ).not.toThrow();
    expect(() =>
      assertPilotDataGuard({
        NODE_ENV: "production",
        PILOT_DATA_MODE: "development",
      }),
    ).toThrow(/cannot run in production/i);
    expect(() =>
      assertPilotDataGuard({
        NODE_ENV: "development",
      }),
    ).toThrow(/PILOT_DATA_MODE=development/i);
  });

  it("health config reports readiness without secret values", async () => {
    const app = createApp({ config, authMiddleware: allowAuth });
    const response = await request(app).get("/api/health/config").expect(200);
    const body = JSON.stringify(response.body);
    expect(response.body.checks).toMatchObject({
      supabaseUrl: true,
      anonKey: true,
      serviceRoleKey: true,
      webhookSecret: true,
      aiQualificationMode: "unavailable",
    });
    expect(body).not.toContain(config.SUPABASE_URL);
    expect(body).not.toContain(config.SUPABASE_ANON_KEY);
    expect(body).not.toContain(config.SUPABASE_SERVICE_ROLE_KEY);
    expect(body).not.toContain(config.INTAKE_WEBHOOK_SECRET);
  });

  it("keeps unsupported external providers unavailable", () => {
    const unavailable = integrationRegistry
      .filter((integration) =>
        ["WHATSAPP", "TELEPHONY", "META_LEAD_ADS", "CRM_SYNC"].includes(
          integration.provider,
        ),
      )
      .map((integration) => integration.availability);
    expect(unavailable).toEqual([
      "NOT_AVAILABLE",
      "NOT_AVAILABLE",
      "NOT_AVAILABLE",
      "NOT_AVAILABLE",
    ]);
  });

  it("provides a locally executable smoke-test dry run", async () => {
    const result = await execFileAsync(
      process.execPath,
      ["./node_modules/tsx/dist/cli.mjs", "scripts/demo-smoke.ts", "--dry-run"],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        timeout: 30_000,
        windowsHide: true,
      },
    );
    expect(result.stdout).toContain("demo_smoke_dry_run");
    expect(result.stdout).toContain("owner dashboard loads");
    expect(result.stderr).toBe("");
  });
});
