import type { HandoffSignals, LeadPriority } from "./scoring";

export type HandoffReason =
  | "HOT_LEAD"
  | "SITE_VISIT_REQUEST"
  | "PRICE_NEGOTIATION"
  | "LEGAL_RERA_QUERY"
  | "BOOKING_REQUEST"
  | "HIGH_BUDGET_BUYER"
  | "ANGRY_BUYER"
  | "HUMAN_REQUESTED"
  | "COMPETITOR_COMPARISON";

export interface HandoffRuleInput {
  priority: LeadPriority;
  siteVisitInterest: boolean;
  budgetMax: number;
  projectPriceMax: number;
  signals: HandoffSignals;
}

export function determineHandoffReasons(
  input: HandoffRuleInput,
): HandoffReason[] {
  const reasons = new Set<HandoffReason>();
  if (input.priority === "HOT") reasons.add("HOT_LEAD");
  if (input.siteVisitInterest) reasons.add("SITE_VISIT_REQUEST");
  if (input.signals.price_negotiation) reasons.add("PRICE_NEGOTIATION");
  if (input.signals.booking_request) reasons.add("BOOKING_REQUEST");
  if (input.signals.compliance_question) reasons.add("LEGAL_RERA_QUERY");
  if (input.signals.angry_or_confused) reasons.add("ANGRY_BUYER");
  if (input.signals.human_requested) reasons.add("HUMAN_REQUESTED");
  if (input.signals.serious_competitor_comparison) {
    reasons.add("COMPETITOR_COMPARISON");
  }
  if (
    input.projectPriceMax > 0 &&
    input.budgetMax >= input.projectPriceMax
  ) {
    reasons.add("HIGH_BUDGET_BUYER");
  }
  return [...reasons];
}

export function isUrgentHandoff(reason: HandoffReason): boolean {
  return reason !== "HOT_LEAD";
}
