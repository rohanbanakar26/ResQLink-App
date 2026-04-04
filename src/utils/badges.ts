// ============================================================
// Badge System
// ============================================================

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  completedTasks: number;
  avgResponseMinutes: number | null;
  uniqueAreas: number;
  criticalTasks: number;
  highImpactTasks: number;
  isTopPercentile: boolean;
}

export const BADGES: Badge[] = [
  {
    id: "first_responder",
    emoji: "🌱",
    name: "First Responder",
    nameHi: "पहला उत्तरदाता",
    description: "Completed your first task",
    descriptionHi: "अपना पहला कार्य पूरा किया",
    condition: (s) => s.completedTasks >= 1,
  },
  {
    id: "helper",
    emoji: "🤝",
    name: "Helper",
    nameHi: "सहायक",
    description: "Completed 5 tasks",
    descriptionHi: "5 कार्य पूरे किए",
    condition: (s) => s.completedTasks >= 5,
  },
  {
    id: "rapid_responder",
    emoji: "⚡",
    name: "Rapid Responder",
    nameHi: "तेज़ उत्तरदाता",
    description: "Average response time under 30 minutes",
    descriptionHi: "औसत प्रतिक्रिया समय 30 मिनट से कम",
    condition: (s) => s.avgResponseMinutes !== null && s.avgResponseMinutes < 30 && s.completedTasks >= 3,
  },
  {
    id: "field_volunteer",
    emoji: "🧭",
    name: "Field Volunteer",
    nameHi: "क्षेत्र स्वयंसेवक",
    description: "Active in 3+ different areas",
    descriptionHi: "3+ विभिन्न क्षेत्रों में सक्रिय",
    condition: (s) => s.uniqueAreas >= 3,
  },
  {
    id: "crisis_hero",
    emoji: "🛡️",
    name: "Crisis Hero",
    nameHi: "संकट नायक",
    description: "Completed 3+ critical zone tasks",
    descriptionHi: "3+ गंभीर क्षेत्र कार्य पूरे किए",
    condition: (s) => s.criticalTasks >= 3,
  },
  {
    id: "smart_contributor",
    emoji: "🧠",
    name: "Smart Contributor",
    nameHi: "स्मार्ट योगदानकर्ता",
    description: "Contributed to 5+ high-impact areas",
    descriptionHi: "5+ उच्च-प्रभाव क्षेत्रों में योगदान दिया",
    condition: (s) => s.highImpactTasks >= 5,
  },
  {
    id: "top_impact",
    emoji: "🏆",
    name: "Top Impact Maker",
    nameHi: "शीर्ष प्रभाव निर्माता",
    description: "Top 10% of all users",
    descriptionHi: "सभी उपयोगकर्ताओं में शीर्ष 10%",
    condition: (s) => s.isTopPercentile,
  },
];

export function getEarnedBadges(stats: UserStats): Badge[] {
  return BADGES.filter((b) => b.condition(stats));
}

export function getNextBadge(stats: UserStats): Badge | null {
  return BADGES.find((b) => !b.condition(stats)) ?? null;
}
