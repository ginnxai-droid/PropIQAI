import { config as loadEnvironmentFile } from "dotenv";
import { createAdminSupabaseClient } from "../server/supabase";
import { loadConfig } from "../server/config";
import { assertPilotDataGuard } from "../server/services/pilotDataGuard";
import { processExternalLeadIntake } from "../server/workflow/intake";

loadEnvironmentFile({ path: ".env.local", quiet: true });

const campaignPrefix = "stage4-pilot-";

async function resetPilotData() {
  const config = loadConfig();
  const admin = createAdminSupabaseClient(config);
  const { data: intakes, error } = await admin
    .from("lead_intake_events")
    .select("id, lead_id, duplicate_of_lead_id")
    .like("campaign", `${campaignPrefix}%`);
  if (error) throw error;
  const intakeIds = (intakes ?? []).map((row) => row.id);
  const leadIds = [
    ...new Set(
      (intakes ?? [])
        .flatMap((row) => [row.lead_id, row.duplicate_of_lead_id])
        .filter(Boolean),
    ),
  ] as string[];
  if (leadIds.length > 0) {
    await admin.from("audit_logs").delete().in("entity_id", [...leadIds, ...intakeIds]);
    await admin.from("internal_alerts").delete().in("lead_id", leadIds);
    await admin.from("followup_tasks").delete().in("lead_id", leadIds);
    await admin.from("sla_events").delete().in("lead_id", leadIds);
    await admin.from("handoffs").delete().in("lead_id", leadIds);
    await admin.from("site_visits").delete().in("lead_id", leadIds);
    await admin.from("conversations").delete().in("lead_id", leadIds);
  }
  if (intakeIds.length > 0) {
    await admin.from("lead_duplicate_events").delete().in("intake_event_id", intakeIds);
    await admin.from("integration_events").delete().in("raw_payload_reference", intakeIds);
    await admin.from("lead_intake_events").delete().in("id", intakeIds);
  }
  if (leadIds.length > 0) {
    await admin.from("leads").delete().in("id", leadIds);
  }
}

async function generatePilotData() {
  const config = loadConfig();
  const admin = createAdminSupabaseClient(config);
  await resetPilotData();
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "propiq-demo-builders")
    .single();
  if (organizationError) throw organizationError;
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("name", "PropIQ Heights")
    .single();
  if (projectError) throw projectError;
  const { data: actor, error: actorError } = await admin
    .from("organization_members")
    .select("profile_id")
    .eq("organization_id", organization.id)
    .eq("role", "ADMIN")
    .eq("active", true)
    .limit(1)
    .single();
  if (actorError) throw actorError;

  const scenarios = [
    {
      buyer_name: "Pilot Website Hot Buyer",
      phone: "+919800004001",
      email: "pilot-hot@example.test",
      source: "WEBSITE" as const,
      channel: "WEBSITE_FORM",
      campaign: `${campaignPrefix}website-hot`,
      received_at: "2026-06-14T22:30:00+05:30",
      message: "Urgent site visit and unit booking with RERA clarification.",
      site_visit_request: true,
      booking_intent: true,
      compliance_question: true,
      human_requested: true,
    },
    {
      buyer_name: "Pilot Webhook Warm Buyer",
      phone: "+919800004002",
      email: "pilot-warm@example.test",
      source: "PORTAL" as const,
      channel: "WEBHOOK",
      provider: "PILOT_WEBHOOK",
      campaign: `${campaignPrefix}webhook-warm`,
      received_at: "2026-06-15T11:00:00+05:30",
      message: "Comparing projects for a purchase within six months.",
      competitor_comparison: true,
    },
    {
      buyer_name: "Pilot AI Review Buyer",
      phone: "+919800004003",
      email: "pilot-ai-review@example.test",
      source: "MANUAL" as const,
      channel: "MANUAL_UI",
      campaign: `${campaignPrefix}manual-review`,
      received_at: "2026-06-15T12:00:00+05:30",
      message: "Needs a human callback about price negotiation.",
      negotiation_intent: true,
      human_requested: true,
    },
  ];

  const results = [];
  for (const scenario of scenarios) {
    results.push(
      await processExternalLeadIntake(
        config,
        { ...scenario, project_id: project.id },
        {
          organizationId: organization.id,
          actorProfileId: actor.profile_id,
          defaultSource: "MANUAL",
          defaultChannel: "MANUAL_UI",
          defaultProvider: "PILOT_GENERATOR",
        },
      ),
    );
  }
  await processExternalLeadIntake(
    config,
    {
      buyer_name: "Pilot Duplicate Buyer",
      phone: "+919800004001",
      email: "pilot-duplicate@example.test",
      source: "WEBSITE",
      channel: "WEBSITE_FORM",
      campaign: `${campaignPrefix}duplicate`,
      received_at: "2026-06-14T22:35:00+05:30",
      message: "Duplicate pilot lead requesting a booking and site visit.",
      site_visit_request: true,
      booking_intent: true,
      compliance_question: true,
      human_requested: true,
      project_id: project.id,
    },
    {
      organizationId: organization.id,
      actorProfileId: actor.profile_id,
      defaultSource: "MANUAL",
      defaultChannel: "MANUAL_UI",
      defaultProvider: "PILOT_GENERATOR",
    },
  );

  const createdLeadIds = results
    .filter((result) => result.outcome === "CREATED")
    .map((result) => result.lead.id);
  if (createdLeadIds[0]) {
    await admin.from("site_visits").insert([
      {
        organization_id: organization.id,
        lead_id: createdLeadIds[0],
        project_id: project.id,
        preferred_date: "2026-06-12",
        preferred_time: "11:00",
        visitors_count: 2,
        needs_directions: true,
        family_attending: true,
        status: "COMPLETED",
        reminder_status: "SENT",
      },
      {
        organization_id: organization.id,
        lead_id: createdLeadIds[0],
        project_id: project.id,
        preferred_date: "2026-06-13",
        preferred_time: "15:00",
        visitors_count: 1,
        needs_directions: false,
        family_attending: false,
        status: "MISSED",
        reminder_status: "SENT",
      },
    ]);
  }
  console.log(
    JSON.stringify({
      event: "pilot_data_generated",
      fakeDataOnly: true,
      organizations: 2,
      createdLeads: createdLeadIds.length,
      campaignPrefix,
    }),
  );
}

assertPilotDataGuard(process.env);
if (process.argv[2] === "reset") {
  await resetPilotData();
  console.log(JSON.stringify({ event: "pilot_data_reset", campaignPrefix }));
} else {
  await generatePilotData();
}
