import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with your API key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface SmartMatchResult {
  reasoning: string;
  suggestedSteps: string[];
  priorityAdjusted: boolean;
  requiredSkills: string[];
  volunteerRankings: Record<string, number>; // volunteer.id -> matchScore (0.0 to 1.0)
}

/**
 * Analyzes an emergency request using Gemini to understand context, skills needed, and urgency.
 */
export async function smartAnalyzeRequest(
  request: { category: string; urgency: string; description: string },
  volunteers: { id: string; name: string; skills: string[]; trustScore: number }[]
): Promise<SmartMatchResult | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Guard: skip if key is missing OR doesn't look like a real Gemini key (valid keys start with "AIza")
  if (!apiKey || !apiKey.startsWith("AIza")) {
    console.warn("[Gemini] API key missing or invalid. Skipping AI analysis and using fallback scoring.");
    return null;
  }

  try {
    const prompt = `
      You are the AI Dispatcher for ResQLink, an emergency response network.
      Analyze this emergency request and match the best volunteers from the provided list.

      EMERGENCY REQUEST:
      - Category: ${request.category}
      - Reported Urgency: ${request.urgency}
      - Description: "${request.description}"

      VOLUNTEERS:
      ${volunteers.map(v => `- ID ${v.id}: ${v.name} (Skills: ${(Array.isArray(v.skills) ? v.skills : []).join(", ")}, Trust: ${v.trustScore})`).join("\n")}

      INSTRUCTIONS:
      1. Determine the "Required Skills" based on the description (e.g., medical, rescue, coordination).
      2. Rank each volunteer from 0.0 to 1.0 based on how well their skills and trust score fit THIS specific mission.
      3. Provide a brief "Reasoning" for the top pick.
      4. Provide 3 "Suggested Steps" for the responder.
      5. Adjust priority if the description sounds more critical than the reported urgency (set priorityAdjusted true).

      RESIST DUMMY DATA. Return ONLY a valid JSON object in this format:
      {
        "reasoning": "string",
        "suggestedSteps": ["step1", "step2", "step3"],
        "priorityAdjusted": boolean,
        "requiredSkills": ["skill1", "skill2"],
        "volunteerRankings": { "volunteer_id_1": 0.95, "volunteer_id_2": 0.4 }
      }
    `;

    // Race the API call against a 5-second timeout so an invalid key / slow network
    // can never block the autoAssignVolunteers pipeline indefinitely.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[Gemini] API call timed out after 5s")), 5000)
    );

    const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    const response = await result.response;
    const text = response.text();

    // Clean potential markdown code blocks and extract the JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not find JSON object in Gemini response");
    return JSON.parse(match[0]) as SmartMatchResult;
  } catch (error) {
    console.error("[Gemini] Smart Match Error — falling back to proximity+trust scoring:", error);
    return null;
  }
}

/**
 * Generates an AI-powered Mission Briefing for a specific volunteer.
 */
export async function generateMissionBrief(
  request: { category: string; description: string; citizenName: string },
  volunteerName: string,
  reason: string
): Promise<string> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) return "No AI briefing available.";

  try {
    const prompt = `
      Write a professional, encouraging, and clear 2-sentence mission briefing for a volunteer.
      Volunteer: ${volunteerName}
      Emergency: ${request.category} - ${request.description}
      Reporter: ${request.citizenName}
      Why they were chosen: ${reason}

      Format: "Mission Brief: [text]"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    return "Complete the mission safely. Coordinate with your team leader.";
  }
}
