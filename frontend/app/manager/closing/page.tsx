"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/utils";
import {
  StandardModal,
} from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { showError, showSuccess } from "@/lib/services/errorHandling";

type StaffRow = {
  id: string;
  name: string;
  staff_code?: string | null;
  shift_id?: string | null;
};

type ShiftRow = {
  id: string;
  shift_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type AssignmentRow = {
  id: string;
  staff_id: string;
  shift_id: string;
  work_date: string;
  status: string;
};

type WeeklyAssignmentRow = {
  id: string;
  staff_id: string;
  weekday: number;
  shift_id: string;
  status: string;
};

type ClosingRow = {
  id: string;
  shift_id?: string | null;
  shift_name?: string | null;
  opening_cash?: number | string | null;
  cash_expected?: number | string | null;
  expected_drawer_cash?: number | string | null;
  cash_counted?: number | string | null;
  cash_difference?: number | string | null;
  closing_float?: number | string | null;
  status?: string | null;
};

type ExpenseRow = {
  id: string;
  category: string;
  amount: number | string;
  payment_method?: string | null;
  vendor?: string | null;
};

type ShiftStatusRow = {
  shift: ShiftRow;
  scheduledStaff: StaffRow[];
  closing?: ClosingRow;
};

const expenseCategories = [
  { value: "Bahan baku tambahan", labelKey: "manager.closing.expenseCategory.extraRawMaterial" },
  { value: "Packaging", labelKey: "manager.closing.expenseCategory.packaging" },
  { value: "Transport / delivery", labelKey: "manager.closing.expenseCategory.transport" },
  { value: "Peralatan kecil", labelKey: "manager.closing.expenseCategory.smallEquipment" },
  { value: "Kebersihan", labelKey: "manager.closing.expenseCategory.cleaning" },
  { value: "Maintenance", labelKey: "manager.closing.expenseCategory.maintenance" },
  { value: "Lainnya", labelKey: "manager.closing.expenseCategory.other" },
];

type DepositRow = {
  id: string;
  envelope_number: string;
  expected_amount: number;
  submitted_amount: number;
  received_amount: number | null;
  status: string;
  staff?: { name: string } | null;
};

type ManagerBookkeepingData = {
  businessDate: string;
  staff: StaffRow[];
  shifts: ShiftRow[];
  assignments: AssignmentRow[];
  weeklyAssignments: WeeklyAssignmentRow[];
  shiftClosings: ClosingRow[];
  expenses: ExpenseRow[];
  deposits: DepositRow[];
};

const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const getYesterday = () => {
  const todayStr = getToday();
  const [year, month, day] = todayStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const formatCurrency = (value: unknown) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatTime = (value?: string | null) => String(value || "--:--").slice(0, 5);

const getIsoWeekday = (businessDate: string) => {
  const [year, month, day] = businessDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
};

const formatClosingStatus = (
  value: string | null | undefined,
  t: (key: string) => string,
) => {
  if (!value || value === "draft") return t("manager.closing.statusWaitingStaff");
  if (value === "submitted") return t("manager.closing.statusNeedsApproval");
  if (value === "needs_review" || value === "reopened") return t("manager.closing.statusNeedsReview");
  if (value === "closed") return t("manager.closing.statusApproved");

  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getClosingStatusClassName = (value?: string | null) => {
  if (value === "closed") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (value === "submitted") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (value === "needs_review") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (value === "reopened") return OWNER_SEMANTIC_TONES.progress.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const hasCashCount = (closing?: ClosingRow) => (
  closing?.cash_counted !== null && closing?.cash_counted !== undefined
);

const getCashDifference = (closing?: ClosingRow) => {
  const value = Number(closing?.cash_difference ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const renderStatusBadge = (label: string, className: string) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>
    {label}
  </span>
);

export default function ManagerClosingPage() {
  const { t } = useLanguage();
  const [businessDate, setBusinessDate] = useState<string>(getToday());
  const [data, setData] = useState<ManagerBookkeepingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openingCashModalOpen, setOpeningCashModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [verifyDepositModalOpen, setVerifyDepositModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRow | null>(null);
  const [verifyForm, setVerifyForm] = useState({ receivedAmount: "", status: "verified", managerNotes: "" });
  const [cashForm, setCashForm] = useState({ shiftId: "", openingCash: "", closingFloat: "", note: "" });
  const [expenseForm, setExpenseForm] = useState({ category: expenseCategories[0].value, amount: "", paymentMethod: "Cash", vendor: "", receiptUrl: "", note: "" });
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [recheckModalOpen, setRecheckModalOpen] = useState(false);
  const [recheckShiftId, setRecheckShiftId] = useState("");
  const [recheckNote, setRecheckNote] = useState("");

  const handleUploadReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/owner/bookkeeping/expenses/receipt", {
        method: "POST",
        headers: {
          "x-user-id": currentUser?.id || "",
          "x-user-name": currentUser?.name || "",
          "x-user-role": currentUser?.role || "",
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to upload receipt");
      }

      setExpenseForm((current) => ({ ...current, receiptUrl: result.receiptUrl }));
    } catch (error) {
      console.error("Receipt upload failed:", error);
      alert(error instanceof Error ? error.message : "Failed to upload receipt");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const currentUser = useMemo(() => getCurrentUser(), []);

  const loadData = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const user = getCurrentUser();
      if (!user || (user.role !== "manager" && user.role !== "owner")) throw new Error(t("manager.closing.managerAccessRequired"));

      const response = await fetch(`/api/manager/closing/operations?businessDate=${businessDate}`, {
        headers: {
          "x-user-id": user.id,
          "x-user-name": user.name,
          "x-user-role": user.role,
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        data?: ManagerBookkeepingData;
        error?: string;
      };

      if (!response.ok || !result.data) throw new Error(result.error || t("manager.closing.loadFailed"));

      setData(result.data);
      setCashForm((current) => ({
        ...current,
        shiftId: current.shiftId || result.data?.shifts[0]?.id || "",
      }));
    } catch (loadError) {
      console.error("Failed to load manager bookkeeping:", loadError);
      setData(null);
      setError(loadError instanceof Error ? loadError.message : t("manager.closing.loadFailed"));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [businessDate, t]);

  useEffect(() => {
    void loadData();
  }, [loadData, t]);

  const postAction = useCallback(async (body: Record<string, unknown>, successMessage: string) => {
    const user = getCurrentUser();
    if (!user || (user.role !== "manager" && user.role !== "owner")) {
      setError(t("manager.closing.managerAccessRequired"));
      return false;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/manager/closing/operations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-name": user.name,
          "x-user-role": user.role,
        },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        showError(result.error || t("manager.closing.actionSaveFailed"));
        return false;
      }
      showSuccess(successMessage);
      await loadData({ quiet: true });
      return true;
    } catch (saveError) {
      console.error("Failed to save manager bookkeeping action:", saveError);
      showError(saveError instanceof Error ? saveError.message : t("manager.closing.actionSaveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadData, t]);

  const assignmentsByStaff = new Map(
    (data?.assignments || [])
      .filter((row) => row.status !== "cancelled")
      .map((row) => [row.staff_id, row]),
  );
  const weeklyAssignmentsByStaff = new Map(
    (data?.weeklyAssignments || [])
      .filter((row) => row.status !== "cancelled" && row.weekday === getIsoWeekday(businessDate))
      .map((row) => [row.staff_id, row]),
  );
  const closingsByShift = new Map((data?.shiftClosings || []).map((row) => [String(row.shift_id || "").replace(`-${businessDate}`, ""), row]));
  const selectedOpeningShift =
    data?.shifts.find((shift) => shift.id === cashForm.shiftId) ?? data?.shifts[0] ?? null;
  const selectedOpeningClosing = selectedOpeningShift
    ? closingsByShift.get(selectedOpeningShift.id)
    : undefined;
  const getScheduledStaffForShift = (shiftId: string) => {
    return (data?.staff || []).filter((staff) => {
      const datedAssignment = assignmentsByStaff.get(staff.id);
      const weeklyAssignment = weeklyAssignmentsByStaff.get(staff.id);

      if (datedAssignment) return datedAssignment.shift_id === shiftId;
      if (weeklyAssignment) return weeklyAssignment.shift_id === shiftId;
      return false;
    });
  };
  const shiftStatusRows: ShiftStatusRow[] = data
    ? data.shifts.map((shift) => ({
        shift,
        scheduledStaff: getScheduledStaffForShift(shift.id),
        closing: closingsByShift.get(shift.id),
      }))
    : [];
  const shiftStatusColumns = useMemo<Array<StandardTableColumn<ShiftStatusRow>>>(
    () => [
      {
        key: "shift",
        header: t("manager.closing.shift"),
        headerClassName: "w-[9%]",
        render: (row) => (
          <div>
            <p className="font-bold text-gray-950">
              {row.shift.shift_name || t("manager.closing.shift")}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {formatTime(row.shift.start_time)} - {formatTime(row.shift.end_time)}
            </p>
          </div>
        ),
        sortValue: (row) => row.shift.shift_name || t("manager.closing.shift"),
      },
      {
        key: "closingPic",
        header: t("manager.closing.closingPic"),
        headerClassName: "w-[12%]",
        render: (row) =>
          row.scheduledStaff.length > 0
            ? row.scheduledStaff.map((staff) => staff.name).join(", ")
            : t("manager.closing.noStaffScheduled"),
        sortValue: (row) =>
          row.scheduledStaff.map((staff) => staff.name).join(", "),
      },
      {
        key: "opening",
        header: t("manager.closing.opening"),
        headerClassName: "w-[9%]",
        render: (row) =>
          row.closing ? formatCurrency(row.closing.opening_cash) : "-",
        sortValue: (row) => Number(row.closing?.opening_cash ?? 0),
      },
      {
        key: "cashSales",
        header: t("manager.closing.cashSales"),
        headerClassName: "w-[9%]",
        render: (row) =>
          row.closing ? formatCurrency(row.closing.cash_expected) : "-",
        sortValue: (row) => Number(row.closing?.cash_expected ?? 0),
      },
      {
        key: "expected",
        header: t("manager.closing.expected"),
        headerClassName: "w-[10%]",
        render: (row) => (
          <span className="font-bold text-gray-950">
            {row.closing ? formatCurrency(row.closing.expected_drawer_cash) : "-"}
          </span>
        ),
        sortValue: (row) => Number(row.closing?.expected_drawer_cash ?? 0),
      },
      {
        key: "counted",
        header: t("manager.closing.counted"),
        headerClassName: "w-[10%]",
        render: (row) =>
          row.closing?.cash_counted === null ||
          row.closing?.cash_counted === undefined
            ? t("manager.closing.waitingStaff")
            : formatCurrency(row.closing.cash_counted),
        sortValue: (row) => Number(row.closing?.cash_counted ?? 0),
      },
      {
        key: "difference",
        header: t("manager.closing.difference"),
        headerClassName: "w-[10%]",
        render: (row) => (
          <span className="font-bold text-gray-950">
            {row.closing?.cash_difference === null ||
            row.closing?.cash_difference === undefined
              ? "-"
              : formatCurrency(row.closing.cash_difference)}
          </span>
        ),
        sortValue: (row) => Number(row.closing?.cash_difference ?? 0),
      },
      {
        key: "status",
        header: t("manager.closing.status"),
        headerClassName: "w-[15%]",
        render: (row) =>
          renderStatusBadge(
            formatClosingStatus(row.closing?.status, t),
            getClosingStatusClassName(row.closing?.status),
        ),
        sortValue: (row) => row.closing?.status || "draft",
      },
      {
        key: "actions",
        header: t("manager.closing.actions"),
        isAction: true,
        headerClassName: "w-[13%]",
        render: (row) => {
          if (!row.closing || !hasCashCount(row.closing)) {
            return <span className="text-xs font-semibold text-gray-400">{t("manager.closing.waitingStaff")}</span>;
          }

          if (row.closing.status === "closed") {
            return <span className="text-xs font-semibold text-[#008A3D]">{t("manager.closing.approved")}</span>;
          }

          const canApprove = getCashDifference(row.closing) === 0;

          return (
            <div className="flex flex-wrap gap-2">
              {canApprove ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    postAction(
                      {
                        action: "review_shift_closing",
                        businessDate,
                        shiftId: row.shift.id,
                        reviewAction: "approve",
                      },
                    t("manager.closing.shiftApproved"),
                    )
                  }
                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("manager.closing.approve")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setRecheckShiftId(row.shift.id);
                  setRecheckNote("");
                  setRecheckModalOpen(true);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("manager.closing.recheck")}
              </button>
            </div>
          );
        },
      },
    ],
    [businessDate, postAction, saving, t],
  );
  const openOpeningCashModal = () => {
    setCashForm((current) => ({
      ...current,
      shiftId: selectedOpeningShift?.id || current.shiftId || data?.shifts[0]?.id || "",
      openingCash:
        selectedOpeningClosing?.opening_cash === null ||
        selectedOpeningClosing?.opening_cash === undefined
          ? current.openingCash
          : String(selectedOpeningClosing.opening_cash),
      closingFloat:
        selectedOpeningClosing?.closing_float === null ||
        selectedOpeningClosing?.closing_float === undefined
          ? current.closingFloat
          : String(selectedOpeningClosing.closing_float),
    }));
    setOpeningCashModalOpen(true);
  };
  const setOpeningCashModalShift = (shiftId: string) => {
    const closing = closingsByShift.get(shiftId);

    setCashForm((current) => ({
      ...current,
      shiftId,
      openingCash:
        closing?.opening_cash === null || closing?.opening_cash === undefined
          ? ""
          : String(closing.opening_cash),
      closingFloat:
        closing?.closing_float === null || closing?.closing_float === undefined
          ? ""
          : String(closing.closing_float),
      note: "",
    }));
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-gray-50">

      <section className="mx-auto space-y-4 px-4 py-4 md:px-6">
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
                  { id: "today", label: t("owner.bookkeeping.today"), value: getToday() },
                  { id: "yesterday", label: t("owner.bookkeeping.yesterday"), value: getYesterday() },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setBusinessDate(preset.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      businessDate === preset.value
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
                value={businessDate}
                onChange={(event) => setBusinessDate(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
                aria-label={t("owner.bookkeeping.businessDate")}
              />
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
        {currentUser && currentUser.role !== "manager" && currentUser.role !== "owner" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {t("manager.closing.managerAccessRequired")}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm font-semibold text-gray-500 shadow-sm">{t("manager.closing.loading")}</div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1fr)_3fr]">
            <div className="grid gap-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-950">{t("manager.closing.openingCash")}</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      {t("manager.closing.openingCashDescription")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openOpeningCashModal}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900"
                  >
                    {t("manager.closing.edit")}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <select
                    value={cashForm.shiftId}
                    onChange={(event) => setCashForm((current) => ({ ...current, shiftId: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900"
                  >
                    {data.shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>{shift.shift_name || t("manager.closing.shift")}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
                      <p className="text-xs font-bold text-gray-500">{t("manager.closing.openingCash")}</p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-950">
                        {selectedOpeningClosing
                          ? formatCurrency(selectedOpeningClosing.opening_cash)
                          : t("manager.closing.notSet")}
                      </p>
                    </div>
                    <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
                      <p className="text-xs font-bold text-gray-500">{t("manager.closing.closingFloat")}</p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-950">
                        {selectedOpeningClosing
                          ? formatCurrency(selectedOpeningClosing.closing_float)
                          : t("manager.closing.notSet")}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-left">
                <div>
                  <h2 className="text-base font-bold text-gray-950">{t("manager.closing.depositTitle")}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {t("manager.closing.depositDescription")}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {!data.deposits || data.deposits.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">{t("manager.closing.noDeposits")}</p>
                  ) : (
                    data.deposits.map((deposit) => {
                      const isPending = deposit.status === "submitted";
                      return (
                        <div key={deposit.id} className="rounded-xl border border-gray-300 p-3 bg-gray-50/50 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-gray-950">{t("manager.closing.envelopeNumber")} {deposit.envelope_number}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{t("manager.closing.cashier")}: {deposit.staff?.name}</p>
                            </div>
                          </div>

                          <div className="text-[11px] font-semibold text-gray-600 space-y-0.5">
                            <div className="flex justify-between">
                              <span>{t("manager.closing.expectedAmount")}:</span>
                              <span className="text-gray-900">{formatCurrency(deposit.expected_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t("manager.closing.submittedAmount")}:</span>
                              <span className="text-gray-900">{formatCurrency(deposit.submitted_amount)}</span>
                            </div>
                            {deposit.status !== "submitted" && (
                              <div className="flex justify-between border-t border-gray-100 pt-1 mt-1 font-bold">
                                <span>{t("manager.closing.receivedAmount")}:</span>
                                <span className="text-blue-700 font-extrabold">{formatCurrency(deposit.received_amount)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-4">
                            <span className="text-[11px] font-semibold text-gray-500">Status:</span>
                            {renderStatusBadge(
                              deposit.status === "submitted"
                                ? t("manager.closing.statusNeedsApproval")
                                : deposit.status === "verified"
                                ? t("manager.closing.statusApproved")
                                : t("manager.closing.statusNeedsReview"),
                              deposit.status === "submitted"
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : deposit.status === "verified"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-rose-50 border-rose-200 text-rose-800"
                            )}
                          </div>

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDeposit(deposit);
                                setVerifyForm({
                                  receivedAmount: String(deposit.submitted_amount),
                                  status: "verified",
                                  managerNotes: "",
                                });
                                setVerifyDepositModalOpen(true);
                              }}
                              className="w-full flex h-8 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white transition hover:bg-gray-800 mt-4"
                            >
                              {t("manager.closing.verifyEnvelope")}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-950">{t("manager.closing.shiftStatusTitle")}</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    {t("manager.closing.shiftStatusDescription")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(true)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 shrink-0"
                >
                  {t("manager.closing.addExpense")}
                </button>
              </div>
              <div className={`mt-4 rounded-lg border p-3 text-sm leading-6 ${OWNER_SEMANTIC_TONES.info.badgeClass}`}>
                {t("manager.closing.shiftStatusNote")}
              </div>
              <div className="mt-4">
                <StandardTable
                  columns={shiftStatusColumns}
                  data={shiftStatusRows}
                  getRowKey={(row) => row.shift.id}
                  emptyLabel={t("manager.closing.noShiftRows")}
                  loading={loading}
                  minWidthClassName="min-w-[980px]"
                />
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <StandardModal
        isOpen={openingCashModalOpen}
        title={t("manager.closing.editOpeningCash")}
        description={t("manager.closing.editOpeningCashDescription")}
        maxWidthClassName="max-w-xl"
        onClose={() => setOpeningCashModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpeningCashModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={saving || !cashForm.shiftId || cashForm.openingCash === ""}
              onClick={async () => {
                const saved = await postAction(
                  {
                    action: "set_opening_cash",
                    businessDate,
                    shiftId: cashForm.shiftId,
                    openingCash: cashForm.openingCash,
                    closingFloat: cashForm.closingFloat || "0",
                    note: cashForm.note,
                  },
                  t("manager.closing.openingCashSaved"),
                );

                if (saved) setOpeningCashModalOpen(false);
              }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("manager.closing.saveOpeningCash")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            {t("manager.closing.shift")}
            <select
              value={cashForm.shiftId}
              onChange={(event) => setOpeningCashModalShift(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              {data?.shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.shift_name || t("manager.closing.shift")}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              {t("manager.closing.openingCash")}
              <input
                type="number"
                min="0"
                value={cashForm.openingCash}
                onChange={(event) =>
                  setCashForm((current) => ({
                    ...current,
                    openingCash: event.target.value,
                  }))
                }
                placeholder={t("manager.closing.openingCashPlaceholder")}
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              {t("manager.closing.closingFloatToKeep")}
              <input
                type="number"
                min="0"
                value={cashForm.closingFloat}
                onChange={(event) =>
                  setCashForm((current) => ({
                    ...current,
                    closingFloat: event.target.value,
                  }))
                }
                placeholder={t("manager.closing.closingFloatPlaceholder")}
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-gray-700">
            {t("manager.closing.note")}
            <textarea
              value={cashForm.note}
              onChange={(event) =>
                setCashForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              rows={3}
              placeholder={t("manager.closing.openingCashNotePlaceholder")}
              className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        </div>
      </StandardModal>

      <StandardModal
        isOpen={expenseModalOpen}
        title={t("manager.closing.managerExpense")}
        description={t("manager.closing.managerExpenseDescription")}
        maxWidthClassName="max-w-xl"
        onClose={() => setExpenseModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setExpenseModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={saving || uploadingReceipt || !expenseForm.category || !expenseForm.amount || !expenseForm.receiptUrl.trim()}
              onClick={async () => {
                const saved = await postAction(
                  {
                    action: "create_expense",
                    expenseDate: businessDate,
                    ...expenseForm,
                  },
                  t("manager.closing.expenseSaved"),
                );

                if (saved) {
                  setExpenseForm({ category: expenseCategories[0].value, amount: "", paymentMethod: "Cash", vendor: "", receiptUrl: "", note: "" });
                  setExpenseModalOpen(false);
                }
              }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("manager.closing.saveExpense")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            {t("manager.menu.modal.category")}
            <select
              value={expenseForm.category}
              onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              {expenseCategories.map((category) => (
                <option key={category.value} value={category.value}>{t(category.labelKey)}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              {t("manager.closing.amountPaid")}
              <input
                type="number"
                min="0"
                value={expenseForm.amount}
                onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder={t("manager.closing.amountPaid")}
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              {t("manager.closing.vendorPlaceholder")}
              <input
                value={expenseForm.vendor}
                onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))}
                placeholder={t("manager.closing.vendorPlaceholder")}
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-gray-700">
            Receipt Picture <span className="text-red-500">*</span>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUploadReceipt}
                disabled={uploadingReceipt}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold outline-none transition focus:border-gray-900"
              />
              {uploadingReceipt && <span className="text-sm font-medium text-blue-600">Uploading...</span>}
              {expenseForm.receiptUrl && !uploadingReceipt && (
                <a href={expenseForm.receiptUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                  View Uploaded Receipt
                </a>
              )}
            </div>
          </label>

          <label className="block text-sm font-semibold text-gray-700">
            {t("manager.closing.note")}
            <textarea
              value={expenseForm.note}
              onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))}
              rows={3}
              placeholder={t("manager.closing.expenseExamples")}
              className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        </div>
      </StandardModal>

      <StandardModal
        isOpen={verifyDepositModalOpen}
        title={t("manager.closing.verifyModalTitle")}
        description={t("manager.closing.verifyModalDesc")}
        maxWidthClassName="max-w-md"
        onClose={() => setVerifyDepositModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setVerifyDepositModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={saving || !verifyForm.receivedAmount}
              onClick={async () => {
                const isDisputed = Number(verifyForm.receivedAmount) !== Number(selectedDeposit?.submitted_amount);
                const finalStatus = isDisputed ? "disputed" : "verified";
                const saved = await postAction(
                  {
                    action: "verify_cash_deposit",
                    depositId: selectedDeposit?.id,
                    receivedAmount: verifyForm.receivedAmount,
                    status: finalStatus,
                    managerNotes: verifyForm.managerNotes || (isDisputed ? "Mismatch flagged by manager" : "Verified match by manager"),
                  },
                  t("manager.closing.depositVerified"),
                );

                if (saved) setVerifyDepositModalOpen(false);
              }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("manager.closing.saveVerification")}
            </button>
          </>
        }
      >
        {selectedDeposit && (
          <div className="space-y-4 text-left">
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 text-xs font-semibold text-gray-700 space-y-1.5">
              <div className="flex justify-between">
                <span>{t("manager.closing.envelopeNumber")}:</span>
                <span className="text-gray-900 font-bold">{selectedDeposit.envelope_number}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("manager.closing.cashier")}:</span>
                <span className="text-gray-900 font-bold">{selectedDeposit.staff?.name}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
                <span>{t("manager.closing.expectedAmount")}:</span>
                <span className="text-gray-900">{formatCurrency(selectedDeposit.expected_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("manager.closing.submittedAmount")}:</span>
                <span className="text-gray-900">{formatCurrency(selectedDeposit.submitted_amount)}</span>
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              {t("manager.closing.receivedAmount")} (IDR)
              <input
                type="number"
                min="0"
                value={verifyForm.receivedAmount}
                onChange={(event) =>
                  setVerifyForm((current) => ({
                    ...current,
                    receivedAmount: event.target.value,
                  }))
                }
                placeholder="Enter physical cash counted"
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              {t("manager.closing.managerNotes")}
              <textarea
                value={verifyForm.managerNotes}
                onChange={(event) =>
                  setVerifyForm((current) => ({
                    ...current,
                    managerNotes: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Add verification notes (required if amount mismatches)"
                className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
          </div>
        )}
      </StandardModal>

      <StandardModal
        isOpen={recheckModalOpen}
        title={t("manager.closing.recheckModalTitle")}
        description={t("manager.closing.recheckModalDesc")}
        maxWidthClassName="max-w-md"
        onClose={() => setRecheckModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRecheckModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const noteToSubmit = recheckNote.trim() || t("manager.closing.recheckNote");
                const saved = await postAction(
                  {
                    action: "review_shift_closing",
                    businessDate,
                    shiftId: recheckShiftId,
                    reviewAction: "recheck",
                    note: noteToSubmit,
                  },
                  t("manager.closing.recheckSaved"),
                );

                if (saved) setRecheckModalOpen(false);
              }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("manager.closing.submitRecheck")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            {t("manager.closing.note")}
            <textarea
              value={recheckNote}
              onChange={(event) => setRecheckNote(event.target.value)}
              rows={3}
              placeholder={t("manager.closing.recheckNote")}
              className="mt-2 w-full resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        </div>
      </StandardModal>
    </main>
  );
}
