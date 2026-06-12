import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "../config";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError } from "../errors";
import { createAdminSupabaseClient } from "../supabase";
import type { z } from "zod";
import type { externalLeadIntakeSchema } from "../validation";
import {
  createQualificationService,
  qualificationLeadUpdate,
} from "./aiQualification";
import { upsertActiveAlert } from "./alerts";
import {
  BUSINESS_HOURS_VERSION,
  isAfterBusinessHours,
} from "./businessHours";
import { runLeadWorkflow } from "./orchestrator";

export type ExternalLeadIntake = z.infer<typeof externalLeadIntakeSchema>;

const sensitiveKeyPattern =
  /(authorization|cookie|password|passwd|secret|token|api[-_]?key|service[-_]?role)/i;

export function sanitizeRawPayload(
  value: unknown,
  depth = 0,
): unknown {
  if (depth >= 5) return "[TRUNCATED]";
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.slice(0, 2000);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeRawPayload(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, nested]) => [
          key.slice(0, 120),
          sensitiveKeyPattern.test(key)
            ? "[REDACTED]"
            : sanitizeRawPayload(nested, depth + 1),
        ]),
    );
  }
  return String(value).slice(0, 2000);
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

async function resolveProject(
  admin: SupabaseClient,
  organizationId: string,
  input: ExternalLeadIntake,
) {
  let query = admin
    .from("projects")
    .select("id, name, location")
    .eq("organization_id", organizationId)
    .eq("active", true);
  if (input.project_id) {
    query = query.eq("id", input.project_id);
  } else if (input.project_interest) {
    query = query.ilike("name", input.project_interest);
  } else {
    query = query.order("created_at", { ascending: true }).limit(2);
  }
  const { data, error } = await query;
  throwDatabaseError(error, "The intake project could not be resolved.");
  if (!data || data.length !== 1) {
    throw new ApiError(
      400,
      "A single active project must match the intake request.",
      "INVALID_PROJECT",
    );
  }
  return data[0]!;
}

async function eligibleAssignee(
  admin: SupabaseClient,
  organizationId: string,
  projectId: string,
): Promise<string | null> {
  const { data: assignments, error: assignmentError } = await admin
    .from("organization_member_projects")
    .select("membership_id")
    .eq("organization_id", organizationId)
    .eq("project_id", projectId);
  throwDatabaseError(assignmentError, "Project assignments could not be loaded.");
  const membershipIds = (assignments ?? []).map((row) => row.membership_id);
  if (membershipIds.length === 0) return null;
  const { data: memberships, error: membershipError } = await admin
    .from("organization_members")
    .select("profile_id, created_at")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .eq("role", "EXECUTIVE")
    .in("id", membershipIds)
    .order("created_at", { ascending: true })
    .limit(1);
  throwDatabaseError(membershipError, "An intake assignee could not be selected.");
  return memberships?.[0]?.profile_id ?? null;
}

async function findDuplicate(
  admin: SupabaseClient,
  organizationId: string,
  projectId: string,
  phone: string,
  email: string | null,
) {
  const { data, error } = await admin
    .from("leads")
    .select("id, project_id, phone, email, name")
    .eq("organization_id", organizationId);
  throwDatabaseError(error, "Duplicate detection could not be completed.");
  const normalizedPhone = normalizePhone(phone);
  for (const lead of data ?? []) {
    const samePhone = normalizePhone(lead.phone) === normalizedPhone;
    const sameEmail =
      email !== null && normalizeEmail(lead.email) === email;
    if (!samePhone && !sameEmail) continue;
    const reasons = [];
    if (samePhone) reasons.push("SAME_PHONE");
    if (sameEmail) reasons.push("SAME_EMAIL");
    if (samePhone && lead.project_id === projectId) {
      reasons.push("SAME_PHONE_AND_PROJECT");
    }
    if (sameEmail && lead.project_id === projectId) {
      reasons.push("SAME_EMAIL_AND_PROJECT");
    }
    return { lead, reasons };
  }
  return null;
}

async function persistIntegrationEvent(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    provider: string;
    channel: string;
    receivedAt: string;
    status: "RECEIVED" | "PROCESSED" | "DUPLICATE" | "FAILED";
    intakeEventId: string;
    leadId?: string | null;
    duplicateLeadId?: string | null;
    errorMessage?: string | null;
  },
) {
  const { error } = await admin.from("integration_events").insert({
    organization_id: input.organizationId,
    provider: input.provider,
    channel: input.channel,
    event_type: "LEAD_RECEIVED",
    received_at: input.receivedAt,
    processing_status: input.status,
    error_message: input.errorMessage ?? null,
    retry_count: 0,
    raw_payload_reference: input.intakeEventId,
    lead_id: input.leadId ?? null,
    duplicate_of_lead_id: input.duplicateLeadId ?? null,
  });
  throwDatabaseError(error, "The integration event could not be recorded.");
}

export async function processExternalLeadIntake(
  config: AppConfig,
  input: ExternalLeadIntake,
  context: {
    organizationId: string;
    actorProfileId: string | null;
    defaultSource: "WEBSITE" | "PORTAL" | "MANUAL";
    defaultChannel: string;
    defaultProvider: string;
  },
) {
  const admin = createAdminSupabaseClient(config);
  const project = await resolveProject(admin, context.organizationId, input);
  const receivedAt = new Date(input.received_at ?? Date.now());
  if (Number.isNaN(receivedAt.getTime())) {
    throw new ApiError(400, "The received time is invalid.", "VALIDATION_ERROR");
  }
  const receivedAtIso = receivedAt.toISOString();
  const source = input.source ?? context.defaultSource;
  const channel = input.channel ?? context.defaultChannel;
  const provider = input.provider ?? context.defaultProvider;
  const email = normalizeEmail(input.email);
  const rawPayload = sanitizeRawPayload(input.raw_payload ?? input) as Record<
    string,
    unknown
  >;
  const normalizedPayload = {
    buyer_name: input.buyer_name,
    phone: normalizePhone(input.phone),
    email,
    project_id: project.id,
    project_interest: input.project_interest ?? project.name,
    budget_text: input.budget_text ?? null,
    budget_amount: input.budget_amount ?? null,
    budget_min: input.budget_min ?? null,
    budget_max: input.budget_max ?? null,
    purchase_timeline: input.purchase_timeline ?? null,
    preferred_location: input.preferred_location ?? null,
    message: input.message ?? null,
    site_visit_request: input.site_visit_request ?? false,
    negotiation_intent: input.negotiation_intent ?? false,
    booking_intent: input.booking_intent ?? false,
    compliance_question: input.compliance_question ?? false,
    human_requested: input.human_requested ?? false,
    angry_or_confused: input.angry_or_confused ?? false,
    competitor_comparison: input.competitor_comparison ?? false,
    source,
    campaign: input.campaign ?? null,
    received_at: receivedAtIso,
    channel,
  };

  const { data: intakeEvent, error: intakeError } = await admin
    .from("lead_intake_events")
    .insert({
      organization_id: context.organizationId,
      provider,
      channel,
      event_type: "LEAD_RECEIVED",
      source,
      campaign: input.campaign ?? null,
      received_at: receivedAtIso,
      normalized_payload: normalizedPayload,
      raw_payload: rawPayload,
      processing_status: "RECEIVED",
      ai_status: "PENDING",
    })
    .select()
    .single();
  throwDatabaseError(intakeError, "The intake event could not be recorded.");

  const duplicate = await findDuplicate(
    admin,
    context.organizationId,
    project.id,
    input.phone,
    email,
  );
  if (duplicate) {
    const { error: duplicateError } = await admin
      .from("lead_duplicate_events")
      .insert({
        organization_id: context.organizationId,
        intake_event_id: intakeEvent.id,
        existing_lead_id: duplicate.lead.id,
        match_reasons: duplicate.reasons,
      });
    throwDatabaseError(duplicateError, "The duplicate event could not be recorded.");
    const { error: intakeUpdateError } = await admin
      .from("lead_intake_events")
      .update({
        duplicate_of_lead_id: duplicate.lead.id,
        processing_status: "DUPLICATE",
        ai_status: "NOT_AVAILABLE",
      })
      .eq("id", intakeEvent.id);
    throwDatabaseError(intakeUpdateError, "The duplicate intake could not be finalized.");
    await persistIntegrationEvent(admin, {
      organizationId: context.organizationId,
      provider,
      channel,
      receivedAt: receivedAtIso,
      status: "DUPLICATE",
      intakeEventId: intakeEvent.id,
      duplicateLeadId: duplicate.lead.id,
    });
    const { error: noteError } = await admin.from("conversations").insert({
      organization_id: context.organizationId,
      lead_id: duplicate.lead.id,
      channel: "FORM",
      transcript: [
        {
          speaker: "buyer",
          text: input.message || "Duplicate external intake received.",
          time: receivedAtIso,
        },
      ],
      summary: `Duplicate intake received through ${channel}.`,
      sentiment: "neutral",
      key_questions: [],
      objections: [],
      created_by: context.actorProfileId,
    });
    throwDatabaseError(noteError, "The duplicate intake note could not be recorded.");
    await upsertActiveAlert(admin, {
      organizationId: context.organizationId,
      leadId: duplicate.lead.id,
      alertType: "DUPLICATE_LEAD_DETECTED",
      severity: "WARNING",
      message: `Duplicate lead intake detected by ${duplicate.reasons.join(", ")}.`,
    });
    await writeAuditLog(admin, {
      organizationId: context.organizationId,
      actorProfileId: context.actorProfileId,
      entityType: "lead_intake_event",
      entityId: intakeEvent.id,
      action: "DUPLICATE_LEAD_DETECTED",
      newValues: {
        duplicate_of_lead_id: duplicate.lead.id,
        match_reasons: duplicate.reasons,
      },
    });
    return {
      outcome: "DUPLICATE" as const,
      lead: duplicate.lead,
      intakeEventId: intakeEvent.id,
      duplicateReasons: duplicate.reasons,
    };
  }

  const ai = await createQualificationService(
    config.AI_QUALIFICATION_MODE,
  ).extract({
    name: input.buyer_name,
    budgetText:
      input.budget_text ??
      (input.budget_amount ? String(input.budget_amount) : null),
    message: input.message,
    preferredLocation: input.preferred_location,
    projectInterest: input.project_interest ?? project.name,
  });
  const aiUpdate = ai.status === "COMPLETED"
    ? qualificationLeadUpdate(ai.data)
    : {
        budget_min: 0,
        budget_max: 0,
        purchase_timeline: "UNKNOWN" as const,
        buyer_type: "UNKNOWN" as const,
        engagement_quality: "UNKNOWN" as const,
        site_visit_interest: false,
        handoff_signals: {},
        preferred_location: null,
        ai_confidence: null,
        ai_signals: {},
        ai_summary: null,
        key_questions: [],
        objections: [],
      };
  const explicitSignals = {
    price_negotiation: input.negotiation_intent ?? false,
    booking_request: input.booking_intent ?? false,
    compliance_question: input.compliance_question ?? false,
    angry_or_confused: input.angry_or_confused ?? false,
    human_requested: input.human_requested ?? false,
    serious_competitor_comparison: input.competitor_comparison ?? false,
  };
  const hasExplicitHighIntent =
    Boolean(input.site_visit_request) ||
    Object.values(explicitSignals).some(Boolean);
  const budgetFallback = input.budget_amount ?? 0;
  const budgetMin =
    input.budget_min ??
    (ai.status === "COMPLETED" ? aiUpdate.budget_min : budgetFallback);
  const budgetMax =
    input.budget_max ??
    (ai.status === "COMPLETED" ? aiUpdate.budget_max : budgetMin);
  const purchaseTimeline =
    input.purchase_timeline ??
    (ai.status === "COMPLETED" ? aiUpdate.purchase_timeline : "UNKNOWN");
  const handoffSignals = {
    ...(ai.status === "COMPLETED" ? aiUpdate.handoff_signals : {}),
    ...Object.fromEntries(
      Object.entries(explicitSignals).map(([key, value]) => [
        key,
        value ||
          Boolean(
            ai.status === "COMPLETED" &&
              aiUpdate.handoff_signals[
                key as keyof typeof aiUpdate.handoff_signals
              ],
          ),
      ]),
    ),
  };
  const assignedTo = await eligibleAssignee(
    admin,
    context.organizationId,
    project.id,
  );
  const afterHours = isAfterBusinessHours(receivedAt);

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      organization_id: context.organizationId,
      project_id: project.id,
      name: input.buyer_name,
      phone: input.phone,
      email,
      source,
      status: "NEW",
      buyer_type:
        input.competitor_comparison
          ? "COMPARISON_SHOPPER"
          : ai.status === "COMPLETED"
            ? aiUpdate.buyer_type
            : "UNKNOWN",
      apartment_preference: "",
      budget_min: budgetMin,
      budget_max: budgetMax,
      purchase_timeline: purchaseTimeline,
      site_visit_interest:
        Boolean(input.site_visit_request) ||
        (ai.status === "COMPLETED" && aiUpdate.site_visit_interest),
      engagement_quality:
        hasExplicitHighIntent
          ? "HIGH"
          : ai.status === "COMPLETED"
            ? aiUpdate.engagement_quality
            : "UNKNOWN",
      callback_responsiveness: "UNKNOWN",
      handoff_signals: handoffSignals,
      assigned_to: assignedTo,
      ai_summary: aiUpdate.ai_summary,
      key_questions: aiUpdate.key_questions,
      objections: aiUpdate.objections,
      is_after_hours: afterHours,
      intake_channel: channel,
      campaign: input.campaign ?? null,
      preferred_location:
        ai.status === "COMPLETED"
          ? aiUpdate.preferred_location ?? input.preferred_location ?? null
          : input.preferred_location ?? null,
      received_at: receivedAtIso,
      business_hours_version: BUSINESS_HOURS_VERSION,
      ai_qualification_status: ai.status,
      ai_confidence: aiUpdate.ai_confidence,
      ai_signals: aiUpdate.ai_signals,
      is_duplicate: false,
    })
    .select()
    .single();
  throwDatabaseError(leadError, "The external lead could not be created.");

  const workflow = await runLeadWorkflow(config, {
    organizationId: context.organizationId,
    leadId: lead.id,
    actorProfileId: context.actorProfileId,
  });
  const { error: intakeUpdateError } = await admin
    .from("lead_intake_events")
    .update({
      lead_id: lead.id,
      processing_status: "PROCESSED",
      ai_status: ai.status,
      error_message: ai.status === "FAILED" ? ai.error : null,
    })
    .eq("id", intakeEvent.id);
  throwDatabaseError(intakeUpdateError, "The intake event could not be finalized.");
  await persistIntegrationEvent(admin, {
    organizationId: context.organizationId,
    provider,
    channel,
    receivedAt: receivedAtIso,
    status: "PROCESSED",
    intakeEventId: intakeEvent.id,
    leadId: lead.id,
  });
  await writeAuditLog(admin, {
    organizationId: context.organizationId,
    actorProfileId: context.actorProfileId,
    entityType: "lead",
    entityId: lead.id,
    action: "EXTERNAL_LEAD_CREATED",
    newValues: {
      source,
      channel,
      campaign: input.campaign ?? null,
      received_at: receivedAtIso,
      ai_status: ai.status,
    },
  });
  if (workflow.lead.priority === "HOT") {
    await upsertActiveAlert(admin, {
      organizationId: context.organizationId,
      leadId: lead.id,
      alertType: "HOT_LEAD",
      severity: "HIGH",
      message: "A newly received external lead was scored HOT.",
    });
    if (Number(workflow.lead.score) >= 9) {
      await upsertActiveAlert(admin, {
        organizationId: context.organizationId,
        leadId: lead.id,
        alertType: "PRIORITY_HOT_LEAD",
        severity: "CRITICAL",
        message: "A newly received external lead requires priority HOT handling.",
      });
    }
    if (afterHours) {
      await upsertActiveAlert(admin, {
        organizationId: context.organizationId,
        leadId: lead.id,
        alertType: "AFTER_HOURS_HIGH_INTENT",
        severity: "CRITICAL",
        message: "A high-intent lead arrived outside India business hours.",
      });
    }
  }
  if (!assignedTo) {
    await upsertActiveAlert(admin, {
      organizationId: context.organizationId,
      leadId: lead.id,
      alertType: "ASSIGNMENT_REQUIRED",
      severity: "HIGH",
      message: "No active project executive was available for external intake assignment.",
    });
  }
  return {
    outcome: "CREATED" as const,
    lead: workflow.lead,
    intakeEventId: intakeEvent.id,
    aiStatus: ai.status,
  };
}
