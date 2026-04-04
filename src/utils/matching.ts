import { haversineDistance } from "./geo";

const categorySkills: Record<string, string[]> = {
  food: ["food", "delivery", "distribution", "logistics", "nutrition"],
  disaster: ["rescue", "disaster", "logistics", "medical", "transport"],
  medical: ["medical", "nursing", "first aid", "doctor", "care"],
  shelter: ["shelter", "community support", "logistics", "transport"],
  senior: ["caregiving", "senior care", "medical", "community support"],
  education: ["teaching", "education", "mentoring", "counseling"],
  sanitation: ["sanitation", "cleanliness", "waste", "community support"],
};

function normalizeList(values: any): string[] {
  return (values ?? []).map((v: any) => v?.toString().trim().toLowerCase()).filter(Boolean);
}

function getCategorySkillList(category: string): string[] {
  return categorySkills[category] ?? [category];
}

function getDistanceScore(distanceKm: number | null): number {
  if (distanceKm == null) return 8;
  if (distanceKm <= 2) return 35;
  if (distanceKm <= 5) return 26;
  if (distanceKm <= 10) return 18;
  if (distanceKm <= 20) return 10;
  return 4;
}

function getSkillScore(request: any, entity: any): number {
  const reqSkills = getCategorySkillList(request.category);
  const entitySkills = normalizeList(entity.skills ?? entity.services ?? entity.categoryTags);
  const overlap = reqSkills.filter((s) => entitySkills.some((es: string) => es.includes(s)));
  return Math.min(overlap.length * 8, 30);
}

export function findBestVolunteer(request: any, volunteers: any[]): any | null {
  const eligible = volunteers
    .filter((v) => v.available !== false && v.availability !== false)
    .map((v) => {
      const distanceKm = haversineDistance(request.location, v.location);
      const score = getDistanceScore(distanceKm) + getSkillScore(request, v) + (v.trustScore ?? 4) * 4;
      return { ...v, distanceKm, matchScore: score, matchReasons: ["Distance", "Skills", "Trust"] };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return eligible[0] ?? null;
}

export function findBestNgo(request: any, ngos: any[]): any | null {
  const eligible = ngos
    .map((n) => {
      const distanceKm = haversineDistance(request.location, n.location);
      const score = getDistanceScore(distanceKm) + getSkillScore(request, n) + (n.trustScore ?? 4) * 4;
      return { ...n, distanceKm, matchScore: score, matchReasons: ["Coverage", "Services"] };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return eligible[0] ?? null;
}
