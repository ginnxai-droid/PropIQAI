export interface SiteVisitMetricInput {
  status: string;
}

export interface SiteVisitMetrics {
  confirmedSiteVisits: number;
  completedSiteVisits: number;
  activeVisitRecords: number;
}

export function summarizeSiteVisits(
  visits: readonly SiteVisitMetricInput[],
): SiteVisitMetrics {
  return {
    confirmedSiteVisits: visits.filter((visit) => visit.status === "CONFIRMED")
      .length,
    completedSiteVisits: visits.filter((visit) => visit.status === "COMPLETED")
      .length,
    activeVisitRecords: visits.filter((visit) => visit.status !== "CANCELLED")
      .length,
  };
}
