// Public API for the owner insight module. Consumers should import from this file.
export * from "./domain/insightSchema";
export {
  buildDeterministicIssueFallback,
  validateAllowedIssueInsights,
} from "./domain/allowedIssueInsightGuards";
export { generateGeminiInsights } from "./ai/geminiInsightService";
export {
  buildOwnerInsightPeriodKey,
  buildOwnerInsightSnapshot,
  createOwnerInsightSupabaseClient,
  type OwnerInsightPeriod,
} from "./snapshots/snapshotService";
export {
  DAILY_GENERATION_LIMIT,
  getTodayInsightRecord,
  getTodayInsightRecords,
  saveTodayInsightRecord,
} from "./persistence/storageService";
export { describeUnknownError } from "./shared/errorUtils";
