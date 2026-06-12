import type { SupabaseClient } from "@supabase/supabase-js";
import { throwDatabaseError } from "../database";

export type AlertType =
  | "HOT_LEAD"
  | "PRIORITY_HOT_LEAD"
  | "SLA_DUE_SOON"
  | "SLA_BREACHED"
  | "MANAGER_ESCALATION"
  | "AFTER_HOURS_HIGH_INTENT"
  | "DUPLICATE_LEAD_DETECTED"
  | "ASSIGNMENT_REQUIRED";

export async function upsertActiveAlert(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    leadId: string;
    alertType: AlertType;
    severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
    assignedRole?: "OWNER" | "MANAGER" | "EXECUTIVE" | "ADMIN";
    message: string;
  },
) {
  const { data: existing, error: existingError } = await admin
    .from("internal_alerts")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("lead_id", input.leadId)
    .eq("alert_type", input.alertType)
    .in("status", ["OPEN", "ACKNOWLEDGED"])
    .maybeSingle();
  throwDatabaseError(existingError, "The active alert could not be checked.");
  const values = {
    severity: input.severity,
    assigned_role: input.assignedRole ?? "MANAGER",
    message: input.message,
  };
  const operation = existing
    ? admin
        .from("internal_alerts")
        .update(values)
        .eq("organization_id", input.organizationId)
        .eq("id", existing.id)
    : admin.from("internal_alerts").insert({
        organization_id: input.organizationId,
        lead_id: input.leadId,
        alert_type: input.alertType,
        status: "OPEN",
        ...values,
      });
  const { data, error } = await operation.select().single();
  throwDatabaseError(error, "The alert could not be persisted.");
  return data;
}
