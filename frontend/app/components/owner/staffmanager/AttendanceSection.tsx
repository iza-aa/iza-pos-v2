"use client";

import { ReactNode, useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
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
  if (status === "early") return "Datang Lebih Awal";
  if (status === "on_time") return "Masuk Tepat Waktu";
  if (status === "late") return "Terlambat";
  return "Belum Clock In";
};

const getCheckOutStatusLabel = (status: CheckOutStatus) => {
  if (status === "early_leave") return "Pulang Lebih Awal";
  if (status === "on_time") return "Pulang Tepat Waktu";
  if (status === "overtime") return "Lembur";
  return "Belum Clock Out";
};

const getCheckInStatusClassName = (status: CheckInStatus) => {
  if (status === "late") return "border-red-200 bg-red-50 text-red-700";
  if (status === "early") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "on_time")
    return "border-green-200 bg-green-50 text-green-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
};

const getCheckOutStatusClassName = (status: CheckOutStatus) => {
  if (status === "early_leave") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (status === "overtime") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (status === "on_time") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
};

const getDateRange = (
  dateRangeMode: DateRangeMode,
  customStartDate: string,
  customEndDate: string,
) => {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  if (dateRangeMode === "today") {
    return {
      startDate: today.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    };
  }

  if (dateRangeMode === "week") {
    start.setDate(start.getDate() - 7);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }

  if (dateRangeMode === "month") {
    start.setMonth(start.getMonth() - 1);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
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

    const [shiftsResult, attendanceResult, storeSettingsResult] =
      await Promise.all([shiftsPromise, attendanceQuery, storeSettingsPromise]);

    if (shiftsResult.error) {
      throw shiftsResult.error;
    }

    if (attendanceResult.error) {
      throw attendanceResult.error;
    }

    if (storeSettingsResult.error) {
      throw storeSettingsResult.error;
    }

    const storeSettingsData =
      storeSettingsResult.data as StoreSettingsRecord | null;

    const snapshot: AttendanceDataSnapshot = {
      shiftList: (shiftsResult.data ?? []) as ShiftRecord[],
      storeSettings: storeSettingsData,
      storeFormData: buildStoreSettingsFormData(storeSettingsData),
      attendanceList: ((attendanceResult.data ?? []) as RawAttendanceRecord[])
        .map(normalizeAttendanceRecord)
        .filter((attendance) => attendance.id),
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
}: AttendanceSectionProps) {
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [shiftList, setShiftList] = useState<ShiftRecord[]>([]);
  const [storeSettings, setStoreSettings] =
    useState<StoreSettingsRecord | null>(null);
  const [storeFormData, setStoreFormData] = useState<StoreSettingsFormData>(
    EMPTY_STORE_SETTINGS_FORM,
  );
  const [selectedShiftId, setSelectedShiftId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [shiftFormData, setShiftFormData] =
    useState<ShiftFormData>(EMPTY_SHIFT_FORM);

  const filteredAttendanceList = useMemo(() => {
    if (selectedShiftId === "all") return attendanceList;

    return attendanceList.filter(
      (attendance) => attendance.shift_id === selectedShiftId,
    );
  }, [attendanceList, selectedShiftId]);

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

    return {
      total,
      clockedIn,
      clockedOut,
      late,
      earlyLeave,
      overtime,
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
        setStoreSettings(snapshot.storeSettings);
        setStoreFormData(snapshot.storeFormData);
        setAttendanceList(snapshot.attendanceList);
      } catch (error) {
        const message = getErrorMessage(
          error,
          "Gagal mengambil data presensi.",
        );

        console.error("Error fetching attendance:", error);
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    },
    [dateRangeMode, customStartDate, customEndDate],
  );

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
      alert("Browser tidak mendukung fitur lokasi.");
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
            ? "Izin lokasi ditolak. Aktifkan izin lokasi browser terlebih dahulu."
            : "Gagal mengambil lokasi. Pastikan GPS aktif dan coba lagi.";

        alert(errorMessage);
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
      alert(
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
      alert("Lokasi cafe berhasil disimpan.");
    } catch (error) {
      const message = getErrorMessage(error, "Gagal menyimpan lokasi cafe.");

      alert(message);
    } finally {
      setStoreLoading(false);
    }
  };

  const handleSaveShift = async () => {
    if (!isValidShiftForm(shiftFormData)) {
      alert(
        "Data shift belum valid. Pastikan nama shift terisi, batas masuk tidak lebih awal dari jam masuk, dan batas pulang tidak lebih awal dari jam pulang.",
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
      const message = getErrorMessage(error, "Gagal menyimpan shift.");

      alert(message);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleToggleShiftStatus = async (shift: ShiftRecord) => {
    const nextStatus = shift.is_active === false;
    const actionLabel = nextStatus ? "mengaktifkan" : "menonaktifkan";

    if (!window.confirm(`Yakin ingin ${actionLabel} ${shift.shift_name}?`)) {
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
      const message = getErrorMessage(error, "Gagal mengubah status shift.");

      alert(message);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleDeleteShift = async (shift: ShiftRecord) => {
    if (
      !window.confirm(
        `Yakin ingin menghapus ${shift.shift_name}? Shift yang dihapus tidak akan muncul lagi di pilihan staff. Histori presensi lama tetap tersimpan, tetapi nama shift pada histori tersebut bisa menjadi "Tanpa Shift".`,
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
      const message = getErrorMessage(error, "Gagal menghapus shift.");

      alert(message);
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
    icon: ReactNode,
    description: string,
  ) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">{description}</p>
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
              Lokasi Absensi Cafe
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Atur titik lokasi cafe dan radius validasi supaya staff hanya bisa
              clock in atau clock out saat berada di sekitar cafe.
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              hasLocation
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-orange-200 bg-orange-50 text-orange-700"
            }`}
          >
            <MapPinIcon className="h-4 w-4" />
            {hasLocation ? "Lokasi Sudah Diset" : "Lokasi Belum Diset"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Nama Cafe
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
              placeholder="Nama cafe"
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
              Radius Absensi (meter)
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
            Gunakan lokasi device owner/kasir saat berada di cafe untuk mengisi
            latitude dan longitude secara otomatis.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locationLoading || storeLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MapPinIcon className="h-4 w-4" />
              {locationLoading ? "Mengambil Lokasi..." : "Gunakan Lokasi Ini"}
            </button>

            <button
              type="button"
              onClick={handleSaveStoreSettings}
              disabled={storeLoading || locationLoading}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {storeLoading ? "Menyimpan..." : "Simpan Lokasi"}
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
            Atur jam masuk, toleransi keterlambatan, jam pulang, dan batas
            pulang normal.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateShiftForm}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <PlusIcon className="h-4 w-4" />
          Tambah Shift
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
                  ? "border-gray-200 bg-gray-50 text-gray-600"
                  : "border-green-200 bg-green-50 text-green-700",
              )}
            </div>

            <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
              <div className="flex justify-between gap-3">
                <span>Masuk tepat waktu</span>
                <span className="font-semibold text-gray-900">
                  {formatTime(shift.start_time)} -{" "}
                  {formatTime(shift.check_in_grace_until)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Pulang tepat waktu</span>
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
                {shift.is_active === false ? "Aktifkan" : "Nonaktifkan"}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteShift(shift)}
                disabled={shiftLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {shiftList.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <ClockIcon className="mx-auto h-9 w-9 text-gray-400" />
          <h3 className="mt-3 text-sm font-bold text-gray-900">
            Belum ada shift
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Tambahkan shift untuk menentukan aturan jam masuk dan pulang staff.
          </p>
        </div>
      )}
    </div>
  );

  const renderAttendanceCard = (attendance: AttendanceRecord) => {
    const staffName = attendance.staff?.name ?? "Staff tidak ditemukan";
    const staffCode = attendance.staff?.staff_code ?? "-";
    const staffType = toTitleCase(attendance.staff?.staff_type);
    const shiftName = attendance.shift?.shift_name ?? "Tanpa Shift";
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
              Jarak: {formatDistance(attendance.clock_in_distance_meters)}
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
              Jarak: {formatDistance(attendance.clock_out_distance_meters)}
            </p>
          </div>
        </div>

        {(attendance.late_reason ||
          attendance.early_leave_reason ||
          attendance.overtime_reason ||
          attendance.notes) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Catatan
            </p>

            {attendance.late_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Terlambat: {attendance.late_reason}
              </p>
            )}

            {attendance.early_leave_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Pulang awal: {attendance.early_leave_reason}
              </p>
            )}

            {attendance.overtime_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Lembur: {attendance.overtime_reason}
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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Staff
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Shift
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tanggal
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Clock In
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Clock Out
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Jarak
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredAttendanceList.map((attendance) => (
              <tr key={attendance.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {attendance.staff?.name ?? "Staff tidak ditemukan"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {attendance.staff?.staff_code ?? "-"} •{" "}
                    {toTitleCase(attendance.staff?.staff_type)}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {attendance.shift?.shift_name ?? "Tanpa Shift"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(attendance.shift?.start_time)} -{" "}
                    {formatTime(attendance.shift?.end_time)}
                  </p>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  {formatDate(attendance.attendance_date)}
                </td>

                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDateTime(attendance.clock_in_at)}
                  </p>

                  <div className="mt-2">
                    {renderStatusBadge(
                      getCheckInStatusLabel(attendance.check_in_status),
                      getCheckInStatusClassName(attendance.check_in_status),
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDateTime(attendance.clock_out_at)}
                  </p>

                  <div className="mt-2">
                    {renderStatusBadge(
                      getCheckOutStatusLabel(attendance.check_out_status),
                      getCheckOutStatusClassName(attendance.check_out_status),
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="space-y-2">
                    {attendance.check_in_status === "late" &&
                      renderStatusBadge(
                        "Perlu Alasan Telat",
                        "border-red-200 bg-red-50 text-red-700",
                      )}

                    {attendance.check_out_status === "early_leave" &&
                      renderStatusBadge(
                        "Pulang Awal",
                        "border-orange-200 bg-orange-50 text-orange-700",
                      )}

                    {attendance.check_out_status === "overtime" &&
                      renderStatusBadge(
                        "Lembur",
                        "border-purple-200 bg-purple-50 text-purple-700",
                      )}

                    {!attendance.check_in_status &&
                      renderStatusBadge(
                        "Belum Clock In",
                        "border-gray-200 bg-gray-50 text-gray-600",
                      )}

                    {attendance.check_in_status &&
                      !attendance.check_out_status &&
                      !attendance.clock_out_at &&
                      renderStatusBadge(
                        "Sedang Bekerja",
                        "border-blue-200 bg-blue-50 text-blue-700",
                      )}
                  </div>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  <p>
                    In: {formatDistance(attendance.clock_in_distance_meters)}
                  </p>
                  <p>
                    Out: {formatDistance(attendance.clock_out_distance_meters)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-3 text-sm text-gray-500">Memuat data presensi...</p>
        </div>
      </div>
    );
  }

  const hasLoadedAnyData =
    shiftList.length > 0 || attendanceList.length > 0 || storeSettings !== null;

  if (!hasLoadedAnyData && !fetchError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400" />
        <h3 className="mt-4 text-base font-bold text-gray-900">
          Data presensi belum dimuat
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          Klik tombol di bawah untuk memuat shift, lokasi cafe, dan data presensi.
          Data tidak dimuat otomatis agar browser tidak menembak request Supabase
          berulang saat tab Presensi dibuka.
        </p>
        <button
          type="button"
          onClick={() => fetchAttendanceData(true)}
          className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Muat Data Presensi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{fetchError}</p>
            <button
              type="button"
              onClick={() => fetchAttendanceData(true)}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {renderStoreLocationSettings()}

      {renderShiftManagement()}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {renderSummaryCard(
          "Total Record",
          summary.total,
          <CalendarDaysIcon className="h-5 w-5" />,
          "Data presensi pada rentang tanggal ini.",
        )}

        {renderSummaryCard(
          "Clock In",
          summary.clockedIn,
          <ClockIcon className="h-5 w-5" />,
          "Staff yang sudah melakukan clock in.",
        )}

        {renderSummaryCard(
          "Clock Out",
          summary.clockedOut,
          <CheckCircleIcon className="h-5 w-5" />,
          "Staff yang sudah melakukan clock out.",
        )}

        {renderSummaryCard(
          "Terlambat",
          summary.late,
          <ExclamationTriangleIcon className="h-5 w-5" />,
          "Clock in melewati batas toleransi.",
        )}

        {renderSummaryCard(
          "Pulang Awal",
          summary.earlyLeave,
          <FunnelIcon className="h-5 w-5" />,
          "Clock out sebelum jam pulang shift.",
        )}

        {renderSummaryCard(
          "Lembur",
          summary.overtime,
          <UserGroupIcon className="h-5 w-5" />,
          "Clock out setelah batas pulang shift.",
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Monitor Presensi Staff
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Pantau clock in dan clock out staff berdasarkan shift yang aktif.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedShiftId}
              onChange={(event) => setSelectedShiftId(event.target.value)}
              className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="all">Semua Shift</option>

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
            Belum ada data presensi
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Data akan muncul setelah staff melakukan clock in atau clock out
            melalui halaman absensi.
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

      {showShiftForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingShift ? "Edit Shift" : "Tambah Shift"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Shift menentukan jam masuk, toleransi telat, jam pulang, dan
                  batas lembur staff.
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
                  Nama Shift
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
                  placeholder="Contoh: Shift Pagi"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Jam Masuk
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
                    Batas Tepat Waktu Masuk
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
                    Jam Pulang
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
                    Batas Tepat Waktu Pulang
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
                  Shift tersedia untuk dipilih di data staff
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
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveShift}
                disabled={shiftLoading}
                className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shiftLoading ? "Menyimpan..." : "Simpan Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}