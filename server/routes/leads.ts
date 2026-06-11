import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import type { AppConfig } from "../config";
import { throwDatabaseError, writeAuditLog } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { createAdminSupabaseClient } from "../supabase";
import { runLeadWorkflow } from "../workflow/orchestrator";
import {
  assignmentSchema,
  conversationCreateSchema,
  leadCreateSchema,
  leadStatusSchema,
  leadUpdateSchema,
} from "../validation";

export const leadsRouter = Router();

async function loadLead(request: AuthenticatedRequest, leadId: string) {
  const auth = getRequestAuth(request);
  const { data, error } = await auth.supabase
    .from("leads")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .eq("id", leadId)
    .maybeSingle();
  throwDatabaseError(error, "The lead could not be loaded.");
  if (!data) {
    throw new ApiError(404, "Lead not found.", "NOT_FOUND");
  }
  return data;
}

leadsRouter.get(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:read");
    const { data, error } = await auth.supabase
      .from("leads")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false });
    throwDatabaseError(error, "Leads could not be loaded.");
    response.json({ data });
  }),
);

leadsRouter.get(
  "/:leadId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:read");
    response.json({ data: await loadLead(request, request.params.leadId!) });
  }),
);

leadsRouter.post(
  "/",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:create");
    const input = leadCreateSchema.parse(request.body);
    const { data: project, error: projectError } = await auth.supabase
      .from("projects")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .eq("id", input.project_id)
      .eq("active", true)
      .maybeSingle();
    throwDatabaseError(projectError, "The project could not be verified.");
    if (!project) {
      throw new ApiError(400, "The selected project is invalid.", "INVALID_PROJECT");
    }
    const leadId = randomUUID();
    const { error } = await auth.supabase
      .from("leads")
      .insert({
        ...input,
        id: leadId,
        organization_id: auth.organizationId,
      });
    throwDatabaseError(error, "The lead could not be created.");
    const { data, error: readError } = await auth.supabase
      .from("leads")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .eq("id", leadId)
      .single();
    throwDatabaseError(readError, "The created lead could not be loaded.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "lead",
      entityId: data.id,
      action: "LEAD_CREATED",
      newValues: data,
    });
    const workflow = await runLeadWorkflow(
      request.app.locals.config as AppConfig,
      {
        organizationId: auth.organizationId,
        leadId: data.id,
        actorProfileId: auth.profileId,
      },
    );
    response.status(201).json({ data: workflow.lead });
  }),
);

leadsRouter.patch(
  "/:leadId",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:update");
    const oldLead = await loadLead(request, request.params.leadId!);
    const input = leadUpdateSchema.parse(request.body);
    const { data, error } = await auth.supabase
      .from("leads")
      .update(input)
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.leadId)
      .select()
      .single();
    throwDatabaseError(error, "The lead could not be updated.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "lead",
      entityId: data.id,
      action: oldLead.score !== data.score ? "LEAD_SCORE_CHANGED" : "LEAD_UPDATED",
      oldValues: oldLead,
      newValues: data,
    });
    const workflow = await runLeadWorkflow(
      request.app.locals.config as AppConfig,
      {
        organizationId: auth.organizationId,
        leadId: data.id,
        actorProfileId: auth.profileId,
      },
    );
    response.json({ data: workflow.lead });
  }),
);

leadsRouter.post(
  "/:leadId/assign",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:assign");
    const input = assignmentSchema.parse(request.body);
    const { data, error } = await auth.supabase.rpc("assign_lead_secure", {
      target_lead_id: request.params.leadId,
      target_profile_id: input.assigned_to,
    });
    throwDatabaseError(error, "The lead could not be assigned.");
    const workflow = await runLeadWorkflow(
      request.app.locals.config as AppConfig,
      {
        organizationId: auth.organizationId,
        leadId: request.params.leadId!,
        actorProfileId: auth.profileId,
      },
    );
    response.json({ data: workflow.lead ?? data });
  }),
);

leadsRouter.post(
  "/:leadId/status",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:update");
    const oldLead = await loadLead(request, request.params.leadId!);
    const input = leadStatusSchema.parse(request.body);
    const firstResponse =
      oldLead.first_response_at ??
      (input.status === "CONTACTED" ? new Date().toISOString() : null);
    const { data, error } = await auth.supabase
      .from("leads")
      .update({
        status: input.status,
        first_response_at: firstResponse,
        last_contacted_at:
          input.status === "CONTACTED" ? new Date().toISOString() : oldLead.last_contacted_at,
      })
      .eq("organization_id", auth.organizationId)
      .eq("id", request.params.leadId)
      .select()
      .single();
    throwDatabaseError(error, "The lead status could not be changed.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "lead",
      entityId: data.id,
      action: "LEAD_STATUS_CHANGED",
      oldValues: { status: oldLead.status },
      newValues: { status: data.status },
    });
    response.json({ data });
  }),
);

leadsRouter.post(
  "/:leadId/conversations",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "conversations:create");
    await loadLead(request, request.params.leadId!);
    const input = conversationCreateSchema.parse(request.body);
    const now = new Date().toISOString();
    const { data, error } = await auth.supabase
      .from("conversations")
      .insert({
        organization_id: auth.organizationId,
        lead_id: request.params.leadId,
        channel: input.channel,
        transcript: [
          {
            speaker: input.speaker,
            text: input.text,
            time: now,
          },
        ],
        summary: input.summary,
        sentiment: input.sentiment,
        key_questions: input.key_questions,
        objections: input.objections,
        created_by: auth.profileId,
      })
      .select()
      .single();
    throwDatabaseError(error, "The conversation entry could not be created.");
    await writeAuditLog(auth.supabase, {
      organizationId: auth.organizationId,
      actorProfileId: auth.profileId,
      entityType: "conversation",
      entityId: data.id,
      action: "CONVERSATION_CREATED",
      newValues: { lead_id: request.params.leadId, channel: input.channel },
    });
    await runLeadWorkflow(request.app.locals.config as AppConfig, {
      organizationId: auth.organizationId,
      leadId: request.params.leadId!,
      actorProfileId: auth.profileId,
    });
    response.status(201).json({ data });
  }),
);

leadsRouter.get(
  "/:leadId/timeline",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:read");
    const lead = await loadLead(request, request.params.leadId!);
    const admin = createAdminSupabaseClient(
      request.app.locals.config as AppConfig,
    );
    const organizationId = auth.organizationId;
    const leadId = lead.id;
    const [
      conversations,
      handoffs,
      visits,
      tasks,
      slaEvents,
      auditLogs,
    ] = await Promise.all([
      admin
        .from("conversations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId),
      admin
        .from("handoffs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId),
      admin
        .from("site_visits")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId),
      admin
        .from("followup_tasks")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId),
      admin
        .from("sla_events")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId),
      admin
        .from("audit_logs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("entity_id", leadId),
    ]);
    for (const result of [
      conversations,
      handoffs,
      visits,
      tasks,
      slaEvents,
      auditLogs,
    ]) {
      throwDatabaseError(result.error, "The lead timeline could not be loaded.");
    }
    const events = [
      {
        id: `lead-${lead.id}`,
        type: "LEAD_CREATED",
        occurred_at: lead.created_at,
        title: "Lead created",
        data: lead,
      },
      ...(conversations.data ?? []).map((row) => ({
        id: row.id,
        type: "CONVERSATION",
        occurred_at: row.created_at,
        title: `Conversation added (${row.channel})`,
        data: row,
      })),
      ...(handoffs.data ?? []).map((row) => ({
        id: row.id,
        type: "HANDOFF",
        occurred_at: row.created_at,
        title: `Handoff: ${row.reason}`,
        data: row,
      })),
      ...(visits.data ?? []).map((row) => ({
        id: row.id,
        type: "SITE_VISIT",
        occurred_at: row.created_at,
        title: `Site visit: ${row.status}`,
        data: row,
      })),
      ...(tasks.data ?? []).map((row) => ({
        id: row.id,
        type: "TASK",
        occurred_at: row.created_at,
        title: `Task: ${row.task_type}`,
        data: row,
      })),
      ...(slaEvents.data ?? []).map((row) => ({
        id: row.id,
        type: "SLA",
        occurred_at: row.created_at,
        title: `SLA: ${row.event_type}`,
        data: row,
      })),
      ...(auditLogs.data ?? []).map((row) => ({
        id: row.id,
        type: "AUDIT",
        occurred_at: row.created_at,
        title: row.action,
        data: row,
      })),
    ].sort(
      (left, right) =>
        new Date(left.occurred_at).getTime() -
        new Date(right.occurred_at).getTime(),
    );
    response.json({ data: events });
  }),
);
