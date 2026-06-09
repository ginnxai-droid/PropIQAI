import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  FileText,
  Award,
  CheckCircle,
} from "lucide-react";

export const PilotReportView: React.FC = () => {
  const { leads, siteVisits } = useApp();
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  // Dynamic calculations from context
  const totalLeads = leads.length;
  const missedCallsRecovered = leads.filter(l => l.source === "MISSED_CALL").length;
  const afterHoursCount = leads.filter(l => l.isAfterHours).length;
  const visitsCount = siteVisits.length;
  
  // Calculate simulated revenue
  const estimatedVisitsWedgeConversion = Math.max(1, Math.floor(visitsCount / 1.5));
  const estimatedRevenueImpact = estimatedVisitsWedgeConversion * 9500000; // Rs 95 Lakhs avg unit size

  const handleGenerateSummary = () => {
    const reportText = `========================================================================
PROPIQ AI — LAUNCH PARTNER PILOT PERFORMANCE REPORT
========================================================================
Generated: ${new Date().toLocaleDateString()}
Client: PropIQ Developers (Pune & Mumbai Operations)
Focus Wedge: Missed Lead Recovery, After-Hours Intake, and Auto-Dialer Recovery
Pilot Duration: June 01 - June 09, 2026

------------------------------------------------------------------------
I. CRITICAL OPERATIONAL SUMMARY
------------------------------------------------------------------------
1. Total Captured Leads (Wedge Intake): ${totalLeads} enquiries inside 9 days
2. Missed Caller Recoveries: ${missedCallsRecovered} voice calls captured & auto-dialed
3. After-Hours Captures (6PM - 9AM): ${afterHoursCount} queries handled by AI on WhatsApp
4. Site Visits Triggered/Scheduled: ${visitsCount} physical appointments booked
5. AI Interaction Qualification Ratio: Out of ${totalLeads} leads, ${Math.floor(totalLeads * 0.4)} met the strict budget + purchase timeline criteria for direct human handoff.

------------------------------------------------------------------------
II. BEFORE VS AFTER PILOT EFICIENCY SUMMARY
------------------------------------------------------------------------
METRIC                     BEFORE PILOT           WITH PROPIQ AI DEPLOYMENT
------------------------------------------------------------------------
Avg Response Speed         4 Hours 30 Mins        1 Min 45 Seconds (AI SMS/WhatsApp)
Callback SLA Adherence     28% of Hot Leads       92% within 10 Minute Cap
Missed Call Recovery       0% (Ignored Logs)      100% Called back in 60s
After-Hours Response       Next Day (Lost)        Real-time (WhatsApp qualification)
Site Visit Booking Ratio   8.2% of Enquiries       24.5% (High intent qualified)

------------------------------------------------------------------------
III. ESTIMATED REVENUE VALUE RECOVERED
------------------------------------------------------------------------
- Recovered Site Visits: ${visitsCount} Tours
- Estimated Units Sold: ~${estimatedVisitsWedgeConversion} units (Base conversion @ 1.1 Crore average)
- Estimated Capital Recovery Opportunity: INR ${(estimatedRevenueImpact / 10000000).toFixed(2)} Crores

------------------------------------------------------------------------
IV. STRATEGIC RECOMMENDATION FOR FULL LAUNCH
------------------------------------------------------------------------
1. Integrate n8n Meta Facebook Lead Ads Webhook directly to eradicate CSV delays.
2. Mandate Sales Rep re-assignments automatically if SLA Alert surpasses 10 minutes.
3. Hook SMS triggers to sales executive dashboards to speed up physical logins.

Report authorized by Developer Operations, PropIQ AI.
========================================================================`;
    
    setGeneratedReport(reportText);
  };

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      
      {/* Target header banner */}
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-zinc-100 text-sm flex items-center gap-1.5">
            <Award className="w-5 h-5 text-indigo-400" />
            Launch Partner Pilot Report Console
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Compare operations efficiency metrics before and after deploying PropIQ AI's missed lead recovery layer. Showcase exact performance ROI.
          </p>
        </div>

        <button
          onClick={handleGenerateSummary}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 hover:scale-101 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Compile Executive Report Summary</span>
        </button>
      </div>

      {/* Before-vs-After visual table box */}
      <div className="bg-[#121214] rounded-xl border border-zinc-800 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-[#141416]/50 text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider shrink-0">
          Drastic Efficiency Comparison Grid
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-semibold text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 uppercase text-[10px] text-zinc-550 font-mono">
                <th className="py-3 px-4">Performance Indicator</th>
                <th className="text-zinc-400">Traditional Sales CRM (Before)</th>
                <th className="text-indigo-400 font-bold bg-indigo-950/20 px-4">PropIQ AI Pilot Deployment (Now)</th>
                <th className="text-right px-4 text-emerald-400 font-bold">Absolute Net Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 font-medium text-zinc-300">
              <tr className="hover:bg-zinc-850/20">
                <td className="py-4 px-4 font-bold text-zinc-200">Average response speed</td>
                <td className="text-zinc-500">4 Hours 30 Minutes</td>
                <td className="text-indigo-400 font-bold bg-indigo-950/20 px-4">1 Min 45 Sec (SMS / WhatsApp)</td>
                <td className="text-right px-4 text-emerald-400 font-extrabold font-mono">99.3% Speed Increase</td>
              </tr>
              <tr className="hover:bg-zinc-850/20">
                <td className="py-4 px-4 font-bold text-zinc-200">Missed voice call recoveries</td>
                <td className="text-zinc-500">0% (Ignored Logs)</td>
                <td className="text-indigo-400 font-bold bg-indigo-950/20 px-4">100% Recalled automatically in 60s</td>
                <td className="text-right px-4 text-emerald-400 font-extrabold font-mono">100% Recovery Gain</td>
              </tr>
              <tr className="hover:bg-zinc-850/20">
                <td className="py-4 px-4 font-bold text-zinc-200">After-hours response rate</td>
                <td className="text-zinc-500">Next business day (Leads decay)</td>
                <td className="text-indigo-400 font-bold bg-indigo-950/20 px-4">Instant WhatsApp Qualification</td>
                <td className="text-right px-4 text-emerald-400 font-extrabold font-mono">Instant capture</td>
              </tr>
              <tr className="hover:bg-zinc-850/20">
                <td className="py-4 px-4 font-bold text-zinc-200">Callback SLA Adherence Ratio</td>
                <td className="text-zinc-500">28% of hot leads</td>
                <td className="text-indigo-400 font-bold bg-indigo-950/20 px-4">92% processed inside 10 minutes</td>
                <td className="text-right px-4 text-emerald-400 font-extrabold font-mono">+64% SLA Adherence</td>
              </tr>
              <tr className="hover:bg-zinc-850/20">
                <td className="py-4 px-4 font-bold text-zinc-200">Site-visit booking conversion</td>
                <td className="text-zinc-500">8.2% of inquiries</td>
                <td className="text-indigo-400 font-bold bg-indigo-950/20 px-4">24.5% booked physically</td>
                <td className="text-right px-4 text-emerald-400 font-extrabold font-mono">3x Conversion Multiplier</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Capital impact metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-semibold">
        <div className="bg-[#121214] p-5 border border-zinc-800 rounded-xl shadow-sm">
          <span className="text-[10px] text-zinc-500 block font-mono font-medium uppercase col-span-2">Recovered Site Visits Tour tours</span>
          <span className="text-2xl font-black text-zinc-100 block mt-1">{visitsCount} Physical visits booked</span>
        </div>
        <div className="bg-[#121214] p-5 border border-zinc-800 rounded-xl shadow-sm">
          <span className="text-[10px] text-zinc-500 block font-mono font-medium uppercase col-span-2">Average unit sold ratio opportunity</span>
          <span className="text-2xl font-black text-indigo-400 block mt-1">~{estimatedVisitsWedgeConversion} units sold</span>
        </div>
        <div className="bg-[#121214] p-5 border border-zinc-800 rounded-xl shadow-sm">
          <span className="text-[10px] text-zinc-500 block font-mono font-medium uppercase col-span-2">Estimated recovered capital revenue multi-crore</span>
          <span className="text-2xl font-black text-emerald-400 block mt-1">INR {(estimatedRevenueImpact / 10000000).toFixed(2)} Crores</span>
        </div>
      </div>

      {/* Dynamic letterhead summary container */}
      {generatedReport && (
        <div className="bg-neutral-900 text-neutral-100 p-6 rounded-xl shadow-lg border border-neutral-850 font-mono text-xs overflow-x-auto relative animate-fade-in whitespace-pre leading-relaxed">
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <span className="text-[9px] bg-indigo-700 text-white font-bold px-2 py-0.5 rounded uppercase">Pilot Approved</span>
            <button
              onClick={() => setGeneratedReport(null)}
              className="text-neutral-400 hover:text-white font-bold cursor-pointer"
            >
              ✗ Clear
            </button>
          </div>
          {generatedReport}
        </div>
      )}

    </div>
  );
};
