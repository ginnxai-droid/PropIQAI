import React from "react";
import { Database, Settings, ShieldCheck, Webhook } from "lucide-react";
import { useApp } from "../context/AppContext";

export const SettingsView: React.FC = () => {
  const { organizationName, activeRole } = useApp();

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto font-sans">
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-md">
        <h3 className="font-extrabold text-zinc-150 text-sm flex items-center gap-1.5">
          <Settings className="w-5 h-5 text-indigo-400" />
          Secure Foundation Settings
        </h3>
        <p className="text-xs text-zinc-450 mt-1">
          Authenticated organization context and integration readiness for the
          controlled pilot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h4 className="mt-3 text-sm font-bold">Access context</h4>
          <p className="mt-1 text-xs text-zinc-400">{organizationName}</p>
          <p className="mt-1 text-xs font-mono text-indigo-400">{activeRole}</p>
        </div>
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5">
          <Database className="w-5 h-5 text-indigo-400" />
          <h4 className="mt-3 text-sm font-bold">Persistent storage</h4>
          <p className="mt-1 text-xs text-zinc-400">
            Core records use Supabase PostgreSQL with tenant Row-Level Security.
          </p>
        </div>
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5">
          <Webhook className="w-5 h-5 text-amber-400" />
          <h4 className="mt-3 text-sm font-bold">External intake</h4>
          <p className="mt-1 text-xs text-zinc-400">
            Not available. Webhook and n8n integrations remain outside
            Stage 1 scope.
          </p>
        </div>
      </div>
    </div>
  );
};
