import { PlugZap } from "lucide-react";
import { useApp } from "../context/AppContext";

export function IntegrationStatusView() {
  const { pilotOverview } = useApp();
  return (
    <div className="space-y-5" data-testid="integration-status">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <PlugZap className="h-5 w-5 text-indigo-400" />
          Integration Readiness
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Provider readiness only. Unsupported external delivery remains Not available.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {pilotOverview?.integrations.map((integration) => (
          <div key={integration.provider} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#121214] p-4">
            <div>
              <span className="block text-xs font-bold text-zinc-200">{integration.label}</span>
              <span className="mt-1 block font-mono text-[10px] text-zinc-500">{integration.provider}</span>
            </div>
            <span className={integration.availability === "AVAILABLE" ? "text-emerald-400" : "text-zinc-500"}>
              {integration.availability === "AVAILABLE" ? "Available" : "Not available"}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-800 bg-[#121214] p-4 text-xs">
        <span className="font-bold text-zinc-200">Persisted integration failures</span>
        <span className="ml-2 text-rose-400">{pilotOverview?.integrationFailures.length ?? 0}</span>
      </div>
    </div>
  );
}
