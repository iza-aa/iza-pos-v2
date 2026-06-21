"use client";

import type { ReactNode } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  OWNER_CHART_COLORS,
  OWNER_CHART_SERIES,
  OWNER_SEMANTIC_TONES,
  type OwnerSemanticTone,
} from "@/lib/constants/theme";
import { formatNumber } from "./dashboardUtils";

export function MetricCard({
  label,
  value,
  helper,
  tone = "info",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: OwnerSemanticTone;
}) {
  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${OWNER_SEMANTIC_TONES[tone].cardClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-gray-950">{value}</p>
      <p className="mt-2 truncate text-sm leading-5 text-gray-600" title={helper}>
        {helper}
      </p>
    </section>
  );
}

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-950">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm font-medium text-gray-500">
      {label}
    </div>
  );
}

export function StandardTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
      {label ? <p className="mb-2 font-bold text-gray-900">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} className="text-gray-600">
            <span style={{ color: entry.color ?? OWNER_CHART_COLORS.INDIGO_BLUE }}>
              {entry.name}
            </span>
            {": "}
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function DonutChartWithLegend({
  data,
  emptyLabel,
}: {
  data: Array<{ name: string; value: number }>;
  emptyLabel: string;
}) {
  if (!data.length) return <EmptyState label={emptyLabel} />;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={OWNER_CHART_SERIES[index % OWNER_CHART_SERIES.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<StandardTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((entry, index) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    OWNER_CHART_SERIES[index % OWNER_CHART_SERIES.length],
                }}
              />
              <span className="truncate text-sm font-semibold capitalize text-gray-700">
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-950">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
