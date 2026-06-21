"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { AIInsight } from "@/lib/services/owner-insights";
import { StandardModal } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";

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
  summaryLabel?: string;
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
  summaryLabel = "Owner Insight Summary",
}: AIInsightCarouselProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  const insight = insights[index] ?? null;
  const hasAiRecommendation = showDetail && Boolean(insight);
  const canNavigate = hasAiRecommendation && insights.length > 1;
  const recommendationLabel = hasAiRecommendation
    ? t("owner.ai.refreshAdvice")
    : t("owner.ai.generateAdvice");
  const showPrevious = () => {
    setIndex((current) => (current === 0 ? insights.length - 1 : current - 1));
  };
  const showNext = () => {
    setIndex((current) => (current === insights.length - 1 ? 0 : current + 1));
  };
  const priorityClass =
    insight?.priority === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : insight?.priority === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

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
            {summaryLabel}
          </div>

          <h2 className="mt-5 text-sm font-bold leading-tight text-gray-900">
            {insight?.title ?? "Ready to generate recommendation"}
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-700 md:text-lg">
            {loading
              ? "Preparing the store snapshot so the advice can use the latest available signals."
              : insight?.problem ??
                t("owner.ai.emptyAdvice")}
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
                Turning the business signals into owner-friendly advice...
                </span>
              </div>
            </div>
          ) : hasAiRecommendation && insight ? (
            <div className="mt-3">
              <p className="text-sm font-bold text-gray-900">What to check:</p>
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
                aria-label={t("owner.ai.showInsight", { index: dotIndex + 1 })}
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
        <StandardModal
          isOpen
          title={insight.title}
          description={t("owner.ai.detailDescription")}
          maxWidthClassName="max-w-5xl"
          onClose={() => setDetailOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {t("common.close")}
              </button>
              {insight.actionHref && insight.actionLabel ? (
                <a
                  href={insight.actionHref}
                  className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  {insight.actionLabel}
                </a>
              ) : null}
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-4">
              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t("owner.ai.whatHappened")}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {insight.problem}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <ChartBarIcon className="h-5 w-5 text-gray-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t("owner.ai.supportingData")}
                  </h3>
                </div>
                <div className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
                  {insight.evidence.map((item) => (
                    <div key={item} className="flex gap-3 py-3 text-sm leading-6 text-gray-700">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-900 bg-gray-900 p-4 text-white">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-white/10 p-2">
                    <LightBulbIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {t("owner.ai.whatToCheck")}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-200">
                      {insight.recommendation}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t("owner.ai.whyItMatters")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {insight.expectedImpact}
                </p>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t("owner.ai.summary")}
                </h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">{t("owner.ai.priority")}</dt>
                    <dd className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${priorityClass}`}>
                      {insight.priority}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">{t("owner.ai.confidence")}</dt>
                    <dd className="font-semibold capitalize text-gray-900">
                      {insight.confidence}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-gray-500">{t("owner.ai.generated")}</dt>
                    <dd className="text-right font-semibold text-gray-900">
                      {generatedAt
                        ? new Date(generatedAt).toLocaleString()
                        : t("notifications.today")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">{t("owner.ai.dailyAttempts")}</dt>
                    <dd className="font-semibold text-gray-900">
                      {t("owner.ai.attemptsCount", {
                        count: generationCount ?? 1,
                        max: 3,
                      })}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">
                  {t("owner.ai.ownerRead")}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {t("owner.ai.ownerReadDescription")}
                </p>
              </section>
            </aside>
          </div>
        </StandardModal>
      ) : null}
    </>
  );
}
