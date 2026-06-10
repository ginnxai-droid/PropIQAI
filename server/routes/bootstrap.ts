import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { throwDatabaseError } from "../database";
import { asyncHandler } from "../errors";

export const bootstrapRouter = Router();

bootstrapRouter.get(
  "/session",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    const { data: profile, error } = await auth.supabase
      .from("profiles")
      .select("id, full_name, email, phone, active")
      .eq("id", auth.profileId)
      .single();
    throwDatabaseError(error, "The user profile could not be loaded.");
    response.json({
      data: {
        user: {
          id: auth.user.id,
          email: auth.user.email,
        },
        profile,
        membership: {
          id: auth.membershipId,
          role: auth.role,
          organization: {
            id: auth.organizationId,
            name: auth.organizationName,
            slug: auth.organizationSlug,
          },
        },
      },
    });
  }),
);

bootstrapRouter.get(
  "/bootstrap",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    const organizationId = auth.organizationId;

    const [
      projectsResult,
      leadsResult,
      conversationsResult,
      handoffsResult,
      visitsResult,
      tasksResult,
      slaEventsResult,
      membersResult,
    ] = await Promise.all([
      auth.supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      auth.supabase
        .from("leads")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      auth.supabase
        .from("conversations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true }),
      auth.supabase
        .from("handoffs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      auth.supabase
        .from("site_visits")
        .select("*")
        .eq("organization_id", organizationId)
        .order("preferred_date", { ascending: true }),
      auth.supabase
        .from("followup_tasks")
        .select("*")
        .eq("organization_id", organizationId)
        .order("due_at", { ascending: true }),
      auth.supabase
        .from("sla_events")
        .select("*")
        .eq("organization_id", organizationId)
        .order("due_at", { ascending: false }),
      auth.supabase
        .from("organization_members")
        .select(
          "id, role, active, profiles!inner(id, full_name, email, phone, active), organization_member_projects!member_projects_membership_same_org_fk(project_id)",
        )
        .eq("organization_id", organizationId)
        .eq("active", true),
    ]);

    const results = [
      projectsResult,
      leadsResult,
      conversationsResult,
      handoffsResult,
      visitsResult,
      tasksResult,
      slaEventsResult,
      membersResult,
    ];
    for (const result of results) {
      throwDatabaseError(result.error, "Application data could not be loaded.");
    }

    response.json({
      data: {
        organization: {
          id: auth.organizationId,
          name: auth.organizationName,
          slug: auth.organizationSlug,
        },
        role: auth.role,
        projects: projectsResult.data ?? [],
        leads: leadsResult.data ?? [],
        conversations: conversationsResult.data ?? [],
        handoffs: handoffsResult.data ?? [],
        siteVisits: visitsResult.data ?? [],
        tasks: tasksResult.data ?? [],
        slaEvents: slaEventsResult.data ?? [],
        members: membersResult.data ?? [],
      },
    });
  }),
);
