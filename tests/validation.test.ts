import { describe, expect, it } from "vitest";
import {
  handoffCreateSchema,
  leadCreateSchema,
  membershipCreateSchema,
  projectCreateSchema,
} from "../server/validation";

describe("server input validation", () => {
  it("rejects an invalid lead phone and inverted budget", () => {
    const result = leadCreateSchema.safeParse({
      project_id: "35c7b8fc-4ca6-499b-bb4c-791d0aa1e52b",
      name: "Buyer",
      phone: "abc",
      source: "WEBSITE",
      buyer_type: "UNKNOWN",
      apartment_preference: "2BHK",
      budget_min: 10_000_000,
      budget_max: 5_000_000,
      purchase_timeline: "UNKNOWN",
      score: 5,
      priority: "WARM",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("phone");
      expect(paths).toContain("budget_max");
    }
  });

  it("accepts a constrained project payload", () => {
    const result = projectCreateSchema.safeParse({
      name: "PropIQ Heights",
      location: "Pune",
      developer_name: "PropIQ Builders",
      rera_number: "P52100000001",
      price_min: 7_500_000,
      price_max: 12_000_000,
      possession_date: "2028-03-31",
      description: "A valid project.",
      amenities: ["Security"],
      faqs: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid membership roles and email addresses", () => {
    expect(
      membershipCreateSchema.safeParse({
        full_name: "Test User",
        email: "not-an-email",
        role: "SUPERUSER",
        project_ids: [],
      }).success,
    ).toBe(false);
  });

  it("accepts a constrained handoff payload", () => {
    expect(
      handoffCreateSchema.safeParse({
        lead_id: "35c7b8fc-4ca6-499b-bb4c-791d0aa1e52b",
        assigned_to: "6861ce5a-1823-4ac7-920a-a9c17b9b5866",
        reason: "HOT_LEAD",
        priority: "HOT",
        sla_deadline: "2026-06-10T12:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});
