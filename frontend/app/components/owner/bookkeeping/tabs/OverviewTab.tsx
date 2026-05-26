"use client";

import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { BookkeepingDashboardData, PaymentBreakdownRow } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { MetricCard, StandardPanel, formatCurrency } from "../BookkeepingPrimitives";

export default function OverviewTab({ data }: { data: BookkeepingDashboardData }) {
  const columns: Array<StandardTableColumn<PaymentBreakdownRow>> = [
    {
      key: "method",
      header: "Payment Method",
      render: (row) => <span className="font-semibold capitalize text-gray-900">{row.method}</span>,
    },
    {
      key: "orders",
      header: "Orders",
      render: (row) => row.orders,
      sortValue: (row) => row.orders,
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.amount)}</span>,
      sortValue: (row) => row.amount,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
        <MetricCard
          label="Gross Sales"
          value={formatCurrency(data.summary.grossSales)}
          description="Total order value before discount."
          tone="progress"
        />
        <MetricCard
          label="Net Sales"
          value={formatCurrency(data.summary.netSales)}
          description="Sales after discount from valid orders."
          tone="success"
        />
        <MetricCard
          label="Estimated COGS"
          value={formatCurrency(data.summary.estimatedCogs)}
          description="Uses recipe and inventory cost when available."
          tone={data.summary.estimatedCogs === null ? "warning" : "coffee"}
        />
        <MetricCard
          label="Exceptions"
          value={data.summary.unresolvedExceptions}
          description="Open items that need review before closing."
          tone={data.summary.unresolvedExceptions > 0 ? "danger" : "neutral"}
        />
        <MetricCard
          label="Discounts"
          value={formatCurrency(data.summary.discounts)}
          description="Reward, voucher, and manual discount cost."
          tone="premium"
        />
        <MetricCard
          label="Tax Collected"
          value={formatCurrency(data.summary.taxCollected)}
          description="Customer tax kept separate from sales revenue."
          tone="neutral"
        />
        <MetricCard
          label="Gross Profit"
          value={formatCurrency(data.summary.grossProfit)}
          description="Net sales minus estimated COGS."
          tone={data.summary.grossProfit === null ? "warning" : "success"}
        />
        <MetricCard
          label="Cash Sales"
          value={formatCurrency(data.summary.cashExpected)}
          description="Cash from valid paid orders only."
          tone="waiting"
        />
      </div>


      <StandardPanel
        title="Payment Method Breakdown"
        description="Automatic split from valid orders in the selected period."
      >
        <StandardTable
          columns={columns}
          data={data.paymentBreakdown}
          getRowKey={(row) => row.method}
          emptyLabel="No payment data in this period."
          minWidthClassName="min-w-[620px]"
        />
      </StandardPanel>
    </div>
  );
}
