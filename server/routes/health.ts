import { Router } from "express";
import type { AppConfig } from "../config";
import { asyncHandler } from "../errors";
import { createAdminSupabaseClient } from "../supabase";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    status: "ok",
    service: "propiq-api",
    timestamp: new Date().toISOString(),
  });
});
healthRouter.get(
  "/db",
  asyncHandler(async (request, response) => {
    const config = request.app.locals.config as AppConfig;
    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      response.status(503).json({
        status: "degraded",
        database: "Not available",
      });
      return;
    }
    const admin = createAdminSupabaseClient(config);
    const { error } = await admin.from("organizations").select("id").limit(1);
    response.status(error ? 503 : 200).json({
      status: error ? "degraded" : "ok",
      database: error ? "Not available" : "reachable",
    });
  }),
);

healthRouter.get("/config", (request, response) => {
  const config = request.app.locals.config as AppConfig;
  response.json({
    status: "ok",
    environment: config.NODE_ENV,
    checks: {
      supabaseUrl: Boolean(config.SUPABASE_URL),
      anonKey: Boolean(config.SUPABASE_ANON_KEY),
      serviceRoleKey: Boolean(config.SUPABASE_SERVICE_ROLE_KEY),
      allowedOrigins: config.ALLOWED_ORIGINS.split(",").filter(Boolean).length,
      webhookSecret: Boolean(config.INTAKE_WEBHOOK_SECRET),
      aiQualificationMode: config.AI_QUALIFICATION_MODE ?? "unavailable",
    },
  });
});
