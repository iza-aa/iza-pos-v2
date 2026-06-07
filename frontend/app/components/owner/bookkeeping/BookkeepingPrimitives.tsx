"use client";

import type { ReactNode } from "react";
import { OWNER_SEMANTIC_TONES, type OwnerSemanticTone } from "@/lib/constants/theme";
import { formatJakartaDisplayDateTime } from "@/lib/services/bookkeeping/bookkeepingDate";

export const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "Cost Data Needed";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDateTime = (value: string) => {
  return formatJakartaDisplayDateTime(value);
};

export const formatLabel = (value: string) => {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export function SemanticBadge({
  tone,
  children,
  className = "",
}: {
  tone: OwnerSemanticTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold leading-5 ${OWNER_SEMANTIC_TONES[tone].badgeClass} ${className}`}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  description,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  description: string;
  tone?: OwnerSemanticTone;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${OWNER_SEMANTIC_TONES[tone].cardClass}`}>
      <p className="text-xs font-semibold uppercase tracking-normal text-gray-600">{label}</p>
      <div className="mt-3 text-2xl font-bold text-gray-950">{value}</div>
      <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

export function StandardPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
