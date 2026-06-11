import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import type { AppConfig } from "../config";
import { requirePermission } from "../authorization";
import { throwDatabaseError } from "../database";
import { asyncHandler } from "../errors";
import { refreshSlaState } from "../workflow/orchestrator";

export const slaRouter = Router();

slaRouter.get(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "sla:read");
    await refreshSlaState(
      request.app.locals.config as AppConfig,
      auth.organizationId,
    );
    const { data, error } = await auth.supabase
      .from("sla_events")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .order("due_at", { ascending: true });
    throwDatabaseError(error, "SLA events could not be loaded.");
    response.json({ data });
  }),
);
