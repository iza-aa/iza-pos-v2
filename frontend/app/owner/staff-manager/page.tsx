"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ViewModeToggle, DeleteModal } from "@/app/components/ui";
import {
  BusinessDateFilter,
  SidebarTabset,
  StaffCard,
  StaffTable,
} from "@/app/components/shared";

import {
  StaffManagerHeader,
  EditStaffModal,
  AddStaffModal,
} from "@/app/components/owner/staffmanager";
import AttendanceSection from "@/app/components/owner/staffmanager/AttendanceSection";
import WeeklyScheduleSection from "@/app/components/owner/staffmanager/WeeklyScheduleSection";
import type { ViewMode } from "@/app/components/ui/Common/ViewModeToggle";
import type { NewStaffData } from "@/app/components/owner/staffmanager/AddStaffModal";
import bcrypt from "bcryptjs";
import { POLLING_INTERVALS, TIMEOUT_DURATIONS } from "@/lib/constants";
import { showSuccess, showError } from "@/lib/services/errorHandling";
import { logActivity } from "@/lib/services/activity/activityLogger";
import type { Staff } from "@/lib/types";
import {
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "@/app/components/shared/i18n";
import { getJakartaTodayDate } from "@/lib/services/bookkeeping/bookkeepingDate";
import {
  getPrimaryStaffPosition,
  getStaffPositionLabel,
  getStaffPositions,
  normalizeStaffPositions,
  type StaffPosition,
  type StaffPositionAssignment,
} from "@/lib/staff/positions";

type StaffRole = "staff" | "manager" | "owner";
type StaffManagerTab = "staff" | "attendance";
type AttendanceTab = "monitor" | "roster" | "settings";
type StaffViewMode = "card" | "table";
type StaffType = StaffPosition;
type StaffStatus = "active" | "inactive" | "on-leave" | "terminated";

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time: string;
  check_in_grace_until?: string | null;
  end_time: string;
  check_out_grace_until?: string | null;
  description?: string | null;
  is_active?: boolean | null;
};

type StaffRecord = Staff & {
  staff_type?: StaffType | null;
  staff_positions?: StaffPositionAssignment[] | null;
  positions?: StaffPosition[];
  primary_position?: StaffPosition | null;
  email?: string | null;
  phone?: string | null;
  password_hash?: string | null;
  pin_hash?: string | null;
  must_change_pin?: boolean | null;
  login_code?: string;
  login_code_expires_at?: string | null;
  login_code_created_at?: string | null;
  pin_updated_at?: string | null;
  pin_reset_at?: string | null;
  weekly_shift_overrides?: WeeklyShiftOverride[];
};

type WeeklyShiftOverride = {
  weekday: number;
  shift_id: string;
};

type StaffInsert = {
  staff_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  // staff_type column was dropped (migration 202606240007); positions are managed via staff_positions table
  status: "active";
  hired_date: string;
  password_hash?: string;
};

type StaffFormPayload = Omit<
  NewStaffData,
  "role" | "staff_type" | "password"
> & {
  role?: unknown;
  staff_type?: StaffType | null;
  positions?: StaffPosition[];
  primary_position?: StaffPosition | null;
  password?: string;
};

type LoggedInStaffIdentity = {
  id: string;
  staffCode: string;
  email: string;
  phone: string;
  name: string;
  role: string;
};

type GeneratedLoginCodeModal = {
  staffName: string;
  staffCode: string;
  loginCode: string;
  expiresAt: string;
};

const STAFF_ROLES_WITH_LOGIN: StaffRole[] = ["manager", "owner"];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const createEmptyLoggedInStaffIdentity = (): LoggedInStaffIdentity => ({
  id: "",
  staffCode: "",
  email: "",
  phone: "",
  name: "",
  role: "",
});

const normalizeStaffRole = (role: unknown): StaffRole => {
  const normalizedRole = normalizeText(role);

  if (normalizedRole === "owner") return "owner";
  if (normalizedRole === "manager") return "manager";
  return "staff";
};

const normalizeStaffType = (
  staffType: unknown,
  role: StaffRole,
): StaffType | null => {
  if (role === "owner" || role === "manager") {
    return null;
  }

  const normalizedStaffType = normalizeText(staffType);

  if (normalizedStaffType === "cashier" || normalizedStaffType === "kasir") {
    return "cashier";
  }

  if (
    normalizedStaffType === "bar" ||
    normalizedStaffType === "barista" ||
    normalizedStaffType === "bartender"
  ) {
    return "barista";
  }

  if (
    normalizedStaffType === "kitchen" ||
    normalizedStaffType === "cook" ||
    normalizedStaffType === "chef" ||
    normalizedStaffType === "dapur"
  ) {
    return "kitchen";
  }

  if (
    normalizedStaffType === "server" ||
    normalizedStaffType === "waiter" ||
    normalizedStaffType === "waitress" ||
    normalizedStaffType === "pelayan"
  ) {
    return "waiter";
  }

  return null;
};

const normalizeStaffStatus = (status: unknown): StaffStatus => {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "inactive") return "inactive";
  if (normalizedStatus === "on-leave") return "on-leave";
  if (normalizedStatus === "terminated") return "terminated";
  return "active";
};

const isMissingStaffPositionsRelation = (message?: string) => {
  const normalizedMessage = String(message ?? "").toLowerCase();

  return (
    normalizedMessage.includes("staff_positions") ||
    normalizedMessage.includes("relationship") ||
    normalizedMessage.includes("schema cache")
  );
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const readIdentityFromRecord = (
  record: Record<string, unknown>,
): LoggedInStaffIdentity | null => {
  const identity: LoggedInStaffIdentity = {
    id: String(record.id ?? record.staff_id ?? record.staffId ?? ""),
    staffCode: String(
      record.staff_code ??
        record.staffCode ??
        record.staffCodeId ??
        record.code ??
        "",
    ),
    email: String(record.email ?? record.user_email ?? record.userEmail ?? ""),
    phone: String(
      record.phone ??
        record.whatsapp ??
        record.phone_number ??
        record.phoneNumber ??
        "",
    ),
    name: String(record.name ?? record.full_name ?? record.fullName ?? ""),
    role: String(record.role ?? record.user_role ?? record.userRole ?? ""),
  };

  if (
    identity.id ||
    identity.staffCode ||
    identity.email ||
    identity.phone ||
    identity.name
  ) {
    return identity;
  }

  return null;
};

const extractIdentity = (rawValue: string): LoggedInStaffIdentity | null => {
  const decodedValue = safeDecodeURIComponent(rawValue);

  try {
    const parsed = JSON.parse(decodedValue);
    const stack: unknown[] = [parsed];

    while (stack.length > 0) {
      const current = stack.shift();

      if (!current || typeof current !== "object") continue;

      const record = current as Record<string, unknown>;
      const directIdentity = readIdentityFromRecord(record);

      if (directIdentity) return directIdentity;

      for (const key of [
        "staff",
        "user",
        "currentStaff",
        "currentUser",
        "authUser",
        "loggedInStaff",
        "profile",
        "data",
      ]) {
        const nested = record[key];

        if (nested && typeof nested === "object") {
          stack.push(nested);
        }
      }
    }
  } catch {
    const textIdentity = decodedValue.trim();

    if (textIdentity) {
      return {
        ...createEmptyLoggedInStaffIdentity(),
        id: textIdentity,
        staffCode: textIdentity,
        email: textIdentity,
        phone: textIdentity,
        name: textIdentity,
      };
    }
  }

  return null;
};

const getStorageIdentity = (storage: Storage) => {
  const preferredKeys = [
    "staff",
    "currentStaff",
    "currentUser",
    "user",
    "authUser",
    "loggedInStaff",
    "iza_staff",
    "session",
    "auth",
    "profile",
  ];

  for (const key of preferredKeys) {
    const rawValue = storage.getItem(key);

    if (!rawValue) continue;

    const identity = extractIdentity(rawValue);

    if (identity) return identity;
  }

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (!key) continue;

    const normalizedKey = normalizeText(key);
    const isLikelyAuthKey =
      normalizedKey.includes("current") ||
      normalizedKey.includes("login") ||
      normalizedKey.includes("auth") ||
      normalizedKey.includes("session") ||
      normalizedKey.includes("user") ||
      normalizedKey.includes("staff");

    if (!isLikelyAuthKey) continue;

    const rawValue = storage.getItem(key);

    if (!rawValue) continue;

    const identity = extractIdentity(rawValue);

    if (identity) return identity;
  }

  return null;
};

const getCookieIdentity = () => {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const [rawKey, ...rawValueParts] = cookie.split("=");
    const key = normalizeText(rawKey);
    const value = rawValueParts.join("=");
    const isLikelyAuthCookie =
      key.includes("current") ||
      key.includes("login") ||
      key.includes("auth") ||
      key.includes("session") ||
      key.includes("user") ||
      key.includes("staff");

    if (!isLikelyAuthCookie) continue;

    const identity = extractIdentity(value);

    if (identity) return identity;
  }

  return null;
};

export default function StaffManagerPage() {
  const { t } = useLanguage();
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [, setShiftList] = useState<ShiftRecord[]>([]);
  const [viewMode, setViewMode] = useState<StaffViewMode>("card");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [activeTab, setActiveTab] = useState<StaffManagerTab>("staff");
  const [activeAttendanceTab, setActiveAttendanceTab] =
    useState<AttendanceTab>("monitor");
  const [attendanceBusinessDate, setAttendanceBusinessDate] =
    useState(getJakartaTodayDate());

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [currentStaffIdentity, setCurrentStaffIdentity] =
    useState<LoggedInStaffIdentity>(createEmptyLoggedInStaffIdentity);
  const [generatedLoginCode, setGeneratedLoginCode] =
    useState<GeneratedLoginCodeModal | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "card" || mode === "table") {
      setViewMode(mode);
    }
  };

  const fetchStaff = useCallback(async () => {
    const staffWithPositionsResult = await supabase
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
      .order("created_at", { ascending: true });

    let data = staffWithPositionsResult.data;
    let error = staffWithPositionsResult.error;

    if (error && isMissingStaffPositionsRelation(error.message)) {
      const legacyResult = await supabase
        .from("staff")
        .select("*")
        .order("created_at", { ascending: true });

      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      showError(t("owner.staff.fetchError", { message: error.message }));
      return;
    }

    const normalizedStaffList = (
      (data ?? []) as Array<StaffRecord & { login_code?: string | null }>
    ).map((staff) => {
      const positions = getStaffPositions(staff);
      const primaryPosition = getPrimaryStaffPosition(staff);

      return {
        ...staff,
        positions,
        primary_position: primaryPosition,
        staff_type: primaryPosition ?? staff.staff_type ?? null,
        login_code:
          typeof staff.login_code === "string" ? staff.login_code : undefined,
      };
    });

    setStaffList(normalizedStaffList);
  }, [t]);

  const fetchShifts = useCallback(async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select(
        "id, shift_name, start_time, check_in_grace_until, end_time, check_out_grace_until, description, is_active",
      )
      .order("start_time", { ascending: true });

    if (error) {
      showError(t("owner.staff.fetchShiftError", { message: error.message }));
      return;
    }

    setShiftList((data ?? []) as ShiftRecord[]);
  }, [t]);

  const refreshStaffAndShifts = useCallback(async () => {
    await Promise.all([fetchStaff(), fetchShifts()]);
  }, [fetchStaff, fetchShifts]);

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

    if (
      role === "staff" &&
      (operationalPositions.length === 0 ||
        !primaryPosition ||
        !operationalPositions.includes(primaryPosition))
    ) {
      throw new Error(
        "Pilih minimal satu posisi dan tentukan posisi utama.",
      );
    }

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
      const message = result.error || "Gagal menyimpan posisi staff.";

      if (isMissingStaffPositionsRelation(message)) {
        throw new Error(
          "Migration staff_positions belum diterapkan di Supabase.",
        );
      }

      throw new Error(message);
    }
  };

  const ensureStaffPositionsAvailable = async () => {
    const { error } = await supabase
      .from("staff_positions")
      .select("id")
      .limit(1);

    if (error) {
      if (isMissingStaffPositionsRelation(error.message)) {
        throw new Error(
          "Migration staff_positions belum diterapkan di Supabase.",
        );
      }

      throw new Error(error.message);
    }
  };

  useEffect(() => {
    refreshStaffAndShifts();
  }, [refreshStaffAndShifts]);

  useEffect(() => {
    const identity =
      getStorageIdentity(window.localStorage) ??
      getStorageIdentity(window.sessionStorage) ??
      getCookieIdentity() ??
      createEmptyLoggedInStaffIdentity();

    setCurrentStaffIdentity(identity);
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshStaffAndShifts, POLLING_INTERVALS.SLOW);
    return () => clearInterval(interval);
  }, [refreshStaffAndShifts]);

  const isCurrentLoggedInStaff = (staff: StaffRecord) => {
    const currentId = normalizeText(currentStaffIdentity.id);
    const currentStaffCode = normalizeText(currentStaffIdentity.staffCode);
    const currentEmail = normalizeText(currentStaffIdentity.email);
    const currentPhone = normalizeText(currentStaffIdentity.phone);
    const currentName = normalizeText(currentStaffIdentity.name);

    const staffId = normalizeText(staff.id);
    const staffCode = normalizeText(staff.staff_code);
    const staffEmail = normalizeText(staff.email);
    const staffPhone = normalizeText(staff.phone);
    const staffName = normalizeText(staff.name);

    return (
      (!!currentId && currentId === staffId) ||
      (!!currentStaffCode && currentStaffCode === staffCode) ||
      (!!currentEmail && currentEmail === staffEmail) ||
      (!!currentPhone && currentPhone === staffPhone) ||
      (!!currentName && currentName === staffName)
    );
  };

  const getStaffSortPriority = (staff: StaffRecord) => {
    const isCurrentUser = isCurrentLoggedInStaff(staff);
    const status = normalizeText(staff.status);
    const role = normalizeText(staff.role);

    if (isCurrentUser) return 0;
    if (status === "inactive") return 4;
    if (role === "owner") return 1;
    if (status === "active") return 2;

    return 3;
  };

  const sortedStaffList = [...staffList].sort((a, b) => {
    const priorityDiff = getStaffSortPriority(a) - getStaffSortPriority(b);

    if (priorityDiff !== 0) return priorityDiff;

    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  const getStaffTypeLabel = (staffType?: StaffType | null) => {
    if (staffType === "cashier") return "Cashier";
    if (staffType === "barista") return "Barista";
    if (staffType === "kitchen") return "Kitchen";
    if (staffType === "waiter") return "Waiter";

    return "";
  };

  const getRoleLabel = (role?: string | null) => {
    const normalizedRole = normalizeText(role);

    if (normalizedRole === "owner") return "Owner";
    if (normalizedRole === "manager") return "Manager";
    if (normalizedRole === "staff") return "Staff";

    return String(role ?? "");
  };

  const getStatusLabel = (status?: string | null) => {
    const normalizedStatus = normalizeText(status);

    if (normalizedStatus === "active") return "Active";
    if (normalizedStatus === "inactive") return "Inactive";
    if (normalizedStatus === "on-leave") return "On Leave";
    if (normalizedStatus === "terminated") return "Terminated";

    return String(status ?? "");
  };

  const staffMatchesSearch = (staff: StaffRecord) => {
    const normalizedSearchQuery = normalizeText(staffSearchQuery);

    if (!normalizedSearchQuery) return true;

    const searchableValues = [
      staff.name,
      staff.staff_code,
      staff.email,
      staff.phone,
      staff.role,
      getRoleLabel(staff.role),
      staff.staff_type,
      getStaffTypeLabel(staff.staff_type),
      ...getStaffPositions(staff).map(getStaffPositionLabel),
      staff.status,
      getStatusLabel(staff.status),
      staff.pin_hash || staff.password_hash ? "access active" : "not activated",
      staff.must_change_pin ? "reset pin" : "",
      staff.login_code && staff.login_code_expires_at ? "active login code" : "",
    ];

    return searchableValues.some((value) =>
      normalizeText(value).includes(normalizedSearchQuery),
    );
  };

  const visibleStaffList = sortedStaffList
    .filter((staff) => normalizeText(staff.status) !== "terminated")
    .filter(staffMatchesSearch);

  const visibleStaffListForTable: Staff[] = visibleStaffList.map((staff) => ({
    ...staff,
    login_code: undefined,
  }));

  const staffManagerTabs = useMemo(() => [
    {
      id: "staff" as const,
      label: t("owner.staff.data"),
      description: t("owner.staff.dataDescription"),
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
  ], [t]);

  const attendanceDateRangeProps = {
    dateRangeMode: "custom" as const,
    customStartDate: attendanceBusinessDate,
    customEndDate: attendanceBusinessDate,
  };

  const canDeleteStaff = (staff: StaffRecord) => {
    const isCurrentUser = isCurrentLoggedInStaff(staff);
    const isOwner = normalizeText(staff.role) === "owner";

    return !isCurrentUser && !isOwner;
  };

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopyMsg("Code copied.");
    setTimeout(() => setCopyMsg(""), TIMEOUT_DURATIONS.SHORT);
  };

  const formatLoginCodeExpiry = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

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
        throw new Error(result.error || t("owner.staff.loginCodeCreateError"));
      }

      await fetchStaff();
      await handleCopy(result.login_code);

      setGeneratedLoginCode({
        staffName: result.staff_name || "Staff",
        staffCode: result.staff_code || "-",
        loginCode: result.login_code,
        expiresAt: result.expires_at,
      });

      showSuccess(t("owner.staff.loginCodeCreated"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("owner.staff.loginCodeCreateError");

      showError(message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDelete = async (id: string) => {
    const staff = staffList.find((item) => item.id === id);

    if (!staff) return;

    if (!canDeleteStaff(staff)) {
      showError(t("owner.staff.deleteNotAllowed"));
      return;
    }

    setSelectedStaff(staff);
    setShowDeleteModal(true);
  };

  const confirmDeleteStaff = async () => {
    if (!selectedStaff) return;

    if (!canDeleteStaff(selectedStaff)) {
      showError(t("owner.staff.deleteNotAllowed"));
      setShowDeleteModal(false);
      setSelectedStaff(null);
      return;
    }

    const previousValue = {
      name: selectedStaff.name,
      staff_code: selectedStaff.staff_code,
      role: selectedStaff.role,
      staff_type: selectedStaff.staff_type,
      positions: getStaffPositions(selectedStaff),
      primary_position: getPrimaryStaffPosition(selectedStaff),
      status: selectedStaff.status,
    };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("staff")
      .update({
        status: "terminated",
        // staff_type column was dropped (migration 202606240007)
        login_code: null,
        login_code_expires_at: null,
        login_code_created_at: null,
        pin_hash: null,
        must_change_pin: false,
        updated_at: now,
      })
      .eq("id", selectedStaff.id);

    if (error) {
      showError(t("owner.staff.deleteError", { message: error.message }));
      return;
    }

    await Promise.allSettled([
      supabase.from("staff_positions").delete().eq("staff_id", selectedStaff.id),
      supabase
        .from("staff_shift_weekly_assignments")
        .delete()
        .eq("staff_id", selectedStaff.id),
      supabase
        .from("staff_shift_daily_assignments")
        .delete()
        .eq("staff_id", selectedStaff.id),
    ]);

    await fetchStaff();
    setShowDeleteModal(false);
    showSuccess(t("owner.staff.deleted"));

    await logActivity({
      action: "DELETE",
      category: "STAFF",
      description: `Deleted staff: ${selectedStaff.name} (${selectedStaff.staff_code})`,
      resourceType: "Staff",
      resourceId: selectedStaff.id,
      resourceName: selectedStaff.name,
      previousValue,
      severity: "critical",
      tags: ["staff", "delete"],
      isReversible: false,
    });

    setSelectedStaff(null);
  };

  const handleEdit = async (id: string) => {
    const staff = staffList.find((item) => item.id === id);

    if (staff) {
      setSelectedStaff(staff as unknown as Staff);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async (updatedStaff: Staff) => {
    const staffToUpdate = updatedStaff as StaffRecord;
    const oldStaff = staffList.find((item) => item.id === staffToUpdate.id);
    const selectedRole = normalizeStaffRole(staffToUpdate.role);
    const selectedPositions =
      selectedRole === "staff"
        ? normalizeStaffPositions(staffToUpdate.positions)
        : [];
    const selectedStaffType =
      selectedRole === "staff"
        ? normalizeStaffType(
            staffToUpdate.primary_position ?? staffToUpdate.staff_type,
            selectedRole,
          )
        : null;
    const selectedStatus = normalizeStaffStatus(staffToUpdate.status);

    await ensureStaffPositionsAvailable();

    const { error } = await supabase
      .from("staff")
      .update({
        name: staffToUpdate.name,
        email: staffToUpdate.email || null,
        phone: staffToUpdate.phone || null,
        role: selectedRole,
        // staff_type column was dropped (migration 202606240007) — updated via set_staff_positions RPC below
        status: selectedStatus,
      })
      .eq("id", staffToUpdate.id);

    if (error) {
      showError(t("owner.staff.updateError", { message: error.message }));
      throw new Error(error.message);
    }

    try {
      await persistStaffPositions({
        staffId: staffToUpdate.id,
        role: selectedRole,
        positions: selectedPositions,
        primaryPosition: selectedStaffType,
      });
    } catch (positionError) {
      const message =
        positionError instanceof Error
          ? positionError.message
          : "Gagal menyimpan posisi staff.";

      showError(message);
      throw positionError;
    }

    await fetchStaff();
    setShowEditModal(false);
    setSelectedStaff(null);
    showSuccess(t("owner.staff.updated"));

    if (oldStaff) {
      await logActivity({
        action: "UPDATE",
        category: "STAFF",
        description: `Updated staff: ${staffToUpdate.name} (${staffToUpdate.staff_code})`,
        resourceType: "Staff",
        resourceId: staffToUpdate.id,
        resourceName: staffToUpdate.name,
        previousValue: {
          name: oldStaff.name,
          email: oldStaff.email,
          phone: oldStaff.phone,
          role: oldStaff.role,
          staff_type: oldStaff.staff_type,
          positions: getStaffPositions(oldStaff),
          primary_position: getPrimaryStaffPosition(oldStaff),
          status: oldStaff.status,
        },
        newValue: {
          name: staffToUpdate.name,
          email: staffToUpdate.email,
          phone: staffToUpdate.phone,
          role: selectedRole,
          staff_type: selectedStaffType,
          positions: selectedPositions,
          primary_position: selectedStaffType,
          status: selectedStatus,
        },
        severity: "info",
        tags: ["staff", "update"],
      });
    }
  };

  const getStaffCodePrefix = (role: StaffRole) => {
    if (role === "owner") return "OWN";
    if (role === "manager") return "MGR";
    return "STF";
  };

  const generateUniqueStaffCode = async (role: StaffRole) => {
    const prefix = getStaffCodePrefix(role);

    const { data, error } = await supabase
      .from("staff")
      .select("staff_code")
      .ilike("staff_code", `${prefix}%`);

    if (error) {
      throw new Error(t("owner.staff.codesFetchError", { message: error.message }));
    }

    const usedNumbers = new Set(
      (data ?? [])
        .map((item) => item.staff_code)
        .filter((code): code is string => typeof code === "string")
        .map((code) => Number.parseInt(code.replace(prefix, ""), 10))
        .filter((number) => Number.isFinite(number)),
    );

    let nextNumber = 1;

    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1;
    }

    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  };

  const handleAddStaff = async (staffData: NewStaffData) => {
    try {
      const staffPayload = staffData as unknown as StaffFormPayload;
      const selectedRole = normalizeStaffRole(staffPayload.role);
      const selectedPositions =
        selectedRole === "staff"
          ? normalizeStaffPositions(staffPayload.positions)
          : [];
      const selectedStaffType =
        selectedRole === "staff"
          ? normalizeStaffType(
              staffPayload.primary_position ?? staffPayload.staff_type,
              selectedRole,
            )
          : null;
      const staffCode = await generateUniqueStaffCode(selectedRole);

      await ensureStaffPositionsAvailable();

      const newStaffData: StaffInsert = {
        staff_code: staffCode,
        name: staffData.name,
        email: staffData.email || null,
        phone: staffData.phone || null,
        role: selectedRole,
        // staff_type column was dropped; positions set via persistStaffPositions below
        status: "active",
        hired_date: new Date().toISOString().split("T")[0],
      };

      const roleCanLogin = STAFF_ROLES_WITH_LOGIN.includes(selectedRole);

      if (roleCanLogin && staffPayload.password) {
        newStaffData.password_hash = await bcrypt.hash(
          staffPayload.password,
          10,
        );
      }

      const { data: insertedStaff, error } = await supabase
        .from("staff")
        .insert([newStaffData])
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(t("owner.staff.codeUsed"));
        }

        throw new Error(error.message);
      }

      if (insertedStaff?.id) {
        try {
          await persistStaffPositions({
            staffId: insertedStaff.id,
            role: selectedRole,
            positions: selectedPositions,
            primaryPosition: selectedStaffType,
          });
        } catch (positionError) {
          await supabase.from("staff").delete().eq("id", insertedStaff.id);
          throw positionError;
        }
      }

      await fetchStaff();
      setShowAddModal(false);
      showSuccess(t("owner.staff.added"));

      if (insertedStaff?.id && selectedRole === "staff") {
        await handleGeneratePass(insertedStaff.id);
      }

      await logActivity({
        action: "CREATE",
        category: "STAFF",
        description: `Created new staff: ${staffData.name} (${staffCode})`,
        resourceType: "Staff",
        resourceId: insertedStaff?.id || staffCode,
        resourceName: staffData.name,
        newValue: {
          name: staffData.name,
          staff_code: staffCode,
          role: selectedRole,
          staff_type: selectedStaffType,
          positions: selectedPositions,
          primary_position: selectedStaffType,
        },
        severity: "info",
        tags: ["staff", "create"],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("owner.staff.unknownError");

      showError(t("owner.staff.addError", { message }));
      throw error instanceof Error ? error : new Error(message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-55px)] overflow-hidden bg-gray-100">
      <SidebarTabset
        title={t("owner.staff.managerTitle")}
        description={t("owner.staff.managerDescription")}
        items={staffManagerTabs}
        activeId={activeTab}
        activeChildId={activeTab === "attendance" ? activeAttendanceTab : undefined}
        onSelect={(tab) => setActiveTab(tab)}
        onChildSelect={(tab, child) => {
          setActiveTab(tab);
          setActiveAttendanceTab(child);
        }}
        mobileOpenLabel={t("owner.staff.mobileOpen")}
        mobileCloseLabel={t("owner.staff.mobileClose")}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {activeTab === "staff" && (
        <section className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 md:px-6">
          <StaffManagerHeader
            onAddStaff={() => setShowAddModal(true)}
            activeTab={activeTab}
            searchQuery={staffSearchQuery}
            onSearchChange={setStaffSearchQuery}
          >
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              showMapView={false}
            />
          </StaffManagerHeader>
        </section>
      )}

      <section className="flex-1 overflow-y-auto bg-gray-100 px-4 md:px-4 py-4 md:py-4 mb-4">
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
            {viewMode === "card" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {visibleStaffList.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    onEdit={() => handleEdit(staff.id)}
                    onDelete={
                      canDeleteStaff(staff)
                        ? () => handleDelete(staff.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {viewMode === "table" && (
              <div className="h-full">
                <StaffTable
                  staffList={visibleStaffListForTable}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            )}

            {visibleStaffList.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {staffSearchQuery
                    ? "No staff found"
                    : t("owner.staff.noStaffData")}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "attendance" && activeAttendanceTab !== "roster" && (
          <AttendanceSection
            viewMode="table"
            dateRangeMode={attendanceDateRangeProps.dateRangeMode}
            customStartDate={attendanceDateRangeProps.customStartDate}
            customEndDate={attendanceDateRangeProps.customEndDate}
            section={activeAttendanceTab === "monitor" ? "monitor" : "settings"}
            requester={
              currentStaffIdentity.id
                ? currentStaffIdentity
                : null
            }
            onShiftChanged={refreshStaffAndShifts}
          />
        )}

        {activeTab === "attendance" && activeAttendanceTab === "roster" && (
          <WeeklyScheduleSection />
        )}
      </section>
      </div>

      {copyMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
          {copyMsg}
        </div>
      )}

      {generatedLoginCode && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t("owner.staff.loginCode")}
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                {generatedLoginCode.staffName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t("owner.staff.staffId", { code: generatedLoginCode.staffCode })}
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
                Valid until{" "}
                {formatLoginCodeExpiry(generatedLoginCode.expiresAt)}
              </p>
            </div>

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Share this code only with the assigned staff member. After the
              staff member creates a PIN, the code can no longer be used.
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

      <EditStaffModal
        isOpen={showEditModal}
        staff={selectedStaff}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaff(null);
        }}
        onSave={handleSaveEdit}
        onGeneratePass={handleGeneratePass}
        onCopyCode={handleCopy}
        isGeneratingCode={isGeneratingCode}
      />

      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddStaff}
        />
      )}

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedStaff(null);
        }}
        onConfirm={confirmDeleteStaff}
        title={t("owner.staff.deleteStaff")}
        itemName={selectedStaff?.name || ""}
        description={t("owner.staff.deleteDescription")}
        confirmText={t("owner.staff.delete")}
        cancelText={t("owner.bookkeeping.cancel")}
      />
    </div>
  );
}
