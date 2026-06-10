import { createAdminSupabaseClient } from "../server/supabase";
import { loadConfig } from "../server/config";

if (process.env.NODE_ENV === "production") {
  throw new Error("Development seed data cannot be loaded in production.");
}

const config = loadConfig();
const admin = createAdminSupabaseClient(config);
const password = process.env.SEED_DEFAULT_PASSWORD;
if (!password || password.length < 12) {
  throw new Error(
    "SEED_DEFAULT_PASSWORD must be set to a development-only value of at least 12 characters.",
  );
}

interface SeedUser {
  email: string;
  fullName: string;
  role: "OWNER" | "MANAGER" | "EXECUTIVE" | "ADMIN";
}

async function requireData<T>(
  operation: PromiseLike<{ data: T; error: { message: string } | null }>,
  label: string,
): Promise<NonNullable<T>> {
  const { data, error } = await operation;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  if (data === null) {
    throw new Error(`${label}: no data returned`);
  }
  return data as NonNullable<T>;
}

async function optionalData<T>(
  operation: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string,
): Promise<T | null> {
  const { data, error } = await operation;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

async function ensureAuthUser(user: SeedUser) {
  for (let page = 1; page <= 10; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) {
      throw new Error(`List auth users: ${result.error.message}`);
    }
    const existing = result.data.users.find(
      (candidate) => candidate.email?.toLowerCase() === user.email.toLowerCase(),
    );
    if (existing) {
      const updated = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      });
      if (updated.error) {
        throw new Error(
          `Update auth user ${user.email}: ${updated.error.message}`,
        );
      }
      return existing.id;
    }
    if (result.data.users.length < 100) {
      break;
    }
  }

  const created = await admin.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: user.fullName },
  });
  if (created.error || !created.data.user) {
    throw new Error(
      `Create auth user ${user.email}: ${
        created.error?.message ?? "no user returned"
      }`,
    );
  }
  return created.data.user.id;
}

async function ensureOrganization(name: string, slug: string) {
  const result = await requireData(
    admin
      .from("organizations")
      .upsert({ name, slug, active: true }, { onConflict: "slug" })
      .select("id, name, slug")
      .single(),
    `Upsert organization ${slug}`,
  );
  return result;
}

async function ensureMembership(
  organizationId: string,
  user: SeedUser,
) {
  const authUserId = await ensureAuthUser(user);
  const profile = await requireData(
    admin
      .from("profiles")
      .upsert(
        {
          auth_user_id: authUserId,
          full_name: user.fullName,
          email: user.email,
          active: true,
        },
        { onConflict: "auth_user_id" },
      )
      .select("id")
      .single(),
    `Upsert profile ${user.email}`,
  );
  const membership = await requireData(
    admin
      .from("organization_members")
      .upsert(
        {
          organization_id: organizationId,
          profile_id: profile.id,
          role: user.role,
          active: true,
        },
        { onConflict: "organization_id,profile_id" },
      )
      .select("id")
      .single(),
    `Upsert membership ${user.email}`,
  );
  return { profileId: profile.id, membershipId: membership.id };
}

async function ensureProject(
  organizationId: string,
  project: {
    name: string;
    location: string;
    developer_name: string;
    rera_number: string;
    price_min: number;
    price_max: number;
    possession_date: string;
    description: string;
  },
) {
  return requireData(
    admin
      .from("projects")
      .upsert(
        {
          organization_id: organizationId,
          ...project,
          active: true,
          amenities: ["Clubhouse", "Security", "Parking"],
          faqs: [
            {
              question: "Is the project RERA registered?",
              answer: `Yes. Registration: ${project.rera_number}.`,
            },
          ],
          working_hours: "09:00-18:00",
        },
        { onConflict: "organization_id,rera_number" },
      )
      .select("id")
      .single(),
    `Upsert project ${project.name}`,
  );
}

async function assignProject(
  organizationId: string,
  membershipId: string,
  projectId: string,
) {
  return requireData(
    admin
      .from("organization_member_projects")
      .upsert(
        {
          organization_id: organizationId,
          membership_id: membershipId,
          project_id: projectId,
        },
        {
          onConflict: "membership_id,project_id",
          ignoreDuplicates: false,
        },
      )
      .select("organization_id, membership_id, project_id")
      .single(),
    "Assign project",
  );
}

async function ensureLead(
  organizationId: string,
  projectId: string,
  assignedTo: string,
  lead: {
    name: string;
    phone: string;
    email: string;
    source: "MISSED_CALL" | "WHATSAPP" | "WEBSITE" | "MANUAL";
    priority: "HOT" | "WARM" | "NURTURE" | "COLD";
    status: "NEW" | "CONTACTED" | "QUALIFIED" | "NURTURE";
    is_after_hours: boolean;
    first_response_at?: string;
  },
) {
  const existing = await optionalData<{ id: string }>(
    admin
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .eq("phone", lead.phone)
      .maybeSingle(),
    `Find lead ${lead.phone}`,
  );
  const payload = {
    organization_id: organizationId,
    project_id: projectId,
    assigned_to: assignedTo,
    ...lead,
    buyer_type: "FAMILY_BUYER",
    apartment_preference: "2BHK",
    budget_min: 7_500_000,
    budget_max: 10_500_000,
    purchase_timeline: "WITHIN_3_MONTHS",
    site_visit_interest: lead.priority === "HOT",
    score:
      lead.priority === "HOT"
        ? 9
        : lead.priority === "WARM"
          ? 7
          : lead.priority === "NURTURE"
            ? 4
            : 2,
    sla_deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
    ai_summary: "Development seed record. No AI processing was performed.",
    recommended_next_action: "Review and contact the buyer.",
  };

  if (existing) {
    return requireData(
      admin
        .from("leads")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single(),
      `Update lead ${lead.phone}`,
    );
  }
  return requireData(
    admin.from("leads").insert(payload).select("id").single(),
    `Create lead ${lead.phone}`,
  );
}

async function ensureConversation(
  organizationId: string,
  leadId: string,
  createdBy: string,
) {
  const existing = await optionalData<{ id: string }>(
    admin
      .from("conversations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .eq("summary", "Development seed conversation.")
      .maybeSingle(),
    "Find development conversation",
  );
  if (existing) {
    return existing;
  }
  return requireData(
    admin
      .from("conversations")
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        channel: "MANUAL",
        transcript: [
          {
            speaker: "Executive",
            text: "Development seed conversation.",
            time: new Date().toISOString(),
          },
        ],
        summary: "Development seed conversation.",
        sentiment: "neutral",
        created_by: createdBy,
      })
      .select("id")
      .single(),
    "Create development conversation",
  );
}

async function ensureSiteVisit(
  organizationId: string,
  leadId: string,
  projectId: string,
  assignedTo: string,
) {
  const existing = await optionalData<{ id: string }>(
    admin
      .from("site_visits")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .eq("preferred_date", "2027-01-15")
      .maybeSingle(),
    "Find development site visit",
  );
  if (existing) {
    return existing;
  }
  return requireData(
    admin
      .from("site_visits")
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        project_id: projectId,
        preferred_date: "2027-01-15",
        preferred_time: "11:00",
        visitors_count: 2,
        buyer_location: "Pune",
        needs_directions: true,
        family_attending: true,
        status: "CONFIRMED",
        reminder_status: "PENDING",
        assigned_to: assignedTo,
      })
      .select("id")
      .single(),
    "Create development site visit",
  );
}

async function ensureHandoff(
  organizationId: string,
  leadId: string,
  assignedTo: string,
) {
  const existing = await optionalData<{ id: string }>(
    admin
      .from("handoffs")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .in("status", ["PENDING", "CONTACTED", "ESCALATED"])
      .maybeSingle(),
    "Find development handoff",
  );
  if (existing) {
    return existing;
  }
  return requireData(
    admin
      .from("handoffs")
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        assigned_to: assignedTo,
        reason: "HOT_LEAD",
        priority: "HOT",
        sla_deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
        status: "PENDING",
      })
      .select("id")
      .single(),
    "Create development handoff",
  );
}

async function ensureSlaEvent(
  organizationId: string,
  leadId: string,
  handoffId: string,
  assignedTo: string,
) {
  const existing = await optionalData<{ id: string }>(
    admin
      .from("sla_events")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .eq("event_type", "FIRST_RESPONSE")
      .maybeSingle(),
    "Find development SLA event",
  );
  if (existing) {
    return existing;
  }
  return requireData(
    admin
      .from("sla_events")
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        handoff_id: handoffId,
        assigned_to: assignedTo,
        event_type: "FIRST_RESPONSE",
        due_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        breached: false,
        escalation_level: 0,
      })
      .select("id")
      .single(),
    "Create development SLA event",
  );
}

async function ensureAuditLog(
  organizationId: string,
  actorProfileId: string,
  leadId: string,
) {
  const existing = await optionalData<{ id: string }>(
    admin
      .from("audit_logs")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("entity_id", leadId)
      .eq("action", "DEVELOPMENT_SEED_VERIFIED")
      .maybeSingle(),
    "Find development audit log",
  );
  if (existing) {
    return existing;
  }
  return requireData(
    admin
      .from("audit_logs")
      .insert({
        organization_id: organizationId,
        actor_profile_id: actorProfileId,
        entity_type: "lead",
        entity_id: leadId,
        action: "DEVELOPMENT_SEED_VERIFIED",
        metadata: { source: "scripts/seed.ts" },
      })
      .select("id")
      .single(),
    "Create development audit log",
  );
}

async function main() {
  const alpha = await ensureOrganization(
    "PropIQ Demo Builders",
    "propiq-demo-builders",
  );
  const beta = await ensureOrganization(
    "Boundary Test Builders",
    "boundary-test-builders",
  );

  const owner = await ensureMembership(alpha.id, {
    email: "owner@propiq.local",
    fullName: "Demo Owner",
    role: "OWNER",
  });
  const manager = await ensureMembership(alpha.id, {
    email: "manager@propiq.local",
    fullName: "Demo Manager",
    role: "MANAGER",
  });
  const executive = await ensureMembership(alpha.id, {
    email: "executive@propiq.local",
    fullName: "Demo Executive",
    role: "EXECUTIVE",
  });
  const administrator = await ensureMembership(alpha.id, {
    email: "admin@propiq.local",
    fullName: "Demo Administrator",
    role: "ADMIN",
  });
  const boundaryOwner = await ensureMembership(beta.id, {
    email: "owner@boundary.local",
    fullName: "Boundary Owner",
    role: "OWNER",
  });

  const heights = await ensureProject(alpha.id, {
    name: "PropIQ Heights",
    location: "Pune, Maharashtra",
    developer_name: "PropIQ Demo Builders",
    rera_number: "P52100000001",
    price_min: 7_500_000,
    price_max: 14_000_000,
    possession_date: "2028-03-31",
    description: "Development-only seed project for Stage 1 validation.",
  });
  const urbanVista = await ensureProject(beta.id, {
    name: "Urban Vista",
    location: "Bengaluru, Karnataka",
    developer_name: "Boundary Test Builders",
    rera_number: "PRM-KA-RERA-0001",
    price_min: 8_500_000,
    price_max: 16_000_000,
    possession_date: "2028-09-30",
    description: "Second-tenant project used to validate isolation.",
  });
  const restrictedProject = await ensureProject(alpha.id, {
    name: "PropIQ Residences",
    location: "Mumbai, Maharashtra",
    developer_name: "PropIQ Demo Builders",
    rera_number: "P51900000002",
    price_min: 12_000_000,
    price_max: 22_000_000,
    possession_date: "2028-12-31",
    description: "Project used to validate executive access boundaries.",
  });

  await Promise.all([
    assignProject(alpha.id, owner.membershipId, heights.id),
    assignProject(alpha.id, manager.membershipId, heights.id),
    assignProject(alpha.id, executive.membershipId, heights.id),
    assignProject(alpha.id, administrator.membershipId, heights.id),
    assignProject(alpha.id, owner.membershipId, restrictedProject.id),
    assignProject(alpha.id, manager.membershipId, restrictedProject.id),
    assignProject(alpha.id, administrator.membershipId, restrictedProject.id),
    assignProject(beta.id, boundaryOwner.membershipId, urbanVista.id),
  ]);

  const respondedAt = new Date(Date.now() - 5 * 60_000).toISOString();
  const alphaLeads = await Promise.all([
    ensureLead(alpha.id, heights.id, executive.profileId, {
      name: "Hot Missed Call",
      phone: "+919100000001",
      email: "hot@example.test",
      source: "MISSED_CALL",
      priority: "HOT",
      status: "QUALIFIED",
      is_after_hours: true,
      first_response_at: respondedAt,
    }),
    ensureLead(alpha.id, heights.id, executive.profileId, {
      name: "Warm Website Lead",
      phone: "+919100000002",
      email: "warm@example.test",
      source: "WEBSITE",
      priority: "WARM",
      status: "CONTACTED",
      is_after_hours: false,
      first_response_at: respondedAt,
    }),
    ensureLead(alpha.id, heights.id, executive.profileId, {
      name: "Nurture Buyer",
      phone: "+919100000003",
      email: "nurture@example.test",
      source: "WHATSAPP",
      priority: "NURTURE",
      status: "NURTURE",
      is_after_hours: false,
    }),
    ensureLead(alpha.id, heights.id, executive.profileId, {
      name: "Cold Manual Lead",
      phone: "+919100000004",
      email: "cold@example.test",
      source: "MANUAL",
      priority: "COLD",
      status: "NEW",
      is_after_hours: false,
    }),
  ]);
  await ensureLead(beta.id, urbanVista.id, boundaryOwner.profileId, {
    name: "Other Organization Lead",
    phone: "+919200000001",
    email: "isolated@example.test",
    source: "WEBSITE",
    priority: "HOT",
    status: "NEW",
    is_after_hours: false,
  });
  await ensureLead(alpha.id, restrictedProject.id, manager.profileId, {
    name: "Manager Restricted Lead",
    phone: "+919100000005",
    email: "manager-only@example.test",
    source: "MANUAL",
    priority: "WARM",
    status: "NEW",
    is_after_hours: false,
  });

  const existingTask = await optionalData<{ id: string }>(
    admin
      .from("followup_tasks")
      .select("id")
      .eq("organization_id", alpha.id)
      .eq("lead_id", alphaLeads[0].id)
      .eq("task_type", "CALLBACK")
      .eq("status", "PENDING")
      .maybeSingle(),
    "Find development task",
  );
  if (!existingTask) {
    await requireData(
      admin
        .from("followup_tasks")
        .insert({
          organization_id: alpha.id,
          lead_id: alphaLeads[0].id,
          assigned_to: executive.profileId,
          task_type: "CALLBACK",
          due_at: new Date(Date.now() + 60 * 60_000).toISOString(),
          status: "PENDING",
          notes: "Development seed callback.",
        })
        .select("id")
        .single(),
      "Create development task",
    );
  }

  const handoff = await ensureHandoff(
    alpha.id,
    alphaLeads[0].id,
    executive.profileId,
  );
  await Promise.all([
    ensureConversation(alpha.id, alphaLeads[0].id, executive.profileId),
    ensureSiteVisit(
      alpha.id,
      alphaLeads[0].id,
      heights.id,
      executive.profileId,
    ),
    ensureSlaEvent(
      alpha.id,
      alphaLeads[0].id,
      handoff.id,
      executive.profileId,
    ),
    ensureAuditLog(alpha.id, owner.profileId, alphaLeads[0].id),
  ]);

  console.log("Development seed complete.");
  console.log(
    "Primary tenant accounts: owner@propiq.local, manager@propiq.local, executive@propiq.local, admin@propiq.local",
  );
  console.log("Isolation tenant: owner@boundary.local");
}

await main();
