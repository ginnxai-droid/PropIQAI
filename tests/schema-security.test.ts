import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = fs.readFileSync(
  path.join(root, "supabase/migrations/202606090001_stage_1_schema.sql"),
  "utf8",
);
const rls = fs.readFileSync(
  path.join(root, "supabase/migrations/202606090002_stage_1_rls.sql"),
  "utf8",
);
const assignmentRpc = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/202606090003_secure_assignment_rpc.sql",
  ),
  "utf8",
);
const membershipIntegrity = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/202606090006_membership_integrity.sql",
  ),
  "utf8",
);
const stage3 = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/202606120001_stage_3_external_intake.sql",
  ),
  "utf8",
);
const securityDefinitions = `${rls}\n${stage3}`;
const environmentExample = fs.readFileSync(
  path.join(root, ".env.example"),
  "utf8",
);
const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
const seedScript = fs.readFileSync(
  path.join(root, "scripts/seed.ts"),
  "utf8",
);
const dashboardView = fs.readFileSync(
  path.join(root, "src/components/DashboardView.tsx"),
  "utf8",
);
const pilotReportView = fs.readFileSync(
  path.join(root, "src/components/PilotReportView.tsx"),
  "utf8",
);
const settingsView = fs.readFileSync(
  path.join(root, "src/components/SettingsView.tsx"),
  "utf8",
);
const serverApp = fs.readFileSync(path.join(root, "server/app.ts"), "utf8");

const tenantTables = [
  "organizations",
  "profiles",
  "organization_members",
  "organization_member_projects",
  "projects",
  "leads",
  "conversations",
  "handoffs",
  "site_visits",
  "followup_tasks",
  "sla_events",
  "audit_logs",
  "lead_intake_events",
  "lead_duplicate_events",
  "integration_events",
  "internal_alerts",
];

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : [target];
  });
}

describe("database security definition", () => {
  it.each(tenantTables)("enables RLS on %s", (table) => {
    expect(securityDefinitions).toContain(
      `alter table public.${table} enable row level security;`,
    );
  });

  it("defines tenant foreign keys and tenant-scoped uniqueness", () => {
    expect(schema).toContain(
      "foreign key (organization_id, project_id) references public.projects(organization_id, id)",
    );
    expect(schema).toContain("leads_org_project_phone_unique");
    expect(schema).toContain("unique (organization_id, profile_id)");
  });

  it("keeps audit records append-only for authenticated users", () => {
    expect(rls).toContain(
      "revoke update, delete, truncate on public.audit_logs from authenticated;",
    );
  });

  it("uses an atomic, authorization-aware lead assignment RPC", () => {
    expect(assignmentRpc).toContain("create or replace function public.assign_lead_secure");
    expect(assignmentRpc).toContain("has_organization_role");
    expect(assignmentRpc).toContain("insert into public.audit_logs");
  });

  it("prevents direct admin-to-owner escalation and cross-tenant assignees", () => {
    expect(membershipIntegrity).toContain(
      "create or replace function public.protect_membership_privileges",
    );
    expect(membershipIntegrity).toContain(
      "actor_role = 'ADMIN' and new.role in ('MANAGER', 'EXECUTIVE')",
    );
    expect(membershipIntegrity).toContain("leads_assignee_same_org_fk");
    expect(membershipIntegrity).toContain(
      "member_projects_membership_same_org_fk",
    );
  });

  it("does not reference the service role secret from browser source", () => {
    const clientFiles = sourceFiles(path.join(root, "src")).filter((file) =>
      /\.(ts|tsx|js|jsx)$/.test(file),
    );
    for (const file of clientFiles) {
      expect(fs.readFileSync(file, "utf8")).not.toContain(
        "SUPABASE_SERVICE_ROLE_KEY",
      );
    }
  });

  it("keeps raw Stage 3 intake and integration payloads server-only", () => {
    expect(stage3).toContain(
      "revoke all on public.lead_intake_events from authenticated;",
    );
    expect(stage3).toContain(
      "revoke all on public.integration_events from authenticated;",
    );
    expect(stage3).toContain(
      "create policy internal_alerts_select_permitted",
    );
  });

  it("keeps local secret files ignored and example secrets empty", () => {
    expect(gitignore).toContain(".env*");
    expect(gitignore).toContain("!.env.example");
    expect(environmentExample).toMatch(
      /^SUPABASE_SERVICE_ROLE_KEY=\s*$/m,
    );
    expect(environmentExample).toMatch(/^SEED_DEFAULT_PASSWORD=\s*$/m);
    expect(environmentExample).toMatch(/^INTAKE_WEBHOOK_SECRET=\s*$/m);
  });

  it("requires a seed password without printing it", () => {
    expect(seedScript).toContain(
      'const password = process.env.SEED_DEFAULT_PASSWORD;',
    );
    expect(seedScript).toContain("password,");
    expect(seedScript).toContain("email_confirm: true");
    expect(seedScript).toContain('onConflict: "membership_id,project_id"');
    expect(seedScript).toContain("ignoreDuplicates: false");
    expect(seedScript).toContain(
      '.select("organization_id, membership_id, project_id")',
    );
    expect(seedScript).not.toContain("Password for all seed users");
    expect(seedScript).not.toContain("ChangeMe-Stage1!");
  });

  it("does not publish fabricated performance or integration claims", () => {
    expect(dashboardView).not.toContain("+15% vs wk");
    expect(dashboardView).toContain(
      'lead.ai_qualification_status === "COMPLETED"',
    );
    expect(dashboardView).toContain("AI Qualified");
    expect(dashboardView).not.toContain("Voice Recoveries");
    expect(pilotReportView).toContain("Not available");
    expect(pilotReportView).toContain(
      "calculated only from persisted Stage 2 and Stage 3 workflow records",
    );
  });

  it("keeps Stage 1 settings and webhook configuration read-only", () => {
    expect(settingsView).not.toMatch(/<(input|select|textarea|form)\b/);
    expect(settingsView).not.toContain("<button");
    expect(settingsView).toContain("Not available");
    expect(serverApp).not.toContain('app.use("/api/settings"');
    expect(serverApp).not.toContain('app.use("/api/webhooks"');
  });
});
