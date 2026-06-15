import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useApp } from "../context/AppContext";

const labels: Record<string, string> = {
  HOT_LEADS: "HOT Lead Queue",
  SLA_BREACH: "SLA Breach Queue",
  MANAGER_ESCALATION: "Manager Escalation Queue",
  DUPLICATE_REVIEW: "Duplicate Review Queue",
  AFTER_HOURS: "After-Hours Lead Queue",
  SITE_VISIT_FOLLOW_UP: "Site Visit Follow-Up Queue",
  AI_UNAVAILABLE: "AI Unavailable Review Queue",
};

export function OperationalQueuesView() {
  const { pilotOverview, setActivePage, setSelectedLeadId, users } = useApp();
  const [queue, setQueue] = useState("HOT_LEADS");
  const [severity, setSeverity] = useState("ALL");
  const rows = useMemo(
    () =>
      (pilotOverview?.queues[queue] ?? []).filter(
        (row) => severity === "ALL" || row.severity === severity,
      ),
    [pilotOverview, queue, severity],
  );

  return (
    <div className="space-y-5" data-testid="operational-queues">
      <div className="flex flex-col justify-between gap-3 border-b border-zinc-800 pb-4 md:flex-row">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Operational Queues</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Tenant-scoped persisted work requiring action or review.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <Filter className="h-4 w-4" />
          Severity
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-100"
          >
            {["ALL", "INFO", "WARNING", "HIGH", "CRITICAL"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.entries(labels).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setQueue(id)}
            className={`whitespace-nowrap rounded border px-3 py-2 text-xs font-bold ${
              queue === id
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            {label} ({pilotOverview?.queues[id]?.length ?? 0})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900 text-[10px] uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Severity</th>
              <th>Created</th>
              <th>Due</th>
              <th className="px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <span className="font-bold text-zinc-200">{row.leadName}</span>
                  <span className="block text-[10px] text-zinc-500">{row.reason ?? labels[row.kind]}</span>
                </td>
                <td>{row.status}</td>
                <td>
                  {users.find((user) => user.id === row.assignedTo)?.name ??
                    row.assignedRole ??
                    "Unassigned"}
                </td>
                <td>{row.severity}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.dueAt ? new Date(row.dueAt).toLocaleString() : "Not available"}</td>
                <td className="px-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedLeadId(row.leadId);
                      setActivePage("detail");
                    }}
                    className="rounded bg-indigo-600 px-3 py-1.5 font-bold text-white"
                  >
                    Open Lead
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No persisted records currently match this queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
