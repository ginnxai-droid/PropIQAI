import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Settings,
  Terminal,
  Zap,
} from "lucide-react";
import { LeadSource, LeadStatus, BuyerType, PurchaseTimeline } from "../types";

export const SettingsView: React.FC = () => {
  const { addLead, setSelectedLeadId, setActivePage } = useApp();

  const [webhookPayload, setWebhookPayload] = useState<string>(JSON.stringify({
  "name": "Amit Singhal",
  "phone": "+91 99887 76655",
  "email": "amit.singhal@gmail.com",
  "source": "META",
  "projectId": "proj_1",
  "message": "Interested in 3BHK near Baner",
  "budgetMax": 14500000,
  "score": 9.2
}, null, 2));

  const [activeConsoleLog, setActiveConsoleLog] = useState<string[]>(["[System Config] Webhook listener initialized on port 3000.", "[System Config] Auto-qualification engines armed."]);

  const handleTestWebhookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(webhookPayload);
      if (!parsed.name || !parsed.phone) {
        throw new Error("Missing required validating attributes: 'name' or 'phone' is missing!");
      }

      // Append logs
      const logTime = new Date().toLocaleTimeString();
      setActiveConsoleLog(prev => [
        `[${logTime} Webhook Received] Payload matched validation schemas.`,
        `[${logTime} DB Check] Initiating duplicate phone check for ${parsed.phone}... No duplicate found inside database.`,
        `[${logTime} AI Score calculated] Score generated: ${parsed.score || 8.0}. Priority mapped: HOT.`,
        `[${logTime} Lead Registered] Successful webhook ingest! Lead ID generated. Routing to Active Lead Detail files...`,
        ...prev
      ]);

      // Trigger actual Context Ingest!
      const newLeadId = addLead({
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email || "inquiry@lead.ai",
        source: parsed.source as LeadSource || LeadSource.META,
        project_id: parsed.projectId || "proj_1",
        status: LeadStatus.NEW,
        buyer_type: BuyerType.FAMILY_BUYER,
        apartment_preference: "3BHK",
        budget_min: (parsed.budgetMax ? parsed.budgetMax * 0.8 : 8000000),
        budget_max: parsed.budgetMax || 14000000,
        purchase_timeline: PurchaseTimeline.IMMEDIATE,
        site_visit_interest: true,
        score: parsed.score || 8.6,
        isAfterHours: true,
        ai_summary: parsed.message || "Manual n8n simulator intake query.",
        recommended_next_action: "SLA timer triggered (10m). Call to confirm visit.",
      });

      // Target active detail inspect
      setTimeout(() => {
        setSelectedLeadId(newLeadId);
        setActivePage("detail");
      }, 1500);

    } catch (err: any) {
      setActiveConsoleLog(prev => [
        `[${new Date().toLocaleTimeString()} ERROR] Ingestion failed: ${err.message}`,
        ...prev
      ]);
    }
  };

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto font-sans">
      
      {/* Banner */}
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-md">
        <h3 className="font-extrabold text-zinc-150 text-sm flex items-center gap-1.5">
          <Settings className="w-5 h-5 text-indigo-400" />
          Settings Portal & n8n webhook simulators
        </h3>
        <p className="text-xs text-zinc-450 mt-1">
          Bridge operations with automation grids. This portal prepares schemas and exposes webhook sandboxes to replicate the Phase 1 intakes before connecting raw n8n nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Webhook Sandbox */}
        <div className="bg-[#121214] rounded-xl border border-zinc-800 p-5 shadow-lg flex flex-col space-y-4">
          <div>
            <h4 className="font-extrabold text-indigo-400 text-xs uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              Dynamic n8n intake Webhook Simulator
            </h4>
            <p className="text-[11px] text-zinc-450 mt-1 leading-normal font-medium">
              Evaluates incoming Meta Lead / WhatsApp transcripts payload in real-time. Direct evaluation simulates the direct `POST /api/webhooks/lead-intake` call.
            </p>
          </div>

          <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-between text-xs font-mono font-medium">
            <span className="text-indigo-400 font-bold font-mono">POST</span>
            <span className="text-zinc-300 font-bold font-mono">https://propiq.ai/api/webhooks/lead-intake</span>
            <span className="text-emerald-430 font-bold uppercase text-[10px] font-mono">Exposed</span>
          </div>

          <form onSubmit={handleTestWebhookSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono font-semibold">Editable test JSON Payload</span>
              <textarea
                value={webhookPayload}
                onChange={(e) => setWebhookPayload(e.target.value)}
                className="w-full h-56 bg-zinc-950 text-zinc-200 font-mono text-[11px] p-4 rounded-lg focus:outline-none border border-zinc-850"
                rows={10}
              />
            </div>

            <button
               type="submit"
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Terminal className="w-4 h-4" />
              <span>Fire Intake Request Webhook</span>
            </button>
          </form>
        </div>

        {/* ConsoleLogs */}
        <div className="space-y-6">
          {/* Mock Console */}
          <div className="bg-zinc-950 text-zinc-200 border border-zinc-850 rounded-xl p-5 shadow-lg h-[270px] flex flex-col">
            <span className="text-[9px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono px-2 py-0.5 rounded font-bold uppercase max-w-fit block mb-3 shrink-0">
              Live Webhook JSON Evaluation Console Logs
            </span>
            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[10px] leading-relaxed select-text tracking-tight pr-1">
              {activeConsoleLog.map((lg, i) => (
                <div key={i} className={`pb-1 ${lg.includes("ERROR") ? "text-rose-400 font-bold" : "text-emerald-400"}`}>
                  {lg}
                </div>
              ))}
            </div>
          </div>

          {/* n8n Checklist specifications */}
          <div className="bg-[#121214] border border-zinc-805 rounded-xl p-5 shadow-lg space-y-3.5">
            <h4 className="font-extrabold text-indigo-400 text-xs uppercase tracking-widest font-mono border-b border-zinc-800 pb-2">n8n checklist integration notes (Phase 1)</h4>
            
            <div className="text-xs text-zinc-400 space-y-2.5 font-semibold leading-relaxed">
              <p>To connect n8n workflows with this dashboard, expose these variables in the workflow node configs:</p>
              
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-zinc-300">
                <li>
                  <span className="text-zinc-200 font-bold">Token Secret Header: </span>
                  <span className="font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-indigo-300">X-PropIQ-Secret: {"<API_KEY>"}</span>
                </li>
                <li>
                  <span className="text-zinc-200 font-bold">Deduplication algorithm: </span>
                  Queries database first by phone number + project reference, preventing double lead assignments.
                </li>
                <li>
                  <span className="text-zinc-200 font-bold">Assigned SLA: </span>
                  Triggers SMS to Priya Sharma (Manager) if assigned executives ignore hot inquiries after 10m.
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
