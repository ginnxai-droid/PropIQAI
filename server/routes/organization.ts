import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { canGrantRole, requirePermission } from "../authorization";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { membershipCreateSchema, membershipUpdateSchema } from "../validation";
import { createAdminSupabaseClient } from "../supabase";
import type { AppConfig } from "../config";

export const organizationRouter = Router();

organizationRouter.post(
  "/members",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "members:manage");
    const input = membershipCreateSchema.parse(request.body);
    if (!canGrantRole(auth.role, input.role)) {
      throw new ApiError(403, "You cannot grant that role.", "ROLE_GRANT_DENIED");
    }

    const config = request.app.locals.config as AppConfig;
    const admin = createAdminSupabaseClient(config);
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: `${config.APP_URL}/reset-password`,
        data: {
          full_name: input.full_name,
          phone: input.phone || null,
        },
      });
    if (inviteError || !invited.user) {
      throw new ApiError(
        inviteError?.status === 422 ? 409 : 500,
        inviteError?.status === 422
          ? "A user with this email already exists."
          : "The user invitation could not be created.",
        inviteError?.status === 422 ? "USER_EXISTS" : "INVITE_FAILED",
      );
    }

    try {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .upsert(
          {
            auth_user_id: invited.user.id,
            full_name: input.full_name,
            email: input.email,
            phone: input.phone || null,
            active: true,
          },
          { onConflict: "auth_user_id" },
        )
        .select()
        .single();
      throwDatabaseError(profileError, "The invited profile could not be created.");

      const { data: membership, error: membershipError } = await admin
        .from("organization_members")
        .insert({
          organization_id: auth.organizationId,
          profile_id: profile.id,
          role: input.role,
          active: true,
        })
        .select()
        .single();
      throwDatabaseError(
        membershipError,
        "The organization membership could not be created.",
      );

      if (input.project_ids.length > 0) {
        const { error: assignmentsError } = await admin
          .from("organization_member_projects")
          .insert(
            input.project_ids.map((projectId) => ({
              organization_id: auth.organizationId,
              membership_id: membership.id,
              project_id: projectId,
            })),
          );
        throwDatabaseError(assignmentsError, "Project access could not be assigned.");
      }

      await writeAuditLog(auth.supabase, {
        organizationId: auth.organizationId,
        actorProfileId: auth.profileId,
        entityType: "organization_member",
        entityId: membership.id,
        action: "USER_INVITED",
        newValues: {
          profile_id: profile.id,
          role: membership.role,
          project_ids: input.project_ids,
        },
      });
      response.status(201).json({
        data: {
          membership,
          profile,
        },
      });
    } catch (provisioningError) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(
        invited.user.id,
      );
      if (cleanupError) {
        throw new ApiError(
          500,
          "Invitation provisioning failed and cleanup could not be confirmed.",
          "INVITE_COMPENSATION_FAILED",
        );
      }
      throw provisioningError;
    }
  }),
);

organizationRouter.get(
  "/members",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "members:read");
    const { data, error } = await auth.supabase
      .from("organization_members")
      .select("id, role, active, profiles!inner(id, full_name, email, phone, active)")
      .eq("organization_id", auth.organizationId);
    throwDatabaseError(error, "Organization members could not be loaded.");
    response.json({ data });
  }),
);

organizationRouter.patch(
  "/members/:membershipId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "members:manage");
    const input = membershipUpdateSchema.parse(request.body);
    const { data: oldMembership, error: oldError } = await auth.supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.membershipId)
      .maybeSingle();
    throwDatabaseError(oldError, "The membership could not be loaded.");
    if (!oldMembership) {
      throw new ApiError(404, "Membership not found.", "NOT_FOUND");
    }
    if (input.role && !canGrantRole(auth.role, input.role)) {
      throw new ApiError(403, "You cannot grant that role.", "ROLE_GRANT_DENIED");
    }
    if (oldMembership.profile_id === auth.profileId && input.active === false) {
      throw new ApiError(400, "You cannot disable your own active membership.", "SELF_DISABLE_DENIED");
    }
    const { data, error } = await auth.supabase
      .from("organization_members")
      .update(input)
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.membershipId)
      .select()
      .single();
    throwDatabaseError(error, "The membership could not be updated.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "organization_member",
      entityId: data.id,
      action:
        input.active === false
          ? "USER_DISABLED"
          : input.role
            ? "ROLE_CHANGED"
            : "MEMBERSHIP_UPDATED",
      oldValues: oldMembership,
      newValues: data,
    });
    response.json({ data });
  }),
);
