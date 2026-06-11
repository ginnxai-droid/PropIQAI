import { describe, expect, it } from "vitest";
import {
  calculateLeadScore,
  priorityForScore,
  scoreBudgetFit,
  scoreBuyerIntent,
  scoreEngagement,
  scoreResponsiveness,
  scoreSource,
  scoreTimeline,
  type ScoringInput,
} from "../server/workflow/scoring";

const baseInput: ScoringInput = {
  projectPriceMin: 7_500_000,
  projectPriceMax: 14_000_000,
  budgetMin: 8_000_000,
  budgetMax: 12_000_000,
  purchaseTimeline: "IMMEDIATE",
  buyerType: "FAMILY_BUYER",
  siteVisitInterest: true,
  engagementQuality: "HIGH",
  source: "PHONE",
  callbackResponsiveness: "RESPONSIVE",
  handoffSignals: {},
};

describe("Stage 2 deterministic scoring", () => {
  it("scores budget fit from project and buyer ranges", () => {
    expect(scoreBudgetFit(baseInput)).toBe(10);
    expect(scoreBudgetFit({ ...baseInput, budgetMin: 1, budgetMax: 7_000_000 })).toBe(6);
    expect(scoreBudgetFit({ ...baseInput, budgetMin: 1, budgetMax: 5_000_000 })).toBe(1);
  });

  it("scores timeline, buyer intent, engagement, source, and responsiveness", () => {
    expect(scoreTimeline("WITHIN_3_MONTHS")).toBe(9);
    expect(scoreBuyerIntent(baseInput)).toBe(9);
    expect(
      scoreBuyerIntent({
        ...baseInput,
        handoffSignals: { booking_request: true },
      }),
    ).toBe(10);
    expect(scoreEngagement("MEDIUM")).toBe(7);
    expect(scoreSource("GOOGLE")).toBe(8);
    expect(scoreResponsiveness("DELAYED")).toBe(6);
  });

  it("maps every priority boundary", () => {
    expect(priorityForScore(8)).toBe("HOT");
    expect(priorityForScore(7.9)).toBe("WARM");
    expect(priorityForScore(6)).toBe("WARM");
    expect(priorityForScore(5.9)).toBe("NURTURE");
    expect(priorityForScore(4)).toBe("NURTURE");
    expect(priorityForScore(3.9)).toBe("COLD");
  });

  it("returns a weighted explainable score", () => {
    const result = calculateLeadScore(
      baseInput,
      new Date("2026-06-11T00:00:00.000Z"),
    );
    expect(result.total).toBe(9.8);
    expect(result.priority).toBe("HOT");
    expect(result.version).toBe("stage-2-v1");
    expect(result.recalculatedAt).toBe("2026-06-11T00:00:00.000Z");
    expect(result.components.budget_fit).toEqual({
      normalized: 10,
      weight: 0.3,
      contribution: 3,
    });
    expect(result.explanation).toContain("budget_fit: 10/10 x 30% = 3.00");
    expect(result.explanation).toContain("total: 9.8/10 (HOT)");
  });
});
