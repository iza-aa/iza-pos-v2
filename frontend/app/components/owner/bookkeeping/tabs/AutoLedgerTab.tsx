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
  savingAdjustment = false,
  onCreateAdjustment,
}: {
  data: BookkeepingDashboardData;
  loading?: boolean;
  savingAdjustment?: boolean;
  onCreateAdjustment?: (form: {
    businessDate: string;
    category: string;
    amount: string;
    direction: "in" | "out" | "neutral";
    paymentMethod: string;
    sourceLabel: string;
    note: string;
  }) => void;
}) {
  const { t } = useLanguage();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    businessDate: data.dateRange.endDate,
    category: "Manual Adjustment",
    amount: "",
    direction: "neutral" as "in" | "out" | "neutral",
    paymentMethod: "",
    sourceLabel: "Owner correction",
    note: "",
  });
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
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAdjustmentOpen(true)}
            disabled={!onCreateAdjustment || savingAdjustment}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("owner.bookkeeping.addAdjustment")}
          </button>
        </div>
      }
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
      <StandardModal
        isOpen={adjustmentOpen}
        title={t("owner.bookkeeping.manualAdjustment")}
        description={t("owner.bookkeeping.manualAdjustmentDescription")}
        maxWidthClassName="max-w-2xl"
        onClose={() => setAdjustmentOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setAdjustmentOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t("owner.bookkeeping.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                onCreateAdjustment?.(adjustmentForm);
                setAdjustmentOpen(false);
              }}
              disabled={
                !onCreateAdjustment ||
                savingAdjustment ||
                !adjustmentForm.businessDate ||
                !adjustmentForm.category.trim() ||
                !adjustmentForm.amount ||
                Number(adjustmentForm.amount) <= 0 ||
                !adjustmentForm.note.trim()
              }
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAdjustment ? t("owner.bookkeeping.saving") : t("owner.bookkeeping.saveAdjustment")}
            </button>
          </>
        }
      >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                {t("owner.bookkeeping.businessDate")}
                <input
                  type="date"
                  value={adjustmentForm.businessDate}
                  onChange={(event) => setAdjustmentForm((current) => ({
                    ...current,
                    businessDate: event.target.value,
                  }))}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                {t("owner.bookkeeping.direction")}
                <select
                  value={adjustmentForm.direction}
                  onChange={(event) => setAdjustmentForm((current) => ({
                    ...current,
                    direction: event.target.value as "in" | "out" | "neutral",
                  }))}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                >
                  <option value="neutral">Neutral - review/correction note</option>
                  <option value="in">In - money/revenue correction</option>
                  <option value="out">Out - cost/cash shortage correction</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">
                {t("owner.bookkeeping.category")}
                <input
                  type="text"
                  value={adjustmentForm.category}
                  onChange={(event) => setAdjustmentForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))}
                  placeholder="Cash Shortage, Refund Correction, etc."
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                {t("owner.bookkeeping.amount")}
                <input
                  type="number"
                  min="0"
                  value={adjustmentForm.amount}
                  onChange={(event) => setAdjustmentForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))}
                  placeholder="0"
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                {t("owner.bookkeeping.paymentMethod")}
                <input
                  type="text"
                  value={adjustmentForm.paymentMethod}
                  onChange={(event) => setAdjustmentForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value,
                  }))}
                  placeholder={t("owner.bookkeeping.optional")}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                {t("owner.bookkeeping.sourceLabel")}
                <input
                  type="text"
                  value={adjustmentForm.sourceLabel}
                  onChange={(event) => setAdjustmentForm((current) => ({
                    ...current,
                    sourceLabel: event.target.value,
                  }))}
                  placeholder="Owner correction"
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 md:col-span-2">
                {t("owner.bookkeeping.auditNote")}
                <textarea
                  value={adjustmentForm.note}
                  onChange={(event) => setAdjustmentForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))}
                  placeholder="Required. Explain why this adjustment is needed."
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
            </div>
      </StandardModal>
    </StandardPanel>
  );
}
