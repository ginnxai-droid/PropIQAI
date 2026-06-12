import { describe, expect, it } from "vitest";
import {
  BUSINESS_HOURS_VERSION,
  isAfterBusinessHours,
} from "../server/workflow/businessHours";

describe("Stage 3 India business hours", () => {
  it("uses the documented version", () => {
    expect(BUSINESS_HOURS_VERSION).toBe("india-mon-sat-10-19-v1");
  });

  it("treats Monday through Saturday 10:00-18:59 India time as business hours", () => {
    expect(isAfterBusinessHours(new Date("2026-06-15T04:30:00.000Z"))).toBe(false);
    expect(isAfterBusinessHours(new Date("2026-06-20T13:29:00.000Z"))).toBe(false);
  });

  it("treats before 10:00, 19:00 onward, and Sunday as after-hours", () => {
    expect(isAfterBusinessHours(new Date("2026-06-15T04:29:00.000Z"))).toBe(true);
    expect(isAfterBusinessHours(new Date("2026-06-15T13:30:00.000Z"))).toBe(true);
    expect(isAfterBusinessHours(new Date("2026-06-14T06:30:00.000Z"))).toBe(true);
  });
});
