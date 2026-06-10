import { describe, expect, it } from "vitest";
import { summarizeSiteVisits } from "../src/lib/siteVisitMetrics";

describe("site visit reporting metrics", () => {
  it("separates confirmed, completed, and active records across every status", () => {
    const metrics = summarizeSiteVisits([
      { status: "REQUESTED" },
      { status: "TENTATIVE" },
      { status: "CONFIRMED" },
      { status: "COMPLETED" },
      { status: "MISSED" },
      { status: "RESCHEDULED" },
      { status: "CANCELLED" },
    ]);

    expect(metrics).toEqual({
      confirmedSiteVisits: 1,
      completedSiteVisits: 1,
      activeVisitRecords: 6,
    });
  });
});
