import React from "react";
import { AlertTriangle, CheckCircle2, Eye, Siren } from "lucide-react";
import { useApp } from "../context/AppContext";

export const AlertsView: React.FC = () => {
  const {
    alerts,
    leads,
    updateAlertStatus,
    setSelectedLeadId,
    setActivePage,
  } = useApp();
  const activeAlerts = alerts.filter((alert) => alert.status !== "RESOLVED");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-5">
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-400">
          <Siren className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-rose-300">
            Internal Alert Queue
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Persisted Stage 3 alerts. External notification delivery is Not available.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#121214]">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 p-4 text-xs">
          <span className="font-bold uppercase text-zinc-300">
            Active alerts ({activeAlerts.length})
          </span>
          <span className="text-zinc-500">Acknowledge or resolve after review</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {activeAlerts.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500/30" />
              No active internal alerts.
            </div>
          ) : (
            activeAlerts.map((alert) => {
              const lead = leads.find((candidate) => candidate.id === alert.lead_id);
              return (
                <div key={alert.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          alert.severity === "CRITICAL"
                            ? "text-rose-400"
                            : "text-amber-400"
                        }`}
                      />
                      <span className="text-xs font-bold text-zinc-100">
                        {alert.alert_type.replace(/_/g, " ")}
                      </span>
                      <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                        {alert.severity}
                      </span>
                      <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[9px] text-indigo-300">
                        {alert.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">{alert.message}</p>
                    <p className="mt-1 font-mono text-[10px] text-zinc-600">
                      {lead?.name ?? "Lead unavailable"} ·{" "}
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead && (
                      <button
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setActivePage("detail");
                        }}
                        className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-[10px] font-bold text-zinc-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </button>
                    )}
                    {alert.status === "OPEN" && (
                      <button
                        onClick={() =>
                          void updateAlertStatus(alert.id, "ACKNOWLEDGED")
                        }
                        className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-300"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => void updateAlertStatus(alert.id, "RESOLVED")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
