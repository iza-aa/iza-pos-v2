"use client";

import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { BookkeepingDashboardData, MenuMarginRow } from "@/lib/services/bookkeeping/bookkeepingTypes";
import {
  MetricCard,
  SemanticBadge,
  StandardPanel,
  formatCurrency,
  formatLabel,
} from "../BookkeepingPrimitives";

export default function CostMarginTab({ data }: { data: BookkeepingDashboardData }) {
  const missingCostCount = data.menuMargins.filter((row) => row.status !== "ready").length;

  const columns: Array<StandardTableColumn<MenuMarginRow>> = [
    {
      key: "menuName",
      header: "Menu Name",
      render: (row) => <span className="font-semibold text-gray-900">{row.menuName}</span>,
    },
    {
      key: "quantitySold",
      header: "Quantity Sold",
      render: (row) => row.quantitySold,
      sortValue: (row) => row.quantitySold,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (row) => formatCurrency(row.revenue),
      sortValue: (row) => row.revenue,
    },
    {
      key: "estimatedCogs",
      header: "Estimated COGS",
      render: (row) => {
        if (row.estimatedCogs !== null) return formatCurrency(row.estimatedCogs);
        return row.status === "recipe_needed" ? "Recipe Needed" : "Cost Data Needed";
      },
      sortValue: (row) => row.estimatedCogs ?? -1,
    },
    {
      key: "grossProfit",
      header: "Gross Profit",
      render: (row) => row.grossProfit === null ? "-" : formatCurrency(row.grossProfit),
      sortValue: (row) => row.grossProfit ?? -1,
    },
    {
      key: "marginPct",
      header: "Margin",
      render: (row) => row.marginPct === null ? "-" : `${row.marginPct.toFixed(1)}%`,
      sortValue: (row) => row.marginPct ?? -1,
    },
    {
      key: "status",
      header: "Status",
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
          label="Estimated COGS"
          value={formatCurrency(data.summary.estimatedCogs)}
          description="Only shown when cost data is complete enough."
          tone={data.summary.estimatedCogs === null ? "warning" : "coffee"}
        />
        <MetricCard
          label="Gross Profit"
          value={formatCurrency(data.summary.grossProfit)}
          description="Net sales minus estimated COGS."
          tone={data.summary.grossProfit === null ? "warning" : "success"}
        />
        <MetricCard
          label="Missing Cost Rows"
          value={missingCostCount}
          description="Menu rows that still need recipe or item cost data."
          tone={missingCostCount > 0 ? "danger" : "success"}
        />
        <MetricCard
          label="Operating Expenses"
          value={formatCurrency(data.summary.operatingExpenses)}
          description="Owner-entered operating expenses in this period."
          tone="neutral"
        />
      </div>

      <StandardPanel
        title="Menu Profitability Table"
        description="Revenue and estimated margin by menu. Profit is intentionally hidden when recipe or item cost data is incomplete."
      >
        <StandardTable
          columns={columns}
          data={data.menuMargins}
          getRowKey={(row) => row.id}
          emptyLabel="No menu sales in this period."
          minWidthClassName="min-w-[980px]"
        />
      </StandardPanel>
    </div>
  );
}
