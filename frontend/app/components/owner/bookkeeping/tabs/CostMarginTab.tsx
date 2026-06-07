"use client";

import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { useLanguage } from "@/app/components/shared/i18n";
import type { BookkeepingDashboardData, MenuMarginRow } from "@/lib/services/bookkeeping/bookkeepingTypes";
import {
  MetricCard,
  SemanticBadge,
  StandardPanel,
  formatCurrency,
  formatLabel,
} from "../BookkeepingPrimitives";

export default function CostMarginTab({
  data,
  loading = false,
}: {
  data: BookkeepingDashboardData;
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const missingCostCount = data.menuMargins.filter((row) => row.status !== "ready").length;

  const columns: Array<StandardTableColumn<MenuMarginRow>> = [
    {
      key: "menuName",
      header: t("owner.bookkeeping.menuName"),
      render: (row) => <span className="font-semibold text-gray-900">{row.menuName}</span>,
    },
    {
      key: "quantitySold",
      header: t("owner.bookkeeping.quantitySold"),
      render: (row) => row.quantitySold,
      sortValue: (row) => row.quantitySold,
    },
    {
      key: "revenue",
      header: t("owner.bookkeeping.revenue"),
      render: (row) => formatCurrency(row.revenue),
      sortValue: (row) => row.revenue,
    },
    {
      key: "estimatedCogs",
      header: t("owner.bookkeeping.foodCost"),
      render: (row) => {
        if (row.estimatedCogs !== null) return formatCurrency(row.estimatedCogs);
        return row.status === "recipe_needed" ? t("owner.bookkeeping.recipeNeeded") : t("owner.bookkeeping.costDataNeeded");
      },
      sortValue: (row) => row.estimatedCogs ?? -1,
    },
    {
      key: "grossProfit",
      header: t("owner.bookkeeping.grossProfit"),
      render: (row) => row.grossProfit === null ? "-" : formatCurrency(row.grossProfit),
      sortValue: (row) => row.grossProfit ?? -1,
    },
    {
      key: "marginPct",
      header: t("owner.bookkeeping.margin"),
      render: (row) => row.marginPct === null ? "-" : `${row.marginPct.toFixed(1)}%`,
      sortValue: (row) => row.marginPct ?? -1,
    },
    {
      key: "status",
      header: t("owner.bookkeeping.status"),
      render: (row) => (
        <SemanticBadge tone={row.status === "ready" ? "success" : "warning"}>
          {formatLabel(row.status)}
        </SemanticBadge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("owner.bookkeeping.foodCost")}
          value={formatCurrency(data.summary.estimatedCogs)}
          description={t("owner.bookkeeping.actualUsageOrRecipe")}
          tone={data.summary.estimatedCogs === null ? "warning" : "coffee"}
        />
        <MetricCard
          label={t("owner.bookkeeping.grossProfit")}
          value={formatCurrency(data.summary.grossProfit)}
          description={t("owner.bookkeeping.netSalesMinusCogs")}
          tone={data.summary.grossProfit === null ? "warning" : "success"}
        />
        <MetricCard
          label={t("owner.bookkeeping.missingCostRows")}
          value={missingCostCount}
          description={t("owner.bookkeeping.missingCostRowsDescription")}
          tone={missingCostCount > 0 ? "danger" : "success"}
        />
        <MetricCard
          label={t("owner.bookkeeping.operatingExpenses")}
          value={formatCurrency(data.summary.operatingExpenses)}
          description={t("owner.bookkeeping.operatingCostPeriod")}
          tone="neutral"
        />
      </div>

      <StandardPanel
        title={t("owner.bookkeeping.menuProfitability")}
        description={t("owner.bookkeeping.menuProfitabilityDescription")}
      >
        <StandardTable
          columns={columns}
          data={data.menuMargins}
          getRowKey={(row) => row.id}
          loading={loading}
          emptyLabel={t("owner.bookkeeping.noMenuSales")}
          minWidthClassName="min-w-[980px]"
        />
      </StandardPanel>
    </div>
  );
}
