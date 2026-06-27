"use client";

import { useMemo, useState } from "react";
import { StandardModal } from "@/app/components/shared";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { useLanguage } from "@/app/components/shared/i18n";
import type { BookkeepingDashboardData, BookkeepingEntry } from "@/lib/services/bookkeeping/bookkeepingTypes";
import {
  SemanticBadge,
  StandardPanel,
  formatCurrency,
  formatDateTime,
  formatLabel,
} from "../BookkeepingPrimitives";

const statusTone = (status: BookkeepingEntry["status"]) => {
  if (status === "posted") return "success";
  if (status === "estimated") return "info";
  if (status === "cost_data_needed") return "warning";
  return "danger";
};

type LedgerGroup = {
  id: string;
  entryAt: string;
  source: string;
  paymentMethod?: string;
  entries: BookkeepingEntry[];
  duplicateKeys: Set<string>;
  moneyIn: number;
  moneyOut: number;
  neutral: number;
  netImpact: number;
  status: BookkeepingEntry["status"];
};

const extractOrderIdFromSource = (source: string) => {
  return source.match(/order #([a-f0-9-]{20,})/i)?.[1] ?? null;
};

const getLedgerGroupKey = (entry: BookkeepingEntry) => {
  if (entry.sourceTable === "orders" && entry.sourceId) return `order:${entry.sourceId}`;
  const orderIdFromSource = extractOrderIdFromSource(entry.source);
  if (orderIdFromSource) return `order:${orderIdFromSource}`;
  if (entry.sourceTable && entry.sourceId) return `${entry.sourceTable}:${entry.sourceId}`;
  return entry.id;
};

const getGroupSourceLabel = (group: LedgerGroup) => {
  const salesEntry = group.entries.find((entry) => entry.sourceTable === "orders");
  if (salesEntry) return salesEntry.source;

  const orderIdFromSource = group.entries
    .map((entry) => extractOrderIdFromSource(entry.source))
    .find(Boolean);

  if (orderIdFromSource) return `Order ${orderIdFromSource}`;
  return group.source;
};

const getEntryAmountClassName = (entry: BookkeepingEntry) => {
  if (entry.direction === "in") return "text-green-700";
  if (entry.direction === "out") return "text-red-700";
  return "text-gray-600";
};

const getGroupStatus = (entries: BookkeepingEntry[]): BookkeepingEntry["status"] => {
  if (entries.some((entry) => entry.status === "cost_data_needed")) return "cost_data_needed";
  if (entries.some((entry) => entry.status === "needs_review")) return "needs_review";
  if (entries.some((entry) => entry.status === "estimated")) return "estimated";
  return "posted";
};

export default function AutoLedgerTab({
  data,
  loading = false,
}: {
  data: BookkeepingDashboardData;
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const ledgerGroups = useMemo(() => {
    const groups = new Map<string, LedgerGroup>();

    data.entries.forEach((entry) => {
      const key = getLedgerGroupKey(entry);
      const current = groups.get(key) || {
        id: key,
        entryAt: entry.entryAt,
        source: entry.source,
        paymentMethod: entry.paymentMethod,
        entries: [],
        duplicateKeys: new Set<string>(),
        moneyIn: 0,
        moneyOut: 0,
        neutral: 0,
        netImpact: 0,
        status: entry.status,
      };

      current.entryAt = entry.entryAt > current.entryAt ? entry.entryAt : current.entryAt;
      current.paymentMethod = current.paymentMethod || entry.paymentMethod;
      if (entry.sourceTable === "orders") current.source = entry.source;
      const duplicateKey = [
        entry.type,
        entry.category,
        entry.type === "cogs_estimate" ? "orders" : entry.sourceTable || "",
        entry.type === "cogs_estimate"
          ? extractOrderIdFromSource(entry.source) || entry.sourceId || ""
          : entry.sourceId || extractOrderIdFromSource(entry.source) || "",
        entry.amount,
        entry.direction,
      ].join(":");

      if (current.duplicateKeys.has(duplicateKey)) {
        groups.set(key, current);
        return;
      }

      current.duplicateKeys.add(duplicateKey);
      current.entries.push(entry);
      if (entry.direction === "in") current.moneyIn += entry.amount;
      if (entry.direction === "out") current.moneyOut += entry.amount;
      if (entry.direction === "neutral") current.neutral += entry.amount;
      current.netImpact = current.moneyIn - current.moneyOut;
      current.status = getGroupStatus(current.entries);
      groups.set(key, current);
    });

    return Array.from(groups.values()).sort((left, right) => right.entryAt.localeCompare(left.entryAt));
  }, [data.entries]);

  const entryCounts = data.entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    return counts;
  }, {});
  const entrySummary = Object.entries(entryCounts)
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");

  const columns: Array<StandardTableColumn<LedgerGroup>> = [
    {
      key: "entryAt",
      header: t("owner.bookkeeping.dateTime"),
      render: (row) => formatDateTime(row.entryAt),
      sortValue: (row) => row.entryAt,
    },
    {
      key: "source",
      header: t("owner.bookkeeping.source"),
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{getGroupSourceLabel(row)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {row.entries.map((entry) => (
              <span
                key={entry.id}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600"
              >
                {entry.category}:{" "}
                <span className={getEntryAmountClassName(entry)}>
                  {entry.direction === "out" ? "-" : ""}{formatCurrency(entry.amount)}
                </span>
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      header: t("owner.bookkeeping.paymentMethod"),
      render: (row) => <span className="capitalize">{row.paymentMethod || "-"}</span>,
    },
    {
      key: "amount",
      header: t("owner.bookkeeping.netImpact"),
      render: (row) => (
        <span className={`font-semibold ${row.netImpact < 0 ? "text-red-700" : row.netImpact > 0 ? "text-green-700" : "text-gray-900"}`}>
          {row.netImpact < 0 ? "-" : ""}{formatCurrency(Math.abs(row.netImpact))}
        </span>
      ),
      sortValue: (row) => row.netImpact,
    },
    {
      key: "status",
      header: t("owner.bookkeeping.status"),
      render: (row) => <SemanticBadge tone={statusTone(row.status)}>{formatLabel(row.status)}</SemanticBadge>,
    },
  ];

  return (
    <StandardPanel
      title={t("owner.bookkeeping.ledger")}
      description={t("owner.bookkeeping.autoLedgerDescription")}
    >
      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
        {entrySummary
          ? t("owner.bookkeeping.transactionSummary", { count: ledgerGroups.length, summary: entrySummary })
          : t("owner.bookkeeping.noFinancialMovement")}
      </div>
      <StandardTable
        columns={columns}
        data={ledgerGroups}
        getRowKey={(row) => row.id}
        loading={loading}
        emptyLabel={t("owner.bookkeeping.noLedgerMovement")}
        minWidthClassName="min-w-[1080px]"
      />
    </StandardPanel>
  );
}
