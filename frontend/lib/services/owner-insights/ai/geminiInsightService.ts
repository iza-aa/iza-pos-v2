import {
  extractJsonArray,
  sanitizeInsights,
  type AIInsight,
  type OwnerInsightCategory,
} from "../domain/insightSchema";
import { validateAllowedIssueInsights } from "../domain/allowedIssueInsightGuards";
import { buildJsonRepairPrompt, buildOwnerInsightPrompt } from "./promptService";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
];

class GeminiRequestError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "GeminiRequestError";
    this.retryable = retryable;
  }
}

function getGeminiModels() {
  const configuredModels = process.env.GEMINI_MODELS ?? process.env.GEMINI_MODEL;
  const models = configuredModels
    ? configuredModels.split(",").map((model) => model.trim()).filter(Boolean)
    : DEFAULT_GEMINI_MODELS;

  return Array.from(new Set(models));
}

function getFriendlyGeminiError(status: number, body: string) {
  const normalizedBody = body.toLowerCase();

  if (status === 503 || normalizedBody.includes("high demand") || normalizedBody.includes("unavailable")) {
    return "Gemini is currently busy. Please try generating the recommendation again in a few minutes.";
  }

  if (status === 429 || normalizedBody.includes("quota")) {
    return "The recommendation service reached its current usage limit. Please try again later.";
  }

  if (status === 400 || status === 401 || status === 403) {
    return "The recommendation service is not configured correctly. Please ask the developer to check the Gemini API key and model settings.";
  }

  return "The recommendation service could not respond right now. Please try again later.";
}

function isRetryableGeminiError(status: number, body: string) {
  const normalizedBody = body.toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    normalizedBody.includes("quota") ||
    normalizedBody.includes("high demand") ||
    normalizedBody.includes("unavailable")
  );
}

async function callGeminiModel(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`,
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
    console.error(`Gemini API error on ${model}: ${response.status} - ${errorText}`);
    throw new GeminiRequestError(
      getFriendlyGeminiError(response.status, errorText),
      isRetryableGeminiError(response.status, errorText),
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGeminiText(prompt: string): Promise<string> {
  const models = getGeminiModels();
  let lastError: unknown = null;

  for (const model of models) {
    try {
      return await callGeminiModel(prompt, model);
    } catch (error) {
      lastError = error;

      if (!(error instanceof GeminiRequestError) || !error.retryable) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("The recommendation service could not respond right now. Please try again later.");
}

function isSingleDayPeriod(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const period = value as { startDate?: unknown; endDate?: unknown };
  return (
    typeof period.startDate === "string" &&
    typeof period.endDate === "string" &&
    period.startDate === period.endDate
  );
}

function removeTemporalHallucinations(
  insights: AIInsight[],
  snapshot: Record<string, unknown>,
) {
  const period = snapshot.period as
    | {
        selected?: unknown;
        comparison?: unknown;
        selectedPeriod?: unknown;
        comparisonPeriod?: unknown;
      }
    | undefined;
  const selectedIsSingleDay = isSingleDayPeriod(
    period?.selected ?? period?.selectedPeriod,
  );
  const comparisonIsSingleDay = isSingleDayPeriod(
    period?.comparison ?? period?.comparisonPeriod,
  );

  return insights.filter((insight) => {
    const text = [
      insight.title,
      insight.problem,
      insight.recommendation,
      insight.expectedImpact,
      ...insight.evidence,
    ]
      .join(" ")
      .toLowerCase();

    if (!selectedIsSingleDay && /\btoday\b|\btoday's\b/.test(text)) return false;
    if (!comparisonIsSingleDay && /\byesterday\b|\byesterday's\b/.test(text)) return false;

    return true;
  });
}

function validateInsightsAgainstSnapshot(
  insights: AIInsight[],
  snapshot: Record<string, unknown>,
) {
  return validateAllowedIssueInsights(
    removeTemporalHallucinations(insights, snapshot),
    snapshot,
  );
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
    return validateInsightsAgainstSnapshot(sanitizeInsights(parsed, category), snapshot);
  } catch {
    const repairedResponse = await callGeminiText(
      buildJsonRepairPrompt(category, firstResponse),
    );
    const parsed = extractJsonArray(repairedResponse);
    return validateInsightsAgainstSnapshot(sanitizeInsights(parsed, category), snapshot);
  }
}
