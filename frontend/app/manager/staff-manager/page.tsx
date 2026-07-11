"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import {
  BusinessDateFilter,
  SidebarTabset,
  StaffCard,
  StaffTable,
} from "@/app/components/shared";
import AttendanceSection from "@/app/components/owner/staffmanager/AttendanceSection";
import WeeklyScheduleSection from "@/app/components/owner/staffmanager/WeeklyScheduleSection";
import { EditStaffModal } from "@/app/components/owner/staffmanager";
import { useLanguage } from "@/app/components/shared/i18n";
import { getJakartaTodayDate } from "@/lib/services/bookkeeping/bookkeepingDate";
import type { ViewMode } from "@/app/components/ui/Common/ViewModeToggle";
import type { Staff } from "@/lib/types";
import {
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  getPrimaryStaffPosition,
  getStaffPositionLabel,
  getStaffPositions,
  normalizeStaffPositions,
  type StaffPosition,
  type StaffPositionAssignment,
} from "@/lib/staff/positions";

type StaffViewMode = "card" | "table";
type StaffManagerTab = "staff" | "attendance";
type AttendanceTab = "monitor" | "roster" | "settings";
type StaffRole = "staff" | "manager" | "owner";
type StaffStatus = "active" | "inactive" | "on-leave" | "terminated";

type ManagerStaffRecord = Staff & {
  email?: string | null;
  staff_type?: string | null;
  staff_positions?: StaffPositionAssignment[] | null;
  positions?: StaffPosition[];
  primary_position?: StaffPosition | null;
};

type RawStaffRecord = Record<string, unknown>;

const toNullableString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value : null;
};

const normalizeStaffRecord = (rawStaff: RawStaffRecord): ManagerStaffRecord => {
  const positionRecord = rawStaff as RawStaffRecord & {
    staff_positions?: StaffPositionAssignment[] | null;
  };
  const positions = getStaffPositions(positionRecord);
  const primaryPosition = getPrimaryStaffPosition(positionRecord);
  const normalizedStaff = {
    ...rawStaff,
    email: toNullableString(rawStaff.email),
    staff_type: primaryPosition ?? toNullableString(rawStaff.staff_type),
    staff_positions: positionRecord.staff_positions ?? null,
    positions,
    primary_position: primaryPosition,
  };

  return normalizedStaff as unknown as ManagerStaffRecord;
};

const normalizeStaffRole = (role: unknown): StaffRole => {
  const normalizedRole = String(role ?? "").trim().toLowerCase();

  if (normalizedRole === "owner") return "owner";
  if (normalizedRole === "manager") return "manager";
  return "staff";
};

const normalizeStaffStatus = (status: unknown): StaffStatus => {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (normalizedStatus === "inactive") return "inactive";
  if (normalizedStatus === "on-leave") return "on-leave";
  if (normalizedStatus === "terminated") return "terminated";
  return "active";
};

export default function ManagerStaffPage() {
  useSessionValidation();
  const { t } = useLanguage();
  const currentUser = getCurrentUser();

  const [staffList, setStaffList] = useState<ManagerStaffRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<StaffViewMode>("card");
  const [activeTab, setActiveTab] = useState<StaffManagerTab>("staff");
  const [activeAttendanceTab, setActiveAttendanceTab] =
    useState<AttendanceTab>("monitor");
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [staffFetchError, setStaffFetchError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<ManagerStaffRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isFetchingStaffRef = useRef(false);
  const [attendanceBusinessDate, setAttendanceBusinessDate] =
    useState(getJakartaTodayDate());

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "card" || mode === "table") {
      setViewMode(mode);
    }
  };

  const fetchStaff = useCallback(async () => {
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
            staff_positions (
              id,
              staff_id,
              position,
              is_primary,
              is_active
            )
          `,
        )
        .neq("role", "owner")
        .order("created_at", { ascending: true });

      if (currentUser?.id) {
        query = query.neq("id", currentUser.id);
      }

      let { data, error } = await query;

      if (
        error &&
        (error.message.toLowerCase().includes("staff_positions") ||
          error.message.toLowerCase().includes("relationship") ||
          error.message.toLowerCase().includes("schema cache"))
      ) {
        let legacyQuery = supabase
          .from("staff")
          .select("*")
          .neq("role", "owner")
          .order("created_at", { ascending: true });

        if (currentUser?.id) {
          legacyQuery = legacyQuery.neq("id", currentUser.id);
        }

        const legacyResult = await legacyQuery;
        data = legacyResult.data;
        error = legacyResult.error;
      }

      if (error) {
        throw error;
      }

      const normalizedStaffList = ((data ?? []) as RawStaffRecord[]).map(
        normalizeStaffRecord,
      );

      setStaffList(normalizedStaffList);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("manager.staff.fetchError");

      setStaffFetchError(message);
    } finally {
      isFetchingStaffRef.current = false;
      setIsLoadingStaff(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();

    const visibleStaff = staffList.filter(
      (staff) => String(staff.status ?? "").trim().toLowerCase() !== "terminated",
    );

    if (!trimmedQuery) return visibleStaff;

    return visibleStaff.filter((staff) => {
      const searchableValues = [
        staff.name,
        staff.staff_code,
        staff.role,
        staff.staff_type,
        ...getStaffPositions(staff).map(getStaffPositionLabel),
        staff.email,
        staff.phone,
        staff.status,
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
      label: t("owner.staff.managerTitle"),
      description: t("manager.staff.profilesAndAccess"),
      icon: UsersIcon,
    },
    {
      id: "attendance" as const,
      label: t("owner.staff.attendance"),
      description: t("owner.staff.attendanceDescription"),
      icon: ClockIcon,
      children: [
        {
          id: "monitor" as const,
          label: t("owner.staff.attendanceMonitor"),
          icon: ClockIcon,
        },
        {
          id: "roster" as const,
          label: t("owner.staff.weeklyRoster"),
          icon: CalendarDaysIcon,
        },
        {
          id: "settings" as const,
          label: t("owner.staff.attendanceSettings"),
          icon: MapPinIcon,
        },
      ],
    },
  ];

  const attendanceDateRangeProps = {
    dateRangeMode: "custom" as const,
    customStartDate: attendanceBusinessDate,
    customEndDate: attendanceBusinessDate,
  };

  const handleEdit = (id: string) => {
    const staff = staffList.find((item) => item.id === id);

    if (!staff) return;

    setSelectedStaff(staff);
    setShowEditModal(true);
  };

  const persistStaffPositions = async ({
    staffId,
    role,
    positions,
    primaryPosition,
  }: {
    staffId: string;
    role: StaffRole;
    positions: StaffPosition[];
    primaryPosition: StaffPosition | null;
  }) => {
    const operationalPositions =
      role === "staff" ? normalizeStaffPositions(positions) : [];

    const response = await fetch("/api/owner/staff-manager/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId,
        positions: operationalPositions,
        primaryPosition: role === "staff" ? primaryPosition : null,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "Staff positions could not be saved.");
    }
  };

  const handleSaveEdit = async (updatedStaff: Staff) => {
    const staffToUpdate = updatedStaff as ManagerStaffRecord;
    const selectedRole = normalizeStaffRole(staffToUpdate.role);
    const selectedPositions =
      selectedRole === "staff"
        ? normalizeStaffPositions(staffToUpdate.positions)
        : [];
    const selectedPrimaryPosition =
      selectedRole === "staff"
        ? (staffToUpdate.primary_position ?? selectedPositions[0] ?? null)
        : null;
    const selectedStatus = normalizeStaffStatus(staffToUpdate.status);

    const { error } = await supabase
      .from("staff")
      .update({
        name: staffToUpdate.name,
        email: staffToUpdate.email || null,
        phone: staffToUpdate.phone || null,
        role: selectedRole,
        // staff_type column was dropped (migration 202606240007) — updated via persistStaffPositions below
        status: selectedStatus,
      })
      .eq("id", staffToUpdate.id);

    if (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("staff_email_key")) {
        errorMessage = "Email ini sudah terdaftar pada akun staf/manajer lain. Silakan gunakan email yang berbeda.";
      }
      showError(errorMessage);
      throw new Error(errorMessage);
    }

    await persistStaffPositions({
      staffId: staffToUpdate.id,
      role: selectedRole,
      positions: selectedPositions,
      primaryPosition: selectedPrimaryPosition,
    });

    await fetchStaff();
    setShowEditModal(false);
    setSelectedStaff(null);
    showSuccess(t("owner.staff.updated"));
  };

  return (
    <div className="flex h-[calc(100vh-55px)] overflow-hidden bg-gray-100">
      <SidebarTabset
        title={t("owner.staff.managerTitle")}
        description={t("manager.staff.managerDescription")}
        items={staffManagerTabs}
        activeId={activeTab}
        activeChildId={activeTab === "attendance" ? activeAttendanceTab : undefined}
        onSelect={(tab) => setActiveTab(tab)}
        onChildSelect={(tab, child) => {
          setActiveTab(tab);
          setActiveAttendanceTab(child);
        }}
        mobileOpenLabel={t("manager.staff.openMenu")}
        mobileCloseLabel={t("manager.staff.closeMenu")}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeTab === "staff" && (
          <section className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 md:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="w-full sm:max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t("manager.staff.searchPlaceholder")}
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
            <BusinessDateFilter
              value={attendanceBusinessDate}
              onChange={setAttendanceBusinessDate}
              title={t("owner.bookkeeping.businessDate")}
              description={t("owner.bookkeeping.businessDateDescription")}
              todayLabel={t("owner.bookkeeping.today")}
              yesterdayLabel={t("owner.bookkeeping.yesterday")}
              ariaLabel={t("owner.bookkeeping.businessDate")}
            />
          </div>
        )}

        {activeTab === "staff" && (
          <>
            {staffFetchError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  {t("manager.staff.fetchFailedTitle")}
                </p>
                <p className="mt-1 text-sm text-red-600">{staffFetchError}</p>
                <button
                  type="button"
                  onClick={() => void fetchStaff()}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  {t("manager.staff.tryAgain")}
                </button>
              </div>
            )}

            {isLoadingStaff && viewMode !== "table" ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
                  <p className="mt-3 text-sm text-gray-500">
                    {t("manager.staff.loading")}
                  </p>
                </div>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStaff.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    onEdit={() => handleEdit(staff.id)}
                    onDelete={undefined}
                    showActions
                  />
                ))}
              </div>
            ) : (
              <StaffTable
                staffList={sanitizedFilteredStaffForTable}
                onEdit={handleEdit}
                showActions
                title={t("manager.staff.accessList")}
                description={t("manager.staff.accessListDescription")}
                loading={isLoadingStaff}
              />
            )}

            {!isLoadingStaff && filteredStaff.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                <p className="text-gray-500">
                  {searchQuery
                    ? t("manager.staff.noStaffFound")
                    : t("owner.staff.noStaffData")}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "attendance" && activeAttendanceTab !== "roster" && (
          <AttendanceSection
            dateRangeMode={attendanceDateRangeProps.dateRangeMode}
            customStartDate={attendanceDateRangeProps.customStartDate}
            customEndDate={attendanceDateRangeProps.customEndDate}
            section={activeAttendanceTab === "monitor" ? "monitor" : "settings"}
            requester={
              currentUser
                ? {
                    id: currentUser.id,
                    name: currentUser.name,
                    role: currentUser.role,
                  }
                : null
            }
          />
        )}

        {activeTab === "attendance" && activeAttendanceTab === "roster" && (
          <WeeklyScheduleSection />
        )}
        </section>
      </div>

      <EditStaffModal
        isOpen={showEditModal}
        staff={selectedStaff}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaff(null);
        }}
        onSave={handleSaveEdit}
        allowOwnerRole={false}
      />
    </div>
  );
}
