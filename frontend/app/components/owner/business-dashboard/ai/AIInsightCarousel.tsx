"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { AIInsight } from "@/lib/services/owner-insights/insightSchema";

type AIInsightCarouselProps = {
  insights: AIInsight[];
  loading: boolean;
  generating: boolean;
  error?: string;
  generatedAt?: string;
  generationCount?: number;
  showDetail: boolean;
  onGenerate: () => void;
};

export default function AIInsightCarousel({
  insights,
  loading,
  generating,
  error = "",
  generatedAt,
  generationCount,
  showDetail,
  onGenerate,
}: AIInsightCarouselProps) {
  const [index, setIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  const insight = insights[index] ?? null;
  const hasAiRecommendation = showDetail && Boolean(insight);
  const recommendationLabel = hasAiRecommendation
    ? "Regenerate Recommendation"
    : "Generate Recommendation";

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-linear-to-br from-[#E2E5FF] via-[#EAEBFA] to-[#F5F6FF] p-5 shadow-sm md:p-6">
        <div className="">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-700">
            <SparklesIcon className="h-4 w-4" />
            AI Insight Summary
          </div>

          <h2 className="mt-5 text-sm font-bold leading-tight text-gray-900">
            {insight?.title ?? "Data Summary is ready"}
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-700 md:text-lg">
            {loading
              ? "Preparing today's business snapshot so the recommendation can use the latest available signals."
              : insight?.problem ??
                "Generate a focused recommendation from the current dashboard data. The insight will use the active tab context and compare today against yesterday where data is available."}
          </p>

          {generating ? (
            <div className="rounded-2xl p-4">
              <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Thinking through the business signals...
              </div>
            </div>
          ) : hasAiRecommendation && insight ? (
            <div className="mt-3">
              <p className="text-sm font-bold text-gray-900">Recommendation:</p>
              <p className="mt-2 text-sm leading-7 text-gray-700 md:text-lg">
                {insight.recommendation}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className=" rounded-xl py-3 text-sm font-medium text-amber-800">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
              {generating ? "Generating..." : recommendationLabel}
            </button>

            {hasAiRecommendation && insight ? (
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                View Detail
              </button>
            ) : null}
          </div>

          {hasAiRecommendation && insights.length > 1 ? (
            <div className="flex items-center gap-2">
              {insights.map((item, dotIndex) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  className={`h-0.5 w-10 rounded-full transition ${
                    dotIndex === index ? "bg-indigo-500" : "bg-gray-400"
                  }`}
                  aria-label={`Show AI insight ${dotIndex + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {detailOpen && insight ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Recommendation Detail
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  {insight.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close recommendation detail"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Business Issue
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-700">
                  {insight.problem}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Supporting Data
                </p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-gray-700">
                  {insight.evidence.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-gray-900 p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-300">
                  Recommended Action
                </p>
                <p className="mt-2 text-sm leading-7">
                  {insight.recommendation}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Expected Impact
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-700">
                  {insight.expectedImpact}
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-gray-900">Generated</p>
                  <p className="mt-1">
                    {generatedAt
                      ? new Date(generatedAt).toLocaleString("en-US")
                      : "Today"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Daily attempts</p>
                  <p className="mt-1">{generationCount ?? 1} of 3</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
              {insight.actionHref && insight.actionLabel ? (
                <a
                  href={insight.actionHref}
                  className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  {insight.actionLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
