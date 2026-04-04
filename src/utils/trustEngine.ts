// ============================================================
// Trust Score Engine
// ============================================================

export interface TrustScoreInputs {
  points: number;
  totalTasks: number;
  completedTasks: number;
  ngoVerified: boolean;
}

export function calculateTrustScore({ points, totalTasks, completedTasks, ngoVerified }: TrustScoreInputs): number {
  const successRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const ngoBonus = ngoVerified ? 20 : 0;
  const raw = points * 0.5 + successRate * 30 + ngoBonus;
  // Normalize to 0-5 star scale
  return Math.min(5, Math.max(0, raw / 20));
}

export function trustScoreToStars(score: number): number {
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

// ============================================================
// Dynamic Points
// ============================================================
export const POINTS = {
  TASK_COMPLETED: 10,
  HIGH_URGENCY_TASK: 20,
  CRITICAL_AREA: 25,
  FAST_RESPONSE: 10,    // Bonus: <30 mins
  NGO_VERIFIED: 15,     // Bonus
} as const;

export function calculatePointsForTask(task: {
  urgency: string;
  isCriticalArea: boolean;
  responseTimeMinutes: number | null;
  ngoVerified: boolean;
}): number {
  let points = POINTS.TASK_COMPLETED;

  if (task.urgency === "high" || task.urgency === "critical") {
    points += POINTS.HIGH_URGENCY_TASK;
  }

  if (task.isCriticalArea) {
    points += POINTS.CRITICAL_AREA;
  }

  if (task.responseTimeMinutes !== null && task.responseTimeMinutes < 30) {
    points += POINTS.FAST_RESPONSE;
  }

  if (task.ngoVerified) {
    points += POINTS.NGO_VERIFIED;
  }

  return points;
}

// ============================================================
// Streak Management
// ============================================================
export function calculateStreak(lastActiveDate: string | null, currentStreakDays: number): { streakDays: number; isNewDay: boolean } {
  if (!lastActiveDate) {
    return { streakDays: 1, isNewDay: true };
  }

  const last = new Date(lastActiveDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { streakDays: currentStreakDays, isNewDay: false };
  } else if (diffDays === 1) {
    return { streakDays: currentStreakDays + 1, isNewDay: true };
  } else {
    return { streakDays: 1, isNewDay: true }; // Streak broken
  }
}
