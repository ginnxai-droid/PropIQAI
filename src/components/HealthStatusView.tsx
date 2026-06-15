import { useEffect, useState } from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { apiRequest } from "../lib/api";

type Health = Record<string, any>;

export function HealthStatusView() {
  const [health, setHealth] = useState<Health | null>(null);
  const [database, setDatabase] = useState<Health | null>(null);
  const [configuration, setConfiguration] = useState<Health | null>(null);

  useEffect(() => {
    void Promise.all([
      apiRequest<Health>("/api/health"),
      apiRequest<Health>("/api/health/db"),
      apiRequest<Health>("/api/health/config"),
    ]).then(([service, db, config]) => {
      setHealth(service);
      setDatabase(db);
      setConfiguration(config);
    });
  }, []);

  return (
    <div className="space-y-5" data-testid="health-status">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <Activity className="h-5 w-5 text-emerald-400" />
          Pilot Health And Configuration
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Safe operational checks. Secret values are never returned.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["API", health?.status ?? "Loading"],
          ["Database", database?.database ?? "Loading"],
          ["Environment", configuration?.environment ?? "Loading"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-[#121214] p-5">
            <span className="text-[10px] font-bold uppercase text-zinc-500">{label}</span>
            <span className="mt-2 block text-lg font-black text-zinc-100">{value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-800 bg-[#121214] p-5">
        <h4 className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          Configuration Presence
        </h4>
        <div className="mt-4 grid gap-2 text-xs md:grid-cols-2">
          {Object.entries(configuration?.checks ?? {}).map(([name, value]) => (
            <div key={name} className="flex justify-between border-b border-zinc-800 py-2">
              <span className="text-zinc-500">{name}</span>
              <span className="font-bold text-zinc-200">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
