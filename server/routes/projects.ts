import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { projectCreateSchema, projectUpdateSchema } from "../validation";

export const projectsRouter = Router();

projectsRouter.get(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "projects:read");
    const { data, error } = await auth.supabase
      .from("projects")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false });
    throwDatabaseError(error, "Projects could not be loaded.");
    response.json({ data });
  }),
);

projectsRouter.get(
  "/:projectId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "projects:read");
    const { data, error } = await auth.supabase
      .from("projects")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.projectId)
      .maybeSingle();
    throwDatabaseError(error, "The project could not be loaded.");
    if (!data) {
      throw new ApiError(404, "Project not found.", "NOT_FOUND");
    }
    response.json({ data });
  }),
);

projectsRouter.post(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "projects:manage");
    const input = projectCreateSchema.parse(request.body);
    const { data, error } = await auth.supabase
      .from("projects")
      .insert({ ...input, organization_id: auth.organizationId })
      .select()
      .single();
    throwDatabaseError(error, "The project could not be created.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "project",
      entityId: data.id,
      action: "PROJECT_CREATED",
      newValues: data,
    });
    response.status(201).json({ data });
  }),
);

projectsRouter.patch(
  "/:projectId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "projects:manage");
    const input = projectUpdateSchema.parse(request.body);
    const { data: oldProject, error: oldError } = await auth.supabase
      .from("projects")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.projectId)
      .maybeSingle();
    throwDatabaseError(oldError, "The project could not be loaded.");
    if (!oldProject) {
      throw new ApiError(404, "Project not found.", "NOT_FOUND");
    }
    const { data, error } = await auth.supabase
      .from("projects")
      .update(input)
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.projectId)
      .select()
      .single();
    throwDatabaseError(error, "The project could not be updated.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "project",
      entityId: data.id,
      action: "PROJECT_UPDATED",
      oldValues: oldProject,
      newValues: data,
    });
    response.json({ data });
  }),
);
