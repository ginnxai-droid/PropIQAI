import React, { useMemo, useState } from "react";
import { Award, FileText } from "lucide-react";
import { useApp } from "../context/AppContext";
import { summarizeSiteVisits } from "../lib/siteVisitMetrics";

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "Not available";
  }
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  return `${Math.round(seconds / 60)} minutes`;
}

export const PilotReportView: React.FC = () => {
  const {
    leads,
    siteVisits,
    slaEvents,
    intakeEvents,
    alerts,
    organizationName,
  } = useApp();
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const responseSeconds = leads.flatMap((lead) => {
      if (!lead.first_response_at) {
        return [];
      }
      return [
        Math.max(
          0,
          Math.round(
            (new Date(lead.first_response_at).getTime() -
              new Date(lead.created_at).getTime()) /
              1000,
          ),
        ),
      ];
    });
    const averageFirstResponseSeconds =
      responseSeconds.length > 0
        ? Math.round(
            responseSeconds.reduce((sum, value) => sum + value, 0) /
              responseSeconds.length,
          )
        : null;
    const completedSlas = slaEvents.filter(
      (event) =>
        event.completed_at &&
        new Date(event.completed_at).getTime() <=
          new Date(event.due_at).getTime(),
    ).length;
    const measurableSlas = slaEvents.filter(
      (event) => event.completed_at || event.breached,
    ).length;

    const visitMetrics = summarizeSiteVisits(siteVisits);

    return {
      totalLeads: leads.length,
      intakeCount: intakeEvents.length,
      duplicateIntakeCount: intakeEvents.filter(
        (event) => event.processing_status === "DUPLICATE",
      ).length,
      aiQualifiedIntakeCount: leads.filter(
        (lead) =>
          lead.received_at && lead.ai_qualification_status === "COMPLETED",
      ).length,
      activeAlerts: alerts.filter((alert) => alert.status !== "RESOLVED").length,
      afterHours: leads.filter((lead) => lead.isAfterHours).length,
      missedCallsResponded: leads.filter(
        (lead) => lead.source === "MISSED_CALL" && lead.first_response_at,
      ).length,
      ...visitMetrics,
      averageFirstResponseSeconds,
      slaAdherence:
        measurableSlas > 0
          ? Math.round((completedSlas / measurableSlas) * 100)
          : null,
    };
  }, [alerts, intakeEvents, leads, siteVisits, slaEvents]);

  const handleGenerateSummary = () => {
    setGeneratedReport(`PROPIQ AI - CONTROLLED PILOT METRICS
Generated: ${new Date().toISOString()}
Organization: ${organizationName}

Persisted leads: ${metrics.totalLeads}
External intake events: ${metrics.intakeCount}
Duplicate intake events: ${metrics.duplicateIntakeCount}
AI-qualified intake leads: ${metrics.aiQualifiedIntakeCount}
Active internal alerts: ${metrics.activeAlerts}
After-hours leads: ${metrics.afterHours}
Missed-call leads with a recorded first response: ${metrics.missedCallsResponded}
Confirmed site visits: ${metrics.confirmedSiteVisits}
Completed site visits: ${metrics.completedSiteVisits}
Active visit records: ${metrics.activeVisitRecords}
Average first response: ${formatDuration(metrics.averageFirstResponseSeconds)}
Measured SLA adherence: ${metrics.slaAdherence === null ? "Not available" : `${metrics.slaAdherence}%`}

Revenue opportunity: Not available.
Automated call recovery rate: Not available.
WhatsApp response performance: Not available.

Notes:
- Values above are calculated only from persisted Stage 2 and Stage 3 workflow records.
- Revenue and channel-delivery claims require verified external source events.
- This report is not evidence of production readiness.`);
  };

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-zinc-100 text-sm flex items-center gap-1.5">
            <Award className="w-5 h-5 text-indigo-400" />
            Controlled Pilot Metrics
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Values are calculated from persisted records. Unsupported metrics
            are labelled unavailable.
          </p>
        </div>
        <button
          onClick={handleGenerateSummary}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4" />
          Compile Summary
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          ["Persisted Leads", metrics.totalLeads],
          ["External Intake Events", metrics.intakeCount],
          ["Duplicate Intake Events", metrics.duplicateIntakeCount],
          ["AI-Qualified Intake", metrics.aiQualifiedIntakeCount],
          ["Active Internal Alerts", metrics.activeAlerts],
          ["Confirmed Site Visits", metrics.confirmedSiteVisits],
          ["Completed Site Visits", metrics.completedSiteVisits],
          ["Active Visit Records", metrics.activeVisitRecords],
          ["After-Hours Leads", metrics.afterHours],
          ["Missed Calls Responded", metrics.missedCallsResponded],
          ["Average First Response", formatDuration(metrics.averageFirstResponseSeconds)],
          [
            "Measured SLA Adherence",
            metrics.slaAdherence === null ? "Not available" : `${metrics.slaAdherence}%`,
          ],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#121214] p-5 border border-zinc-800 rounded-xl">
            <span className="text-[10px] text-zinc-500 uppercase font-mono">{label}</span>
            <span className="text-xl font-black text-zinc-100 block mt-2">{value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
        Revenue opportunity and external channel recovery metrics are Not
        available. Stage 3 internal alerts do not imply external delivery.
      </div>

      {generatedReport && (
        <div className="bg-neutral-900 text-neutral-100 p-6 rounded-xl border border-neutral-800 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {generatedReport}
        </div>
      )}
    </div>
  );
};
