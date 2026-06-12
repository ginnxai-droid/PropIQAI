import { z } from "zod";

export const aiQualificationSchema = z
  .object({
    budget_min: z.number().int().nonnegative().nullable().default(null),
    budget_max: z.number().int().nonnegative().nullable().default(null),
    purchase_timeline: z
      .enum([
        "IMMEDIATE",
        "WITHIN_3_MONTHS",
        "THREE_TO_SIX_MONTHS",
        "SIX_TO_TWELVE_MONTHS",
        "LONG_TERM",
        "UNKNOWN",
      ])
      .default("UNKNOWN"),
    buyer_type: z
      .enum([
        "FAMILY_BUYER",
        "INVESTOR",
        "FIRST_TIME_BUYER",
        "NRI",
        "COMPARISON_SHOPPER",
        "UNKNOWN",
      ])
      .default("UNKNOWN"),
    engagement_quality: z
      .enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"])
      .default("UNKNOWN"),
    site_visit_request: z.boolean().default(false),
    negotiation_intent: z.boolean().default(false),
    booking_intent: z.boolean().default(false),
    compliance_question: z.boolean().default(false),
    human_requested: z.boolean().default(false),
    angry_or_confused: z.boolean().default(false),
    competitor_comparison: z.boolean().default(false),
    preferred_project: z.string().trim().max(200).nullable().default(null),
    preferred_location: z.string().trim().max(240).nullable().default(null),
    sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
    summary: z.string().trim().max(2000).default(""),
    key_questions: z.array(z.string().trim().max(500)).max(20).default([]),
    objections: z.array(z.string().trim().max(500)).max(20).default([]),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((value, context) => {
    if (
      value.budget_min !== null &&
      value.budget_max !== null &&
      value.budget_max < value.budget_min
    ) {
      context.addIssue({
        code: "custom",
        path: ["budget_max"],
        message: "Maximum budget cannot be lower than minimum budget.",
      });
    }
  });

export type AiQualification = z.infer<typeof aiQualificationSchema>;

export interface AiQualificationInput {
  name: string;
  budgetText?: string | null;
  message?: string | null;
  preferredLocation?: string | null;
  projectInterest?: string | null;
}

export type AiQualificationResult =
  | { status: "COMPLETED"; data: AiQualification }
  | { status: "NOT_AVAILABLE"; data: null }
  | { status: "FAILED"; data: null; error: string };

export interface AiQualificationService {
  extract(input: AiQualificationInput): Promise<AiQualificationResult>;
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function parseBudget(text: string): { min: number | null; max: number | null } {
  const range = text.match(
    /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l)\b/i,
  );
  if (range) {
    const multiplier =
      range[3]!.toLowerCase() === "crore" ||
      range[3]!.toLowerCase() === "cr"
        ? 10_000_000
        : 100_000;
    return {
      min: Math.round(Number(range[1]) * multiplier),
      max: Math.round(Number(range[2]) * multiplier),
    };
  }
  const values = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l)?/gi)]
    .map((match) => {
      const amount = Number(match[1]);
      const unit = match[2]?.toLowerCase();
      if (!Number.isFinite(amount)) return null;
      if (unit === "crore" || unit === "cr") return Math.round(amount * 10_000_000);
      if (unit === "lakh" || unit === "lac" || unit === "l") {
        return Math.round(amount * 100_000);
      }
      return amount >= 100_000 ? Math.round(amount) : null;
    })
    .filter((value): value is number => value !== null);
  if (values.length === 0) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function createLocalQualificationService(): AiQualificationService {
  return {
    async extract(input) {
      try {
        const combined = [
          input.budgetText,
          input.message,
          input.preferredLocation,
          input.projectInterest,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const budget = parseBudget(combined);
        const siteVisit = includesAny(combined, [
          "site visit",
          "visit property",
          "schedule visit",
          "property tour",
        ]);
        const negotiation = includesAny(combined, [
          "negotiate",
          "negotiation",
          "best price",
          "discount",
        ]);
        const booking = includesAny(combined, [
          "book now",
          "booking",
          "block unit",
          "token amount",
        ]);
        const compliance = includesAny(combined, [
          "rera",
          "legal",
          "payment plan",
          "possession",
        ]);
        const humanRequested = includesAny(combined, [
          "human",
          "agent",
          "representative",
          "call me",
        ]);
        const angry = includesAny(combined, [
          "angry",
          "frustrated",
          "confused",
          "complaint",
        ]);
        const competitor = includesAny(combined, [
          "compare",
          "comparison",
          "competitor",
          "versus",
          " vs ",
        ]);
        const immediate = includesAny(combined, [
          "immediately",
          "this week",
          "this month",
          "urgent",
        ]);
        const withinThreeMonths = includesAny(combined, [
          "within 3 months",
          "next 3 months",
          "three months",
        ]);
        const highIntent =
          siteVisit || negotiation || booking || humanRequested || immediate;
        const result = aiQualificationSchema.parse({
          budget_min: budget.min,
          budget_max: budget.max,
          purchase_timeline: immediate
            ? "IMMEDIATE"
            : withinThreeMonths
              ? "WITHIN_3_MONTHS"
              : "UNKNOWN",
          buyer_type: competitor ? "COMPARISON_SHOPPER" : "UNKNOWN",
          engagement_quality: highIntent ? "HIGH" : combined ? "MEDIUM" : "UNKNOWN",
          site_visit_request: siteVisit,
          negotiation_intent: negotiation,
          booking_intent: booking,
          compliance_question: compliance,
          human_requested: humanRequested,
          angry_or_confused: angry,
          competitor_comparison: competitor,
          preferred_project: input.projectInterest?.trim() || null,
          preferred_location: input.preferredLocation?.trim() || null,
          sentiment: angry ? "negative" : "neutral",
          summary: combined
            ? "Structured qualification signals extracted from the inbound lead message."
            : "",
          key_questions: compliance ? ["Legal, RERA, payment, or possession query"] : [],
          objections: negotiation ? ["Commercial negotiation requested"] : [],
          confidence: combined ? 0.72 : 0.35,
        });
        return { status: "COMPLETED", data: result };
      } catch {
        return {
          status: "FAILED",
          data: null,
          error: "AI qualification output failed validation.",
        };
      }
    },
  };
}

export function createUnavailableQualificationService(): AiQualificationService {
  return {
    async extract() {
      return { status: "NOT_AVAILABLE", data: null };
    },
  };
}

export function createQualificationService(
  mode: "local" | "unavailable" | undefined,
): AiQualificationService {
  return mode === "local"
    ? createLocalQualificationService()
    : createUnavailableQualificationService();
}

export function qualificationLeadUpdate(data: AiQualification) {
  return {
    budget_min: data.budget_min ?? 0,
    budget_max: data.budget_max ?? data.budget_min ?? 0,
    purchase_timeline: data.purchase_timeline,
    buyer_type: data.buyer_type,
    engagement_quality: data.engagement_quality,
    site_visit_interest: data.site_visit_request,
    handoff_signals: {
      price_negotiation: data.negotiation_intent,
      booking_request: data.booking_intent,
      compliance_question: data.compliance_question,
      angry_or_confused: data.angry_or_confused,
      human_requested: data.human_requested,
      serious_competitor_comparison: data.competitor_comparison,
    },
    preferred_location: data.preferred_location,
    ai_summary: data.summary || null,
    key_questions: data.key_questions,
    objections: data.objections,
    ai_confidence: data.confidence,
    ai_signals: data,
  };
}
