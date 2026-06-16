const requiredChecks = [
  "app loads",
  "api health passes",
  "db health passes or reports explicit degraded status",
  "config health hides secrets",
  "login works",
  "owner dashboard loads",
  "manager queue loads",
  "executive queue loads",
  "pilot kpi report loads",
  "integration status shows unavailable providers",
  "manual intake creates fake lead",
  "score appears",
  "handoff and sla appear",
  "operational queue opens lead detail",
  "no secrets appear in ui or api responses",
];

const secretNamePattern =
  /(authorization|cookie|password|passwd|secret|token|api[-_]?key|service[-_]?role|database[_-]?url)/i;

function parseArg(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function assertNoSecretValues(body: string) {
  for (const [key, value] of Object.entries(process.env)) {
    if (!value || value.length < 8 || !secretNamePattern.test(key)) continue;
    if (body.includes(value)) {
      throw new Error(`Smoke response exposed configured sensitive value: ${key}`);
    }
  }
}

async function checkJson(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.text();
  assertNoSecretValues(body);
  if (!response.ok && path !== "/api/health/db") {
    throw new Error(`${path} failed with ${response.status}`);
  }
  if (path === "/api/health/db" && ![200, 503].includes(response.status)) {
    throw new Error(`${path} returned unexpected status ${response.status}`);
  }
  JSON.parse(body);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apiUrl = parseArg("api-url") ?? process.env.DEMO_API_URL;

  if (dryRun) {
    console.log(JSON.stringify({ event: "demo_smoke_dry_run", requiredChecks }));
    return;
  }

  if (!apiUrl) {
    throw new Error("Provide --api-url <url> or DEMO_API_URL for hosted API checks.");
  }

  const baseUrl = normalizeUrl(apiUrl);
  await checkJson(baseUrl, "/api/health");
  await checkJson(baseUrl, "/api/health/db");
  await checkJson(baseUrl, "/api/health/config");
  console.log(
    JSON.stringify({
      event: "demo_smoke_api_passed",
      checked: ["/api/health", "/api/health/db", "/api/health/config"],
      manualChecksRemaining: requiredChecks.filter(
        (check) =>
          ![
            "api health passes",
            "db health passes or reports explicit degraded status",
            "config health hides secrets",
            "no secrets appear in ui or api responses",
          ].includes(check),
      ),
    }),
  );
}

await main();
