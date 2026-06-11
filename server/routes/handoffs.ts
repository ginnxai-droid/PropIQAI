import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import type { AppConfig } from "../config";
import { throwDatabaseError } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { handoffCreateSchema } from "../validation";
import { runLeadWorkflow } from "../workflow/orchestrator";

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

    const { error: assignmentError } = await auth.supabase.rpc(
      "assign_lead_secure",
      {
        target_lead_id: input.lead_id,
        target_profile_id: input.assigned_to,
      },
    );
    throwDatabaseError(assignmentError, "The handoff assignee could not be applied.");
    const workflow = await runLeadWorkflow(
      request.app.locals.config as AppConfig,
      {
        organizationId: auth.organizationId,
        leadId: input.lead_id,
        actorProfileId: auth.profileId,
        requestedReasons: [input.reason],
      },
    );
    const data = workflow.handoffs.find(
      (handoff) => handoff.reason === input.reason,
    );
    if (!data) {
      throw new ApiError(
        400,
        "The handoff did not produce an active SLA.",
        "HANDOFF_NOT_APPLICABLE",
      );
    }
    response.status(201).json({ data });
  }),
);
