import { describe, expect, it } from "vitest";
import {
  aiQualificationSchema,
  createLocalQualificationService,
  createUnavailableQualificationService,
  qualificationLeadUpdate,
} from "../server/workflow/aiQualification";
import { sanitizeRawPayload } from "../server/workflow/intake";

describe("Stage 3 AI qualification contract", () => {
  it("accepts structured JSON and maps only qualification fields", () => {
    const structured = aiQualificationSchema.parse({
      budget_min: 10_000_000,
      budget_max: 15_000_000,
      purchase_timeline: "IMMEDIATE",
      buyer_type: "FAMILY_BUYER",
      engagement_quality: "HIGH",
      site_visit_request: true,
      negotiation_intent: true,
      booking_intent: false,
      compliance_question: true,
      human_requested: true,
      angry_or_confused: false,
      competitor_comparison: false,
      preferred_project: "PropIQ Heights",
      preferred_location: "Pune",
      sentiment: "neutral",
      summary: "High intent buyer.",
      key_questions: ["RERA"],
      objections: ["Price"],
      confidence: 0.9,
    });
    const update = qualificationLeadUpdate(structured);
    expect(update).toMatchObject({
      budget_min: 10_000_000,
      site_visit_interest: true,
      handoff_signals: {
        price_negotiation: true,
        compliance_question: true,
        human_requested: true,
      },
    });
    expect(update).not.toHaveProperty("score");
    expect(update).not.toHaveProperty("priority");
    expect(update).not.toHaveProperty("assigned_to");
    expect(update).not.toHaveProperty("organization_id");
  });

  it("rejects invalid JSON safely", () => {
    expect(() =>
      aiQualificationSchema.parse({
        budget_min: 20_000_000,
        budget_max: 10_000_000,
        confidence: 2,
      }),
    ).toThrow();
  });

  it("extracts validated local signals and supports unavailable fallback", async () => {
    const local = await createLocalQualificationService().extract({
      name: "Buyer",
      budgetText: "1.2 to 1.5 crore",
      message:
        "Urgent site visit. Call me to negotiate price and explain RERA possession.",
      preferredLocation: "Pune",
      projectInterest: "PropIQ Heights",
    });
    expect(local.status).toBe("COMPLETED");
    if (local.status === "COMPLETED") {
      expect(local.data).toMatchObject({
        budget_min: 12_000_000,
        budget_max: 15_000_000,
        purchase_timeline: "IMMEDIATE",
        site_visit_request: true,
        negotiation_intent: true,
        compliance_question: true,
        human_requested: true,
      });
    }
    await expect(
      createUnavailableQualificationService().extract({ name: "Buyer" }),
    ).resolves.toEqual({ status: "NOT_AVAILABLE", data: null });
  });

  it("redacts secret-like raw payload fields and bounds nested content", () => {
    expect(
      sanitizeRawPayload({
        buyer: "A",
        authorization: "Bearer secret",
        nested: { api_key: "secret", message: "ok" },
      }),
    ).toEqual({
      buyer: "A",
      authorization: "[REDACTED]",
      nested: { api_key: "[REDACTED]", message: "ok" },
    });
  });
});
