
"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ViewMode = "card" | "table";
type DateRangeMode = "all" | "today" | "week" | "month" | "custom";
export type AttendanceSectionView = "monitor" | "settings";
type CheckInStatus = "early" | "on_time" | "late" | null;
type CheckOutStatus = "early_leave" | "on_time" | "overtime" | null;

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
  is_active?: boolean | null;
};

type ShiftFormData = {
  shift_name: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
  is_active: boolean;
};

type StoreSettingsRecord = {
  id: string;
  store_name: string;
  store_latitude: number | null;
  store_longitude: number | null;
  attendance_radius_meters: number;
  is_active: boolean;
};

type StoreSettingsFormData = {
  store_name: string;
  store_latitude: string;
  store_longitude: string;
  attendance_radius_meters: string;
};

type AttendanceStaff = {
  id: string;
  name: string;
  staff_code: string;
  staff_type?: string | null;
  role?: string | null;
};

type ActiveStaffRecord = AttendanceStaff & {
  shift_id: string | null;
};

type AttendanceShift = {
  id: string;
  shift_name: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
};

type AttendanceRecord = {
  id: string;
  staff_id: string;
  shift_id: string | null;
  attendance_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  check_in_status: CheckInStatus;
  check_out_status: CheckOutStatus;
  clock_in_distance_meters?: number | string | null;
  clock_out_distance_meters?: number | string | null;
  late_reason?: string | null;
  early_leave_reason?: string | null;
  overtime_reason?: string | null;
  notes?: string | null;
  staff: AttendanceStaff | null;
  shift: AttendanceShift | null;
};

type RawAttendanceRecord = {
  id?: unknown;
  staff_id?: unknown;
  shift_id?: unknown;
  attendance_date?: unknown;
  clock_in_at?: unknown;
  clock_out_at?: unknown;
  check_in_status?: unknown;
  check_out_status?: unknown;
  clock_in_distance_meters?: unknown;
  clock_out_distance_meters?: unknown;
  late_reason?: unknown;
  early_leave_reason?: unknown;
  overtime_reason?: unknown;
  notes?: unknown;
  staff?: unknown;
  shift?: unknown;
};

interface AttendanceSectionProps {
  onClose?: () => void;
  viewMode?: ViewMode;
  dateRangeMode?: DateRangeMode;
  customStartDate?: string;
  customEndDate?: string;
  onShiftChanged?: () => void | Promise<void>;
  section?: AttendanceSectionView;
}

const EMPTY_SHIFT_FORM: ShiftFormData = {
  shift_name: "",
  start_time: "08:00",
  check_in_grace_until: "08:15",
  end_time: "15:00",
  check_out_grace_until: "15:15",
  is_active: true,
};

const EMPTY_STORE_SETTINGS_FORM: StoreSettingsFormData = {
  store_name: "Coffee Shop",
  store_latitude: "",
  store_longitude: "",
  attendance_radius_meters: "150",
};

type AttendanceDataSnapshot = {
  shiftList: ShiftRecord[];
  staffList: ActiveStaffRecord[];
  storeSettings: StoreSettingsRecord | null;
  storeFormData: StoreSettingsFormData;
  attendanceList: AttendanceRecord[];
};

type AttendanceFetchParams = {
  dateRangeMode: DateRangeMode;
  customStartDate: string;
  customEndDate: string;
  force?: boolean;
};

const FETCH_CACHE_TTL_MS = 5000;

let attendanceDataCache: AttendanceDataSnapshot | null = null;
let attendanceDataCacheKey = "";
let attendanceDataCacheAt = 0;
let attendanceFetchPromise: Promise<AttendanceDataSnapshot> | null = null;
let attendanceFetchPromiseKey = "";

const getAttendanceFetchKey = ({
  dateRangeMode,
  customStartDate,
  customEndDate,
}: AttendanceFetchParams) => {
  return `${dateRangeMode}|${customStartDate}|${customEndDate}`;
};

const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

const toNullableString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value : null;
};

const toNullableNumberOrString = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return value;
  return null;
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

const normalizeCheckInStatus = (value: unknown): CheckInStatus => {
  if (value === "early") return "early";
  if (value === "on_time") return "on_time";
  if (value === "late") return "late";
  return null;
};

const normalizeCheckOutStatus = (value: unknown): CheckOutStatus => {
  if (value === "early_leave") return "early_leave";
  if (value === "on_time") return "on_time";
  if (value === "overtime") return "overtime";
  return null;
};

const normalizeStaff = (value: unknown): AttendanceStaff | null => {
  const staff = getSingleRelation<Record<string, unknown>>(value);

  if (!staff) return null;

  const id = toSafeString(staff.id);
  const name = toSafeString(staff.name);
  const staffCode = toSafeString(staff.staff_code);

  if (!id || !name || !staffCode) return null;

  return {
    id,
    name,
    staff_code: staffCode,
    staff_type: toNullableString(staff.staff_type),
    role: toNullableString(staff.role),
  };
};

const normalizeActiveStaff = (value: unknown): ActiveStaffRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const staff = value as Record<string, unknown>;
  const id = toSafeString(staff.id);
  const name = toSafeString(staff.name);
  const staffCode = toSafeString(staff.staff_code);

  if (!id || !name || !staffCode) return null;

  return {
    id,
    name,
    staff_code: staffCode,
    staff_type: toNullableString(staff.staff_type),
    role: toNullableString(staff.role),
    shift_id: toNullableString(staff.shift_id),
  };
};

const normalizeShift = (value: unknown): AttendanceShift | null => {
  const shift = getSingleRelation<Record<string, unknown>>(value);

  if (!shift) return null;

  const id = toSafeString(shift.id);
  const shiftName = toSafeString(shift.shift_name);
  const startTime = toSafeString(shift.start_time);
  const checkInGraceUntil = toSafeString(shift.check_in_grace_until);
  const endTime = toSafeString(shift.end_time);
  const checkOutGraceUntil = toSafeString(shift.check_out_grace_until);

  if (!id || !shiftName) return null;

  return {
    id,
    shift_name: shiftName,
    start_time: startTime,
    check_in_grace_until: checkInGraceUntil,
    end_time: endTime,
    check_out_grace_until: checkOutGraceUntil,
  };
};

const normalizeAttendanceRecord = (
  rawRecord: RawAttendanceRecord,
): AttendanceRecord => {
  return {
    id: toSafeString(rawRecord.id),
    staff_id: toSafeString(rawRecord.staff_id),
    shift_id: toNullableString(rawRecord.shift_id),
    attendance_date: toSafeString(rawRecord.attendance_date),
    clock_in_at: toNullableString(rawRecord.clock_in_at),
    clock_out_at: toNullableString(rawRecord.clock_out_at),
    check_in_status: normalizeCheckInStatus(rawRecord.check_in_status),
    check_out_status: normalizeCheckOutStatus(rawRecord.check_out_status),
    clock_in_distance_meters: toNullableNumberOrString(
      rawRecord.clock_in_distance_meters,
    ),
    clock_out_distance_meters: toNullableNumberOrString(
      rawRecord.clock_out_distance_meters,
    ),
    late_reason: toNullableString(rawRecord.late_reason),
    early_leave_reason: toNullableString(rawRecord.early_leave_reason),
    overtime_reason: toNullableString(rawRecord.overtime_reason),
    notes: toNullableString(rawRecord.notes),
    staff: normalizeStaff(rawRecord.staff),
    shift: normalizeShift(rawRecord.shift),
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";

  return value.slice(0, 5);
};

const formatDistance = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "-";

  const distance = Number(value);

  if (Number.isNaN(distance)) return "-";

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`;
  }

  return `${Math.round(distance)} m`;
};

const toTitleCase = (value?: string | null) => {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getCheckInStatusLabel = (status: CheckInStatus) => {
  if (status === "early") return "Early Arrival";
  if (status === "on_time") return "On-Time Clock In";
  if (status === "late") return "Late";
  return "Not Clocked In";
};

const getCheckOutStatusLabel = (status: CheckOutStatus) => {
  if (status === "early_leave") return "Early Leave";
  if (status === "on_time") return "On-Time Clock Out";
  if (status === "overtime") return "Overtime";
  return "Not Clocked Out";
};

const getCheckInStatusClassName = (status: CheckInStatus) => {
  if (status === "late") return OWNER_SEMANTIC_TONES.danger.badgeClass;
  if (status === "early") return OWNER_SEMANTIC_TONES.info.badgeClass;
  if (status === "on_time") return OWNER_SEMANTIC_TONES.success.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const getCheckOutStatusClassName = (status: CheckOutStatus) => {
  if (status === "early_leave") {
    return OWNER_SEMANTIC_TONES.warning.badgeClass;
  }

  if (status === "overtime") {
    return OWNER_SEMANTIC_TONES.premium.badgeClass;
  }

  if (status === "on_time") {
    return OWNER_SEMANTIC_TONES.success.badgeClass;
  }

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const getJakartaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
};

const addDaysToDateString = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return getJakartaDateString(date);
};

const addMonthsToDateString = (dateString: string, months: number) => {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return getJakartaDateString(date);
};

const getDateRange = (
  dateRangeMode: DateRangeMode,
  customStartDate: string,
  customEndDate: string,
) => {
  const today = getJakartaDateString();

  if (dateRangeMode === "today") {
    return {
      startDate: today,
      endDate: today,
    };
  }

  if (dateRangeMode === "week") {
    return {
      startDate: addDaysToDateString(today, -7),
      endDate: today,
    };
  }

  if (dateRangeMode === "month") {
    return {
      startDate: addMonthsToDateString(today, -1),
      endDate: today,
    };
  }

  if (dateRangeMode === "custom" && customStartDate && customEndDate) {
    return {
      startDate: customStartDate,
      endDate: customEndDate,
    };
  }

  return {
    startDate: null,
    endDate: null,
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }

    if (typeof record.details === "string" && record.details.trim()) {
      return record.details;
    }

    if (typeof record.hint === "string" && record.hint.trim()) {
      return record.hint;
    }
  }

  return fallback;
};

const normalizeTimeForDb = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  const amPmMatch = trimmedValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();

    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  const timeMatch = trimmedValue.match(/^(\d{1,2}):(\d{2})/);

  if (!timeMatch) return trimmedValue;

  return `${String(Number(timeMatch[1])).padStart(2, "0")}:${timeMatch[2]}`;
};

const normalizeCoordinateInput = (value: string) => {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) return null;

  const coordinate = Number(normalizedValue);

  if (!Number.isFinite(coordinate)) return null;

  return coordinate;
};

const normalizeRadiusInput = (value: string) => {
  const radius = Number(value.trim());

  if (!Number.isFinite(radius)) return null;

  return Math.round(radius);
};

const isValidStoreSettingsForm = (formData: StoreSettingsFormData) => {
  const latitude = normalizeCoordinateInput(formData.store_latitude);
  const longitude = normalizeCoordinateInput(formData.store_longitude);
  const radius = normalizeRadiusInput(formData.attendance_radius_meters);

  return (
    !!formData.store_name.trim() &&
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    radius !== null &&
    radius > 0
  );
};

const isValidShiftForm = (formData: ShiftFormData) => {
  const startTime = normalizeTimeForDb(formData.start_time);
  const checkInGraceUntil = normalizeTimeForDb(formData.check_in_grace_until);
  const endTime = normalizeTimeForDb(formData.end_time);
  const checkOutGraceUntil = normalizeTimeForDb(formData.check_out_grace_until);

  return (
    !!formData.shift_name.trim() &&
    !!startTime &&
    !!checkInGraceUntil &&
    !!endTime &&
    !!checkOutGraceUntil &&
    checkInGraceUntil >= startTime &&
    checkOutGraceUntil >= endTime
  );
};


const buildStoreSettingsFormData = (
  storeSettingsData: StoreSettingsRecord | null,
): StoreSettingsFormData => {
  return {
    store_name: storeSettingsData?.store_name ?? "Coffee Shop",
    store_latitude:
      storeSettingsData?.store_latitude === null ||
      storeSettingsData?.store_latitude === undefined
        ? ""
        : String(storeSettingsData.store_latitude),
    store_longitude:
      storeSettingsData?.store_longitude === null ||
      storeSettingsData?.store_longitude === undefined
        ? ""
        : String(storeSettingsData.store_longitude),
    attendance_radius_meters: String(
      storeSettingsData?.attendance_radius_meters ?? 150,
    ),
  };
};

const buildAttendanceListWithAbsentStaff = ({
  attendanceList,
  staffList,
  shiftList,
  startDate,
  endDate,
}: {
  attendanceList: AttendanceRecord[];
  staffList: ActiveStaffRecord[];
  shiftList: ShiftRecord[];
  startDate: string | null;
  endDate: string | null;
}) => {
  if (!startDate || !endDate || startDate !== endDate) {
    return attendanceList;
  }

  const shiftMap = new Map<string, ShiftRecord>(
    shiftList.map((shift) => [shift.id, shift]),
  );

  const existingStaffIds = new Set(
    attendanceList
      .filter((attendance) => attendance.attendance_date === startDate)
      .map((attendance) => attendance.staff_id),
  );

  const absentAttendanceList: AttendanceRecord[] = staffList
    .filter((staff) => !existingStaffIds.has(staff.id))
    .map((staff) => {
      const staffShift = staff.shift_id ? shiftMap.get(staff.shift_id) : null;

      return {
        id: `absent-${staff.id}-${startDate}`,
        staff_id: staff.id,
        shift_id: staff.shift_id,
        attendance_date: startDate,
        clock_in_at: null,
        clock_out_at: null,
        check_in_status: null,
        check_out_status: null,
        clock_in_distance_meters: null,
        clock_out_distance_meters: null,
        late_reason: null,
        early_leave_reason: null,
        overtime_reason: null,
        notes: null,
        staff: {
          id: staff.id,
          name: staff.name,
          staff_code: staff.staff_code,
          staff_type: staff.staff_type,
          role: staff.role,
        },
        shift: staffShift
          ? {
              id: staffShift.id,
              shift_name: staffShift.shift_name,
              start_time: staffShift.start_time,
              check_in_grace_until: staffShift.check_in_grace_until,
              end_time: staffShift.end_time,
              check_out_grace_until: staffShift.check_out_grace_until,
            }
          : null,
      };
    });

  return [...attendanceList, ...absentAttendanceList].sort((a, b) => {
    const aClock = a.clock_in_at ?? "";
    const bClock = b.clock_in_at ?? "";

    if (!!aClock !== !!bClock) return aClock ? -1 : 1;

    return (a.staff?.name ?? "").localeCompare(b.staff?.name ?? "", "id-ID");
  });
};

const loadAttendanceSnapshot = async ({
  dateRangeMode,
  customStartDate,
  customEndDate,
  force = false,
}: AttendanceFetchParams): Promise<AttendanceDataSnapshot> => {
  const fetchKey = getAttendanceFetchKey({
    dateRangeMode,
    customStartDate,
    customEndDate,
  });

  const now = Date.now();

  if (
    !force &&
    attendanceDataCache &&
    attendanceDataCacheKey === fetchKey &&
    now - attendanceDataCacheAt < FETCH_CACHE_TTL_MS
  ) {
    return attendanceDataCache;
  }

  if (attendanceFetchPromise && attendanceFetchPromiseKey === fetchKey) {
    return attendanceFetchPromise;
  }

  attendanceFetchPromiseKey = fetchKey;
  attendanceFetchPromise = (async () => {
    const { startDate, endDate } = getDateRange(
      dateRangeMode,
      customStartDate,
      customEndDate,
    );

    const shiftsPromise = supabase
      .from("shifts")
      .select(
        "id, shift_name, start_time, check_in_grace_until, end_time, check_out_grace_until, is_active",
      )
      .order("start_time", { ascending: true });

    const staffPromise = supabase
      .from("staff")
      .select("id, name, staff_code, staff_type, role, shift_id")
      .eq("status", "active")
      .not("shift_id", "is", null)
      .order("name", { ascending: true });

    const storeSettingsPromise = supabase
      .from("store_settings")
      .select(
        "id, store_name, store_latitude, store_longitude, attendance_radius_meters, is_active",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let attendanceQuery = supabase
      .from("attendance")
      .select(
        `
          id,
          staff_id,
          shift_id,
          attendance_date,
          clock_in_at,
          clock_out_at,
          check_in_status,
          check_out_status,
          clock_in_distance_meters,
          clock_out_distance_meters,
          late_reason,
          early_leave_reason,
          overtime_reason,
          notes,
          staff:staff_id (
            id,
            name,
            staff_code,
            staff_type,
            role
          ),
          shift:shift_id (
            id,
            shift_name,
            start_time,
            check_in_grace_until,
            end_time,
            check_out_grace_until
          )
        `,
      )
      .order("attendance_date", { ascending: false })
      .order("clock_in_at", { ascending: false, nullsFirst: false });

    if (startDate && endDate) {
      attendanceQuery = attendanceQuery
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);
    }

    const [shiftsResult, staffResult, attendanceResult, storeSettingsResult] =
      await Promise.all([
        shiftsPromise,
        staffPromise,
        attendanceQuery,
        storeSettingsPromise,
      ]);

    if (shiftsResult.error) {
      throw shiftsResult.error;
    }

    if (staffResult.error) {
      throw staffResult.error;
    }

    if (attendanceResult.error) {
      throw attendanceResult.error;
    }

    if (storeSettingsResult.error) {
      throw storeSettingsResult.error;
    }

    const storeSettingsData =
      storeSettingsResult.data as StoreSettingsRecord | null;
    const shiftList = (shiftsResult.data ?? []) as ShiftRecord[];
    const staffList = ((staffResult.data ?? []) as unknown[])
      .map(normalizeActiveStaff)
      .filter((staff): staff is ActiveStaffRecord => !!staff);
    const eligibleStaffIds = new Set(staffList.map((staff) => staff.id));

    const normalizedAttendanceList = (
      (attendanceResult.data ?? []) as RawAttendanceRecord[]
    )
      .map(normalizeAttendanceRecord)
      .filter(
        (attendance) =>
          attendance.id && eligibleStaffIds.has(attendance.staff_id),
      );

    const snapshot: AttendanceDataSnapshot = {
      shiftList,
      staffList,
      storeSettings: storeSettingsData,
      storeFormData: buildStoreSettingsFormData(storeSettingsData),
      attendanceList: buildAttendanceListWithAbsentStaff({
        attendanceList: normalizedAttendanceList,
        staffList,
        shiftList,
        startDate,
        endDate,
      }),
    };

    attendanceDataCache = snapshot;
    attendanceDataCacheKey = fetchKey;
    attendanceDataCacheAt = Date.now();

    return snapshot;
  })();

  try {
    return await attendanceFetchPromise;
  } finally {
    attendanceFetchPromise = null;
    attendanceFetchPromiseKey = "";
  }
};

export default function AttendanceSection({
  viewMode = "card",
  dateRangeMode = "today",
  customStartDate = "",
  customEndDate = "",
  onShiftChanged,
  section = "monitor",
}: AttendanceSectionProps) {
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [shiftList, setShiftList] = useState<ShiftRecord[]>([]);
  const [staffList, setStaffList] = useState<ActiveStaffRecord[]>([]);
  const [storeSettings, setStoreSettings] =
    useState<StoreSettingsRecord | null>(null);
  const [storeFormData, setStoreFormData] = useState<StoreSettingsFormData>(
    EMPTY_STORE_SETTINGS_FORM,
  );
  const [selectedShiftId, setSelectedShiftId] = useState("all");
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [shiftFormData, setShiftFormData] =
    useState<ShiftFormData>(EMPTY_SHIFT_FORM);

  const filteredAttendanceList = useMemo(() => {
    return attendanceList.filter((attendance) => {
      const matchShift =
        selectedShiftId === "all" || attendance.shift_id === selectedShiftId;
      const matchStaff =
        selectedStaffId === "all" || attendance.staff_id === selectedStaffId;

      return matchShift && matchStaff;
    });
  }, [attendanceList, selectedShiftId, selectedStaffId]);

  const summary = useMemo(() => {
    const total = filteredAttendanceList.length;

    const clockedIn = filteredAttendanceList.filter(
      (attendance) => attendance.clock_in_at,
    ).length;

    const clockedOut = filteredAttendanceList.filter(
      (attendance) => attendance.clock_out_at,
    ).length;

    const late = filteredAttendanceList.filter(
      (attendance) => attendance.check_in_status === "late",
    ).length;

    const earlyLeave = filteredAttendanceList.filter(
      (attendance) => attendance.check_out_status === "early_leave",
    ).length;

    const overtime = filteredAttendanceList.filter(
      (attendance) => attendance.check_out_status === "overtime",
    ).length;

    const notClockedIn = filteredAttendanceList.filter(
      (attendance) => !attendance.clock_in_at,
    ).length;

    return {
      total,
      clockedIn,
      clockedOut,
      late,
      earlyLeave,
      overtime,
      notClockedIn,
    };
  }, [filteredAttendanceList]);

  const [fetchError, setFetchError] = useState("");

  const fetchAttendanceData = useCallback(
    async (force = false) => {
      setFetchError("");

      if (!attendanceDataCache) {
        setLoading(true);
      }

      try {
        const snapshot = await loadAttendanceSnapshot({
          dateRangeMode,
          customStartDate,
          customEndDate,
          force,
        });

        setShiftList(snapshot.shiftList);
        setStaffList(snapshot.staffList);
        setStoreSettings(snapshot.storeSettings);
        setStoreFormData(snapshot.storeFormData);
        setAttendanceList(snapshot.attendanceList);
      } catch (error) {
        const message = getErrorMessage(
          error,
          "Failed to fetch attendance data.",
        );

        console.error("Error fetching attendance:", error);
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    },
    [dateRangeMode, customStartDate, customEndDate],
  );

  useEffect(() => {
    void fetchAttendanceData(false);
  }, [fetchAttendanceData]);

  const openCreateShiftForm = () => {
    setEditingShift(null);
    setShiftFormData(EMPTY_SHIFT_FORM);
    setShowShiftForm(true);
  };

  const openEditShiftForm = (shift: ShiftRecord) => {
    setEditingShift(shift);
    setShiftFormData({
      shift_name: shift.shift_name,
      start_time: formatTime(shift.start_time),
      check_in_grace_until: formatTime(shift.check_in_grace_until),
      end_time: formatTime(shift.end_time),
      check_out_grace_until: formatTime(shift.check_out_grace_until),
      is_active: shift.is_active !== false,
    });
    setShowShiftForm(true);
  };

  const closeShiftForm = () => {
    setShowShiftForm(false);
    setEditingShift(null);
    setShiftFormData(EMPTY_SHIFT_FORM);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError("Browser tidak mendukung fitur lokasi.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStoreFormData((prev) => ({
          ...prev,
          store_latitude: position.coords.latitude.toFixed(7),
          store_longitude: position.coords.longitude.toFixed(7),
        }));
        setLocationLoading(false);
      },
      (error) => {
        const errorMessage =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enable browser location permission first."
            : "Failed to get location. Make sure GPS is active and try again.";

        showError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const handleSaveStoreSettings = async () => {
    if (!isValidStoreSettingsForm(storeFormData)) {
      showError(
        "Pengaturan lokasi belum valid. Pastikan nama cafe, latitude, longitude, dan radius sudah benar.",
      );
      return;
    }

    setStoreLoading(true);

    try {
      const latitude = normalizeCoordinateInput(storeFormData.store_latitude);
      const longitude = normalizeCoordinateInput(storeFormData.store_longitude);
      const radius = normalizeRadiusInput(
        storeFormData.attendance_radius_meters,
      );

      const payload = {
        store_name: storeFormData.store_name.trim(),
        store_latitude: latitude,
        store_longitude: longitude,
        attendance_radius_meters: radius,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = storeSettings?.id
        ? await supabase
            .from("store_settings")
            .update(payload)
            .eq("id", storeSettings.id)
        : await supabase.from("store_settings").insert([payload]);

      if (error) {
        throw error;
      }

      await fetchAttendanceData(true);
      showSuccess("Cafe location saved.");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save cafe location.");

      showError(message);
    } finally {
      setStoreLoading(false);
    }
  };

  const handleSaveShift = async () => {
    if (!isValidShiftForm(shiftFormData)) {
      showError(
        "Shift data is not valid. Make sure the shift name is filled, the clock-in grace time is not earlier than the start time, and the clock-out grace time is not earlier than the end time.",
      );
      return;
    }

    setShiftLoading(true);

    try {
      const payload = {
        shift_name: shiftFormData.shift_name.trim(),
        start_time: normalizeTimeForDb(shiftFormData.start_time),
        check_in_grace_until: normalizeTimeForDb(
          shiftFormData.check_in_grace_until,
        ),
        end_time: normalizeTimeForDb(shiftFormData.end_time),
        check_out_grace_until: normalizeTimeForDb(
          shiftFormData.check_out_grace_until,
        ),
        is_active: shiftFormData.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error } = editingShift
        ? await supabase
            .from("shifts")
            .update(payload)
            .eq("id", editingShift.id)
            .select("id")
            .single()
        : await supabase.from("shifts").insert([payload]).select("id").single();

      if (error) {
        throw error;
      }

      await fetchAttendanceData(true);
      await onShiftChanged?.();
      closeShiftForm();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save shift.");

      showError(message);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleToggleShiftStatus = async (shift: ShiftRecord) => {
    const nextStatus = shift.is_active === false;
    const actionLabel = nextStatus ? "mengaktifkan" : "menonaktifkan";

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${shift.shift_name}?`)) {
      return;
    }

    setShiftLoading(true);

    try {
      const { error } = await supabase
        .from("shifts")
        .update({
          is_active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shift.id);

      if (error) {
        throw error;
      }

      await fetchAttendanceData(true);
      await onShiftChanged?.();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update shift status.");

      showError(message);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleDeleteShift = async (shift: ShiftRecord) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${shift.shift_name}? Deleted shifts will no longer appear in staff options. Existing attendance history remains stored, but the shift name in that history can become "No Shift".`,
      )
    ) {
      return;
    }

    setShiftLoading(true);

    try {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", shift.id);

      if (error) {
        throw error;
      }

      await fetchAttendanceData(true);
      await onShiftChanged?.();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete shift.");

      showError(message);
    } finally {
      setShiftLoading(false);
    }
  };

  const renderStatusBadge = (label: string, className: string) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );

  const renderSummaryCard = (
    label: string,
    value: number,
    _icon: ReactNode,
    description: string,
    tone: keyof typeof OWNER_SEMANTIC_TONES = "neutral",
  ) => (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${OWNER_SEMANTIC_TONES[tone].cardClass}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-4 text-3xl font-bold text-gray-950">{value}</p>
      <p className="mt-3 text-sm text-gray-600">{description}</p>
    </div>
  );

  const renderStoreLocationSettings = () => {
    const hasLocation =
      !!storeFormData.store_latitude.trim() &&
      !!storeFormData.store_longitude.trim();

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Cafe Attendance Location
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Set the cafe location point and validation radius so staff can only
              clock in or clock out when they are near the cafe.
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              hasLocation
                ? OWNER_SEMANTIC_TONES.success.badgeClass
                : OWNER_SEMANTIC_TONES.warning.badgeClass
            }`}
          >
            <MapPinIcon className="h-4 w-4" />
            {hasLocation ? "Location Set" : "Location Not Set"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Cafe Name
            </label>
            <input
              type="text"
              value={storeFormData.store_name}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  store_name: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="Cafe name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Latitude
            </label>
            <input
              type="text"
              value={storeFormData.store_latitude}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  store_latitude: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="-7.1234567"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Longitude
            </label>
            <input
              type="text"
              value={storeFormData.store_longitude}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  store_longitude: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="110.1234567"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Attendance Radius (meters)
            </label>
            <input
              type="number"
              min="1"
              value={storeFormData.attendance_radius_meters}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  attendance_radius_meters: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="150"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Use the owner or cashier device location while at the cafe to fill
            latitude and longitude automatically.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locationLoading || storeLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MapPinIcon className="h-4 w-4" />
              {locationLoading ? "Getting Location..." : "Use Current Location"}
            </button>

            <button
              type="button"
              onClick={handleSaveStoreSettings}
              disabled={storeLoading || locationLoading}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {storeLoading ? "Saving..." : "Save Location"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderShiftManagement = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Shift Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure start time, lateness tolerance, end time, and normal
            clock-out limit.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateShiftForm}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <PlusIcon className="h-4 w-4" />
          Add Shift
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {shiftList.map((shift) => (
          <div
            key={shift.id}
            className={`rounded-2xl border p-4 ${
              shift.is_active === false
                ? "border-gray-200 bg-gray-50 opacity-75"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {shift.shift_name}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                </p>
              </div>

              {renderStatusBadge(
                shift.is_active === false ? "Inactive" : "Active",
                shift.is_active === false
                  ? OWNER_SEMANTIC_TONES.neutral.badgeClass
                  : OWNER_SEMANTIC_TONES.success.badgeClass,
              )}
            </div>

            <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
              <div className="flex justify-between gap-3">
                <span>On-time clock in</span>
                <span className="font-semibold text-gray-900">
                  {formatTime(shift.start_time)} -{" "}
                  {formatTime(shift.check_in_grace_until)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>On-time clock out</span>
                <span className="font-semibold text-gray-900">
                  {formatTime(shift.end_time)} -{" "}
                  {formatTime(shift.check_out_grace_until)}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => openEditShiftForm(shift)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleToggleShiftStatus(shift)}
                disabled={shiftLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PowerIcon className="h-4 w-4" />
                {shift.is_active === false ? "Activate" : "Deactivate"}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteShift(shift)}
                disabled={shiftLoading}
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border bg-white text-xs font-semibold transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {shiftList.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <ClockIcon className="mx-auto h-9 w-9 text-gray-400" />
          <h3 className="mt-3 text-sm font-bold text-gray-900">
            No shifts yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add shifts to define staff clock-in and clock-out rules.
          </p>
        </div>
      )}
    </div>
  );

  const renderAttendanceCard = (attendance: AttendanceRecord) => {
    const staffName = attendance.staff?.name ?? "Staff not found";
    const staffCode = attendance.staff?.staff_code ?? "-";
    const staffType = toTitleCase(attendance.staff?.staff_type);
    const shiftName = attendance.shift?.shift_name ?? "No Shift";
    const shiftTime = attendance.shift
      ? `${formatTime(attendance.shift.start_time)} - ${formatTime(
          attendance.shift.end_time,
        )}`
      : "--:-- - --:--";

    return (
      <div
        key={attendance.id}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">{staffCode}</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">
              {staffName}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{staffType}</p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-gray-500">
              {formatDate(attendance.attendance_date)}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {shiftName}
            </p>
            <p className="text-xs text-gray-500">{shiftTime}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Clock In</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {formatDateTime(attendance.clock_in_at)}
            </p>

            <div className="mt-3">
              {renderStatusBadge(
                getCheckInStatusLabel(attendance.check_in_status),
                getCheckInStatusClassName(attendance.check_in_status),
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Distance: {formatDistance(attendance.clock_in_distance_meters)}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Clock Out</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {formatDateTime(attendance.clock_out_at)}
            </p>

            <div className="mt-3">
              {renderStatusBadge(
                getCheckOutStatusLabel(attendance.check_out_status),
                getCheckOutStatusClassName(attendance.check_out_status),
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Distance: {formatDistance(attendance.clock_out_distance_meters)}
            </p>
          </div>
        </div>

        {(attendance.late_reason ||
          attendance.early_leave_reason ||
          attendance.overtime_reason ||
          attendance.notes) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notes
            </p>

            {attendance.late_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Late: {attendance.late_reason}
              </p>
            )}

            {attendance.early_leave_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Early leave: {attendance.early_leave_reason}
              </p>
            )}

            {attendance.overtime_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Overtime: {attendance.overtime_reason}
              </p>
            )}

            {attendance.notes && (
              <p className="mt-2 text-sm text-gray-700">
                Notes: {attendance.notes}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAttendanceTable = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-5 ">
        <h2 className="text-base font-bold text-gray-900">Attendance Monitor Table</h2>
        <p className="mt-1 text-sm text-gray-500 mb-4 ">
          Concrete attendance records for clock-in, clock-out, status, and location distance.
        </p>

      <StandardTable
        columns={[
          {
            key: "staff",
            header: "Staff",
            sortValue: (attendance) => attendance.staff?.name ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {attendance.staff?.name ?? "Staff not found"}
                </p>
                <p className="text-xs text-gray-500">
                  {attendance.staff?.staff_code ?? "-"} - {toTitleCase(attendance.staff?.staff_type)}
                </p>
              </div>
            ),
          },
          {
            key: "shift",
            header: "Shift",
            sortValue: (attendance) => attendance.shift?.shift_name ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {attendance.shift?.shift_name ?? "No Shift"}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(attendance.shift?.start_time)} - {formatTime(attendance.shift?.end_time)}
                </p>
              </div>
            ),
          },
          {
            key: "date",
            header: "Date",
            sortValue: (attendance) => attendance.attendance_date,
            render: (attendance) => formatDate(attendance.attendance_date),
          },
          {
            key: "clock_in",
            header: "Clock In",
            sortValue: (attendance) => attendance.clock_in_at ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(attendance.clock_in_at)}
                </p>
                <div className="mt-2">
                  {renderStatusBadge(
                    getCheckInStatusLabel(attendance.check_in_status),
                    getCheckInStatusClassName(attendance.check_in_status),
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "clock_out",
            header: "Clock Out",
            sortValue: (attendance) => attendance.clock_out_at ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(attendance.clock_out_at)}
                </p>
                <div className="mt-2">
                  {renderStatusBadge(
                    getCheckOutStatusLabel(attendance.check_out_status),
                    getCheckOutStatusClassName(attendance.check_out_status),
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            sortValue: (attendance) =>
              `${attendance.check_in_status ?? ""} ${attendance.check_out_status ?? ""}`,
            render: (attendance) => (
              <div className="space-y-2">
                {attendance.check_in_status === "late" &&
                  renderStatusBadge("Late Reason Needed", OWNER_SEMANTIC_TONES.danger.badgeClass)}
                {attendance.check_out_status === "early_leave" &&
                  renderStatusBadge("Early Leave", OWNER_SEMANTIC_TONES.warning.badgeClass)}
                {attendance.check_out_status === "overtime" &&
                  renderStatusBadge("Overtime", OWNER_SEMANTIC_TONES.premium.badgeClass)}
                {!attendance.check_in_status &&
                  renderStatusBadge("Not Clocked In", OWNER_SEMANTIC_TONES.neutral.badgeClass)}
                {attendance.check_in_status &&
                  !attendance.check_out_status &&
                  !attendance.clock_out_at &&
                  renderStatusBadge("Currently Working", OWNER_SEMANTIC_TONES.info.badgeClass)}
              </div>
            ),
          },
          {
            key: "distance",
            header: "Distance",
            sortValue: (attendance) => Number(attendance.clock_in_distance_meters ?? 0),
            render: (attendance) => (
              <div className="space-y-1">
                <p>In: {formatDistance(attendance.clock_in_distance_meters)}</p>
                <p>Out: {formatDistance(attendance.clock_out_distance_meters)}</p>
              </div>
            ),
          },
        ] satisfies Array<StandardTableColumn<AttendanceRecord>>}
        data={filteredAttendanceList}
        getRowKey={(attendance) => attendance.id}
        loading={loading}
        emptyLabel="No attendance data yet."
        minWidthClassName="min-w-[1040px]"
      />
    </div>
  );

  if (loading && section !== "monitor") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-3 text-sm text-gray-500">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fetchError && (
        <div className={`rounded-2xl border p-4 text-sm ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{fetchError}</p>
            <button
              type="button"
              onClick={() => fetchAttendanceData(true)}
              className={`rounded-xl border bg-white px-4 py-2 text-sm font-semibold transition hover:bg-red-50 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {section === "settings" ? (
        <>
          {renderStoreLocationSettings()}
          {renderShiftManagement()}
        </>
      ) : null}

      {section === "monitor" ? (
        <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {renderSummaryCard(
          "Total Staff",
          summary.total,
          <CalendarDaysIcon className="h-5 w-5" />,
          "Active users with shifts"
        )}

        {renderSummaryCard(
          "Not Clocked In",
          summary.notClockedIn,
          <ExclamationTriangleIcon className="h-5 w-5" />,
          "Users not clocked in.",
          "waiting",
        )}

        {renderSummaryCard(
          "Clock In",
          summary.clockedIn,
          <ClockIcon className="h-5 w-5" />,
          "Staff have clocked in.",
          "info",
        )}

        {renderSummaryCard(
          "Clock Out",
          summary.clockedOut,
          <CheckCircleIcon className="h-5 w-5" />,
          "Staff have clocked out.",
          "success",
        )}

        {renderSummaryCard(
          "Late",
          summary.late,
          <ExclamationTriangleIcon className="h-5 w-5" />,
          "Users clock in late.",
          "danger",
        )}

        {renderSummaryCard(
          "Early Leave",
          summary.earlyLeave,
          <FunnelIcon className="h-5 w-5" />,
          "Users clock out early.",
          "warning",
        )}

        {renderSummaryCard(
          "Overtime",
          summary.overtime,
          <UserGroupIcon className="h-5 w-5" />,
          "Users clock out late.",
          "premium",
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Staff Attendance Monitor
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Monitor clock in and clock out for active users with assigned shifts.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
              className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="all">All Staff</option>

              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.staff_code})
                </option>
              ))}
            </select>

            <select
              value={selectedShiftId}
              onChange={(event) => setSelectedShiftId(event.target.value)}
              className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="all">All Shifts</option>

              {shiftList.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.shift_name} ({formatTime(shift.start_time)} -{" "}
                  {formatTime(shift.end_time)})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => fetchAttendanceData(true)}
              className="h-10 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {filteredAttendanceList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-4 text-base font-bold text-gray-900">
            No attendance data yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Data will appear after staff clock in or clock out from the
            attendance page.
          </p>
        </div>
      ) : viewMode === "table" ? (
        renderAttendanceTable()
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredAttendanceList.map((attendance) =>
            renderAttendanceCard(attendance),
          )}
        </div>
      )}
        </>
      ) : null}

      {showShiftForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingShift ? "Edit Shift" : "Add Shift"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Shift defines start time, lateness tolerance, end time, and
                  overtime limits for staff.
                </p>
              </div>

              <button
                type="button"
                onClick={closeShiftForm}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close shift form"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Shift Name
                </label>
                <input
                  type="text"
                  value={shiftFormData.shift_name}
                  onChange={(event) =>
                    setShiftFormData((prev) => ({
                      ...prev,
                      shift_name: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Example: Morning Shift"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={shiftFormData.start_time}
                    onChange={(event) =>
                      setShiftFormData((prev) => ({
                        ...prev,
                        start_time: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Clock-In Grace Until
                  </label>
                  <input
                    type="time"
                    value={shiftFormData.check_in_grace_until}
                    onChange={(event) =>
                      setShiftFormData((prev) => ({
                        ...prev,
                        check_in_grace_until: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={shiftFormData.end_time}
                    onChange={(event) =>
                      setShiftFormData((prev) => ({
                        ...prev,
                        end_time: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Clock-Out Grace Until
                  </label>
                  <input
                    type="time"
                    value={shiftFormData.check_out_grace_until}
                    onChange={(event) =>
                      setShiftFormData((prev) => ({
                        ...prev,
                        check_out_grace_until: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={shiftFormData.is_active}
                  onChange={(event) =>
                    setShiftFormData((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  Shift is available for staff data selection
                </span>
              </label>
            </div>

            <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeShiftForm}
                disabled={shiftLoading}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveShift}
                disabled={shiftLoading}
                className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shiftLoading ? "Saving..." : "Save Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
