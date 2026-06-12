import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import type { AppConfig } from "../server/config";

const config: AppConfig = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-that-is-long-enough-for-tests",
  SUPABASE_SERVICE_ROLE_KEY: undefined,
  APP_URL: "http://localhost:3000",
  API_PORT: 3001,
  ALLOWED_ORIGINS: "http://localhost:3000",
  NODE_ENV: "test",
  INTAKE_WEBHOOK_SECRET: "stage-three-test-webhook-secret",
  AI_QUALIFICATION_MODE: "local",
};

const rejectAuth: RequestHandler = (_request, response) => {
  response.status(401).json({
    error: { code: "UNAUTHENTICATED", message: "Authentication is required." },
  });
};

describe("API security boundary", () => {
  const app = createApp({ config, authMiddleware: rejectAuth });

  it("keeps the health check public and applies security headers", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejects unauthenticated application requests", async () => {
    const response = await request(app).get("/api/bootstrap").expect(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires the configured secret before public webhook processing", async () => {
    const response = await request(app)
      .post("/api/intake/webhook/unknown")
      .send({ buyer_name: "Webhook Buyer", phone: "+919876543210" })
      .expect(401);
    expect(response.body.error.code).toBe("INVALID_WEBHOOK_SECRET");
  });

  it("rejects origins outside the allowlist", async () => {
    await request(app)
      .get("/api/health")
      .set("Origin", "https://attacker.example")
      .expect(500);
  });
});
