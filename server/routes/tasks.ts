import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { taskCreateSchema, taskUpdateSchema } from "../validation";

export const tasksRouter = Router();

tasksRouter.post(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "tasks:create");
    const input = taskCreateSchema.parse(request.body);
    const [
      { data: lead, error: leadError },
      { data: assignee, error: assigneeError },
    ] = await Promise.all([
      auth.supabase
        .from("leads")
        .select("id")
        .eq("organization_id", auth.organizationId)
        .eq("id", input.lead_id)
        .maybeSingle(),
      auth.supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", auth.organizationId)
        .eq("profile_id", input.assigned_to)
        .eq("active", true)
        .maybeSingle(),
    ]);
    throwDatabaseError(leadError, "The task lead could not be verified.");
    throwDatabaseError(assigneeError, "The task assignee could not be verified.");
    if (!lead || !assignee) {
      throw new ApiError(
        400,
        "The lead or assignee is not active in this organization.",
        "INVALID_TASK_RELATION",
      );
    }
    const { data, error } = await auth.supabase
      .from("followup_tasks")
      .insert({ ...input, organization_id: auth.organizationId })
      .select()
      .single();
    throwDatabaseError(error, "The task could not be created.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "followup_task",
      entityId: data.id,
      action: "TASK_CREATED",
      newValues: data,
    });
    response.status(201).json({ data });
  }),
);

tasksRouter.patch(
  "/:taskId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "tasks:update");
    const input = taskUpdateSchema.parse(request.body);
    const { data: oldTask, error: oldError } = await auth.supabase
      .from("followup_tasks")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.taskId)
      .maybeSingle();
    throwDatabaseError(oldError, "The task could not be loaded.");
    if (!oldTask) {
      throw new ApiError(404, "Task not found.", "NOT_FOUND");
    }
    const { data, error } = await auth.supabase
      .from("followup_tasks")
      .update(input)
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.taskId)
      .select()
      .single();
    throwDatabaseError(error, "The task could not be updated.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "followup_task",
      entityId: data.id,
      action: "TASK_UPDATED",
      oldValues: oldTask,
      newValues: data,
    });
    response.json({ data });
  }),
);
