import { describe, expect, it } from "vitest";
import {
  calculateSlaDeadline,
  escalationLevel,
} from "../server/workflow/sla";

describe("Stage 2 SLA engine", () => {
  const now = new Date("2026-06-11T06:00:00.000Z");

  it("uses five minutes for urgent hot and ten minutes for score-only hot", () => {
    expect(
      calculateSlaDeadline({ priority: "HOT", urgentHandoff: true, now })?.toISOString(),
    ).toBe("2026-06-11T06:05:00.000Z");
    expect(
      calculateSlaDeadline({ priority: "HOT", urgentHandoff: false, now })?.toISOString(),
    ).toBe("2026-06-11T06:10:00.000Z");
  });

  it("uses same business day for warm leads", () => {
    expect(
      calculateSlaDeadline({ priority: "WARM", now })?.toISOString(),
    ).toBe("2026-06-11T11:30:00.000Z");
  });

  it("rolls after-hours warm leads to the next business day", () => {
    expect(
      calculateSlaDeadline({
        priority: "WARM",
        now: new Date("2026-06-12T13:00:00.000Z"),
      })?.toISOString(),
    ).toBe("2026-06-15T11:30:00.000Z");
  });

  it("uses 48 hours for nurture and no urgent SLA for cold", () => {
    expect(
      calculateSlaDeadline({ priority: "NURTURE", now })?.toISOString(),
    ).toBe("2026-06-13T06:00:00.000Z");
    expect(calculateSlaDeadline({ priority: "COLD", now })).toBeNull();
  });

  it("calculates persisted escalation levels", () => {
    const due = new Date("2026-06-11T06:00:00.000Z");
    expect(escalationLevel(due, new Date("2026-06-11T06:01:00.000Z"))).toBe(1);
    expect(escalationLevel(due, new Date("2026-06-11T06:15:00.000Z"))).toBe(2);
    expect(escalationLevel(due, new Date("2026-06-11T06:30:00.000Z"))).toBe(3);
    expect(escalationLevel(due, new Date("2026-06-11T07:00:00.000Z"))).toBe(4);
    expect(
      escalationLevel(
        due,
        new Date("2026-06-11T07:00:00.000Z"),
        new Date("2026-06-11T05:59:00.000Z"),
      ),
    ).toBe(0);
  });
});
