"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ViewModeToggle, DeleteModal } from "@/app/components/ui";
import { StaffCard, StaffTable } from "@/app/components/shared";
import {
  StaffManagerHeader,
  EditStaffModal,
  AddStaffModal,
} from "@/app/components/owner/staffmanager";
import AttendanceSection from "@/app/components/owner/staffmanager/AttendanceSection";
import type { ViewMode } from "@/app/components/ui/Common/ViewModeToggle";
import type { NewStaffData } from "@/app/components/owner/staffmanager/AddStaffModal";
import bcrypt from "bcryptjs";
import { POLLING_INTERVALS, TIMEOUT_DURATIONS } from "@/lib/constants";
import { showSuccess, showError } from "@/lib/services/errorHandling";
import { logActivity } from "@/lib/services/activity/activityLogger";
import type { Staff } from "@/lib/types";
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

type StaffRole = "staff" | "manager" | "owner";
type StaffViewMode = "card" | "table";
type StaffType = "barista" | "kitchen" | "cashier" | "waiter";
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
  shift_id?: string | null;
  shift?: ShiftRecord | null;
};

type StaffInsert = {
  staff_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  staff_type: StaffType | null;
  shift_id: string | null;
  status: "active";
  hired_date: string;
  password_hash?: string;
};

type StaffFormPayload = Omit<
  NewStaffData,
  "role" | "staff_type" | "password" | "shift_id"
> & {
  role?: unknown;
  staff_type?: StaffType | null;
  shift_id?: string | null;
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

const normalizeShiftId = (value: unknown, role: StaffRole) => {
  if (role === "owner") return null;

  const text = String(value ?? "").trim();

  return text ? text : null;
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
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [shiftList, setShiftList] = useState<ShiftRecord[]>([]);
  const [viewMode, setViewMode] = useState<StaffViewMode>("card");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"staff" | "presensi">("staff");
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dateRangeMode, setDateRangeMode] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("today");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const dateDropdownRef = useRef<HTMLDivElement>(null);

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
    const { data, error } = await supabase
      .from("staff")
      .select(
        `
          *,
          shift:staff_shift_id_fkey (
            id,
            shift_name,
            start_time,
            check_in_grace_until,
            end_time,
            check_out_grace_until,
            description,
            is_active
          )
        `,
      )
      .order("created_at", { ascending: true });

    if (error) {
      showError("Gagal mengambil data staff: " + error.message);
      return;
    }

    const normalizedStaffList = (
      (data ?? []) as Array<StaffRecord & { login_code?: string | null }>
    ).map((staff) => ({
      ...staff,
      login_code:
        typeof staff.login_code === "string" ? staff.login_code : undefined,
    }));

    setStaffList(normalizedStaffList);
  }, []);

  const fetchShifts = useCallback(async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select(
        "id, shift_name, start_time, check_in_grace_until, end_time, check_out_grace_until, description, is_active",
      )
      .order("start_time", { ascending: true });

    if (error) {
      showError("Gagal mengambil data shift: " + error.message);
      return;
    }

    setShiftList((data ?? []) as ShiftRecord[]);
  }, []);

  const refreshStaffAndShifts = useCallback(async () => {
    await Promise.all([fetchStaff(), fetchShifts()]);
  }, [fetchStaff, fetchShifts]);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (staffType === "cashier") return "Kasir Cashier";
    if (staffType === "barista") return "Barista";
    if (staffType === "kitchen") return "Kitchen Dapur";
    if (staffType === "waiter") return "Waiter Pelayan";

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

    if (normalizedStatus === "active") return "Active Aktif";
    if (normalizedStatus === "inactive") return "Inactive Nonaktif";
    if (normalizedStatus === "on-leave") return "On Leave Cuti";
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
      staff.status,
      getStatusLabel(staff.status),
      staff.pin_hash || staff.password_hash ? "akses aktif" : "belum aktivasi",
      staff.must_change_pin ? "reset pin" : "",
      staff.login_code && staff.login_code_expires_at ? "kode login aktif" : "",
      staff.shift?.shift_name,
      staff.shift_id,
    ];

    return searchableValues.some((value) =>
      normalizeText(value).includes(normalizedSearchQuery),
    );
  };

  const visibleStaffList = sortedStaffList.filter(staffMatchesSearch);

  const visibleStaffListForTable: Staff[] = visibleStaffList.map((staff) => ({
    ...staff,
    login_code: undefined,
  }));

  const canDeleteStaff = (staff: StaffRecord) => {
    const isCurrentUser = isCurrentLoggedInStaff(staff);
    const isOwner = normalizeText(staff.role) === "owner";

    return !isCurrentUser && !isOwner;
  };

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopyMsg("Kode berhasil disalin!");
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
        throw new Error(result.error || "Gagal membuat kode login.");
      }

      await fetchStaff();
      await handleCopy(result.login_code);

      setGeneratedLoginCode({
        staffName: result.staff_name || "Staff",
        staffCode: result.staff_code || "-",
        loginCode: result.login_code,
        expiresAt: result.expires_at,
      });

      showSuccess("Kode login staff berhasil dibuat.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal membuat kode login.";

      showError(message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDelete = async (id: string) => {
    const staff = staffList.find((item) => item.id === id);

    if (!staff) return;

    if (!canDeleteStaff(staff)) {
      showError(
        "Akun owner atau akun yang sedang digunakan tidak boleh dihapus.",
      );
      return;
    }

    setSelectedStaff(staff);
    setShowDeleteModal(true);
  };

  const confirmDeleteStaff = async () => {
    if (!selectedStaff) return;

    if (!canDeleteStaff(selectedStaff)) {
      showError(
        "Akun owner atau akun yang sedang digunakan tidak boleh dihapus.",
      );
      setShowDeleteModal(false);
      setSelectedStaff(null);
      return;
    }

    const previousValue = {
      name: selectedStaff.name,
      staff_code: selectedStaff.staff_code,
      role: selectedStaff.role,
      staff_type: selectedStaff.staff_type,
      status: selectedStaff.status,
      shift_id: selectedStaff.shift_id,
    };

    const { error: activityLogError } = await supabase
      .from("activity_logs")
      .delete()
      .eq("user_id", selectedStaff.id);

    if (activityLogError) {
      showError("Gagal menghapus log staff: " + activityLogError.message);
      return;
    }

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", selectedStaff.id);

    if (error) {
      showError("Gagal menghapus staff: " + error.message);
      return;
    }

    await fetchStaff();
    setShowDeleteModal(false);
    showSuccess("Staff berhasil dihapus");

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

  const handleEdit = (id: string) => {
    const staff = staffList.find((item) => item.id === id);

    if (staff) {
      setSelectedStaff(staff);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async (updatedStaff: Staff) => {
    const staffToUpdate = updatedStaff as StaffRecord;
    const oldStaff = staffList.find((item) => item.id === staffToUpdate.id);
    const selectedRole = normalizeStaffRole(staffToUpdate.role);
    const selectedStaffType = normalizeStaffType(
      staffToUpdate.staff_type,
      selectedRole,
    );
    const selectedShiftId = normalizeShiftId(
      staffToUpdate.shift_id,
      selectedRole,
    );
    const selectedStatus = normalizeStaffStatus(staffToUpdate.status);

    const { error } = await supabase
      .from("staff")
      .update({
        name: staffToUpdate.name,
        email: staffToUpdate.email || null,
        phone: staffToUpdate.phone || null,
        role: selectedRole,
        staff_type: selectedStaffType,
        shift_id: selectedShiftId,
        status: selectedStatus,
      })
      .eq("id", staffToUpdate.id);

    if (error) {
      showError("Gagal update staff: " + error.message);
      return;
    }

    await fetchStaff();
    setShowEditModal(false);
    setSelectedStaff(null);
    showSuccess("Data staff berhasil diupdate");

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
          shift_id: oldStaff.shift_id,
          status: oldStaff.status,
        },
        newValue: {
          name: staffToUpdate.name,
          email: staffToUpdate.email,
          phone: staffToUpdate.phone,
          role: selectedRole,
          staff_type: selectedStaffType,
          shift_id: selectedShiftId,
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
      throw new Error(`Gagal mengambil kode staff: ${error.message}`);
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
      const selectedStaffType = normalizeStaffType(
        staffPayload.staff_type,
        selectedRole,
      );
      const selectedShiftId = normalizeShiftId(
        staffPayload.shift_id,
        selectedRole,
      );
      const staffCode = await generateUniqueStaffCode(selectedRole);

      const newStaffData: StaffInsert = {
        staff_code: staffCode,
        name: staffData.name,
        email: staffData.email || null,
        phone: staffData.phone || null,
        role: selectedRole,
        staff_type: selectedStaffType,
        shift_id: selectedShiftId,
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
          showError("Kode staff sudah dipakai. Silakan coba simpan ulang.");
          return;
        }

        showError("Gagal menambahkan staff: " + error.message);
        return;
      }

      await fetchStaff();
      setShowAddModal(false);
      showSuccess("Staff berhasil ditambahkan");

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
          shift_id: selectedShiftId,
        },
        severity: "info",
        tags: ["staff", "create"],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak diketahui";

      showError("Gagal menambahkan staff: " + message);
    }
  };

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      <section className="shrink-0 px-4 md:px-6 pt-4 md:pt-6 bg-white border-b border-gray-200">
        <StaffManagerHeader
          title={activeTab === "staff" ? "Staff Manager" : "Presensi Staff"}
          description={
            activeTab === "staff"
              ? "Kelola data staff, role, shift, status, dan kode login."
              : "Pantau clock in dan clock out staff berdasarkan shift."
          }
          onAddStaff={() => setShowAddModal(true)}
          activeTab={activeTab}
          searchQuery={staffSearchQuery}
          onSearchChange={setStaffSearchQuery}
        >
          {activeTab === "presensi" && (
            <div className="relative" ref={dateDropdownRef}>
              <button
                type="button"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 h-9.5 md:h-10.5 px-3 md:px-4 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="font-medium">
                  {dateRangeMode === "all" && "All Time"}
                  {dateRangeMode === "today" && "Today"}
                  {dateRangeMode === "week" && "This Week (Last 7 Days)"}
                  {dateRangeMode === "month" && "This Month (Last 30 Days)"}
                  {dateRangeMode === "custom" && "Custom Range"}
                </span>
              </button>

              {showDateDropdown && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDateRangeMode("all");
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                        dateRangeMode === "all"
                          ? "bg-gray-900 text-white"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      All Time
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDateRangeMode("today");
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition mt-1 ${
                        dateRangeMode === "today"
                          ? "bg-gray-100 text-gray-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      Today
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDateRangeMode("week");
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition mt-1 ${
                        dateRangeMode === "week"
                          ? "bg-gray-100 text-gray-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      This Week (Last 7 Days)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDateRangeMode("month");
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition mt-1 ${
                        dateRangeMode === "month"
                          ? "bg-gray-100 text-gray-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      This Month (Last 30 Days)
                    </button>
                  </div>

                  <div className="border-t border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
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
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>

                      <div className="relative">
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(event) =>
                            setCustomEndDate(event.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                        className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={() => setShowTabDropdown(!showTabDropdown)}
              className="flex items-center gap-2 h-9.5 md:h-10.5 px-3 md:px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition"
            >
              {activeTab === "staff" ? (
                <>
                  <UsersIcon className="w-4 md:w-5 h-4 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">
                    Data Staff
                  </span>
                </>
              ) : (
                <>
                  <ClockIcon className="w-4 md:w-5 h-4 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">
                    Presensi
                  </span>
                </>
              )}
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            {showTabDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("staff");
                    setShowTabDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    activeTab === "staff"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <UsersIcon className="w-4 h-4" />
                  Data Staff
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("presensi");
                    setShowTabDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    activeTab === "presensi"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <ClockIcon className="w-4 h-4" />
                  Presensi Staff
                </button>
              </div>
            )}
          </div>
        </StaffManagerHeader>
      </section>

      <section className="flex-1 overflow-y-auto bg-gray-100 px-4 md:px-6 py-4 md:py-6">
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
                    onGeneratePass={() => handleGeneratePass(staff.id)}
                    onCopyCode={handleCopy}
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
                  onGeneratePass={handleGeneratePass}
                  onCopyCode={handleCopy}
                />
              </div>
            )}

            {visibleStaffList.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {staffSearchQuery
                    ? "Staff tidak ditemukan"
                    : "Belum ada data staff"}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "presensi" && (
          <AttendanceSection
            viewMode="table"
            dateRangeMode={dateRangeMode}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onShiftChanged={refreshStaffAndShifts}
          />
        )}
      </section>

      {copyMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
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
                Berlaku sampai{" "}
                {formatLoginCodeExpiry(generatedLoginCode.expiresAt)}
              </p>
            </div>

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Berikan kode ini hanya kepada staff terkait. Setelah staff membuat
              PIN, kode ini otomatis tidak bisa dipakai lagi.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleCopy(generatedLoginCode.loginCode)}
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

      <EditStaffModal
        isOpen={showEditModal}
        staff={selectedStaff}
        shifts={shiftList}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaff(null);
        }}
        onSave={handleSaveEdit}
      />

      {showAddModal && (
        <AddStaffModal
          shifts={shiftList}
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
        title="Hapus Staff"
        itemName={selectedStaff?.name || ""}
        description="Staff yang dihapus tidak dapat dikembalikan. Apakah Anda yakin?"
        confirmText="Hapus"
        cancelText="Batal"
      />
    </div>
  );
}