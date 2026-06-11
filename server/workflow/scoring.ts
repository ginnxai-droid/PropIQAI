export const SCORING_VERSION = "stage-2-v1";

export type LeadPriority = "HOT" | "WARM" | "NURTURE" | "COLD";
export type EngagementQuality = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type CallbackResponsiveness =
  | "RESPONSIVE"
  | "DELAYED"
  | "UNRESPONSIVE"
  | "UNKNOWN";

export interface HandoffSignals {
  price_negotiation?: boolean;
  booking_request?: boolean;
  compliance_question?: boolean;
  angry_or_confused?: boolean;
  human_requested?: boolean;
  serious_competitor_comparison?: boolean;
}

export interface ScoringInput {
  projectPriceMin: number;
  projectPriceMax: number;
  budgetMin: number;
  budgetMax: number;
  purchaseTimeline: string;
  buyerType: string;
  siteVisitInterest: boolean;
  engagementQuality: EngagementQuality;
  source: string;
  callbackResponsiveness: CallbackResponsiveness;
  handoffSignals: HandoffSignals;
}

export interface ScoreComponent {
  normalized: number;
  weight: number;
  contribution: number;
}

export interface ScoringResult {
  total: number;
  priority: LeadPriority;
  components: Record<string, ScoreComponent>;
  version: typeof SCORING_VERSION;
  explanation: string;
  recalculatedAt: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scoreBudgetFit(input: ScoringInput): number {
  if (
    input.budgetMax <= 0 ||
    input.projectPriceMin <= 0 ||
    input.projectPriceMax < input.projectPriceMin
  ) {
    return 1;
  }
  const overlaps =
    input.budgetMax >= input.projectPriceMin &&
    input.budgetMin <= input.projectPriceMax;
  if (overlaps && input.budgetMin >= input.projectPriceMin) {
    return 10;
  }
  if (overlaps) {
    return 8;
  }
  if (input.budgetMax >= input.projectPriceMin * 0.9) {
    return 6;
  }
  if (input.budgetMax >= input.projectPriceMin * 0.75) {
    return 4;
  }
  return 1;
}

export function scoreTimeline(value: string): number {
  return (
    {
      IMMEDIATE: 10,
      WITHIN_3_MONTHS: 9,
      THREE_TO_SIX_MONTHS: 7,
      SIX_TO_TWELVE_MONTHS: 5,
      LONG_TERM: 3,
      UNKNOWN: 1,
    }[value] ?? 1
  );
}

export function scoreBuyerIntent(input: ScoringInput): number {
  const base =
    {
      FAMILY_BUYER: 7,
      INVESTOR: 7,
      FIRST_TIME_BUYER: 7,
      NRI: 7,
      COMPARISON_SHOPPER: 5,
      UNKNOWN: 2,
    }[input.buyerType] ?? 2;
  const visitBoost = input.siteVisitInterest ? 2 : 0;
  const commercialBoost =
    input.handoffSignals.booking_request ||
    input.handoffSignals.price_negotiation
      ? 1
      : 0;
  return clamp(base + visitBoost + commercialBoost, 1, 10);
}

export function scoreEngagement(value: EngagementQuality): number {
  return { HIGH: 10, MEDIUM: 7, LOW: 4, UNKNOWN: 1 }[value];
}

export function scoreSource(value: string): number {
  return (
    {
      PHONE: 9,
      MISSED_CALL: 9,
      WEBSITE: 8,
      GOOGLE: 8,
      PORTAL: 8,
      EMAIL: 6,
      MANUAL: 6,
      META: 5,
      WHATSAPP: 5,
    }[value] ?? 1
  );
}

export function scoreResponsiveness(value: CallbackResponsiveness): number {
  return { RESPONSIVE: 10, DELAYED: 6, UNRESPONSIVE: 2, UNKNOWN: 1 }[
    value
  ];
}

export function priorityForScore(score: number): LeadPriority {
  if (score >= 8) return "HOT";
  if (score >= 6) return "WARM";
  if (score >= 4) return "NURTURE";
  return "COLD";
}

export function calculateLeadScore(
  input: ScoringInput,
  now = new Date(),
): ScoringResult {
  const values = {
    budget_fit: { normalized: scoreBudgetFit(input), weight: 0.3 },
    purchase_timeline: { normalized: scoreTimeline(input.purchaseTimeline), weight: 0.25 },
    buyer_intent: { normalized: scoreBuyerIntent(input), weight: 0.15 },
    engagement_quality: { normalized: scoreEngagement(input.engagementQuality), weight: 0.15 },
    source_quality: { normalized: scoreSource(input.source), weight: 0.1 },
    callback_responsiveness: {
      normalized: scoreResponsiveness(input.callbackResponsiveness),
      weight: 0.05,
    },
  };
  const components = Object.fromEntries(
    Object.entries(values).map(([name, component]) => [
      name,
      {
        ...component,
        contribution: Number(
          (component.normalized * component.weight).toFixed(2),
        ),
      },
    ]),
  );
  const total = Number(
    clamp(
      Object.values(components).reduce(
        (sum, component) => sum + component.contribution,
        0,
      ),
      1,
      10,
    ).toFixed(1),
  );
  const priority = priorityForScore(total);
  const explanation = Object.entries(components)
    .map(
      ([name, component]) =>
        `${name}: ${component.normalized}/10 x ${Math.round(component.weight * 100)}% = ${component.contribution.toFixed(2)}`,
    )
    .concat(`total: ${total.toFixed(1)}/10 (${priority})`)
    .join("; ");

  return {
    total,
    priority,
    components,
    version: SCORING_VERSION,
    explanation,
    recalculatedAt: now.toISOString(),
  };
}
