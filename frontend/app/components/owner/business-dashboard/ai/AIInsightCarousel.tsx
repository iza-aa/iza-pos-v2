"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { AIInsight } from "@/lib/services/owner-insights/insightSchema";

const thinkingTextClassName =
  "inline-block bg-[linear-gradient(90deg,#374151_0%,#374151_35%,#9CA3AF_50%,#374151_65%,#374151_100%)] bg-[length:220%_100%] bg-clip-text text-transparent animate-[ai-thinking-breath_1.8s_ease-in-out_infinite]";

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
  const canNavigate = hasAiRecommendation && insights.length > 1;
  const recommendationLabel = hasAiRecommendation
    ? "Regenerate Recommendation"
    : "Generate Recommendation";
  const showPrevious = () => {
    setIndex((current) => (current === 0 ? insights.length - 1 : current - 1));
  };
  const showNext = () => {
    setIndex((current) => (current === insights.length - 1 ? 0 : current + 1));
  };

  return (
    <>
      <section className="relative rounded-2xl border border-gray-200 bg-linear-to-br from-[#E2E5FF] via-[#EAEBFA] to-[#F5F6FF] p-5 shadow-sm md:p-6">
        <button
          type="button"
          onClick={showPrevious}
          disabled={!canNavigate}
          className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white hover:text-gray-950 disabled:cursor-not-allowed disabled:bg-gray-100/80 disabled:text-gray-300 disabled:shadow-none md:flex"
          aria-label="Show previous recommendation"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={showNext}
          disabled={!canNavigate}
          className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white hover:text-gray-950 disabled:cursor-not-allowed disabled:bg-gray-100/80 disabled:text-gray-300 disabled:shadow-none md:flex"
          aria-label="Show next recommendation"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
        <div className="md:px-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-700">
            <SparklesIcon className="h-4 w-4" />
            AI Insight Summary
          </div>

          <h2 className="mt-5 text-sm font-bold leading-tight text-gray-900">
            {insight?.title ?? "Ready to generate recommendation"}
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-700 md:text-lg">
            {loading
              ? "Preparing today's business snapshot so the recommendation can use the latest available signals."
              : insight?.problem ??
                "No recommendation has been generated yet. Generate one from the active tab context and selected date range."}
          </p>

          {generating ? (
            <div className="rounded-2xl mt-2 mb-1">
              <div className="text-sm font-semibold">
                <style jsx>{`
                  @keyframes ai-thinking-breath {
                    0% {
                      background-position: 140% 0;
                    }
                    50% {
                      background-position: 0% 0;
                    }
                    100% {
                      background-position: -140% 0;
                    }
                  }
                `}</style>
                <span className={thinkingTextClassName}>
                Thinking through the business signals...
                </span>
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

        <div className="mt-3 flex flex-col gap-4 md:px-12 sm:flex-row sm:items-center sm:justify-between">
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

          {canNavigate ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showPrevious}
              disabled={!canNavigate}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 md:hidden"
              aria-label="Show previous recommendation"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {insights.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (canNavigate) setIndex(dotIndex);
                }}
                disabled={!canNavigate}
                className={`h-0.5 w-10 rounded-full transition ${
                  canNavigate && dotIndex === index ? "bg-indigo-500" : "bg-gray-400/60"
                } disabled:cursor-not-allowed disabled:bg-gray-300`}
                aria-label={`Show AI insight ${dotIndex + 1}`}
              />
            ))}
            <button
              type="button"
              onClick={showNext}
              disabled={!canNavigate}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 md:hidden"
              aria-label="Show next recommendation"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
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
