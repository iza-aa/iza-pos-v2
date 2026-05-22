"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load recommendations.",
      );
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
          : "Unable to generate recommendation.",
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

  const hasStoredAiInsight = Boolean(record?.insights_json?.length);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <AIInsightCarousel
        insights={insights}
        loading={loading}
        generating={generating}
        error={error}
        generatedAt={record?.generated_at}
        generationCount={record?.generation_count}
        showDetail={hasStoredAiInsight}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
