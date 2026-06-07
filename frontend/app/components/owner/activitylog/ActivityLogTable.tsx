"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { EyeIcon } from "@heroicons/react/24/outline";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { ActivityLog } from "@/lib/types";
import { formatJakartaDateTimeParts } from "@/lib/constants/time";

interface ActivityLogTableProps {
  logs: ActivityLog[];
  onLogClick: (log: ActivityLog) => void;
  actions?: ReactNode;
  filterPanel?: ReactNode;
  loading?: boolean;
}

const getSeverityBadgeClass = (severity: string) => {
  const normalized = severity.toLowerCase();

  if (normalized === "critical" || normalized === "error") {
    return OWNER_SEMANTIC_TONES.danger.badgeClass;
  }

  if (normalized === "warning") {
    return OWNER_SEMANTIC_TONES.danger.badgeClass;
  }

  return OWNER_SEMANTIC_TONES.info.badgeClass;
};

const getCategoryBadgeClass = (category: string) => {
  if (category === "SALES") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (category === "INVENTORY") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (category === "FINANCIAL" || category === "REPORT") return OWNER_SEMANTIC_TONES.premium.badgeClass;
  if (category === "SYSTEM") return OWNER_SEMANTIC_TONES.dark.badgeClass;
  if (category === "AUTH") return OWNER_SEMANTIC_TONES.neutral.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const formatLabel = (value: string) => {
  if (!value) return "Unknown";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

function TimeCell({ timestamp }: { timestamp: string }) {
  const dateTime = formatJakartaDateTimeParts(timestamp);

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-900">{dateTime.time}</p>
      <p className="mt-1 text-xs text-gray-500">{dateTime.date}</p>
    </div>
  );
}

const renderBadge = (label: string, className: string) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
    {label}
  </span>
);

export default function ActivityLogTable({
  logs,
  onLogClick,
  actions,
  filterPanel,
  loading = false,
}: ActivityLogTableProps) {
  const columns = useMemo<Array<StandardTableColumn<ActivityLog>>>(
    () => [
      {
        key: "event",
        header: "Event",
        render: (log) => (
          <div className="flex flex-wrap gap-2">
            {renderBadge(formatLabel(log.severity), getSeverityBadgeClass(log.severity))}
            {renderBadge(formatLabel(log.actionCategory), getCategoryBadgeClass(log.actionCategory))}
          </div>
        ),
        sortValue: (log) => `${log.severity}-${log.actionCategory}`,
        className: "align-top",
      },
      {
        key: "description",
        header: "Description",
        render: (log) => (
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold text-gray-900">{log.actionDescription}</p>
            <p className="mt-1 text-xs text-gray-500">{formatLabel(log.action)}</p>
            {log.notes ? (
              <p className="mt-2 line-clamp-1 text-xs text-gray-500">{log.notes}</p>
            ) : null}
          </div>
        ),
        sortValue: (log) => log.actionDescription,
        className: "align-top",
      },
      {
        key: "user",
        header: "User",
        render: (log) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{log.userName}</p>
            <p className="text-xs capitalize text-gray-500">{log.userRole}</p>
          </div>
        ),
        sortValue: (log) => log.userName,
        className: "align-top",
      },
      {
        key: "resource",
        header: "Resource",
        render: (log) =>
          log.resourceName ? (
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{log.resourceName}</p>
              <p className="text-xs text-gray-500">{log.resourceType}</p>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
        sortValue: (log) => log.resourceName ?? log.resourceType,
        className: "align-top",
      },
      {
        key: "changes",
        header: "Changes",
        render: (log) => {
          const changesSummary = log.changesSummary ?? [];

          if (!changesSummary.length) {
            return <span className="text-gray-400">-</span>;
          }

          return (
            <div className="min-w-0">
              <p className="line-clamp-1 text-gray-700">{changesSummary[0]}</p>
              {changesSummary.length > 1 ? (
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  +{changesSummary.length - 1} more
                </p>
              ) : null}
            </div>
          );
        },
        sortValue: (log) => log.changesSummary?.length ?? 0,
        className: "align-top",
      },
      {
        key: "time",
        header: "Date",
        render: (log) => <TimeCell timestamp={log.timestamp} />,
        sortValue: (log) => log.timestamp,
        className: "align-top",
      },
      {
        key: "detail",
        header: "Detail",
        isAction: true,
        render: (log) => (
          <button
            type="button"
            onClick={() => onLogClick(log)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
            aria-label="Show activity details"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        ),
        className: "align-top",
      },
    ],
    [onLogClick],
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-950">Activity Log Table</h2>
          <p className="mt-1 text-sm text-gray-500">
            Chronological audit trail for system and user actions.
          </p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {filterPanel ? <div className="mb-4">{filterPanel}</div> : null}
      <StandardTable
        columns={columns}
        data={logs}
        getRowKey={(log) => log.id}
        emptyLabel="No activity logs match the current filters."
        loading={loading}
        minWidthClassName="min-w-[1120px]"
      />
    </section>
  );
}
