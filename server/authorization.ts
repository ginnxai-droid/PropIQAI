import { ApiError } from "./errors";

export const roles = ["OWNER", "MANAGER", "EXECUTIVE", "ADMIN"] as const;
export type OrganizationRole = (typeof roles)[number];

export type Permission =
  | "projects:read"
  | "projects:manage"
  | "leads:read"
  | "leads:create"
  | "leads:assign"
  | "leads:update"
  | "conversations:create"
  | "handoffs:create"
  | "visits:read"
  | "visits:create"
  | "visits:update"
  | "tasks:create"
  | "tasks:update"
  | "reports:read"
  | "sla:read"
  | "members:read"
  | "members:manage";

const permissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  OWNER: new Set([
    "projects:read",
    "projects:manage",
    "leads:read",
    "leads:create",
    "leads:assign",
    "leads:update",
    "conversations:create",
    "handoffs:create",
    "visits:read",
    "visits:create",
    "visits:update",
    "tasks:create",
    "tasks:update",
    "reports:read",
    "sla:read",
    "members:read",
    "members:manage",
  ]),
  ADMIN: new Set([
    "projects:read",
    "projects:manage",
    "leads:read",
    "leads:create",
    "leads:assign",
    "leads:update",
    "conversations:create",
    "handoffs:create",
    "visits:read",
    "visits:create",
    "visits:update",
    "tasks:create",
    "tasks:update",
    "reports:read",
    "sla:read",
    "members:read",
    "members:manage",
  ]),
  MANAGER: new Set([
    "projects:read",
    "leads:read",
    "leads:create",
    "leads:assign",
    "leads:update",
    "conversations:create",
    "handoffs:create",
    "visits:read",
    "visits:create",
    "visits:update",
    "tasks:create",
    "tasks:update",
    "reports:read",
    "sla:read",
    "members:read",
  ]),
  EXECUTIVE: new Set([
    "projects:read",
    "leads:read",
    "leads:update",
    "conversations:create",
    "visits:read",
    "visits:create",
    "visits:update",
    "tasks:update",
  ]),
};

export function hasPermission(
  role: OrganizationRole,
  permission: Permission,
): boolean {
  return permissions[role].has(permission);
}

export function requirePermission(
  role: OrganizationRole,
  permission: Permission,
): void {
  if (!hasPermission(role, permission)) {
    throw new ApiError(
      403,
      "You do not have permission to perform this action.",
      "FORBIDDEN",
    );
  }
}

export function canGrantRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
): boolean {
  if (actorRole === "OWNER") {
    return true;
  }
  if (actorRole === "ADMIN") {
    return targetRole === "MANAGER" || targetRole === "EXECUTIVE";
  }
  return false;
}
