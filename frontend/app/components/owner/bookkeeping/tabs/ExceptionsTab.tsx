"use client";

import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { BookkeepingDashboardData, BookkeepingException } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { SemanticBadge, StandardPanel, formatLabel } from "../BookkeepingPrimitives";

const severityTone = (severity: BookkeepingException["severity"]) => {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "info";
};

export default function ExceptionsTab({
  data,
  updatingId = "",
  onUpdateException,
}: {
  data: BookkeepingDashboardData;
  updatingId?: string;
  onUpdateException?: (exception: BookkeepingException, status: "acknowledged" | "resolved") => void;
}) {
  const columns: Array<StandardTableColumn<BookkeepingException>> = [
    {
      key: "businessDate",
      header: "Date",
      render: (row) => row.businessDate || "-",
      sortValue: (row) => row.businessDate,
    },
    {
      key: "severity",
      header: "Severity",
      render: (row) => <SemanticBadge tone={severityTone(row.severity)}>{formatLabel(row.severity)}</SemanticBadge>,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="font-semibold text-gray-900">{row.type}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (row) => row.description,
      className: "whitespace-normal",
    },
    {
      key: "source",
      header: "Source",
      render: (row) => row.source,
    },
    {
      key: "suggestedFix",
      header: "Suggested Fix",
      render: (row) => row.suggestedFix,
      className: "whitespace-normal",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <SemanticBadge tone="neutral">{formatLabel(row.status)}</SemanticBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (row) => row.status === "resolved" ? (
        <span className="text-sm font-semibold text-gray-400">Done</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onUpdateException?.(row, "acknowledged")}
            disabled={!onUpdateException || updatingId === row.id}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Acknowledge
          </button>
          <button
            type="button"
            onClick={() => onUpdateException?.(row, "resolved")}
            disabled={!onUpdateException || updatingId === row.id}
            className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            Resolve
          </button>
        </div>
      ),
    },
  ];

  return (
    <StandardPanel
      title="Bookkeeping Exceptions"
      description="Focused review list for data issues that can block accurate closing, ledger, or margin reports."
    >
      <StandardTable
        columns={columns}
        data={data.exceptions}
        getRowKey={(row) => row.id}
        emptyLabel="No bookkeeping exceptions in this period."
        minWidthClassName="min-w-[1120px]"
      />
    </StandardPanel>
  );
}
