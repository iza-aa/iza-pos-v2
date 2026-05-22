import {
  extractJsonArray,
  sanitizeInsights,
  type AIInsight,
  type OwnerInsightCategory,
} from "./insightSchema";
import { buildJsonRepairPrompt, buildOwnerInsightPrompt } from "./promptService";

const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.05,
          maxOutputTokens: 2048,
          topP: 0.2,
          topK: 1,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function generateGeminiInsights(
  category: OwnerInsightCategory,
  snapshot: Record<string, unknown>,
): Promise<AIInsight[]> {
  const firstResponse = await callGeminiText(
    buildOwnerInsightPrompt(category, snapshot),
  );

  try {
    const parsed = extractJsonArray(firstResponse);
    return sanitizeInsights(parsed, category);
  } catch {
    const repairedResponse = await callGeminiText(
      buildJsonRepairPrompt(category, firstResponse),
    );
    const parsed = extractJsonArray(repairedResponse);
    return sanitizeInsights(parsed, category);
  }
}
