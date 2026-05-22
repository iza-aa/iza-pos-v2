"use client";

import { OWNER_CHART_COLORS, OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { buildBusinessHealth, clampScore } from "./overviewLogic";

function HealthMetricRow({
  label,
  value,
  score,
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  score: number;
  tone: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-36 text-sm font-bold leading-5 text-gray-600">{label}</p>
        <p className="text-right text-sm font-bold leading-5 text-gray-950">{value}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full"
          style={{ width: `${clampScore(score)}%`, backgroundColor: tone }}
        />
      </div>
    </div>
  );
}

export default function BusinessHealthSummary({
  health,
}: {
  health: ReturnType<typeof buildBusinessHealth>;
}) {
  const statusTone =
    health.status === "Healthy"
      ? OWNER_SEMANTIC_TONES.success.badgeClass
      : health.status === "Watch"
        ? OWNER_SEMANTIC_TONES.waiting.badgeClass
        : OWNER_SEMANTIC_TONES.danger.badgeClass;

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <div
          className="grid h-40 w-40 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${OWNER_CHART_COLORS.INDIGO_BLUE} ${health.score * 3.6}deg, ${OWNER_SEMANTIC_TONES.neutral.border} 0deg)`,
          }}
        >
          <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-950">{health.score}</p>
              <p className="text-xs font-semibold text-gray-500">/ 100</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm font-bold text-gray-900">Business Health Score</p>
        <span className={`mt-2 rounded-full border px-3 py-1 text-xs font-bold ${statusTone}`}>
          {health.status}
        </span>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3">
          <HealthMetricRow
            label="Revenue Growth"
            value={`${health.revenueGrowth >= 0 ? "+" : ""}${health.revenueGrowth.toFixed(1)}%`}
            score={clampScore(50 + health.revenueGrowth / 2)}
            tone={OWNER_CHART_COLORS.INDIGO_BLUE}
            compact
          />
          <HealthMetricRow
            label="Order Growth"
            value={`${health.orderGrowth >= 0 ? "+" : ""}${health.orderGrowth.toFixed(1)}%`}
            score={clampScore(50 + health.orderGrowth / 2)}
            tone={OWNER_CHART_COLORS.SOFT_SKY_BLUE}
            compact
          />
          <HealthMetricRow
            label="Completion Rate"
            value={`${health.completionRate.toFixed(1)}%`}
            score={health.completionRate}
            tone={OWNER_CHART_COLORS.SOFT_GREEN}
            compact
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
        <HealthMetricRow
          label="Cancelled Rate"
          value={`${health.cancelledRate.toFixed(1)}%`}
          score={clampScore(100 - health.cancelledRate * 3)}
          tone={OWNER_CHART_COLORS.SOFT_ROSE}
        />
        <HealthMetricRow
          label="Avg. Service Time"
          value={health.serviceMinutes === null ? "-" : `${health.serviceMinutes.toFixed(1)} min`}
          score={
            health.serviceMinutes === null
              ? 70
              : clampScore(100 - Math.max(0, health.serviceMinutes - 10) * 3)
          }
          tone={OWNER_CHART_COLORS.SOFT_YELLOW}
        />
      </div>
    </div>
  );
}
