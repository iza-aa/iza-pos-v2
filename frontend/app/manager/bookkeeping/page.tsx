"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/utils";
import {
  DateRangeFilter,
  getDefaultDateRange,
  StandardModal,
  type DateRangeValue,
} from "@/app/components/shared";
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
  "Bahan baku tambahan",
  "Packaging",
  "Transport / delivery",
  "Peralatan kecil",
  "Kebersihan",
  "Maintenance",
  "Lainnya",
];

type ManagerBookkeepingData = {
  businessDate: string;
  staff: StaffRow[];
  shifts: ShiftRow[];
  assignments: AssignmentRow[];
  weeklyAssignments: WeeklyAssignmentRow[];
  shiftClosings: ClosingRow[];
  expenses: ExpenseRow[];
};

const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

const formatClosingStatus = (value?: string | null) => {
  if (!value) return "Draft";

  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getClosingStatusClassName = (value?: string | null) => {
  if (value === "closed") return OWNER_SEMANTIC_TONES.dark.badgeClass;
  if (value === "submitted") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (value === "needs_review") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (value === "reopened") return OWNER_SEMANTIC_TONES.progress.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const renderStatusBadge = (label: string, className: string) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
    {label}
  </span>
);

export default function ManagerBookkeepingPage() {
  const [dateRange, setDateRange] =
    useState<DateRangeValue>(getDefaultDateRange);
  const businessDate = dateRange.endDate || getToday();
  const [data, setData] = useState<ManagerBookkeepingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openingCashModalOpen, setOpeningCashModalOpen] = useState(false);
  const [cashForm, setCashForm] = useState({ shiftId: "", openingCash: "", closingFloat: "", note: "" });
  const [expenseForm, setExpenseForm] = useState({ category: expenseCategories[0], amount: "", paymentMethod: "Cash", vendor: "", note: "" });

  const currentUser = useMemo(() => getCurrentUser(), []);

  const loadData = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const user = getCurrentUser();
      if (!user || (user.role !== "manager" && user.role !== "owner")) throw new Error("Manager access required.");

      const response = await fetch(`/api/manager/bookkeeping/operations?businessDate=${businessDate}`, {
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

      if (!response.ok || !result.data) throw new Error(result.error || "Operational closing data could not be loaded.");

      setData(result.data);
      setCashForm((current) => ({
        ...current,
        shiftId: current.shiftId || result.data?.shifts[0]?.id || "",
      }));
    } catch (loadError) {
      console.error("Failed to load manager bookkeeping:", loadError);
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Operational closing data could not be loaded.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const postAction = async (body: Record<string, unknown>, successMessage: string) => {
    const user = getCurrentUser();
    if (!user || (user.role !== "manager" && user.role !== "owner")) {
      setError("Manager access required.");
      return false;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/manager/bookkeeping/operations", {
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
        showError(result.error || "Action could not be saved.");
        return false;
      }
      showSuccess(successMessage);
      await loadData({ quiet: true });
      return true;
    } catch (saveError) {
      console.error("Failed to save manager bookkeeping action:", saveError);
      showError(saveError instanceof Error ? saveError.message : "Action could not be saved.");
      return false;
    } finally {
      setSaving(false);
    }
  };

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

      if (weeklyAssignment) return weeklyAssignment.shift_id === shiftId;
      if (datedAssignment) return datedAssignment.shift_id === shiftId;
      return staff.shift_id === shiftId;
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
        header: "Shift",
        render: (row) => (
          <div>
            <p className="font-bold text-gray-950">
              {row.shift.shift_name || "Shift"}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {formatTime(row.shift.start_time)} - {formatTime(row.shift.end_time)}
            </p>
          </div>
        ),
        sortValue: (row) => row.shift.shift_name || "Shift",
      },
      {
        key: "closingPic",
        header: "Closing Pic",
        render: (row) =>
          row.scheduledStaff.length > 0
            ? row.scheduledStaff.map((staff) => staff.name).join(", ")
            : "No staff scheduled",
        sortValue: (row) =>
          row.scheduledStaff.map((staff) => staff.name).join(", "),
      },
      {
        key: "opening",
        header: "Opening",
        render: (row) =>
          row.closing ? formatCurrency(row.closing.opening_cash) : "-",
        sortValue: (row) => Number(row.closing?.opening_cash ?? 0),
      },
      {
        key: "cashSales",
        header: "Cash Sales",
        render: (row) =>
          row.closing ? formatCurrency(row.closing.cash_expected) : "-",
        sortValue: (row) => Number(row.closing?.cash_expected ?? 0),
      },
      {
        key: "expected",
        header: "Expected",
        render: (row) => (
          <span className="font-bold text-gray-950">
            {row.closing ? formatCurrency(row.closing.expected_drawer_cash) : "-"}
          </span>
        ),
        sortValue: (row) => Number(row.closing?.expected_drawer_cash ?? 0),
      },
      {
        key: "counted",
        header: "Counted",
        render: (row) =>
          row.closing?.cash_counted === null ||
          row.closing?.cash_counted === undefined
            ? "Waiting staff"
            : formatCurrency(row.closing.cash_counted),
        sortValue: (row) => Number(row.closing?.cash_counted ?? 0),
      },
      {
        key: "difference",
        header: "Difference",
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
        header: "Status",
        render: (row) =>
          renderStatusBadge(
            formatClosingStatus(row.closing?.status),
            getClosingStatusClassName(row.closing?.status),
          ),
        sortValue: (row) => row.closing?.status || "draft",
      },
    ],
    [],
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
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h1 className="text-xl font-bold text-gray-950 md:text-xl">Operational Closing</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manager prepares cashier PIC, drawer float, and store expenses before owner reviews closing.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto space-y-4 px-4 py-4 md:px-6">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
        {currentUser && currentUser.role !== "manager" && currentUser.role !== "owner" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Please login as manager to use this page.
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm font-semibold text-gray-500 shadow-sm">Loading operational closing...</div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1fr)_3fr]">
            <div className="grid gap-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-950">Opening Cash</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Daily drawer setting. Edit when todays float is different.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openOpeningCashModal}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900"
                  >
                    Edit
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <select
                    value={cashForm.shiftId}
                    onChange={(event) => setCashForm((current) => ({ ...current, shiftId: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900"
                  >
                    {data.shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>{shift.shift_name || "Shift"}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
                      <p className="text-xs font-bold text-gray-500">Opening Cash</p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-950">
                        {selectedOpeningClosing
                          ? formatCurrency(selectedOpeningClosing.opening_cash)
                          : "Not Set"}
                      </p>
                    </div>
                    <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
                      <p className="text-xs font-bold text-gray-500">Closing Float</p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-950">
                        {selectedOpeningClosing
                          ? formatCurrency(selectedOpeningClosing.closing_float)
                          : "Not Set"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-gray-950">Store Expense</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Record same-day operational spending, not tax or recipe food cost.
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  <select
                    value={expenseForm.category}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900"
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={expenseForm.amount}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="Amount paid"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  <input
                    value={expenseForm.vendor}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))}
                    placeholder="Vendor / receiver"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  <button
                    type="button"
                    disabled={saving || !expenseForm.category || !expenseForm.amount}
                    onClick={() => postAction({ action: "create_expense", expenseDate: businessDate, ...expenseForm }, "Expense saved.")}
                    className="h-11 w-full rounded-lg bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    Save Expense
                  </button>
                  <p className="text-xs leading-5 text-gray-500">
                    Examples: emergency milk purchase, packaging, delivery fee, cleaning supplies, small repairs. Tax collected from customers is not entered here.
                  </p>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-gray-950">Shift Closing Status</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  One row per shift. Staff schedule comes from Staff Manager: daily override first, default shift second.
                </p>
              </div>
              <div className={`mt-4 rounded-lg border p-3 text-sm leading-6 ${OWNER_SEMANTIC_TONES.info.badgeClass}`}>
                Change staff shift from Staff Manager. Closing only reads the schedule, then tracks opening cash and cash count submission.
              </div>
              <div className="mt-4">
                <StandardTable
                  columns={shiftStatusColumns}
                  data={shiftStatusRows}
                  getRowKey={(row) => row.shift.id}
                  emptyLabel="No shift data for this date."
                  minWidthClassName="min-w-[980px]"
                />
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <StandardModal
        isOpen={openingCashModalOpen}
        title="Edit Opening Cash"
        description="Save the drawer float for this operational date and shift."
        maxWidthClassName="max-w-xl"
        onClose={() => setOpeningCashModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpeningCashModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
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
                  "Opening cash saved.",
                );

                if (saved) setOpeningCashModalOpen(false);
              }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Opening Cash"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            Shift
            <select
              value={cashForm.shiftId}
              onChange={(event) => setOpeningCashModalShift(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              {data?.shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.shift_name || "Shift"}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              Opening Cash
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
                placeholder="Opening cash"
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              Closing Float To Keep
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
                placeholder="Closing float"
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-gray-700">
            Note
            <textarea
              value={cashForm.note}
              onChange={(event) =>
                setCashForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              rows={3}
              placeholder="Optional note for today's opening cash difference"
              className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        </div>
      </StandardModal>
    </main>
  );
}
