import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type { AuthenticatedRequest } from "../auth";
import { getRequestAuth } from "../auth";
import { requirePermission } from "../authorization";
import type { AppConfig } from "../config";
import { throwDatabaseError } from "../database";
import { ApiError, asyncHandler } from "../errors";
import { createAdminSupabaseClient } from "../supabase";
import { externalLeadIntakeSchema } from "../validation";
import { processExternalLeadIntake } from "../workflow/intake";

export const publicIntakeRouter = Router();
export const intakeRouter = Router();

function secureSecretMatch(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

publicIntakeRouter.post(
  "/webhook/:organizationSlug",
  asyncHandler(async (request, response) => {
    const config = request.app.locals.config as AppConfig;
    if (!config.INTAKE_WEBHOOK_SECRET) {
      throw new ApiError(
        503,
        "Webhook intake is not available.",
        "INTEGRATION_NOT_AVAILABLE",
      );
    }
    if (
      !secureSecretMatch(
        request.header("x-propiq-webhook-secret"),
        config.INTAKE_WEBHOOK_SECRET,
      )
    ) {
      throw new ApiError(401, "Webhook authentication failed.", "INVALID_WEBHOOK_SECRET");
    }
    const admin = createAdminSupabaseClient(config);
    const { data: organization, error } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", request.params.organizationSlug)
      .eq("active", true)
      .maybeSingle();
    throwDatabaseError(error, "Webhook intake could not be initialized.");
    if (!organization) {
      throw new ApiError(404, "Webhook intake target was not found.", "NOT_FOUND");
    }
    const input = {
      ...externalLeadIntakeSchema.parse(request.body),
      raw_payload: request.body,
    };
    const result = await processExternalLeadIntake(config, input, {
      organizationId: organization.id,
      actorProfileId: null,
      defaultSource: "PORTAL",
      defaultChannel: "WEBHOOK",
      defaultProvider: "EXTERNAL_WEBHOOK",
    });
    response.status(result.outcome === "CREATED" ? 201 : 200).json({ data: result });
  }),
);

intakeRouter.post(
  "/website",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:create");
    const input = {
      ...externalLeadIntakeSchema.parse(request.body),
      raw_payload: request.body,
    };
    const result = await processExternalLeadIntake(
      request.app.locals.config as AppConfig,
      input,
      {
        organizationId: auth.organizationId,
        actorProfileId: auth.profileId,
        defaultSource: "WEBSITE",
        defaultChannel: "WEBSITE_FORM",
        defaultProvider: "PROPIQ_WEBSITE",
      },
    );
    response.status(result.outcome === "CREATED" ? 201 : 200).json({ data: result });
  }),
);

intakeRouter.post(
  "/manual",
  asyncHandler(async (request: AuthenticatedRequest, response) => {
    const auth = getRequestAuth(request);
    requirePermission(auth.role, "leads:create");
    const input = {
      ...externalLeadIntakeSchema.parse(request.body),
      raw_payload: request.body,
    };
    const result = await processExternalLeadIntake(
      request.app.locals.config as AppConfig,
      input,
      {
        organizationId: auth.organizationId,
        actorProfileId: auth.profileId,
        defaultSource: "MANUAL",
        defaultChannel: "MANUAL_JSON",
        defaultProvider: "PROPIQ_TEST",
      },
    );
    response.status(result.outcome === "CREATED" ? 201 : 200).json({ data: result });
  }),
);
