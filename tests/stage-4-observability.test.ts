import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import type { AppConfig } from "../server/config";
import { validateRuntimeConfig } from "../server/config";

const config: AppConfig = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-that-is-long-enough-for-tests",
  SUPABASE_SERVICE_ROLE_KEY: undefined,
  APP_URL: "http://localhost:3000",
  API_PORT: 3001,
  ALLOWED_ORIGINS: "http://localhost:3000",
  NODE_ENV: "test",
  INTAKE_WEBHOOK_SECRET: "stage-four-test-webhook-secret",
  AI_QUALIFICATION_MODE: "unavailable",
};

const allowAuth: RequestHandler = (_request, _response, next) => next();

describe("Stage 4 health and observability", () => {
  const app = createApp({ config, authMiddleware: allowAuth });

  it("returns a request ID on successful and failed responses", async () => {
    const health = await request(app)
      .get("/api/health")
      .set("x-request-id", "pilot-request-1")
      .expect(200);
    expect(health.headers["x-request-id"]).toBe("pilot-request-1");

    const missing = await request(app).get("/api/does-not-exist").expect(404);
    expect(missing.headers["x-request-id"]).toEqual(expect.any(String));
    expect(missing.body.error.requestId).toBe(
      missing.headers["x-request-id"],
    );
    expect(JSON.stringify(missing.body)).not.toContain("stack");
  });

  it("exposes configuration presence without exposing secret values", async () => {
    const response = await request(app).get("/api/health/config").expect(200);
    expect(response.body).toMatchObject({
      status: "ok",
      environment: "test",
      checks: {
        anonKey: true,
        serviceRoleKey: false,
        webhookSecret: true,
        aiQualificationMode: "unavailable",
      },
    });
    const body = JSON.stringify(response.body);
    expect(body).not.toContain(config.SUPABASE_ANON_KEY);
    expect(body).not.toContain(config.INTAKE_WEBHOOK_SECRET);
  });

  it("rejects unsafe production configuration", () => {
    expect(() =>
      validateRuntimeConfig({
        ...config,
        NODE_ENV: "production",
      }),
    ).toThrow(/service role key/i);
    expect(() =>
      validateRuntimeConfig({
        ...config,
        NODE_ENV: "production",
        SUPABASE_SERVICE_ROLE_KEY:
          "service-role-key-that-is-long-enough-for-production",
      }),
    ).toThrow(/localhost/i);
  });
});
