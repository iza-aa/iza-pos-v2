"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { getCurrentUser } from "@/lib/utils";

type CurrentUser = {
  id: string;
  role: string;
  name: string;
  staffCode?: string;
  staffType?: string | null;
};

type ShiftClosingData = {
  businessDate: string;
  staff: {
    id: string;
    name: string;
    staffCode?: string | null;
  };
  staffOptions?: Array<{
    id: string;
    name: string;
    staffCode?: string | null;
    role?: string | null;
    shiftId?: string | null;
  }>;
  shift: {
    id: string;
    shiftName: string;
    startTime?: string | null;
    endTime?: string | null;
  };
  snapshot: {
    shiftId: string;
    shiftName: string;
    grossSales: number;
    discountTotal: number;
    netSales: number;
    openingCash: number;
    cashExpected: number | null;
    expectedDrawerCash: number | null;
    cashToDeposit: number | null;
    closingFloat: number;
    floatPolicy: "carry_float" | "new_float" | "deposit_all";
    nonCashSales: number;
    cancelledCount: number;
    orderCount: number;
    cashOrderCount: number;
    nonCashOrderCount: number;
  };
  closing: {
    id: string;
    status: string;
    openingCash: number;
    cashExpected: number | null;
    expectedDrawerCash: number | null;
    cashCounted: number | null;
    cashDifference: number | null;
    cashToDeposit: number;
    closingFloat: number;
    floatPolicy: "carry_float" | "new_float" | "deposit_all";
    notes?: string | null;
  } | null;
};

const getJakartaDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";
  return value.slice(0, 5);
};

const formatStatus = (value?: string | null) => {
  if (!value) return "Draft";

  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getSetupGuidance = (message: string) => {
  const normalized = message.toLowerCase();
  const needsShiftAssignment =
    normalized.includes("assigned shift") ||
    normalized.includes("assign a staff member") ||
    normalized.includes("assign the correct shift") ||
    normalized.includes("outside its end-shift window");

  if (!needsShiftAssignment) return null;

  if (normalized.includes("outside its end-shift window")) {
    return {
      title: "Current shift does not match",
      description: message,
      steps: [
        "Check whether this staff member is still assigned to an earlier shift.",
        "Assign the staff member to the correct active shift for the current work period.",
        "Refresh this page after the assignment is saved.",
      ],
    };
  }

  return {
    title: "Shift assignment required",
    description: message,
    steps: [
      "Assign this staff member to the correct active shift in Staff Manager.",
      "Make sure the shift covers the order period you want to close.",
      "Refresh this page after the assignment is saved.",
    ],
  };
};

export default function StaffEndShiftPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<ShiftClosingData | null>(null);
  const [businessDate, setBusinessDate] = useState(getJakartaDate);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [cashCounted, setCashCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canSubmit = useMemo(() => {
    if (!data || submitting) return false;
    if (data.closing?.status === "closed") return false;

    const parsed = Number(cashCounted);
    return cashCounted !== "" && Number.isFinite(parsed) && parsed >= 0;
  }, [cashCounted, data, submitting]);

  const loadData = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      const user = getCurrentUser() as CurrentUser | null;

      if (!user) {
        router.replace("/staff/login");
        return;
      }

      if (user.role === "staff") {
        router.replace("/staff/attendance");
        return;
      }

      if (user.role !== "staff" && user.role !== "owner") {
        router.replace("/staff/dashboard");
        return;
      }

      setCurrentUser(user);
      setError("");
      if (!quiet) setLoading(true);
      if (quiet) setRefreshing(true);

      try {
        const params = new URLSearchParams({ businessDate });
        if (user.role === "owner" && selectedStaffId) {
          params.set("staffId", selectedStaffId);
        }

        const response = await fetch(`/api/staff/bookkeeping/shift-closing?${params.toString()}`, {
          headers: {
            "x-user-id": user.id,
            "x-user-name": user.name,
            "x-user-role": user.role,
          },
        });

        const result = (await response.json().catch(() => ({}))) as {
          data?: ShiftClosingData;
          error?: string;
        };

        if (!response.ok || !result.data) {
          setData(null);
          setError(result.error || "Shift closing data could not be loaded.");
          return;
        }

        setData(result.data);
        if (user.role === "owner" && !selectedStaffId) {
          setSelectedStaffId(result.data.staff.id);
        }
        setCashCounted(
          result.data.closing?.cashCounted === null || result.data.closing?.cashCounted === undefined
            ? ""
            : String(result.data.closing.cashCounted),
        );
        setNotes(result.data.closing?.notes || "");
      } catch (loadError) {
        console.error("Failed to load staff end shift:", loadError);
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Shift closing data could not be loaded.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessDate, router, selectedStaffId],
  );

  useEffect(() => {
    setNotice("");
    void loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    const user = currentUser || (getCurrentUser() as CurrentUser | null);

    if (!user || (user.role !== "staff" && user.role !== "owner")) {
      setError("End shift access required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const params = new URLSearchParams();
      if (user.role === "owner" && selectedStaffId) {
        params.set("staffId", selectedStaffId);
      }

      const response = await fetch(`/api/staff/bookkeeping/shift-closing${params.size ? `?${params.toString()}` : ""}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-name": user.name,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          businessDate,
          cashCounted,
          notes,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        data?: {
          status: string;
          cashDifference: number;
        };
        error?: string;
      };

      if (!response.ok || !result.success) {
        setError(result.error || "Shift closing could not be submitted.");
        return;
      }

      setNotice(`Shift closing submitted as ${formatStatus(result.data?.status)}.`);
      await loadData({ quiet: true });
    } catch (submitError) {
      console.error("Failed to submit staff end shift:", submitError);
      setError(submitError instanceof Error ? submitError.message : "Shift closing could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6 xl:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 md:text-3xl">End Shift</h1>
            <p className="mt-1 text-sm text-gray-500">
              Submit counted cash for your assigned shift before the owner closes the day.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto md:justify-end">
            {currentUser?.role === "owner" && data?.staffOptions?.length ? (
              <select
                value={selectedStaffId || data.staff.id}
                onChange={(event) => {
                  setSelectedStaffId(event.target.value);
                  setNotice("");
                }}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900 sm:w-64"
              >
                {data.staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}{staff.staffCode ? ` - ${staff.staffCode}` : ""}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="date"
              value={businessDate}
              onChange={(event) => setBusinessDate(event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900 sm:w-48"
            />
            <button
              type="button"
              onClick={() => void loadData({ quiet: true })}
              disabled={refreshing || loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-6 xl:px-8">
        {error ? (
          (() => {
            const guidance = getSetupGuidance(error);

            if (!guidance) {
              return (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              );
            }

            return (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
                  <div>
                    <h2 className="text-base font-bold text-amber-950">{guidance.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-amber-800">{guidance.description}</p>
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm font-semibold text-amber-900">
                      {guidance.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm font-semibold text-gray-500 shadow-sm">
            Loading shift closing...
          </div>
        ) : data ? (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
              <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500">{formatDate(data.businessDate)}</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-950">{data.shift.shiftName}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatTime(data.shift.startTime)} - {formatTime(data.shift.endTime)} · {data.staff.name}
                  </p>
                </div>

                <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  End Shift
                </span>
              </div>

              <div className="mx-auto mt-6 max-w-3xl">
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <EyeSlashIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">Blind Cash Count</h3>
                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      Count physical cash first. Expected cash is hidden until submit so the count stays honest.
                    </p>
                  </div>
                </div>

                <label className="mt-6 block text-sm font-semibold text-gray-700">
                  Cash Counted
                  <input
                    type="number"
                    min="0"
                    value={cashCounted}
                    onChange={(event) => setCashCounted(event.target.value)}
                    placeholder="Enter counted cash"
                    disabled={data.closing?.status === "closed"}
                    className="mt-2 h-14 w-full rounded-xl border border-gray-200 bg-white px-4 text-lg font-bold text-gray-950 outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </label>

                <label className="mt-4 block text-sm font-semibold text-gray-700">
                  Notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional note, required by SOP if there is a cash difference."
                    rows={4}
                    disabled={data.closing?.status === "closed"}
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {submitting ? "Submitting..." : "Submit Shift Closing"}
                </button>

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                  <p className="leading-6">
                    Submit after your shift ends and before cash is mixed with the next shift drawer.
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
