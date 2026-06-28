import { getJakartaTodayDate } from "@/lib/services/bookkeeping/bookkeepingDate";
import type { CheckInStatus, CheckOutStatus, AttendanceRecord, ShiftRecord, RawRelationValue } from "./types";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";

export const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

export const toNullableString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value : null;
};

export const normalizeStaffPosition = (value: unknown) => {
  const position =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: toSafeString(position.id),
    position: toSafeString(position.position),
    is_primary: Boolean(position.is_primary),
    is_active: Boolean(position.is_active),
  };
};

export const getUnknownErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  if (typeof error === "string") return error;
  return "Failed to submit attendance.";
};

export const getSingleRelation = <T extends Record<string, unknown>>(
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

export const normalizeShift = (value: RawRelationValue | unknown): ShiftRecord | null => {
  const shift = getSingleRelation<Record<string, unknown>>(value);

  if (!shift) return null;

  const id = toSafeString(shift.id);
  const shiftName = toSafeString(shift.shift_name);

  if (!id || !shiftName) return null;

  return {
    id,
    shift_name: shiftName,
    start_time: toSafeString(shift.start_time),
    check_in_grace_until: toSafeString(shift.check_in_grace_until),
    end_time: toSafeString(shift.end_time),
    check_out_grace_until: toSafeString(shift.check_out_grace_until),
  };
};



export const normalizeCheckInStatus = (value: unknown): CheckInStatus => {
  if (value === "early") return "early";
  if (value === "on_time") return "on_time";
  if (value === "late") return "late";
  return null;
};

export const normalizeCheckOutStatus = (value: unknown): CheckOutStatus => {
  if (value === "early_leave") return "early_leave";
  if (value === "on_time") return "on_time";
  if (value === "overtime") return "overtime";
  return null;
};

export const normalizeAttendance = (
  rawAttendance: Record<string, unknown>,
): AttendanceRecord => {
  return {
    id: toSafeString(rawAttendance.id),
    staff_id: toSafeString(rawAttendance.staff_id),
    shift_id: toNullableString(rawAttendance.shift_id),
    attendance_date: toSafeString(rawAttendance.attendance_date),
    clock_in_at: toNullableString(rawAttendance.clock_in_at),
    clock_out_at: toNullableString(rawAttendance.clock_out_at),
    check_in_status: normalizeCheckInStatus(rawAttendance.check_in_status),
    check_out_status: normalizeCheckOutStatus(rawAttendance.check_out_status),
    clock_in_distance_meters:
      typeof rawAttendance.clock_in_distance_meters === "number" ||
      typeof rawAttendance.clock_in_distance_meters === "string"
        ? rawAttendance.clock_in_distance_meters
        : null,
    clock_out_distance_meters:
      typeof rawAttendance.clock_out_distance_meters === "number" ||
      typeof rawAttendance.clock_out_distance_meters === "string"
        ? rawAttendance.clock_out_distance_meters
        : null,
    late_reason: toNullableString(rawAttendance.late_reason),
    early_leave_reason: toNullableString(rawAttendance.early_leave_reason),
    overtime_reason: toNullableString(rawAttendance.overtime_reason),
    notes: toNullableString(rawAttendance.notes),
    shift: normalizeShift(rawAttendance.shift),
  };
};

export const getTodayDateString = () => getJakartaTodayDate();

export const getIsoWeekday = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  return dayOfWeek === 0 ? 7 : dayOfWeek;
};

export const addDaysToDateString = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
};


export const getStatusLabel = (status?: CheckInStatus | CheckOutStatus) => {
  if (status === "early") return "Early Arrival";
  if (status === "late") return "Late";
  if (status === "early_leave") return "Early Leave";
  if (status === "overtime") return "Overtime";
  if (status === "on_time") return "On Time";
  return "Pending";
};

export const getStatusClassName = (status?: CheckInStatus | CheckOutStatus) => {
  if (status === "late") return "bg-amber-50 border-amber-200 text-amber-800";
  if (status === "early_leave") return "bg-amber-50 border-amber-200 text-amber-800";
  if (status === "overtime") return "bg-blue-50 border-blue-200 text-blue-700";
  if (status === "early") return "bg-blue-50 border-blue-200 text-blue-700";
  if (status === "on_time") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  return "bg-gray-50 border-gray-200 text-gray-600";
};

export const getCurrentLocation = () => {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support location access."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
};

export const getLocationErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    const code = Number((error as { code?: unknown }).code);

    if (code === 1) {
      return "Location access was denied. Enable browser location permission to submit attendance.";
    }

    if (code === 2) {
      return "Device location is not available. Enable GPS/device location and try again.";
    }

    if (code === 3) {
      return "Location took too long to read. Make sure GPS is active and try again.";
    }
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  if (/permission|notallowed|denied/i.test(errorMessage)) {
    return "Location access was denied. Enable browser location permission to submit attendance.";
  }

  if (/timeout/i.test(errorMessage)) {
    return "Location took too long to read. Make sure GPS is active and try again.";
  }

  if (/unavailable|position/i.test(errorMessage)) {
    return "Device location is not available. Enable GPS/device location and try again.";
  }

  return errorMessage || "Failed to read device location. Enable location permission and try again.";
};

export const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const getTodayFullDateString = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};



export const formatTime = (value?: string | null) => {
  if (!value) return "--:--";
  return value.slice(0, 5);
};

export const formatDistance = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "-";

  const distance = Number(value);

  if (Number.isNaN(distance)) return "-";

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`;
  }

  return `${Math.round(distance)} m`;
};

export const getDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "-";

  const startDate = new Date(start.includes("T") ? start : start.replace(" ", "T"));
  const endDate = new Date(end.includes("T") ? end : end.replace(" ", "T"));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const hour = Math.floor(diffMs / 3600000);
  const minute = Math.floor((diffMs % 3600000) / 60000);

  if (hour > 0) {
    return `${hour} hour${hour > 1 ? "s" : ""} ${minute} minute${minute > 1 ? "s" : ""}`;
  }
  return `${minute} minute${minute > 1 ? "s" : ""}`;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatClosingStatus = (value?: string | null) => {
  if (!value) return "Draft";

  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const getClosingStatusClassName = (value?: string | null) => {
  if (value === "closed") return OWNER_SEMANTIC_TONES.dark.badgeClass;
  if (value === "submitted") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (value === "needs_review") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (value === "reopened") return OWNER_SEMANTIC_TONES.progress.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

export const getSetupGuidance = (message: string) => {
  const normalized = message.toLowerCase();
  const needsShiftAssignment =
    normalized.includes("assigned shift") ||
    normalized.includes("assign a staff member") ||
    normalized.includes("assign the correct shift") ||
    normalized.includes("outside its end-shift window");

  if (!needsShiftAssignment) return null;

  return normalized.includes("outside its end-shift window")
    ? "Current shift does not match the allowed end-shift window. Ask the owner or manager to confirm your active shift assignment."
    : "Shift assignment is required before submitting end shift. Ask the owner or manager to assign the correct active shift.";
};

export const extractPresenceCodeFromQrText = (text: string) => {
  const trimmedText = text.trim();

  if (!trimmedText) return "";

  try {
    const url = new URL(trimmedText);
    const code = url.searchParams.get("code");

    if (code) {
      return code.trim();
    }
  } catch {
    // QR may contain only the raw code, not a full URL.
  }

  const codeMatch = trimmedText.match(/[?&]code=([^&]+)/i);

  if (codeMatch?.[1]) {
    return decodeURIComponent(codeMatch[1]).trim();
  }

  return trimmedText.trim();
};

export const getScannerErrorMessage = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (/permission|notallowed|denied/i.test(errorMessage)) {
    return "Camera access was denied. Enable camera permission and try again.";
  }

  if (/notfound|not found|overconstrained/i.test(errorMessage)) {
    return "Camera was not found. Make sure the device has a camera and camera permission is enabled.";
  }

  if (/notreadable|trackstart|in use/i.test(errorMessage)) {
    return "Camera is being used by another app. Close that app and try again.";
  }

  return "Failed to open the QR scanner. Check camera permission and try again.";
};
