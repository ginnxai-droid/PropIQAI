import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { handoffCreateSchema } from "../validation";

export const handoffsRouter = Router();

handoffsRouter.post(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "handoffs:create");
    const input = handoffCreateSchema.parse(request.body);

    const [{ data: lead, error: leadError }, { data: assignee, error: assigneeError }] =
      await Promise.all([
        auth.supabase
          .from("leads")
          .select("id")
          .eq("organization_id", auth.organizationId)
          .eq("id", input.lead_id)
          .maybeSingle(),
        auth.supabase
          .from("organization_members")
          .select("profile_id")
          .eq("organization_id", auth.organizationId)
          .eq("profile_id", input.assigned_to)
          .eq("active", true)
          .maybeSingle(),
      ]);
    throwDatabaseError(leadError, "The handoff lead could not be verified.");
    throwDatabaseError(
      assigneeError,
      "The handoff assignee could not be verified.",
    );
    if (!lead) {
      throw new ApiError(404, "Lead not found.", "NOT_FOUND");
    }
    if (!assignee) {
      throw new ApiError(
        400,
        "The handoff assignee is not active in this organization.",
        "INVALID_ASSIGNEE",
      );
    }

    const { data: existing, error: existingError } = await auth.supabase
      .from("handoffs")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .eq("lead_id", input.lead_id)
      .in("status", ["PENDING", "CONTACTED", "ESCALATED"])
      .maybeSingle();
    throwDatabaseError(existingError, "The existing handoff could not be checked.");

    const values = {
      ...input,
      organization_id: auth.organizationId,
      status: "PENDING",
      escalated_to: null,
      completed_at: null,
    };
    const operation = existing
      ? auth.supabase
          .from("handoffs")
          .update(values)
          .eq("organization_id", auth.organizationId)
          .eq("id", existing.id)
      : auth.supabase.from("handoffs").insert(values);
    const { data, error } = await operation.select().single();
    throwDatabaseError(error, "The handoff could not be created.");

    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "handoff",
      entityId: data.id,
      action: "HANDOFF_CREATED",
      newValues: data,
    });
    response.status(201).json({ data });
  }),
);
