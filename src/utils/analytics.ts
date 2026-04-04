import type { GeoPoint } from "./geo";

const urgencyWeights: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const severityWeights: Record<string, number> = {
  food: 3, disaster: 5, medical: 4, shelter: 4, senior: 2, education: 2, sanitation: 1,
};

export function getUrgencyValue(urgency: string): number {
  return urgencyWeights[urgency] ?? 1;
}

export function getSeverityValue(category: string): number {
  return severityWeights[category] ?? 2;
}

export function getZoneKey(location: GeoPoint | null): string {
  if (!location?.lat || !location?.lng) return "unknown";
  return `${location.lat.toFixed(1)}:${location.lng.toFixed(1)}`;
}

export function calculatePriorityScore({
  averageUrgency = 1,
  totalReports = 1,
  recentReports = 1,
  severity = 1,
}: {
  averageUrgency?: number;
  totalReports?: number;
  recentReports?: number;
  severity?: number;
}): number {
  return averageUrgency * 40 + totalReports * 30 + recentReports * 20 + severity * 10;
}

export function deriveTrend(previousTotal: number, nextTotal: number): string {
  if (nextTotal - previousTotal >= 3) return "surging";
  if (nextTotal > previousTotal) return "rising";
  return "steady";
}

export interface PriorityZone {
  area: string;
  priorityScore: number;
  activeRequests: number;
  trend: string;
  location: GeoPoint | null;
}

export function buildPriorityZones(analyticsData: any[], requests: any[]): PriorityZone[] {
  const zoneMap = new Map<string, PriorityZone>();

  for (const entry of analyticsData) {
    const key = entry.id || getZoneKey(entry.location);
    zoneMap.set(key, {
      area: entry.area || key,
      priorityScore: entry.priorityScore || 0,
      activeRequests: 0,
      trend: entry.trend || "steady",
      location: entry.location || null,
    });
  }

  for (const req of requests) {
    if (req.status === "Completed") continue;
    const key = getZoneKey(req.location);
    const zone = zoneMap.get(key);
    if (zone) zone.activeRequests++;
  }

  return Array.from(zoneMap.values())
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
