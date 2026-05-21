"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { AIInsight } from "@/lib/services/owner-insights/insightSchema";

const toneClass = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function AIInsightCarousel({ insights }: { insights: AIInsight[] }) {
  const [index, setIndex] = useState(0);

  if (insights.length === 0) return null;

  const insight = insights[index] ?? insights[0];
  const canNavigate = insights.length > 1;
  const visibleEvidence = insight.evidence.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-700">
            <SparklesIcon className="h-4 w-4" />
            AI Insight Summary
          </span>
          <span className="text-xs font-semibold text-gray-500">
            Insight {index + 1} of {insights.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass[insight.priority]}`}
          >
            {insight.priority} priority
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass[insight.confidence]}`}
          >
            {insight.confidence} confidence
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="p-5 md:p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Masalah utama
          </p>
          <h3 className="mt-2 text-xl font-bold leading-tight text-gray-900">
            {insight.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-gray-700 md:text-base">
            {insight.problem}
          </p>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Bukti pendukung
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleEvidence.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium leading-5 text-gray-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="border-t border-gray-100 bg-gray-50 p-5 md:p-6 lg:border-l lg:border-t-0">
          <div className="rounded-2xl bg-gray-900 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-300">
              Rekomendasi
            </p>
            <p className="mt-3 text-sm leading-7 md:text-base">
              {insight.recommendation}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Dampak yang diharapkan
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {insight.expectedImpact}
            </p>
          </div>

          {insight.actionHref && insight.actionLabel ? (
            <a
              href={insight.actionHref}
              className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {insight.actionLabel}
            </a>
          ) : null}
        </aside>
      </div>

      {canNavigate ? (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center justify-center gap-2">
            {insights.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(dotIndex)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  dotIndex === index ? "bg-gray-900" : "bg-gray-300"
                }`}
                aria-label={`Show AI insight ${dotIndex + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setIndex((value) => Math.min(insights.length - 1, value + 1))
            }
            disabled={index === insights.length - 1}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
