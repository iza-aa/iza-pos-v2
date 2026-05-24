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
  period,
}: {
  category: OwnerInsightCategory;
  compact?: boolean;
  period?: { startDate: string; endDate: string };
}) {
  const [record, setRecord] = useState<OwnerInsightRecord | null>(null);
  const [fallbackInsight, setFallbackInsight] = useState<AIInsight | null>(null);
  const [loading] = useState(false);
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

  const requestPeriod = useMemo(() => {
    if (!period?.startDate || !period?.endDate) return null;
    return period;
  }, [period]);

  useEffect(() => {
    let ignore = false;

    const loadStoredRecommendation = async () => {
      const params = new URLSearchParams({ category });

      if (requestPeriod) {
        params.set("startDate", requestPeriod.startDate);
        params.set("endDate", requestPeriod.endDate);
      }

      try {
        const response = await fetch(`/api/owner/recommendations?${params.toString()}`, {
          headers: requestHeaders(),
        });
        const data = (await response.json()) as RecommendationResponse;

        if (ignore) return;
        setRecord(data.record ?? null);
        setFallbackInsight(null);
      } catch {
        if (!ignore) {
          setRecord(null);
          setFallbackInsight(null);
        }
      }
    };

    void loadStoredRecommendation();

    return () => {
      ignore = true;
    };
  }, [category, requestHeaders, requestPeriod]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setFallbackInsight(null);

    try {
      const response = await fetch("/api/owner/recommendations/generate", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ category, period: requestPeriod }),
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
        if (!data.record && !data.fallbackInsight) {
          setRecord(null);
          setFallbackInsight(null);
        }
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
  const hasDisplayableInsight = hasStoredAiInsight || Boolean(fallbackInsight);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <AIInsightCarousel
        insights={insights}
        loading={loading}
        generating={generating}
        error={error}
        generatedAt={record?.generated_at}
        generationCount={record?.generation_count}
        showDetail={hasDisplayableInsight}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
