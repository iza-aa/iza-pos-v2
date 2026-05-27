"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/24/outline";
import { getCurrentUser } from "@/lib/utils";

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
  status?: string | null;
};

type ExpenseRow = {
  id: string;
  category: string;
  amount: number | string;
  payment_method?: string | null;
  vendor?: string | null;
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

export default function ManagerBookkeepingPage() {
  const [businessDate, setBusinessDate] = useState(getToday);
  const [data, setData] = useState<ManagerBookkeepingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
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
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

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
      if (!response.ok || !result.success) throw new Error(result.error || "Action could not be saved.");
      setNotice(successMessage);
      await loadData({ quiet: true });
    } catch (saveError) {
      console.error("Failed to save manager bookkeeping action:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Action could not be saved.");
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
  const getScheduledStaffForShift = (shiftId: string) => {
    return (data?.staff || []).filter((staff) => {
      const datedAssignment = assignmentsByStaff.get(staff.id);
      const weeklyAssignment = weeklyAssignmentsByStaff.get(staff.id);

      if (weeklyAssignment) return weeklyAssignment.shift_id === shiftId;
      if (datedAssignment) return datedAssignment.shift_id === shiftId;
      return staff.shift_id === shiftId;
    });
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 md:text-3xl">Operational Closing</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manager prepares cashier PIC, drawer float, and store expenses before owner reviews closing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={businessDate}
              onChange={(event) => setBusinessDate(event.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
            <button
              type="button"
              onClick={() => void loadData({ quiet: true })}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition hover:border-gray-900 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto space-y-4 px-4 py-4 md:px-6">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{notice}</div> : null}
        {currentUser && currentUser.role !== "manager" && currentUser.role !== "owner" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Please login as manager to use this page.
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm font-semibold text-gray-500 shadow-sm">Loading operational closing...</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <BanknotesIcon className="h-6 w-6 text-gray-500" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-950">Opening Cash</h2>
                    <p className="mt-1 text-sm text-gray-500">Set drawer float before the shift starts. Staff will only count physical cash at end shift.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <select
                    value={cashForm.shiftId}
                    onChange={(event) => setCashForm((current) => ({ ...current, shiftId: event.target.value }))}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                  >
                    {data.shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>{shift.shift_name || "Shift"}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={cashForm.openingCash}
                    onChange={(event) => setCashForm((current) => ({ ...current, openingCash: event.target.value }))}
                    placeholder="Opening cash"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                  />
                  <input
                    type="number"
                    min="0"
                    value={cashForm.closingFloat}
                    onChange={(event) => setCashForm((current) => ({ ...current, closingFloat: event.target.value }))}
                    placeholder="Closing float to keep"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                  />
                  <button
                    type="button"
                    disabled={saving || !cashForm.shiftId || cashForm.openingCash === ""}
                    onClick={() => postAction({ action: "set_opening_cash", businessDate, shiftId: cashForm.shiftId, openingCash: cashForm.openingCash, closingFloat: cashForm.closingFloat || "0", note: cashForm.note }, "Opening cash saved.")}
                    className="h-12 w-full rounded-xl bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    Save Opening Cash
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <ReceiptPercentIcon className="h-6 w-6 text-gray-500" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-950">Store Expense</h2>
                    <p className="mt-1 text-sm text-gray-500">Record same-day operational spending, not tax or food cost from recipes.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <select
                    value={expenseForm.category}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
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
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                  />
                  <input
                    value={expenseForm.vendor}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))}
                    placeholder="Vendor / receiver"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                  />
                  <button
                    type="button"
                    disabled={saving || !expenseForm.category || !expenseForm.amount}
                    onClick={() => postAction({ action: "create_expense", expenseDate: businessDate, ...expenseForm }, "Expense saved.")}
                    className="h-12 w-full rounded-xl bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    Save Expense
                  </button>
                  <p className="text-xs leading-5 text-gray-500">
                    Examples: emergency milk purchase, packaging, delivery fee, cleaning supplies, small repairs. Tax collected from customers is not entered here.
                  </p>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-500" />
                <div>
                  <h2 className="text-lg font-bold text-gray-950">Today Shift Status</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    One row per shift. Staff schedule comes from Staff Manager: daily override first, default shift second.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                Change staff shift from Staff Manager. Closing only reads the schedule, then tracks opening cash and cash count submission.
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Shift</th>
                      <th className="px-4 py-3">Closing PIC</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Opening</th>
                      <th className="px-4 py-3">Cash Sales</th>
                      <th className="px-4 py-3">Expected</th>
                      <th className="px-4 py-3">Counted</th>
                      <th className="px-4 py-3">Difference</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.shifts.map((shift) => {
                      const scheduledStaff = getScheduledStaffForShift(shift.id);
                      const closing = closingsByShift.get(shift.id);
                      return (
                        <tr key={shift.id}>
                          <td className="px-4 py-4 font-semibold text-gray-900">{shift.shift_name || "Shift"}</td>
                          <td className="px-4 py-4 text-gray-600">
                            {scheduledStaff.length > 0
                              ? scheduledStaff.map((staff) => staff.name).join(", ")
                              : "No staff scheduled"}
                          </td>
                          <td className="px-4 py-4 text-gray-600">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</td>
                          <td className="px-4 py-4 text-gray-600">{closing ? formatCurrency(closing.opening_cash) : "-"}</td>
                          <td className="px-4 py-4 text-gray-600">{closing ? formatCurrency(closing.cash_expected) : "-"}</td>
                          <td className="px-4 py-4 font-semibold text-gray-900">{closing ? formatCurrency(closing.expected_drawer_cash) : "-"}</td>
                          <td className="px-4 py-4 text-gray-600">{closing?.cash_counted === null || closing?.cash_counted === undefined ? "Waiting staff" : formatCurrency(closing.cash_counted)}</td>
                          <td className="px-4 py-4 font-bold text-gray-900">{closing?.cash_difference === null || closing?.cash_difference === undefined ? "-" : formatCurrency(closing.cash_difference)}</td>
                          <td className="px-4 py-4 text-gray-600">{closing?.status || "Draft"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
