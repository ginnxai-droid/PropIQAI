export function assertPilotDataGuard(environment: NodeJS.ProcessEnv) {
  if (
    environment.NODE_ENV === "production" ||
    environment.PILOT_DATA_MODE !== "development"
  ) {
    throw new Error(
      "Pilot data requires PILOT_DATA_MODE=development and cannot run in production.",
    );
  }
}
