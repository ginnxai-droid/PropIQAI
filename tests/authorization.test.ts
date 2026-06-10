import { describe, expect, it } from "vitest";
import {
  canGrantRole,
  hasPermission,
  requirePermission,
} from "../server/authorization";
import { ApiError } from "../server/errors";

describe("role authorization", () => {
  it("allows owners to manage projects and members", () => {
    expect(hasPermission("OWNER", "projects:manage")).toBe(true);
    expect(hasPermission("OWNER", "members:manage")).toBe(true);
  });

  it("prevents executives from management and reporting operations", () => {
    expect(hasPermission("EXECUTIVE", "projects:manage")).toBe(false);
    expect(hasPermission("EXECUTIVE", "leads:assign")).toBe(false);
    expect(hasPermission("EXECUTIVE", "reports:read")).toBe(false);
    expect(hasPermission("EXECUTIVE", "handoffs:create")).toBe(false);
    expect(hasPermission("EXECUTIVE", "members:read")).toBe(false);
    expect(hasPermission("EXECUTIVE", "members:manage")).toBe(false);
    expect(() => requirePermission("EXECUTIVE", "projects:manage")).toThrow(
      ApiError,
    );
    expect(() => requirePermission("EXECUTIVE", "members:manage")).toThrow(
      ApiError,
    );
  });

  it("allows management roles to create handoffs", () => {
    expect(hasPermission("OWNER", "handoffs:create")).toBe(true);
    expect(hasPermission("ADMIN", "handoffs:create")).toBe(true);
    expect(hasPermission("MANAGER", "handoffs:create")).toBe(true);
  });

  it("limits role grants by actor role", () => {
    expect(canGrantRole("OWNER", "OWNER")).toBe(true);
    expect(canGrantRole("ADMIN", "MANAGER")).toBe(true);
    expect(canGrantRole("ADMIN", "OWNER")).toBe(false);
    expect(canGrantRole("MANAGER", "EXECUTIVE")).toBe(false);
  });
});
