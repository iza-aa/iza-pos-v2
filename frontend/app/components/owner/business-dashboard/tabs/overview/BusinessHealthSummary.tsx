"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { StandardModal } from "@/app/components/shared";
import { useLanguage, type TranslationKey } from "@/app/components/shared/i18n";
import { OWNER_CHART_COLORS, OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { formatCurrency, formatNumber } from "../shared/dashboardUtils";
import { buildBusinessHealth, clampScore } from "./overviewLogic";

type Health = ReturnType<typeof buildBusinessHealth>;
type DriverTone = "good" | "watch" | "risk" | "neutral";
type DriverKey = "sales" | "customer" | "inventory" | "staff" | "operations";

type DriverDetail = {
  key: DriverKey;
  label: string;
  score: number | null;
  rawStatus: string;
  status: string;
  summary: string;
  metrics: Array<{ label: string; value: string; read: string }>;
};

const HEALTH_COLORS = {
  good: "#22C55E",
  goodSoft: "#86EFAC",
  watch: "#F59E0B",
  watchSoft: "#FCD34D",
  risk: "#F43F5E",
  riskSoft: "#FDA4AF",
  neutral: OWNER_CHART_COLORS.INDIGO_BLUE,
  neutralSoft: "#A5B4FC",
  lowData: "#2563EB",
  lowDataSoft: "#93C5FD",
  track: "#E8E9E3",
} as const;

const getStatusClass = (label: string) => {
  if (label === "Good" || label === "Healthy" || label === "Reliable") {
    return OWNER_SEMANTIC_TONES.success.badgeClass;
  }

  if (label === "Stable" || label === "Watch" || label === "Moderate") {
    return OWNER_SEMANTIC_TONES.warning.badgeClass;
  }

  if (label === "Risk" || label === "Needs Attention" || label === "No Signal") {
    return OWNER_SEMANTIC_TONES.danger.badgeClass;
  }

  return OWNER_SEMANTIC_TONES.info.badgeClass;
};

const getTone = (score: number | null): DriverTone => {
  if (score === null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 40) return "watch";
  return "risk";
};

const getToneGradient = (tone: DriverTone) => {
  if (tone === "good") return [HEALTH_COLORS.goodSoft, HEALTH_COLORS.good] as const;
  if (tone === "watch") return [HEALTH_COLORS.watchSoft, HEALTH_COLORS.watch] as const;
  if (tone === "risk") return [HEALTH_COLORS.riskSoft, HEALTH_COLORS.risk] as const;
  return [HEALTH_COLORS.neutralSoft, HEALTH_COLORS.neutral] as const;
};

const getGaugeGradient = (status: string) => {
  if (status === "Healthy") return [HEALTH_COLORS.goodSoft, HEALTH_COLORS.good] as const;
  if (status === "Watch") return [HEALTH_COLORS.watchSoft, HEALTH_COLORS.watch] as const;
  if (status === "Low Data") return [HEALTH_COLORS.lowDataSoft, HEALTH_COLORS.lowData] as const;
  if (status === "Needs Attention") return [HEALTH_COLORS.riskSoft, HEALTH_COLORS.risk] as const;
  return [HEALTH_COLORS.neutralSoft, HEALTH_COLORS.neutral] as const;
};


const translateStatus = (status: string, t: (key: TranslationKey, values?: Record<string, string | number>) => string) => {
  const key = status.toLowerCase().replace(/\s+/g, "");
  const statusKeys: Record<string, TranslationKey> = {
    healthy: "owner.health.status.healthy",
    watch: "owner.health.status.watch",
    lowdata: "owner.health.status.lowData",
    needsattention: "owner.health.status.needsAttention",
    good: "owner.health.status.good",
    reliable: "owner.health.status.reliable",
    stable: "owner.health.status.stable",
    moderate: "owner.health.status.moderate",
    risk: "owner.health.status.risk",
    nosignal: "owner.health.status.noSignal",
  };
  return statusKeys[key] ? t(statusKeys[key]) : status;
};

const formatPercent = (
  value: number | null,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
  signed = false,
) => {
  if (value === null) return t("owner.health.noData");
  const prefix = signed && value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
};

const formatOptionalCurrency = (
  value: number | null,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
) => {
  return value === null ? t("owner.health.noData") : formatCurrency(value);
};

const describeGrowth = (
  value: number | null,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
) => {
  if (value === null) return t("owner.health.noComparisonData");
  if (value > 5) return t("owner.health.improving");
  if (value < -5) return t("owner.health.declining");
  return t("owner.health.flatMovement");
};

const describeLowerPercentLevel = (
  value: number | null,
  healthy: number,
  risk: number,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
) => {
  if (value === null) return t("owner.health.noFinancialData");
  if (value <= healthy) return t("owner.health.withinTarget");
  if (value < risk) return t("owner.health.monitorLevel");
  return t("owner.health.highLevel");
};

const describeCompletionRate = (
  value: number | null,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
) => {
  if (value === null) return t("owner.health.noOrderData");
  if (value >= 95) return t("owner.health.cleanCompletionFlow");
  if (value >= 80) return t("owner.health.someOrderLeakage");
  return t("owner.health.completionNeedsAttention");
};

function ScoreGauge({
  health,
  compact = false,
  t,
}: {
  health: Health;
  compact?: boolean;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}) {
  const score = clampScore(health.score);
  const gaugeData = [
    { name: "Score", value: score },
    { name: "Gap", value: 100 - score },
  ];
  const [gaugeStart, gaugeEnd] = getGaugeGradient(health.status);

  return (
    <div className={`relative ${compact ? "h-44" : "h-72"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="business-health-gauge-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={gaugeStart} />
              <stop offset="100%" stopColor={gaugeEnd} />
            </linearGradient>
          </defs>
          <Pie
            data={gaugeData}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius="66%"
            outerRadius="94%"
            cornerRadius={12}
            stroke="none"
          >
            <Cell fill="url(#business-health-gauge-gradient)" />
            <Cell fill={HEALTH_COLORS.track} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
        <p className={`${compact ? "text-3xl" : "text-5xl"} font-bold leading-none text-gray-950`}>
          {score}
        </p>
        <p className="mt-1 text-sm font-bold text-gray-500">/ 100</p>
        <span className={`mt-3 rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(health.status)}`}>
          {translateStatus(health.status, t)}
        </span>
      </div>
    </div>
  );
}

const buildDriverDetails = (
  health: Health,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
): DriverDetail[] => [
  {
    key: "sales",
    label: t("owner.health.sales"),
    score: health.salesAreaScore,
    rawStatus: health.labels.sales,
    status: translateStatus(health.labels.sales, t),
    summary: t("owner.health.salesSummary"),
    metrics: [
      {
        label: t("owner.bookkeeping.netSales"),
        value: formatOptionalCurrency(health.areas?.sales.netSales ?? null, t),
        read: t("owner.health.salesNetRead"),
      },
      {
        value: formatPercent(health.revenueGrowth, t, true),
        label: t("owner.health.revenueGrowth"),
        read: describeGrowth(health.revenueGrowth, t),
      },
      {
        label: t("owner.health.orderGrowth"),
        value: formatPercent(health.orderGrowth, t, true),
        read: describeGrowth(health.orderGrowth, t),
      },
    ],
  },
  {
    key: "customer",
    label: t("owner.health.customer"),
    score: health.customerAreaScore,
    rawStatus: health.labels.customer,
    status: translateStatus(health.labels.customer, t),
    summary: t("owner.health.customerSummary"),
    metrics: [
      {
        label: t("owner.customer.repeatRate"),
        value: formatPercent(health.areas?.customer.repeatCustomerRate ?? null, t),
        read: t("owner.health.customerRepeatRead"),
      },
      {
        label: t("owner.customer.memberShare"),
        value: formatPercent(health.areas?.customer.memberShare ?? null, t),
        read: t("owner.health.customerMemberRead"),
      },
      {
        label: t("owner.health.discountRate"),
        value: formatPercent(health.areas?.customer.discountRatio ?? null, t),
        read: describeLowerPercentLevel(health.areas?.customer.discountRatio ?? null, 5, 15, t),
      },
    ],
  },
  {
    key: "inventory",
    label: t("owner.health.inventory"),
    score: health.inventoryAreaScore,
    rawStatus: health.labels.inventory,
    status: translateStatus(health.labels.inventory, t),
    summary: t("owner.health.inventorySummary"),
    metrics: [
      {
        label: t("owner.inventory.criticalItems"),
        value: formatNumber(health.areas?.inventory.criticalItems ?? 0),
        read: t("owner.health.inventoryCriticalRead"),
      },
      {
        label: t("owner.inventory.dataIssues"),
        value: formatNumber(health.areas?.inventory.dataIssues ?? 0),
        read: t("owner.health.inventoryDataRead"),
      },
      {
        label: t("owner.inventory.pendingReports"),
        value: formatNumber(health.areas?.inventory.pendingReports ?? 0),
        read: t("owner.health.inventoryReportRead"),
      },
    ],
  },
  {
    key: "staff",
    label: t("owner.health.staff"),
    score: health.staffAreaScore,
    rawStatus: health.labels.staff,
    status: translateStatus(health.labels.staff, t),
    summary: t("owner.health.staffSummary"),
    metrics: [
      {
        label: t("owner.staff.attendanceRate"),
        value: formatPercent(health.areas?.staff.attendanceRate ?? null, t),
        read: t("owner.health.staffAttendanceRead"),
      },
      {
        label: t("owner.staff.lateCount"),
        value: formatPercent(health.areas?.staff.lateRate ?? null, t),
        read: describeLowerPercentLevel(health.areas?.staff.lateRate ?? null, 5, 20, t),
      },
      {
        label: t("owner.staff.overtimeCount"),
        value: formatPercent(health.areas?.staff.overtimeRate ?? null, t),
        read: describeLowerPercentLevel(health.areas?.staff.overtimeRate ?? null, 10, 30, t),
      },
    ],
  },
  {
    key: "operations",
    label: t("owner.health.operations"),
    score: health.operationsAreaScore,
    rawStatus: health.labels.operations,
    status: translateStatus(health.labels.operations, t),
    summary: t("owner.health.operationsSummary"),
    metrics: [
      {
        label: t("owner.health.completion"),
        value: formatPercent(health.areas?.operations.completionRate ?? health.completionRate, t),
        read: describeCompletionRate(health.areas?.operations.completionRate ?? health.completionRate, t),
      },
      {
        label: t("owner.health.cancellationRate"),
        value: formatPercent(health.areas?.operations.cancelledRate ?? health.cancelledRate, t),
        read: describeLowerPercentLevel(health.areas?.operations.cancelledRate ?? health.cancelledRate, 2, 10, t),
      },
      {
        label: t("owner.health.serviceTime"),
        value: (health.areas?.operations.serviceMinutes ?? health.serviceMinutes) === null
          ? t("owner.health.noSamples")
          : t("owner.staff.minutesShort", {
              value: (health.areas?.operations.serviceMinutes ?? health.serviceMinutes ?? 0).toFixed(1),
            }),
        read:
          (health.areas?.operations.serviceMinutes ?? health.serviceMinutes) === null
            ? t("owner.health.noTimestampSamples")
            : t("owner.health.timedOrders", {
                count: health.areas?.operations.serviceSampleSize ?? health.serviceSampleSize,
              }),
      },
    ],
  },
];

function DriverProgress({ score }: { score: number | null }) {
  const tone = getTone(score);
  const [barStart, barEnd] = getToneGradient(tone);

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#EEF0EA]">
      <div
        className="h-full rounded-full"
        style={{
          width: `${score === null ? 0 : clampScore(score)}%`,
          backgroundImage: `linear-gradient(90deg, ${barStart}, ${barEnd})`,
        }}
      />
    </div>
  );
}

function DetailModal({
  health,
  onClose,
}: {
  health: Health;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const drivers = buildDriverDetails(health, t);
  const weakestDriverKey = (() => {
    if (health.weakestDriver === "Sales") return "sales";
    if (health.weakestDriver === "Customer") return "customer";
    if (health.weakestDriver === "Inventory") return "inventory";
    if (health.weakestDriver === "Staff") return "staff";
    if (health.weakestDriver === "Operations") return "operations";
    return "sales";
  })();
  const initialDriver =
    drivers.find((driver) => driver.key === weakestDriverKey) ?? drivers[0];
  const weakestDriver =
    drivers.find((driver) => driver.key === weakestDriverKey) ?? drivers[0];
  const [activeDriverKey, setActiveDriverKey] = useState<DriverKey>(
    initialDriver.key,
  );
  const activeDriver =
    drivers.find((driver) => driver.key === activeDriverKey) ?? drivers[0];

  return (
    <StandardModal
      isOpen
      title={t("owner.health.details")}
      description={t("owner.health.detailsDescription")}
      maxWidthClassName="max-w-5xl"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          {t("common.close")}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">
              {t("owner.health.businessAreas")}
            </p>
            <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {drivers.map((driver) => {
                const isActive = driver.key === activeDriver.key;

                return (
                  <button
                    key={driver.key}
                    type="button"
                    onClick={() => setActiveDriverKey(driver.key)}
                    className={`min-h-16 rounded-lg border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-gray-950 bg-gray-950 text-white"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                      {driver.label}
                    </p>
                    <p className={`mt-1 text-xs ${isActive ? "text-gray-300" : "text-gray-500"}`}>
                      {driver.score === null
                        ? t("owner.health.noData")
                        : t("owner.health.scoreOutOf100", {
                            score: clampScore(driver.score),
                          })}
                    </p>
                  </button>
                );
              })}
            </nav>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">
                  {t("owner.health.selectedDriver")}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">
                  {activeDriver.label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {activeDriver.summary}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(activeDriver.rawStatus)}`}>
                {activeDriver.status}
              </span>
            </div>

            <div className="mt-4">
              <DriverProgress score={activeDriver.score} />
            </div>

            <div className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
              {activeDriver.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_130px_1.2fr] sm:items-center sm:gap-4"
                >
                  <p className="font-semibold text-gray-700">{metric.label}</p>
                  <p className="font-bold text-gray-950 sm:text-right">
                    {metric.value}
                  </p>
                  <p className="text-gray-500">{metric.read}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t("owner.health.summary")}
            </h3>
            <ScoreGauge health={health} compact t={t} />
            <dl className="mt-2 space-y-3 border-t border-gray-200 pt-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">{t("owner.health.weakestDriver")}</dt>
                <dd className="text-right font-semibold text-gray-900">
                  {weakestDriver.label}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">{t("owner.health.dataConfidence")}</dt>
                <dd className="text-right font-semibold text-gray-900">
                  {translateStatus(health.confidence, t)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-500">{t("owner.health.areaCoverageLabel")}</dt>
                <dd className="text-right font-semibold text-gray-900">
                  {t("owner.health.areaCoverage", {
                    available: health.availableAreaCount,
                  })}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">
              {t("owner.health.ownerRead")}
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {t("owner.health.scoreExplanation")}
            </p>
          </section>
        </aside>
      </div>
    </StandardModal>
  );
}

export default function BusinessHealthSummary({ health }: { health: Health }) {
  const { t } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="flex min-h-90 w-full flex-col items-center justify-center overflow-hidden rounded-lg outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-900/10"
        aria-label={t("owner.health.openDetails")}
      >
        <div className="w-full max-w-sm">
          <div className="mb-2 flex items-center justify-between gap-3 px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {t("owner.health.gauge")}
            </p>
          </div>
          <ScoreGauge health={health} t={t} />
        </div>
      </button>

      {detailsOpen ? (
        <DetailModal health={health} onClose={() => setDetailsOpen(false)} />
      ) : null}
    </>
  );
}
