"use client";

import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { useLanguage } from "@/app/components/shared/i18n";
import type { BookkeepingDashboardData, BookkeepingException } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { SemanticBadge, StandardPanel, formatDateTime, formatLabel } from "../BookkeepingPrimitives";

const severityTone = (severity: BookkeepingException["severity"]) => {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "info";
};

export default function ExceptionsTab({
  data,
  loading = false,
}: {
  data: BookkeepingDashboardData;
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const reviewTone = (row: BookkeepingException) => {
    if (row.reviewStatus === "waiting_manager_review") return "warning";
    if (row.status === "open") return "danger";
    return "success";
  };

  const reviewLabel = (row: BookkeepingException) => {
    if (row.reviewStatus === "waiting_manager_review") return t("owner.bookkeeping.waitingReview");
    if (row.status === "open") return t("owner.bookkeeping.unresolved") || "Unresolved";
    return t("owner.bookkeeping.reviewed");
  };

  const columns: Array<StandardTableColumn<BookkeepingException>> = [
    {
      key: "businessDate",
      header: t("owner.bookkeeping.date"),
      render: (row) => row.businessDate || "-",
      sortValue: (row) => row.businessDate,
    },
    {
      key: "severity",
      header: t("owner.bookkeeping.severity"),
      render: (row) => <SemanticBadge tone={severityTone(row.severity)}>{formatLabel(row.severity)}</SemanticBadge>,
    },
    {
      key: "type",
      header: t("owner.bookkeeping.type"),
      render: (row) => <span className="font-semibold text-gray-900">{row.type}</span>,
    },
    {
      key: "description",
      header: t("owner.bookkeeping.descriptionColumn"),
      render: (row) => row.description,
      className: "whitespace-normal",
    },
    {
      key: "source",
      header: t("owner.bookkeeping.source"),
      render: (row) => row.source,
    },
    {
      key: "suggestedFix",
      header: t("owner.bookkeeping.suggestedFix"),
      render: (row) => row.suggestedFix,
      className: "whitespace-normal",
    },
    {
      key: "status",
      header: t("owner.bookkeeping.status") || "Status",
      render: (row) => (
        <div className="min-w-[150px]">
          <SemanticBadge tone={reviewTone(row)}>{reviewLabel(row)}</SemanticBadge>
          {row.reviewedByName ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-gray-600">
              {t("owner.bookkeeping.by")} {row.reviewedByName}
            </p>
          ) : null}
          {row.reviewedAt ? (
            <p className="text-xs leading-5 text-gray-500">{formatDateTime(row.reviewedAt)}</p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <StandardPanel
      title={t("owner.bookkeeping.exceptions")}
      description={t("owner.bookkeeping.reviewQueueDescription")}
    >
      <StandardTable
        columns={columns}
        data={data.exceptions}
        getRowKey={(row) => row.id}
        loading={loading}
        emptyLabel={t("owner.bookkeeping.noExceptions")}
        minWidthClassName="min-w-[1120px]"
      />
    </StandardPanel>
  );
}
