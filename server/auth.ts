import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AppConfig } from "./config";
import { ApiError } from "./errors";
import { createUserSupabaseClient } from "./supabase";
import type { OrganizationRole } from "./authorization";

export interface RequestAuth {
  user: User;
  profileId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
  membershipId: string;
  supabase: SupabaseClient;
}

export interface AuthenticatedRequest extends Request {
  auth?: RequestAuth;
}

interface MembershipRow {
  id: string;
  organization_id: string;
  role: OrganizationRole;
  active: boolean;
  organizations:
    | {
        id: string;
        name: string;
        slug: string;
        active: boolean;
      }
    | {
        id: string;
        name: string;
        slug: string;
        active: boolean;
      }[]
    | null;
}

function singleOrganization(
  organization: MembershipRow["organizations"],
): Exclude<MembershipRow["organizations"], null | unknown[]> {
  if (!organization || Array.isArray(organization)) {
    throw new ApiError(403, "Active organization not found.", "NO_ORGANIZATION");
  }
  return organization;
}

export function createAuthMiddleware(config: AppConfig) {
  return async (
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ) => {
    try {
      const authorization = request.header("authorization");
      if (!authorization?.startsWith("Bearer ")) {
        throw new ApiError(401, "Authentication is required.", "UNAUTHENTICATED");
      }

      const accessToken = authorization.slice("Bearer ".length).trim();
      const supabase = createUserSupabaseClient(config, accessToken);
      const { data: authData, error: authError } = await supabase.auth.getUser(
        accessToken,
      );
      if (authError || !authData.user) {
        throw new ApiError(401, "The session is invalid or expired.", "INVALID_SESSION");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, active")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      if (profileError || !profile || profile.active !== true) {
        throw new ApiError(403, "This user profile is disabled.", "PROFILE_DISABLED");
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("organization_members")
        .select(
          "id, organization_id, role, active, organizations!inner(id, name, slug, active)",
        )
        .eq("profile_id", profile.id)
        .eq("active", true);
      if (membershipError) {
        throw new ApiError(403, "Organization membership could not be verified.", "MEMBERSHIP_DENIED");
      }

      const requestedOrganizationId = request.header("x-organization-id");
      const selected = (memberships as MembershipRow[] | null)?.find((membership) => {
        const organization = singleOrganization(membership.organizations);
        return (
          organization.active &&
          (!requestedOrganizationId ||
            membership.organization_id === requestedOrganizationId)
        );
      });
      if (!selected) {
        throw new ApiError(403, "No active organization membership is available.", "MEMBERSHIP_DENIED");
      }

      const organization = singleOrganization(selected.organizations);
      request.auth = {
        user: authData.user,
        profileId: profile.id,
        organizationId: selected.organization_id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        role: selected.role,
        membershipId: selected.id,
        supabase,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getRequestAuth(request: AuthenticatedRequest): RequestAuth {
  if (!request.auth) {
    throw new ApiError(401, "Authentication is required.", "UNAUTHENTICATED");
  }
  return request.auth;
}
