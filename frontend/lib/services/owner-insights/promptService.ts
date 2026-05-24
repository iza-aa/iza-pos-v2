import type { OwnerInsightCategory } from "./insightSchema";
import { CATEGORY_PROMPT_RULES } from "./categoryPromptRules";

export function buildOwnerInsightPrompt(
  category: OwnerInsightCategory,
  snapshot: Record<string, unknown>,
) {
  const categoryContext = CATEGORY_PROMPT_RULES[category];
  const period = snapshot.period as
    | {
        selected?: { label?: string; startDate?: string; endDate?: string };
        comparison?: { label?: string; startDate?: string; endDate?: string };
        selectedPeriodLabel?: string;
        comparisonPeriodLabel?: string;
        timezone?: string;
      }
    | undefined;
  const selectedPeriod =
    period?.selected?.label ??
    period?.selectedPeriodLabel ??
    "the selected dashboard period";
  const comparisonPeriod =
    period?.comparison?.label ??
    period?.comparisonPeriodLabel ??
    "the immediately previous comparison period";
  const hasAllowedIssues =
    Array.isArray((snapshot as { allowedIssues?: unknown }).allowedIssues);

  return `You are a Business Intelligence Advisor for the owner of IZA POS.

Task:
Create up to 5 business recommendations for category: ${categoryContext.label}.
Business focus for this category: ${categoryContext.focus}.
Analyze only from the provided snapshot JSON.
Do not invent numbers, trends, or facts that are not present in the snapshot.
Use clear, professional, actionable English.
${hasAllowedIssues ? "You may only create insights from snapshot.allowedIssues. Do not create new problems." : ""}

Period context:
- Selected dashboard period: ${selectedPeriod}
- Comparison period: ${comparisonPeriod}
- Timezone: ${period?.timezone ?? "Asia/Jakarta"}

Mandatory rules:
1. Output only valid JSON, with no markdown and no extra explanation.
2. Root JSON must be an array.
3. Every item must follow this schema:
   {
     "id": "${hasAllowedIssues ? "must exactly match one allowedIssues.id" : "short-unique-string"}",
     "category": "${category}",
     "title": "string",
     "priority": "high|medium|low",
     "confidence": "high|medium|low",
     "problem": "string",
     "evidence": ["string with a number or metric from the snapshot"],
     "recommendation": "string",
     "expectedImpact": "string",
     "actionLabel": "optional string",
     "actionHref": "optional string"
   }
4. Every recommendation must have at least 1 evidence item.
5. Evidence must mention a number or metric from the snapshot.
6. Avoid generic advice such as "increase promotion" unless it is tied to a specific metric.
7. If data is insufficient, create an insight that says the data is not enough and recommend which metric should be tracked.
8. Do not mention that you are AI.
9. Do not suggest large discounts without considering margin or discount cost when such data exists.
10. Never describe the selected period as "today" unless selectedPeriod.startDate equals selectedPeriod.endDate in the snapshot.
11. Never describe the comparison period as "yesterday" unless comparisonPeriod.startDate equals comparisonPeriod.endDate in the snapshot.
12. Evidence must be traceable to an exact field/value in the snapshot. If a metric is not present, do not infer it.
13. If a product, category, staff member, or payment method is not present in the snapshot, do not mention it.
14. For actionHref, use only relevant internal routes from this list:
    - /owner/dashboard?tab=sales
    - /owner/dashboard?tab=customer
    - /owner/dashboard?tab=inventory
    - /owner/dashboard?tab=staff
    - /owner/dashboard?tab=operations
${categoryContext.forbiddenClaims
  .map((rule, index) => `${15 + index}. ${rule}`)
  .join("\n")}
${hasAllowedIssues ? "\nCritical allowedIssues rules:\n- Every output item id must exactly match one snapshot.allowedIssues.id.\n- Use the matching allowed issue problem, evidence, recommendationHint, and expectedImpact as your source.\n- If snapshot.allowedIssues is empty, return an empty JSON array.\n- Do not turn neutral metrics into problems unless they appear in allowedIssues." : ""}
${hasAllowedIssues ? "\nEvidence quality rules:\n- The problem must include at least one exact number copied from the matching allowedIssues.evidence.\n- The recommendation must explain which metric should be prioritized first when multiple metrics are involved.\n- Avoid vague words such as significantly, lower, higher, or declined unless the sentence also includes the exact value or percentage from evidence." : ""}

Snapshot JSON:
${JSON.stringify(snapshot, null, 2)}`;
}

export function buildJsonRepairPrompt(
  category: OwnerInsightCategory,
  invalidResponse: string,
) {
  return `Convert the following response into a valid JSON array only.
Do not add markdown or explanation.
Every item must use English and must have category "${category}", non-empty evidence array, non-empty problem, and non-empty recommendation.
Do not add facts, products, quantities, dates, or trends that were not already present in the original response.
If the original response used unsupported period wording, replace it with "selected period" or "comparison period".

Response:
${invalidResponse}`;
}
