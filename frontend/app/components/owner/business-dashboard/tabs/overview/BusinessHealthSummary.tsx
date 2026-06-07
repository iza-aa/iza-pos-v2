"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { StandardModal } from "@/app/components/shared";
import { useLanguage, type TranslationKey } from "@/app/components/shared/i18n";
import { OWNER_CHART_COLORS, OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { formatCurrency } from "../shared/dashboardUtils";
import { buildBusinessHealth, clampScore } from "./overviewLogic";

type Health = ReturnType<typeof buildBusinessHealth>;
type DriverTone = "good" | "watch" | "risk" | "neutral";
type DriverKey = "demand" | "transaction" | "profit" | "operations";

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
  const key = status.toLowerCase().replace(/\\s+/g, "");
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

const describePercentLevel = (
  value: number | null,
  healthy: number,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
) => {
  if (value === null) return t("owner.health.noFinancialData");
  return value >= healthy ? t("owner.health.healthyLevel") : t("owner.health.needsReview");
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

const describeCurrencySignal = (
  value: number | null,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
) => {
  if (value === null) return t("owner.health.noFinancialData");
  if (value > 0) return t("owner.health.positiveEstimate");
  if (value < 0) return t("owner.health.negativeEstimate");
  return t("owner.health.breakEven");
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
    key: "demand",
    label: t("owner.health.demand"),
    score: health.demandScore,
    rawStatus: health.labels.demand,
    status: translateStatus(health.labels.demand, t),
    summary: t("owner.health.demandSummary"),
    metrics: [
      {
        label: t("owner.health.revenueGrowth"),
        value: formatPercent(health.revenueGrowth, t, true),
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
    key: "transaction",
    label: t("owner.health.transactionQuality"),
    score: health.transactionQualityScore,
    rawStatus: health.labels.transactionQuality,
    status: translateStatus(health.labels.transactionQuality, t),
    summary: t("owner.health.transactionSummary"),
    metrics: [
      {
        label: "AOV",
        value: formatOptionalCurrency(health.averageOrderValue, t),
        read: t("owner.health.averageValuePerOrder"),
      },
      {
        label: t("owner.health.aovGrowth"),
        value: formatPercent(health.aovGrowth, t, true),
        read: describeGrowth(health.aovGrowth, t),
      },
    ],
  },
  {
    key: "profit",
    label: t("owner.health.profitQuality"),
    score: health.profitQualityScore,
    rawStatus: health.labels.profitQuality,
    status: translateStatus(health.labels.profitQuality, t),
    summary: t("owner.health.profitSummary"),
    metrics: [
      {
        label: t("owner.health.margin"),
        value: formatPercent(health.netProfitMargin, t),
        read: describePercentLevel(health.netProfitMargin, 20, t),
      },
      {
        label: t("owner.health.netProfit"),
        value: formatOptionalCurrency(health.netProfitEstimate, t),
        read: describeCurrencySignal(health.netProfitEstimate, t),
      },
    ],
  },
  {
    key: "operations",
    label: t("owner.health.operationalFlow"),
    score: health.operationalFlowScore,
    rawStatus: health.labels.operationalFlow,
    status: translateStatus(health.labels.operationalFlow, t),
    summary: t("owner.health.operationsSummary"),
    metrics: [
      {
        label: t("owner.health.completion"),
        value: formatPercent(health.completionRate, t),
        read: describeCompletionRate(health.completionRate, t),
      },
      {
        label: t("owner.health.serviceTime"),
        value: health.serviceMinutes === null ? t("owner.health.noSamples") : t("owner.staff.minutesShort", { value: health.serviceMinutes.toFixed(1) }),
        read:
          health.serviceMinutes === null
            ? t("owner.health.noTimestampSamples")
            : t("owner.health.timedOrders", { count: health.serviceSampleSize }),
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
    if (health.weakestDriver === "Demand") return "demand";
    if (health.weakestDriver === "Transaction Quality") return "transaction";
    if (health.weakestDriver === "Profit Quality") return "profit";
    if (health.weakestDriver === "Operational Flow") return "operations";
    return "demand";
  })();
  const initialDriver =
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
      maxWidthClassName="max-w-lg"
      onClose={onClose}
    >
      <div className="grid gap-5">
        <nav className="grid grid-cols-2 gap-2">
          {drivers.map((driver) => {
            const isActive = driver.key === activeDriver.key;

            return (
              <button
                key={driver.key}
                type="button"
                onClick={() => setActiveDriverKey(driver.key)}
                className={`min-h-12 rounded-lg border px-3 py-2 text-left transition ${
                  isActive
                    ? "border-gray-950 bg-gray-950 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <p className={`text-sm font-bold ${isActive ? "text-white" : "text-gray-950"}`}>
                  {driver.label}
                </p>
              </button>
            );
          })}
        </nav>

        <section className="min-h-75 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {t("owner.health.selectedDriver")}
              </p>
              <h4 className="mt-1 text-xl font-bold text-gray-950">
                {activeDriver.label}
              </h4>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                {activeDriver.summary}
              </p>
            </div>
            <div className="shrink-0 sm:text-right">
              <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(activeDriver.rawStatus)}`}>
                {activeDriver.status}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <DriverProgress score={activeDriver.score} />
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
            <div className="hidden gap-3 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-400 sm:grid sm:grid-cols-[1fr_110px_1fr]">
              <span>{t("owner.staff.metric")}</span>
              <span className="text-right">{t("owner.staff.sheet.value")}</span>
              <span>{t("owner.health.read")}</span>
            </div>
            {activeDriver.metrics.map((metric) => (
              <div
                key={metric.label}
                className="grid gap-1 border-t border-gray-100 px-4 py-3 text-sm sm:grid-cols-[1fr_110px_1fr] sm:gap-3"
              >
                <p className="font-bold text-gray-700">{metric.label}</p>
                <p className="font-bold text-gray-950 sm:text-right">
                  {metric.value}
                </p>
                <p className="font-semibold text-gray-500">{metric.read}</p>
              </div>
            ))}
          </div>
        </section>
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
