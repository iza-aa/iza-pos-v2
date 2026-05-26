"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  ReceiptPercentIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  DateRangeFilter,
  getDefaultDateRange,
  SidebarTabset,
  type DateRangeValue,
} from "@/app/components/shared";
import { getCurrentUser } from "@/lib/utils";
import type {
  BookkeepingDashboardData,
  BookkeepingException,
  ShiftClosingRow,
  BookkeepingTab,
  ClosingSection,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import OverviewTab from "./tabs/OverviewTab";
import ClosingsTab from "./tabs/ClosingsTab";
import AutoLedgerTab from "./tabs/AutoLedgerTab";
import CostMarginTab from "./tabs/CostMarginTab";
import ExpensesTab from "./tabs/ExpensesTab";
import ExceptionsTab from "./tabs/ExceptionsTab";
import ReportsTab from "./tabs/ReportsTab";
import SettingsTab from "./tabs/SettingsTab";

const tabs = [
  {
    id: "overview" as const,
    label: "Overview",
    description: "Financial result",
    icon: Squares2X2Icon,
  },
  {
    id: "closings" as const,
    label: "Closings",
    description: "Shift & daily",
    icon: ClipboardDocumentCheckIcon,
    children: [
      { id: "shift" as const, label: "Shift Closing", icon: BanknotesIcon },
      { id: "daily" as const, label: "Daily Closing", icon: DocumentChartBarIcon },
    ],
  },
  {
    id: "ledger" as const,
    label: "Auto Ledger",
    description: "Financial movement",
    icon: ArchiveBoxIcon,
  },
  {
    id: "cost-margin" as const,
    label: "Cost & Margin",
    description: "COGS health",
    icon: ChartPieIcon,
  },
  {
    id: "expenses" as const,
    label: "Expenses",
    description: "Operating cost",
    icon: ReceiptPercentIcon,
  },
  {
    id: "exceptions" as const,
    label: "Exceptions",
    description: "Review queue",
    icon: ExclamationTriangleIcon,
  },
  {
    id: "reports" as const,
    label: "Reports",
    description: "Exports & history",
    icon: DocumentChartBarIcon,
  },
  {
    id: "settings" as const,
    label: "Settings",
    description: "Tax & charge",
    icon: Cog6ToothIcon,
  },
];

const isBookkeepingTab = (value: string | null): value is BookkeepingTab => {
  return tabs.some((tab) => tab.id === value);
};

const isClosingSection = (value: string | null): value is ClosingSection => {
  return value === "shift" || value === "daily";
};

type GenerateResult = {
  success?: boolean;
  error?: string;
  entries?: { total: number; created: number; updated: number };
  exceptions?: { total: number; created: number; updated: number };
  shiftClosings?: { total: number; created: number; updated: number; skipped: number };
  reports?: { created: number };
};

export default function OwnerBookkeeping() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [data, setData] = useState<BookkeepingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingLedger, setGeneratingLedger] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [generatingShiftClosing, setGeneratingShiftClosing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState("");
  const [updatingExceptionId, setUpdatingExceptionId] = useState("");
  const [savingShiftCashId, setSavingShiftCashId] = useState("");
  const [reviewingShiftId, setReviewingShiftId] = useState("");
  const [closingDaily, setClosingDaily] = useState(false);
  const [reopeningDaily, setReopeningDaily] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeTab = useMemo<BookkeepingTab>(() => {
    const tab = searchParams.get("tab");
    return isBookkeepingTab(tab) ? tab : "overview";
  }, [searchParams]);

  const activeClosingSection = useMemo<ClosingSection>(() => {
    const section = searchParams.get("section");
    return isClosingSection(section) ? section : "shift";
  }, [searchParams]);

  const loadData = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== "owner") {
        throw new Error("Owner access required.");
      }

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await fetch(`/api/owner/bookkeeping/overview?${params.toString()}`, {
        headers: {
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
      });

      const result = (await response.json().catch(() => ({}))) as {
        data?: BookkeepingDashboardData;
        error?: string;
      };

      if (!response.ok || !result.data) {
        throw new Error(result.error || "Bookkeeping data could not be loaded.");
      }

      setData(result.data);
    } catch (loadError) {
      console.error("Failed to load bookkeeping data:", loadError);
      setData(null);
      setError("Bookkeeping data could not be loaded. Available widgets will render again after the data source is available.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && !isBookkeepingTab(tab)) {
      router.replace("/owner/bookkeeping?tab=overview");
    }
  }, [router, searchParams]);

  useEffect(() => {
    setError("");
    setNotice("");
  }, [activeTab, activeClosingSection]);

  useEffect(() => {
    setNotice("");
    void loadData();
  }, [loadData]);

  const postGenerateRequest = async (url: string): Promise<GenerateResult> => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      throw new Error("Owner access required.");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
        "x-user-name": currentUser.name,
        "x-user-role": currentUser.role,
      },
      body: JSON.stringify({ dateRange }),
    });

    const result = (await response.json().catch(() => ({}))) as GenerateResult;
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Bookkeeping action could not be completed.");
    }

    return result;
  };

  const handleGenerateLedger = async () => {
    setGeneratingLedger(true);
    setError("");
    setNotice("");

    try {
      const result = await postGenerateRequest("/api/owner/bookkeeping/ledger/generate");
      setNotice(
        `Ledger generated: ${result.entries?.created ?? 0} created, ${result.entries?.updated ?? 0} updated, ${result.exceptions?.total ?? 0} exception(s) reviewed.`,
      );
      await loadData({ quiet: true });
    } catch (generateError) {
      console.error("Failed to generate bookkeeping ledger:", generateError);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Bookkeeping ledger could not be generated.",
      );
    } finally {
      setGeneratingLedger(false);
    }
  };

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
      setError("Owner access required.");
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
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Manual adjustment could not be created.");
      }

      setNotice("Manual adjustment saved.");
      await loadData({ quiet: true });
    } catch (adjustmentError) {
      console.error("Failed to create manual adjustment:", adjustmentError);
      setError(
        adjustmentError instanceof Error
          ? adjustmentError.message
          : "Manual adjustment could not be created.",
      );
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleGenerateShiftClosing = async () => {
    setGeneratingShiftClosing(true);
    setError("");
    setNotice("");

    try {
      const result = await postGenerateRequest("/api/owner/bookkeeping/closings/shift/generate");
      const shiftClosings = result.shiftClosings;
      const total = shiftClosings?.total ?? 0;

      setNotice(
        total === 0
          ? "No shift closing was generated. Check whether the selected period has valid orders that match active shift hours."
          : `Shift closing generated: ${shiftClosings?.created ?? 0} created, ${shiftClosings?.updated ?? 0} updated, ${shiftClosings?.skipped ?? 0} protected.`,
      );
      await loadData({ quiet: true });
    } catch (generateError) {
      console.error("Failed to generate shift closing:", generateError);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Shift closing draft could not be generated.",
      );
    } finally {
      setGeneratingShiftClosing(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setError("");
    setNotice("");

    try {
      const result = await postGenerateRequest("/api/owner/bookkeeping/reports/generate");
      setNotice(`Report generated: ${result.reports?.created ?? 0} snapshot created.`);
      await loadData({ quiet: true });
    } catch (generateError) {
      console.error("Failed to generate bookkeeping report:", generateError);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Bookkeeping report could not be generated.",
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCreateExpense = async (form: {
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
      setError("Owner access required.");
      return;
    }

    setSavingExpense(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/expenses/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Bookkeeping expense could not be created.");
      }

      setNotice("Expense saved.");
      await loadData({ quiet: true });
    } catch (createError) {
      console.error("Failed to create expense:", createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Bookkeeping expense could not be created.",
      );
    } finally {
      setSavingExpense(false);
    }
  };

  const handleUpdateException = async (
    exception: BookkeepingException,
    status: "acknowledged" | "resolved",
  ) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
      return;
    }

    setUpdatingExceptionId(exception.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/exceptions/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          id: exception.id,
          status,
          exception: {
            businessDate: exception.businessDate,
            severity: exception.severity,
            type: exception.type,
            description: exception.description,
            source: exception.source,
            suggestedFix: exception.suggestedFix,
          },
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Bookkeeping exception could not be updated.");
      }

      setNotice(`Exception marked as ${status}.`);
      await loadData({ quiet: true });
    } catch (updateError) {
      console.error("Failed to update exception:", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Bookkeeping exception could not be updated.",
      );
    } finally {
      setUpdatingExceptionId("");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
      return;
    }

    setDeletingExpenseId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/expenses/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({ id }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Bookkeeping expense could not be deleted.");
      }

      setNotice("Expense deleted.");
      await loadData({ quiet: true });
    } catch (deleteError) {
      console.error("Failed to delete expense:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Bookkeeping expense could not be deleted.",
      );
    } finally {
      setDeletingExpenseId("");
    }
  };

  const handleUpdateExpense = async (form: {
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
      setError("Owner access required.");
      return;
    }

    setSavingExpense(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/expenses/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Bookkeeping expense could not be updated.");
      }

      setNotice("Expense updated.");
      await loadData({ quiet: true });
    } catch (updateError) {
      console.error("Failed to update expense:", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Bookkeeping expense could not be updated.",
      );
    } finally {
      setSavingExpense(false);
    }
  };

  const handleCloseDaily = async (cashCounted: string, notes: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
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
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({ dateRange, cashCounted, notes }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        cashDifference?: number | null;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Daily closing could not be completed.");
      }

      setNotice(`Daily closing saved as ${result.status}.`);
      await loadData({ quiet: true });
    } catch (closeError) {
      console.error("Failed to close daily:", closeError);
      setError(
        closeError instanceof Error
          ? closeError.message
          : "Daily closing could not be completed.",
      );
    } finally {
      setClosingDaily(false);
    }
  };

  const handleSaveShiftCash = async (
    row: ShiftClosingRow,
    cashCounted: string,
    cashDrawer: {
      openingCash: string;
      closingFloat: string;
      floatPolicy: ShiftClosingRow["floatPolicy"];
    },
  ) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
      return;
    }

    setSavingShiftCashId(row.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/closings/shift/cash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          businessDate: row.businessDate,
          shiftId: row.id,
          cashCounted,
          openingCash: cashDrawer.openingCash,
          closingFloat: cashDrawer.closingFloat,
          floatPolicy: cashDrawer.floatPolicy,
          shift: {
            shiftName: row.shiftName,
            openedAt: row.openedAt,
            closedAt: row.closedAt,
            grossSales: row.grossSales,
            discountTotal: row.discountTotal,
            netSales: row.netSales,
            openingCash: row.openingCash,
            cashExpected: row.cashExpected,
            expectedDrawerCash: row.expectedDrawerCash,
            cashToDeposit: row.cashToDeposit,
            closingFloat: row.closingFloat,
            floatPolicy: row.floatPolicy,
            nonCashSales: row.nonCashSales,
            cancelledCount: row.cancelledCount,
            status: row.status,
          },
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Shift cash count could not be saved.");
      }

      setNotice(`Shift cash count saved as ${result.status}.`);
      await loadData({ quiet: true });
    } catch (saveError) {
      console.error("Failed to save shift cash count:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Shift cash count could not be saved.",
      );
    } finally {
      setSavingShiftCashId("");
    }
  };

  const handleReviewShiftClosing = async (
    row: ShiftClosingRow,
    action: "approve" | "reopen",
    note: string,
  ) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
      return;
    }

    setReviewingShiftId(row.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/closings/shift/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          businessDate: row.businessDate,
          shiftId: row.id,
          action,
          note,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Shift closing could not be reviewed.");
      }

      setNotice(`Shift closing saved as ${result.status}.`);
      await loadData({ quiet: true });
    } catch (reviewError) {
      console.error("Failed to review shift closing:", reviewError);
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Shift closing could not be reviewed.",
      );
    } finally {
      setReviewingShiftId("");
    }
  };

  const handleReopenDaily = async (businessDate: string, reason: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
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
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({ businessDate, reason }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Daily closing could not be reopened.");
      }

      setNotice(`Daily closing saved as ${result.status}.`);
      await loadData({ quiet: true });
    } catch (reopenError) {
      console.error("Failed to reopen daily closing:", reopenError);
      setError(
        reopenError instanceof Error
          ? reopenError.message
          : "Daily closing could not be reopened.",
      );
    } finally {
      setReopeningDaily(false);
    }
  };

  const setActiveTab = (tab: BookkeepingTab) => {
    router.push(
      tab === "closings"
        ? `/owner/bookkeeping?tab=closings&section=${activeClosingSection}`
        : `/owner/bookkeeping?tab=${tab}`,
    );
  };

  const setClosingSection = (section: ClosingSection) => {
    router.push(`/owner/bookkeeping?tab=closings&section=${section}`);
  };

  const renderTab = () => {
    if (activeTab === "settings") return <SettingsTab />;
    if (!data) return null;
    if (activeTab === "closings") {
      return (
        <ClosingsTab
          data={data}
          activeSection={activeClosingSection}
          generatingShiftClosing={generatingShiftClosing}
          closingDaily={closingDaily}
          reopeningDaily={reopeningDaily}
          savingShiftCashId={savingShiftCashId}
          reviewingShiftId={reviewingShiftId}
          onGenerateShiftClosing={handleGenerateShiftClosing}
          onCloseDaily={handleCloseDaily}
          onReopenDaily={handleReopenDaily}
          onSaveShiftCash={handleSaveShiftCash}
          onReviewShiftClosing={handleReviewShiftClosing}
        />
      );
    }
    if (activeTab === "ledger") {
      return (
        <AutoLedgerTab
          data={data}
          generating={generatingLedger}
          savingAdjustment={savingAdjustment}
          onGenerate={handleGenerateLedger}
          onCreateAdjustment={handleCreateAdjustment}
        />
      );
    }
    if (activeTab === "cost-margin") return <CostMarginTab data={data} />;
    if (activeTab === "expenses") {
      return (
        <ExpensesTab
          data={data}
          saving={savingExpense}
          deletingId={deletingExpenseId}
          onCreateExpense={handleCreateExpense}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      );
    }
    if (activeTab === "exceptions") {
      return (
        <ExceptionsTab
          data={data}
          updatingId={updatingExceptionId}
          onUpdateException={handleUpdateException}
        />
      );
    }
    if (activeTab === "reports") {
      return (
        <ReportsTab
          data={data}
          generating={generatingReport}
          onGenerate={handleGenerateReport}
        />
      );
    }
    return <OverviewTab data={data} />;
  };

  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-white">
      <div className="flex h-full min-h-0">
        <SidebarTabset
          title="Bookkeeping"
          description="Automatic closing, ledger, margin, and reports."
          items={tabs}
          activeId={activeTab}
          activeChildId={activeClosingSection}
          onSelect={setActiveTab}
          onChildSelect={(_, section) => setClosingSection(section)}
          mobileOpenLabel="Open bookkeeping menu"
          mobileCloseLabel="Close bookkeeping menu"
        />

        <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
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

              {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm font-semibold text-gray-500 shadow-sm">
                  Loading bookkeeping data...
                </div>
              ) : (
                renderTab()
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
