"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import {
  DateRangeFilter,
  getDefaultDateRange,
  getLast7DateRange,
  SidebarTabset,
  StaffCard,
  StaffTable,
  type DateRangeValue,
} from "@/app/components/shared";
import AttendanceSection from "@/app/components/owner/staffmanager/AttendanceSection";
import type { ViewMode } from "@/app/components/ui/Common/ViewModeToggle";
import type { Staff } from "@/lib/types";
import {
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

type StaffViewMode = "card" | "table";
type StaffManagerTab = "staff" | "attendance";
type AttendanceTab = "monitor" | "settings";

type StaffShiftInfo = {
  id: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
  check_in_grace_until?: string | null;
  check_out_grace_until?: string | null;
};

type ManagerStaffRecord = Staff & {
  email?: string | null;
  staff_type?: string | null;
  shift_id?: string | null;
  shift?: StaffShiftInfo | null;
};

type RawStaffRecord = Record<string, unknown>;
type GeneratedLoginCode = {
  staffName: string;
  staffCode: string;
  loginCode: string;
  expiresAt: string;
};

const getSingleRelation = <T extends Record<string, unknown>>(
  value: unknown,
): T | null => {
  if (!value) return null;

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (
      firstValue &&
      typeof firstValue === "object" &&
      !Array.isArray(firstValue)
    ) {
      return firstValue as T;
    }

    return null;
  }

  if (typeof value === "object") {
    return value as T;
  }

  return null;
};

const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

const toNullableString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value : null;
};

const normalizeShift = (value: unknown): StaffShiftInfo | null => {
  const shift = getSingleRelation<Record<string, unknown>>(value);

  if (!shift) return null;

  const id = toSafeString(shift.id);
  const shiftName = toSafeString(shift.shift_name);

  if (!id || !shiftName) return null;

  return {
    id,
    shift_name: shiftName,
    start_time: toNullableString(shift.start_time),
    end_time: toNullableString(shift.end_time),
    check_in_grace_until: toNullableString(shift.check_in_grace_until),
    check_out_grace_until: toNullableString(shift.check_out_grace_until),
  };
};

const normalizeStaffRecord = (rawStaff: RawStaffRecord): ManagerStaffRecord => {
  const normalizedStaff = {
    ...rawStaff,
    email: toNullableString(rawStaff.email),
    staff_type: toNullableString(rawStaff.staff_type),
    shift_id: toNullableString(rawStaff.shift_id),
    shift: normalizeShift(rawStaff.shift),
  };

  return normalizedStaff as unknown as ManagerStaffRecord;
};

export default function ManagerStaffPage() {
  useSessionValidation();

  const [staffList, setStaffList] = useState<ManagerStaffRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<StaffViewMode>("card");
  const [activeTab, setActiveTab] = useState<StaffManagerTab>("staff");
  const [activeAttendanceTab, setActiveAttendanceTab] =
    useState<AttendanceTab>("monitor");
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [staffFetchError, setStaffFetchError] = useState("");
  const [generatingAccessStaffId, setGeneratingAccessStaffId] = useState("");
  const [generatedLoginCode, setGeneratedLoginCode] =
    useState<GeneratedLoginCode | null>(null);
  const [copyMsg, setCopyMsg] = useState("");

  const isFetchingStaffRef = useRef(false);
  const [attendanceDateRange, setAttendanceDateRange] =
    useState<DateRangeValue>(getDefaultDateRange);

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "card" || mode === "table") {
      setViewMode(mode);
    }
  };

  const fetchStaff = async () => {
    if (isFetchingStaffRef.current) return;

    isFetchingStaffRef.current = true;
    setIsLoadingStaff(true);
    setStaffFetchError("");

    try {
      const currentUser = getCurrentUser();

      let query = supabase
        .from("staff")
        .select(
          `
            *,
            shift:staff_shift_id_fkey (
              id,
              shift_name,
              start_time,
              end_time,
              check_in_grace_until,
              check_out_grace_until
            )
          `,
        )
        .neq("role", "owner")
        .order("created_at", { ascending: true });

      if (currentUser?.id) {
        query = query.neq("id", currentUser.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const normalizedStaffList = ((data ?? []) as RawStaffRecord[]).map(
        normalizeStaffRecord,
      );

      setStaffList(normalizedStaffList);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch staff data.";

      setStaffFetchError(message);
    } finally {
      isFetchingStaffRef.current = false;
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    void fetchStaff();
  }, []);

  const filteredStaff = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();

    if (!trimmedQuery) return staffList;

    return staffList.filter((staff) => {
      const searchableValues = [
        staff.name,
        staff.staff_code,
        staff.role,
        staff.staff_type,
        staff.email,
        staff.phone,
        staff.status,
        staff.shift?.shift_name,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(trimmedQuery),
      );
    });
  }, [staffList, searchQuery]);

  const sanitizedFilteredStaffForTable = useMemo<Staff[]>(() => {
    return filteredStaff.map((staff) => {
      const tableStaff: Staff = {
        ...staff,
        login_code: undefined,
      };

      return tableStaff;
    });
  }, [filteredStaff]);

  const staffManagerTabs = [
    {
      id: "staff" as const,
      label: "Staff Data",
      description: "Profiles and access",
      icon: UsersIcon,
    },
    {
      id: "attendance" as const,
      label: "Staff Attendance",
      description: "Attendance and shifts",
      icon: ClockIcon,
      children: [
        {
          id: "monitor" as const,
          label: "Attendance Monitor",
          icon: ClockIcon,
        },
        {
          id: "settings" as const,
          label: "Attendance Settings",
          icon: MapPinIcon,
        },
      ],
    },
  ];

  const getAttendanceDateRangeProps = (range: DateRangeValue) => {
    const today = new Date().toISOString().slice(0, 10);
    const last7 = getLast7DateRange();
    const last30Date = new Date();
    last30Date.setDate(last30Date.getDate() - 29);
    const last30 = {
      startDate: last30Date.toISOString().slice(0, 10),
      endDate: today,
    };

    if (range.startDate === today && range.endDate === today) {
      return { dateRangeMode: "today" as const, customStartDate: "", customEndDate: "" };
    }

    if (range.startDate === last7.startDate && range.endDate === last7.endDate) {
      return { dateRangeMode: "week" as const, customStartDate: "", customEndDate: "" };
    }

    if (range.startDate === last30.startDate && range.endDate === last30.endDate) {
      return { dateRangeMode: "month" as const, customStartDate: "", customEndDate: "" };
    }

    return {
      dateRangeMode: "custom" as const,
      customStartDate: range.startDate,
      customEndDate: range.endDate,
    };
  };

  const attendanceDateRangeProps =
    getAttendanceDateRangeProps(attendanceDateRange);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopyMsg("Code copied.");
    window.setTimeout(() => setCopyMsg(""), 2000);
  };

  const formatLoginCodeExpiry = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleGenerateAccessCode = async (id: string) => {
    if (generatingAccessStaffId) return;

    setGeneratingAccessStaffId(id);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_pin",
          staff_id: id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create login code.");
      }

      await fetchStaff();
      await handleCopy(result.login_code);

      setGeneratedLoginCode({
        staffName: result.staff_name || "Staff",
        staffCode: result.staff_code || "-",
        loginCode: result.login_code,
        expiresAt: result.expires_at,
      });

      showSuccess("Staff login code created.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to create login code.");
    } finally {
      setGeneratingAccessStaffId("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-55px)] overflow-hidden bg-gray-100">
      <SidebarTabset
        title="Staff Manager"
        description="Support staff access and attendance records."
        items={staffManagerTabs}
        activeId={activeTab}
        activeChildId={activeTab === "attendance" ? activeAttendanceTab : undefined}
        onSelect={(tab) => setActiveTab(tab)}
        onChildSelect={(tab, child) => {
          setActiveTab(tab);
          setActiveAttendanceTab(child);
        }}
        mobileOpenLabel="Open staff manager menu"
        mobileCloseLabel="Close staff manager menu"
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeTab === "staff" && (
          <section className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 md:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="w-full sm:max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search name, ID, role, type, email, phone, or shift..."
                  width="w-full"
                />
              </div>

              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showMapView={false}
              />
            </div>
          </section>
        )}

        <section className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        {activeTab === "attendance" && activeAttendanceTab === "monitor" && (
          <div className="mb-4">
            <DateRangeFilter
              value={attendanceDateRange}
              onChange={setAttendanceDateRange}
            />
          </div>
        )}

        {activeTab === "staff" && (
          <>
            {staffFetchError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  Failed to fetch staff data
                </p>
                <p className="mt-1 text-sm text-red-600">{staffFetchError}</p>
                <button
                  type="button"
                  onClick={() => void fetchStaff()}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {isLoadingStaff && viewMode !== "table" ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
                  <p className="mt-3 text-sm text-gray-500">
                    Loading staff data...
                  </p>
                </div>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStaff.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    onEdit={() => undefined}
                    onDelete={undefined}
                    showActions={false}
                    onGenerateAccessCode={() => void handleGenerateAccessCode(staff.id)}
                    isGeneratingAccessCode={generatingAccessStaffId === staff.id}
                  />
                ))}
              </div>
            ) : (
              <StaffTable
                staffList={sanitizedFilteredStaffForTable}
                onEdit={() => undefined}
                onDelete={() => undefined}
                showActions={false}
                onGenerateAccessCode={(id) => void handleGenerateAccessCode(id)}
                generatingAccessStaffId={generatingAccessStaffId}
                title="Staff Access List"
                description="Read-only staff data with operational login code generation."
                loading={isLoadingStaff}
              />
            )}

            {!isLoadingStaff && filteredStaff.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                <p className="text-gray-500">
                  {searchQuery
                    ? "No staff found"
                    : "No staff data yet"}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "attendance" && (
          <AttendanceSection
            dateRangeMode={attendanceDateRangeProps.dateRangeMode}
            customStartDate={attendanceDateRangeProps.customStartDate}
            customEndDate={attendanceDateRangeProps.customEndDate}
            section={activeAttendanceTab}
          />
        )}
        </section>
      </div>

      {copyMsg && (
        <div className="fixed right-4 top-4 z-50 rounded bg-green-600 px-4 py-2 text-white shadow">
          {copyMsg}
        </div>
      )}

      {generatedLoginCode && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Staff Login Code
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                {generatedLoginCode.staffName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Staff ID: {generatedLoginCode.staffCode}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Code
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-[0.35em] text-gray-900">
                {generatedLoginCode.loginCode}
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Valid until {formatLoginCodeExpiry(generatedLoginCode.expiresAt)}
              </p>
            </div>

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Share this code only with the assigned staff member. After the staff member creates a PIN, the code can no longer be used.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleCopy(generatedLoginCode.loginCode)}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Copy Code
              </button>
              <button
                type="button"
                onClick={() => setGeneratedLoginCode(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
