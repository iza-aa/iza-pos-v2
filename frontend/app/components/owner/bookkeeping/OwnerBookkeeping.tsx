"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  DateRangeFilter,
  getDefaultDateRange,
  getTodayDateRange,
  SidebarTabset,
  type DateRangeValue,
} from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
import { getJakartaTodayDate, toUtcDateOnly } from "@/lib/services/bookkeeping/bookkeepingDate";
import { getCurrentUser } from "@/lib/utils";
import type {
  BookkeepingDashboardData,
  BookkeepingExpense,
  BookkeepingTab,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import ClosingsTab from "./tabs/ClosingsTab";
import AutoLedgerTab from "./tabs/AutoLedgerTab";
import CostMarginTab from "./tabs/CostMarginTab";
import ExpensesTab from "./tabs/ExpensesTab";
import ExceptionsTab from "./tabs/ExceptionsTab";

const tabs = [
  {
    id: "closings" as const,
    labelKey: "owner.bookkeeping.closings",
    descriptionKey: "owner.bookkeeping.closingsDescription",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    id: "ledger" as const,
    labelKey: "owner.bookkeeping.ledger",
    descriptionKey: "owner.bookkeeping.ledgerDescription",
    icon: ArchiveBoxIcon,
  },
  {
    id: "cost-margin" as const,
    labelKey: "owner.bookkeeping.costMargin",
    descriptionKey: "owner.bookkeeping.costMarginDescription",
    icon: ChartPieIcon,
  },
  {
    id: "expenses" as const,
    labelKey: "owner.bookkeeping.expenses",
    descriptionKey: "owner.bookkeeping.expensesDescription",
    icon: BanknotesIcon,
  },
  {
    id: "exceptions" as const,
    labelKey: "owner.bookkeeping.exceptions",
    descriptionKey: "owner.bookkeeping.exceptionsDescription",
    icon: ExclamationTriangleIcon,
  },
];

const isBookkeepingTab = (value: string | null): value is BookkeepingTab => {
  return tabs.some((tab) => tab.id === value);
};

const getYesterdayDateRange = (): DateRangeValue => {
  const date = toUtcDateOnly(getJakartaTodayDate());
  date.setUTCDate(date.getUTCDate() - 1);
  const yesterday = date.toISOString().slice(0, 10);
  return { startDate: yesterday, endDate: yesterday };
};

function BusinessDateFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const todayRange = getTodayDateRange();
  const yesterdayRange = getYesterdayDateRange();
  const setBusinessDate = (nextDate: string) => onChange(nextDate);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950">{t("owner.bookkeeping.businessDate")}</p>
          <p className="mt-1 text-sm text-gray-500">
            {t("owner.bookkeeping.businessDateDescription")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "today", label: t("owner.bookkeeping.today"), value: todayRange.endDate },
              { id: "yesterday", label: t("owner.bookkeeping.yesterday"), value: yesterdayRange.endDate },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setBusinessDate(preset.value)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  value === preset.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={value}
            onChange={(event) => setBusinessDate(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
            aria-label={t("owner.bookkeeping.businessDate")}
          />
        </div>
      </div>
    </section>
  );
}

const createEmptyBookkeepingData = (dateRange: DateRangeValue): BookkeepingDashboardData => ({
  dateRange,
  summary: {
    grossSales: 0,
    discounts: 0,
    netSales: 0,
    taxCollected: 0,
    estimatedCogs: null,
    grossProfit: null,
    operatingExpenses: 0,
    netProfitEstimate: null,
    openingCashTotal: 0,
    cashExpected: 0,
    expectedDrawerCash: 0,
    cashToDeposit: 0,
    closingFloatTotal: 0,
    cashDifference: null,
    totalOrders: 0,
    cancelledOrders: 0,
    unresolvedExceptions: 0,
  },
  paymentBreakdown: [],
  entries: [],
  expenses: [],
  exceptions: [],
  reports: [],
  menuMargins: [],
  shiftClosings: [],
  dailyClosing: null,
});

export default function OwnerBookkeeping() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [data, setData] = useState<BookkeepingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState("");
  const [closingDaily, setClosingDaily] = useState(false);
  const [reopeningDaily, setReopeningDaily] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeTab = useMemo<BookkeepingTab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "settings") return "expenses";
    if (tab === "reports") return "closings";
    if (tab === "overview") return "closings";
    return isBookkeepingTab(tab) ? tab : "closings";
  }, [searchParams]);

  const localizedTabs = useMemo(
    () => tabs.map((tab) => ({
      ...tab,
      label: t(tab.labelKey),
      description: t(tab.descriptionKey),
    })),
    [t],
  );

  const setClosingBusinessDate = (businessDate: string) => {
    setDateRange({ startDate: businessDate, endDate: businessDate });
  };

  const loadData = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== "owner") {
        throw new Error(t("owner.bookkeeping.ownerRequired"));
      }

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await fetch(`/api/owner/bookkeeping/overview?${params.toString()}`);

      const result = (await response.json().catch(() => ({}))) as {
        data?: BookkeepingDashboardData;
        error?: string;
      };

      if (!response.ok || !result.data) {
        throw new Error(result.error || t("owner.bookkeeping.loadError"));
      }

      setData(result.data);
    } catch (loadError) {
      console.error("Failed to load bookkeeping data:", loadError);
      setData(null);
      setError(t("owner.bookkeeping.loadError"));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [dateRange, t]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "settings") {
      router.replace("/owner/bookkeeping?tab=expenses");
      return;
    }
    if (tab === "reports") {
      router.replace("/owner/bookkeeping?tab=closings");
      return;
    }
    if (tab === "overview") {
      router.replace("/owner/bookkeeping?tab=closings");
      return;
    }

    if (tab && !isBookkeepingTab(tab)) {
      router.replace("/owner/bookkeeping?tab=closings");
    }
  }, [router, searchParams]);

  useEffect(() => {
    setError("");
    setNotice("");
  }, [activeTab]);

  useEffect(() => {
    setNotice("");
    void loadData();
  }, [loadData]);

  const handleCreateAdjustment = async (form: {
    businessDate: string;
    category: string;
    amount: string;
    direction: "in" | "out" | "neutral";
    paymentMethod: string;
    sourceLabel: string;
    note: string;
  }) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError(t("owner.bookkeeping.ownerRequired"));
      return;
    }

    setSavingAdjustment(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/ledger/adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("owner.bookkeeping.adjustmentCreateError"));
      }

      setNotice(t("owner.bookkeeping.adjustmentSaved"));
      await loadData({ quiet: true });
    } catch (adjustmentError) {
      console.error("Failed to create manual adjustment:", adjustmentError);
      setError(
        adjustmentError instanceof Error
          ? adjustmentError.message
          : t("owner.bookkeeping.adjustmentCreateError"),
      );
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleSaveExpense = async (form: {
    id?: string;
    expenseDate: string;
    category: string;
    amount: string;
    paymentMethod: string;
    vendor: string;
    receiptUrl: string;
    note: string;
  }) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError(t("owner.bookkeeping.ownerRequired"));
      return;
    }

    setSavingExpense(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        form.id
          ? "/api/owner/bookkeeping/expenses/update"
          : "/api/owner/bookkeeping/expenses/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("owner.bookkeeping.expenseSaveError"));
      }

      setNotice(form.id ? t("owner.bookkeeping.expenseUpdated") : t("owner.bookkeeping.expenseSaved"));
      await loadData({ quiet: true });
    } catch (saveError) {
      console.error("Failed to save bookkeeping expense:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("owner.bookkeeping.expenseSaveError"),
      );
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: BookkeepingExpense) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError(t("owner.bookkeeping.ownerRequired"));
      return;
    }

    setDeletingExpenseId(expense.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/expenses/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: expense.id }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("owner.bookkeeping.expenseDeleteError"));
      }

      setNotice(t("owner.bookkeeping.expenseDeleted"));
      await loadData({ quiet: true });
    } catch (deleteError) {
      console.error("Failed to delete bookkeeping expense:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("owner.bookkeeping.expenseDeleteError"),
      );
    } finally {
      setDeletingExpenseId("");
    }
  };

  const handleCloseDaily = async (notes: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError(t("owner.bookkeeping.ownerRequired"));
      return;
    }

    setClosingDaily(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/closings/daily/close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dateRange, notes }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        cashDifference?: number | null;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("owner.bookkeeping.dailyCloseError"));
      }

      setNotice(t("owner.bookkeeping.dailySavedStatus", { status: result.status || "-" }));
      await loadData({ quiet: true });
    } catch (closeError) {
      console.error("Failed to close daily:", closeError);
      setError(
        closeError instanceof Error
          ? closeError.message
          : t("owner.bookkeeping.dailyCloseError"),
      );
    } finally {
      setClosingDaily(false);
    }
  };

  const handleReopenDaily = async (businessDate: string, reason: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError(t("owner.bookkeeping.ownerRequired"));
      return;
    }

    setReopeningDaily(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/closings/daily/reopen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessDate, reason }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("owner.bookkeeping.dailyReopenError"));
      }

      setNotice(t("owner.bookkeeping.dailySavedStatus", { status: result.status || "-" }));
      await loadData({ quiet: true });
    } catch (reopenError) {
      console.error("Failed to reopen daily closing:", reopenError);
      setError(
        reopenError instanceof Error
          ? reopenError.message
          : t("owner.bookkeeping.dailyReopenError"),
      );
    } finally {
      setReopeningDaily(false);
    }
  };

  const setActiveTab = (tab: BookkeepingTab) => {
    router.push(`/owner/bookkeeping?tab=${tab}`);
  };

  const displayData = data ?? createEmptyBookkeepingData(dateRange);

  const renderTab = () => {
    if (activeTab === "closings") {
      return (
        <ClosingsTab
          data={displayData}
          loading={loading}
          closingDaily={closingDaily}
          reopeningDaily={reopeningDaily}
          onApproveDaily={handleCloseDaily}
          onReopenDaily={handleReopenDaily}
        />
      );
    }
    if (activeTab === "ledger") {
      return (
        <AutoLedgerTab
          data={displayData}
          loading={loading}
          savingAdjustment={savingAdjustment}
          onCreateAdjustment={handleCreateAdjustment}
        />
      );
    }
    if (activeTab === "cost-margin") return <CostMarginTab data={displayData} loading={loading} />;
    if (activeTab === "expenses") {
      return (
        <ExpensesTab
          data={displayData}
          loading={loading}
          savingExpense={savingExpense}
          deletingExpenseId={deletingExpenseId}
          onSaveExpense={handleSaveExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      );
    }
    if (activeTab === "exceptions") {
      return (
        <ExceptionsTab
          data={displayData}
          loading={loading}
        />
      );
    }
    return (
      <ClosingsTab
        data={displayData}
        loading={loading}
        closingDaily={closingDaily}
        reopeningDaily={reopeningDaily}
        onApproveDaily={handleCloseDaily}
        onReopenDaily={handleReopenDaily}
      />
    );
  };

  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-white">
      <div className="flex h-full min-h-0">
        <SidebarTabset
          title={t("owner.bookkeeping.title")}
          description={t("owner.bookkeeping.description")}
          items={localizedTabs}
          activeId={activeTab}
          onSelect={setActiveTab}
          mobileOpenLabel={t("owner.bookkeeping.mobileOpen")}
          mobileCloseLabel={t("owner.bookkeeping.mobileClose")}
        />

        <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1">
                {activeTab === "closings" ? (
                  <BusinessDateFilter
                    value={dateRange.endDate}
                    onChange={setClosingBusinessDate}
                  />
                ) : (
                  <DateRangeFilter value={dateRange} onChange={setDateRange} />
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-[#F6C99F] bg-[#FFF1E6] p-4 text-sm font-semibold text-[#B45309]">
                  {error}
                </div>
              ) : null}

              {notice ? (
                <div className="rounded-2xl border border-[#BFE5CC] bg-[#EAF7EF] p-4 text-sm font-semibold text-[#2F7D50]">
                  {notice}
                </div>
              ) : null}

              {renderTab()}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
