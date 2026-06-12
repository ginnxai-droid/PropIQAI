/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LoginView } from "./components/LoginView";
import { ResetPasswordView } from "./components/ResetPasswordView";
import { PermissionDeniedView } from "./components/PermissionDeniedView";
import { NotFoundView } from "./components/NotFoundView";
import { AnimatePresence, motion } from "motion/react";

const DashboardView = lazy(() =>
  import("./components/DashboardView").then((module) => ({
    default: module.DashboardView,
  })),
);
const LeadInboxView = lazy(() =>
  import("./components/LeadInboxView").then((module) => ({
    default: module.LeadInboxView,
  })),
);
const LeadDetailView = lazy(() =>
  import("./components/LeadDetailView").then((module) => ({
    default: module.LeadDetailView,
  })),
);
const SiteVisitsView = lazy(() =>
  import("./components/SiteVisitsView").then((module) => ({
    default: module.SiteVisitsView,
  })),
);
const SalesTasksView = lazy(() =>
  import("./components/SalesTasksView").then((module) => ({
    default: module.SalesTasksView,
  })),
);
const SlaAlertsView = lazy(() =>
  import("./components/SlaAlertsView").then((module) => ({
    default: module.SlaAlertsView,
  })),
);
const AlertsView = lazy(() =>
  import("./components/AlertsView").then((module) => ({
    default: module.AlertsView,
  })),
);
const PilotReportView = lazy(() =>
  import("./components/PilotReportView").then((module) => ({
    default: module.PilotReportView,
  })),
);
const ProjectsView = lazy(() =>
  import("./components/ProjectsView").then((module) => ({
    default: module.ProjectsView,
  })),
);
const SalesTeamView = lazy(() =>
  import("./components/SalesTeamView").then((module) => ({
    default: module.SalesTeamView,
  })),
);
const SettingsView = lazy(() =>
  import("./components/SettingsView").then((module) => ({
    default: module.SettingsView,
  })),
);

function AppContent() {
  const {
    activePage,
    loading,
    error,
    refresh,
    operationError,
    clearOperationError,
  } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-300 flex items-center justify-center text-sm">
        Loading your organization workspace...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border border-rose-500/20 bg-[#121214] p-7 text-center">
          <h1 className="font-bold">Workspace unavailable</h1>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
      case "alerts":
        return <AlertsView />;
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
          {operationError && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <span>{operationError}</span>
              <button
                onClick={clearOperationError}
                className="ml-4 text-xs font-bold uppercase tracking-wide"
              >
                Dismiss
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              <Suspense
                fallback={
                  <div className="p-8 text-sm text-zinc-400">Loading view...</div>
                }
              >
                {renderActiveView()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function ProtectedApplication() {
  const { loading, session } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center">
        Checking session...
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default function App() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginView />}
      />
      <Route path="/reset-password" element={<ResetPasswordView />} />
      <Route path="/permission-denied" element={<PermissionDeniedView />} />
      <Route path="/" element={<ProtectedApplication />} />
      <Route path="/dashboard" element={<ProtectedApplication />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  );
}
