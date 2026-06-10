import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { siteVisitCreateSchema, siteVisitUpdateSchema } from "../validation";

export const siteVisitsRouter = Router();

siteVisitsRouter.get(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "visits:read");
    const { data, error } = await auth.supabase
      .from("site_visits")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .order("preferred_date", { ascending: true });
    throwDatabaseError(error, "Site visits could not be loaded.");
    response.json({ data });
  }),
);

siteVisitsRouter.post(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "visits:create");
    const input = siteVisitCreateSchema.parse(request.body);
    const { data: lead, error: leadError } = await auth.supabase
      .from("leads")
      .select("id, project_id, assigned_to")
      .eq("organization_id", auth.organizationId)
      .eq("id", input.lead_id)
      .maybeSingle();
    throwDatabaseError(leadError, "The lead could not be verified.");
    if (!lead || lead.project_id !== input.project_id) {
      throw new ApiError(400, "Lead and project do not match.", "INVALID_PROJECT");
    }
    const assignedTo = input.assigned_to ?? lead.assigned_to ?? auth.profileId;
    const { data: assignee, error: assigneeError } = await auth.supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .eq("profile_id", assignedTo)
      .eq("active", true)
      .maybeSingle();
    throwDatabaseError(
      assigneeError,
      "The site visit assignee could not be verified.",
    );
    if (!assignee) {
      throw new ApiError(
        400,
        "The site visit assignee is not active in this organization.",
        "INVALID_ASSIGNEE",
      );
    }
    const { data, error } = await auth.supabase
      .from("site_visits")
      .insert({
        ...input,
        assigned_to: assignedTo,
        organization_id: auth.organizationId,
      })
      .select()
      .single();
    throwDatabaseError(error, "The site visit could not be created.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "site_visit",
      entityId: data.id,
      action: "SITE_VISIT_CREATED",
      newValues: data,
    });
    response.status(201).json({ data });
  }),
);

siteVisitsRouter.patch(
  "/:visitId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "visits:update");
    const input = siteVisitUpdateSchema.parse(request.body);
    const { data: oldVisit, error: oldError } = await auth.supabase
      .from("site_visits")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.visitId)
      .maybeSingle();
    throwDatabaseError(oldError, "The site visit could not be loaded.");
    if (!oldVisit) {
      throw new ApiError(404, "Site visit not found.", "NOT_FOUND");
    }
    const { data, error } = await auth.supabase
      .from("site_visits")
      .update(input)
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.visitId)
      .select()
      .single();
    throwDatabaseError(error, "The site visit could not be updated.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "site_visit",
      entityId: data.id,
      action: "SITE_VISIT_UPDATED",
      oldValues: oldVisit,
      newValues: data,
    });
    response.json({ data });
  }),
);
