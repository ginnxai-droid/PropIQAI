import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { alertUpdateSchema } from "../validation";

export const alertsRouter = Router();

alertsRouter.get(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "alerts:read");
    const { data, error } = await auth.supabase
      .from("internal_alerts")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false });
    throwDatabaseError(error, "Alerts could not be loaded.");
    response.json({ data: data ?? [] });
  }),
);

alertsRouter.patch(
  "/:alertId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "alerts:update");
    const input = alertUpdateSchema.parse(request.body);
    const { data: existing, error: existingError } = await auth.supabase
      .from("internal_alerts")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.alertId)
      .maybeSingle();
    throwDatabaseError(existingError, "The alert could not be loaded.");
    if (!existing) {
      throw new ApiError(404, "Alert not found.", "NOT_FOUND");
    }
    const now = new Date().toISOString();
    const update =
      input.status === "ACKNOWLEDGED"
        ? { status: input.status, acknowledged_at: now }
        : {
            status: input.status,
            acknowledged_at: existing.acknowledged_at ?? now,
            resolved_at: now,
          };
    const { data, error } = await auth.supabase
      .from("internal_alerts")
      .update(update)
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.alertId)
      .select()
      .single();
    throwDatabaseError(error, "The alert could not be updated.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "internal_alert",
      entityId: data.id,
      action: input.status === "ACKNOWLEDGED" ? "ALERT_ACKNOWLEDGED" : "ALERT_RESOLVED",
      oldValues: { status: existing.status },
      newValues: { status: data.status },
    });
    response.json({ data });
  }),
);
