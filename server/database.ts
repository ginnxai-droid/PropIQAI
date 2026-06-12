import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors";

interface SupabaseLikeError {
  code?: string;
  message?: string;
}

export function throwDatabaseError(
  error: SupabaseLikeError | null,
  fallbackMessage: string,
): void {
  if (!error) {
    return;
  }

  if (error.code === "23505") {
    throw new ApiError(409, "A record with these unique values already exists.", "CONFLICT");
  }
  if (error.code === "23503" || error.code === "P0002") {
    throw new ApiError(400, "A referenced record is invalid.", "INVALID_REFERENCE");
  }
  if (error.code === "42501") {
    throw new ApiError(403, "The database denied this operation.", "FORBIDDEN");
  }

  console.error("Supabase operation failed", {
    code: error.code,
    message: error.message,
  });
  throw new ApiError(500, fallbackMessage, "DATABASE_ERROR");
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    actorProfileId: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    oldValues?: unknown;
    newValues?: unknown;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_profile_id: input.actorProfileId,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    old_values: input.oldValues ?? null,
    new_values: input.newValues ?? null,
    metadata: input.metadata ?? {},
  });
  throwDatabaseError(error, "The audit event could not be recorded.");
}
