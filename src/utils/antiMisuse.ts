// ============================================================
// Anti-Misuse System (Rule-Based)
// ============================================================

const MAX_REQUESTS_PER_DAY = 5;

export interface MisuseCheckResult {
  allowed: boolean;
  reason?: string;
  reasonHi?: string;
}

/**
 * Check if a user has exceeded the daily request limit
 */
export function checkDailyLimit(existingRequests: { createdAt: number }[]): MisuseCheckResult {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const todayCount = existingRequests.filter((r) => r.createdAt > oneDayAgo).length;

  if (todayCount >= MAX_REQUESTS_PER_DAY) {
    return {
      allowed: false,
      reason: `You have reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests. Please try again tomorrow.`,
      reasonHi: `आपने ${MAX_REQUESTS_PER_DAY} अनुरोधों की दैनिक सीमा पूरी कर ली है। कृपया कल पुनः प्रयास करें।`,
    };
  }
  return { allowed: true };
}

/**
 * Check for duplicate/similar descriptions submitted recently
 */
export function checkDuplicateDescription(
  description: string,
  recentRequests: { description: string; createdAt: number }[],
): MisuseCheckResult {
  if (!description || description.length < 10) {
    return { allowed: true };
  }

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentDescs = recentRequests
    .filter((r) => r.createdAt > oneHourAgo)
    .map((r) => r.description.toLowerCase().trim());

  const normalizedDesc = description.toLowerCase().trim();

  for (const prev of recentDescs) {
    const similarity = calculateSimilarity(normalizedDesc, prev);
    if (similarity > 0.8) {
      return {
        allowed: false,
        reason: "This request appears very similar to one you recently submitted. Please wait or update the existing request.",
        reasonHi: "यह अनुरोध आपके हाल ही में सबमिट किए गए अनुरोध से बहुत मिलता-जुलता है। कृपया प्रतीक्षा करें या मौजूदा अनुरोध को अपडेट करें।",
      };
    }
  }

  return { allowed: true };
}

/**
 * Simple Jaccard similarity for duplicate detection
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Run all misuse checks
 */
export function runMisuseChecks(
  description: string,
  userRequests: { description: string; createdAt: number }[],
): MisuseCheckResult {
  const dailyCheck = checkDailyLimit(userRequests);
  if (!dailyCheck.allowed) return dailyCheck;

  const duplicateCheck = checkDuplicateDescription(description, userRequests);
  if (!duplicateCheck.allowed) return duplicateCheck;

  return { allowed: true };
}
