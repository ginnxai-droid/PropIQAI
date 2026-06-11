import { describe, expect, it } from "vitest";
import {
  determineHandoffReasons,
  isUrgentHandoff,
} from "../server/workflow/handoffs";

describe("Stage 2 handoff rules", () => {
  it("creates every requested rule without duplicates", () => {
    const reasons = determineHandoffReasons({
      priority: "HOT",
      siteVisitInterest: true,
      budgetMax: 15_000_000,
      projectPriceMax: 14_000_000,
      signals: {
        price_negotiation: true,
        booking_request: true,
        compliance_question: true,
        angry_or_confused: true,
        human_requested: true,
        serious_competitor_comparison: true,
      },
    });
    expect(reasons).toEqual([
      "HOT_LEAD",
      "SITE_VISIT_REQUEST",
      "PRICE_NEGOTIATION",
      "BOOKING_REQUEST",
      "LEGAL_RERA_QUERY",
      "ANGRY_BUYER",
      "HUMAN_REQUESTED",
      "COMPETITOR_COMPARISON",
      "HIGH_BUDGET_BUYER",
    ]);
    expect(new Set(reasons).size).toBe(reasons.length);
  });

  it("creates no handoff when no rule applies", () => {
    expect(
      determineHandoffReasons({
        priority: "COLD",
        siteVisitInterest: false,
        budgetMax: 1,
        projectPriceMax: 10,
        signals: {},
      }),
    ).toEqual([]);
  });

  it("treats explicit buyer signals as urgent", () => {
    expect(isUrgentHandoff("HOT_LEAD")).toBe(false);
    expect(isUrgentHandoff("HUMAN_REQUESTED")).toBe(true);
  });
});
