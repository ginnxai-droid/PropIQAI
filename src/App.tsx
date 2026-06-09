/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { LeadInboxView } from "./components/LeadInboxView";
import { LeadDetailView } from "./components/LeadDetailView";
import { SiteVisitsView } from "./components/SiteVisitsView";
import { SalesTasksView } from "./components/SalesTasksView";
import { SlaAlertsView } from "./components/SlaAlertsView";
import { PilotReportView } from "./components/PilotReportView";
import { ProjectsView } from "./components/ProjectsView";
import { SalesTeamView } from "./components/SalesTeamView";
import { SettingsView } from "./components/SettingsView";
import { AnimatePresence, motion } from "motion/react";

function AppContent() {
  const { activePage } = useApp();

  const renderActiveView = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardView />;
      case "inbox":
        return <LeadInboxView />;
      case "detail":
        return <LeadDetailView />;
      case "visits":
        return <SiteVisitsView />;
      case "tasks":
        return <SalesTasksView />;
      case "sla":
        return <SlaAlertsView />;
      case "pilot":
        return <PilotReportView />;
      case "projects":
        return <ProjectsView />;
      case "team":
        return <SalesTeamView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] font-sans text-zinc-100">
      {/* 1. Static Sidebar Panel */}
      <Sidebar />

      {/* 2. Main Layout Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Top bar header */}
        <Header />

        {/* Dynamic page content wrapped in smooth scroll & fade animation */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#09090b]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
