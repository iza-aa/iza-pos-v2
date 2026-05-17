"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { supabase } from "@/lib/config/supabaseClient";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import { StaffCard, StaffTable } from "@/app/components/shared";
import AttendanceSection from "@/app/components/owner/staffmanager/AttendanceSection";
import type { ViewMode } from "@/app/components/ui/Common/ViewModeToggle";
import type { Staff } from "@/lib/types";
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

type StaffViewMode = "card" | "table";
type StaffManagerTab = "staff" | "presensi";
type DateRangeMode = "all" | "today" | "week" | "month" | "custom";

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

type GeneratedLoginCodeModal = {
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
  const [copyMsg, setCopyMsg] = useState("");
  const [activeTab, setActiveTab] = useState<StaffManagerTab>("staff");
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [staffFetchError, setStaffFetchError] = useState("");
  const [generatedLoginCode, setGeneratedLoginCode] =
    useState<GeneratedLoginCodeModal | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const isFetchingStaffRef = useRef(false);

  const [dateRangeMode, setDateRangeMode] = useState<DateRangeMode>("today");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

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
        error instanceof Error ? error.message : "Gagal mengambil data staff.";

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

  const formatLoginCodeExpiry = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowTabDropdown(false);
      }

      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDateDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGeneratePass = async (id: string) => {
    if (isGeneratingCode) return;

    setIsGeneratingCode(true);

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
        throw new Error(result.error || "Gagal membuat kode login.");
      }

      await fetchStaff();
      await handleCopyCode(result.login_code);

      setGeneratedLoginCode({
        staffName: result.staff_name || "Staff",
        staffCode: result.staff_code || "-",
        loginCode: result.login_code,
        expiresAt: result.expires_at,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal membuat kode login.";

      alert(message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyMsg("Kode berhasil dicopy!");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch {
      setCopyMsg("Gagal copy kode.");
      setTimeout(() => setCopyMsg(""), 2000);
    }
  };

  const renderDateLabel = () => {
    if (dateRangeMode === "all") return "All Time";
    if (dateRangeMode === "today") return "Today";
    if (dateRangeMode === "week") return "This Week";
    if (dateRangeMode === "month") return "This Month";
    return "Custom Range";
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      {copyMsg && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-6 py-3 text-white shadow-lg">
          {copyMsg}
        </div>
      )}

      {generatedLoginCode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Kode Login Staff
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
                Kode
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-[0.35em] text-gray-900">
                {generatedLoginCode.loginCode}
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Berlaku sampai {formatLoginCodeExpiry(generatedLoginCode.expiresAt)}
              </p>
            </div>

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Berikan kode ini hanya kepada staff terkait. Setelah staff membuat PIN,
              kode ini otomatis tidak bisa dipakai lagi.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleCopyCode(generatedLoginCode.loginCode)}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Copy Kode
              </button>
              <button
                type="button"
                onClick={() => setGeneratedLoginCode(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto ">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
              {activeTab === "staff" ? "Staff Management" : "Presensi Staff"}
            </h1>
            <p className="text-sm text-gray-600 md:text-base">
              {activeTab === "staff"
                ? "View staff list and manage staff PIN access."
                : "Pantau clock in dan clock out staff berdasarkan shift."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "presensi" && (
              <div className="relative" ref={dateDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDateDropdown((prev) => !prev)}
                  className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm transition hover:bg-gray-50 md:px-4"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">{renderDateLabel()}</span>
                </button>

                {showDateDropdown && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="p-2">
                      {(
                        [
                          ["all", "All Time"],
                          ["today", "Today"],
                          ["week", "This Week (Last 7 Days)"],
                          ["month", "This Month (Last 30 Days)"],
                        ] as Array<[DateRangeMode, string]>
                      ).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setDateRangeMode(mode);
                            setShowDateDropdown(false);
                          }}
                          className={`mt-1 w-full rounded-lg px-4 py-2 text-left text-sm transition first:mt-0 ${
                            dateRangeMode === mode
                              ? "bg-gray-900 text-white"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 p-4">
                      <p className="mb-3 text-sm font-medium text-gray-700">
                        Custom Range
                      </p>

                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(event) =>
                              setCustomStartDate(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-gray-900"
                          />
                          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>

                        <div className="relative">
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(event) =>
                              setCustomEndDate(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-gray-900"
                          />
                          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (customStartDate && customEndDate) {
                              setDateRangeMode("custom");
                              setShowDateDropdown(false);
                            }
                          }}
                          disabled={!customStartDate || !customEndDate}
                          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Apply Custom Range
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "staff" && (
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showMapView={false}
              />
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowTabDropdown((prev) => !prev)}
                className="flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-3 text-white transition hover:bg-gray-800 md:px-4"
              >
                {activeTab === "staff" ? (
                  <>
                    <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-xs font-medium md:text-sm">
                      Data Staff
                    </span>
                  </>
                ) : (
                  <>
                    <ClockIcon className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-xs font-medium md:text-sm">
                      Presensi
                    </span>
                  </>
                )}
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {showTabDropdown && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("staff");
                      setShowTabDropdown(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      activeTab === "staff"
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <UsersIcon className="h-4 w-4" />
                    Data Staff
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("presensi");
                      setShowTabDropdown(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      activeTab === "presensi"
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <ClockIcon className="h-4 w-4" />
                    Presensi Staff
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === "staff" && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari nama, ID, role, tipe, email, nomor, atau shift..."
                width="w-full"
              />
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <>
            {staffFetchError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  Gagal mengambil data staff
                </p>
                <p className="mt-1 text-sm text-red-600">{staffFetchError}</p>
                <button
                  type="button"
                  onClick={() => void fetchStaff()}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {isLoadingStaff ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
                  <p className="mt-3 text-sm text-gray-500">
                    Memuat data staff...
                  </p>
                </div>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStaff.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    onGeneratePass={() => handleGeneratePass(staff.id)}
                    onCopyCode={handleCopyCode}
                    onEdit={() => undefined}
                    onDelete={undefined}
                    showActions={false}
                  />
                ))}
              </div>
            ) : (
              <StaffTable
                staffList={sanitizedFilteredStaffForTable}
                onGeneratePass={handleGeneratePass}
                onCopyCode={handleCopyCode}
                onEdit={() => undefined}
                onDelete={() => undefined}
                showActions={false}
              />
            )}

            {!isLoadingStaff && filteredStaff.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                <p className="text-gray-500">
                  {searchQuery
                    ? "Tidak ada staff yang ditemukan"
                    : "Belum ada data staff"}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "presensi" && (
          <AttendanceSection
            dateRangeMode={dateRangeMode}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        )}
      </div>
    </div>
  );
}