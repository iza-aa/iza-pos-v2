"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowPathIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { getCurrentUser } from "@/lib/utils";
import type {
  AIInsight,
  OwnerInsightCategory,
  OwnerInsightRecord,
} from "@/lib/services/owner-insights/insightSchema";
import AIInsightCarousel from "./AIInsightCarousel";

type RecommendationResponse = {
  record?: OwnerInsightRecord | null;
  records?: OwnerInsightRecord[];
  error?: string;
  fallback?: boolean;
  fallbackInsight?: AIInsight;
};

export default function GenerateRecommendationPanel({
  category,
  compact = false,
}: {
  category: OwnerInsightCategory;
  compact?: boolean;
}) {
  const [record, setRecord] = useState<OwnerInsightRecord | null>(null);
  const [fallbackInsight, setFallbackInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getCurrentUser();
  }, []);

  const requestHeaders = useCallback(() => {
    const user = currentUser ?? getCurrentUser();

    return {
      "Content-Type": "application/json",
      "x-user-id": user?.id ?? "",
      "x-user-name": user?.name ?? "Owner",
      "x-user-role": user?.role ?? "",
    };
  }, [currentUser]);

  const loadExisting = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/owner/recommendations?category=${category}`, {
        headers: requestHeaders(),
      });
      const data = (await response.json()) as RecommendationResponse;
      setRecord(data.record ?? null);
      setFallbackInsight(data.fallbackInsight ?? null);
      if (data.error && !data.record) setError(data.error);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat rekomendasi.");
    } finally {
      setLoading(false);
    }
  }, [category, requestHeaders]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setFallbackInsight(null);

    try {
      const response = await fetch("/api/owner/recommendations/generate", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ category }),
      });
      const data = (await response.json()) as RecommendationResponse;

      if (data.record) {
        setRecord(data.record);
      }

      if (data.fallbackInsight) {
        setFallbackInsight(data.fallbackInsight);
      }

      if (data.error) {
        setError(data.error);
      }
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Gagal generate recommendation.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const insights = record?.insights_json?.length
    ? record.insights_json
    : fallbackInsight
      ? [fallbackInsight]
      : [];

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">AI Recommendation</h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate insight kategori aktif berdasarkan Today vs Yesterday.
          </p>
          {record ? (
            <p className="mt-1 text-xs text-gray-400">
              Generated {new Date(record.generated_at).toLocaleString("id-ID")}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || generating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <SparklesIcon className="h-4 w-4" />
          )}
          {generating
            ? "Generating..."
            : record
              ? "Regenerate Recommendation"
              : "Generate Recommendation"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          {error}
        </div>
      ) : null}

      <AIInsightCarousel insights={insights} />
    </div>
  );
}
