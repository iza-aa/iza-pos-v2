"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { canAccessEndShift } from "@/lib/utils/staffAccess";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { SidebarTabset, DateRangeFilter, getDefaultDateRange, type DateRangeValue } from "@/app/components/shared";
import { getJakartaTodayDate } from "@/lib/services/bookkeeping/bookkeepingDate";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";

type CheckInStatus = "early" | "on_time" | "late" | null;
type CheckOutStatus = "early_leave" | "on_time" | "overtime" | null;
type StaffAttendanceTab = "absence" | "end-shift";

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
};

type StaffRecord = {
  id: string;
  staff_code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  staff_type?: string | null;
  status: string;
  shift_id?: string | null;
  shift?: ShiftRecord | null;
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
  shift?: ShiftRecord | null;
};

type StoreSettings = {
  id: string;
  store_name: string;
  store_latitude: number | null;
  store_longitude: number | null;
  attendance_radius_meters: number;
  is_active: boolean;
};

type ShiftClosingData = {
  businessDate: string;
  staff: {
    id: string;
    name: string;
    staffCode?: string | null;
  };
  shift: {
    id: string;
    shiftName: string;
    startTime?: string | null;
    endTime?: string | null;
  };
  closing: {
    id: string;
    status: string;
    cashCounted: number | null;
    cashDifference: number | null;
    notes?: string | null;
  } | null;
};

type AssignmentRecord = {
  weekday?: number;
  work_date?: string;
  shift_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shift: any;
};


type Html5QrcodeConfig = {
  fps?: number;
  qrbox?: { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
};

type Html5QrcodeInstance = {
  start: (
    cameraConfig: { facingMode: "environment" | "user" } | string,
    config: Html5QrcodeConfig,
    onScanSuccess: (decodedText: string) => void,
    onScanFailure?: (errorMessage: string) => void,
  ) => Promise<void | null>;
  stop: () => Promise<void>;
  clear: () => void;
};

type Html5QrcodeConstructor = new (elementId: string) => Html5QrcodeInstance;

type RawRelationValue = Record<string, unknown> | Record<string, unknown>[] | null;

const QR_READER_ELEMENT_ID = "staff-attendance-qr-reader";
const MAX_LOCATION_ACCURACY_METERS = 100;

const staffAttendanceTabs = [
  {
    id: "absence",
    label: "Absence",
    description: "Clock in and out",
    icon: ClockIcon,
  },
  {
    id: "end-shift",
    label: "End Shift",
    description: "Submit cash count",
    icon: BanknotesIcon,
  },
] satisfies Array<{
  id: StaffAttendanceTab;
  label: string;
  description: string;
  icon: typeof ClockIcon;
}>;

const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

const toNullableString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value : null;
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

const normalizeShift = (value: RawRelationValue | unknown): ShiftRecord | null => {
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

const normalizeAttendance = (
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

const getTodayDateString = () => getJakartaTodayDate();

const getIsoWeekday = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  return dayOfWeek === 0 ? 7 : dayOfWeek;
};

const addDaysToDateString = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
};


const getStatusLabel = (status?: CheckInStatus | CheckOutStatus) => {
  if (status === "early") return "Early Arrival";
  if (status === "late") return "Late";
  if (status === "early_leave") return "Early Leave";
  if (status === "overtime") return "Overtime";
  if (status === "on_time") return "On Time";
  return "Pending";
};

const getStatusClassName = (status?: CheckInStatus | CheckOutStatus) => {
  if (status === "late") return "bg-amber-50 border-amber-200 text-amber-800";
  if (status === "early_leave") return "bg-amber-50 border-amber-200 text-amber-800";
  if (status === "overtime") return "bg-blue-50 border-blue-200 text-blue-700";
  if (status === "early") return "bg-blue-50 border-blue-200 text-blue-700";
  if (status === "on_time") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  return "bg-gray-50 border-gray-200 text-gray-600";
};

const getCurrentLocation = () => {
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

const getLocationErrorMessage = (error: unknown) => {
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

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getTodayFullDateString = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
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

const getDuration = (start?: string | null, end?: string | null) => {
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatClosingStatus = (value?: string | null) => {
  if (!value) return "Draft";

  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getClosingStatusClassName = (value?: string | null) => {
  if (value === "closed") return OWNER_SEMANTIC_TONES.dark.badgeClass;
  if (value === "submitted") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (value === "needs_review") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (value === "reopened") return OWNER_SEMANTIC_TONES.progress.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const getSetupGuidance = (message: string) => {
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

const extractPresenceCodeFromQrText = (text: string) => {
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

const getScannerErrorMessage = (error: unknown) => {
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

export default function AttendancePage() {
  useSessionValidation();

  const currentUser = getCurrentUser();
  const userId = currentUser?.id ?? null;
  const today = getTodayDateString();

  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [weeklyAssignments, setWeeklyAssignments] = useState<AssignmentRecord[]>([]);
  const [dailyAssignments, setDailyAssignments] = useState<AssignmentRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(
    null,
  );
  const [activeAttendanceTab, setActiveAttendanceTab] =
    useState<StaffAttendanceTab>("absence");
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [qrStatus, setQrStatus] = useState<"unscanned" | "verified" | "invalid">("unscanned");
  const [presenceCode, setPresenceCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shiftClosingData, setShiftClosingData] = useState<ShiftClosingData | null>(null);
  const [shiftClosingLoading, setShiftClosingLoading] = useState(false);
  const [shiftClosingRefreshing, setShiftClosingRefreshing] = useState(false);
  const [shiftClosingSubmitting, setShiftClosingSubmitting] = useState(false);
  const [shiftClosingError, setShiftClosingError] = useState("");
  const [shiftClosingNotice, setShiftClosingNotice] = useState("");
  const [cashCounted, setCashCounted] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const canUseEndShift = canAccessEndShift({
    role: currentUser?.role,
    positions: currentUser?.positions,
    staffType: currentUser?.staffType ?? staff?.staff_type,
  });
  const visibleAttendanceTabs = canUseEndShift
    ? staffAttendanceTabs
    : staffAttendanceTabs.filter((tab) => tab.id !== "end-shift");

  const html5QrCodeRef = useRef<Html5QrcodeInstance | null>(null);
  const scannerStartingRef = useRef(false);
  const scannerHasDecodedRef = useRef(false);

  const canClockIn = !todayAttendance;
  const canClockOut = todayAttendance && !todayAttendance.clock_out_at;
  const isCompletedToday = todayAttendance && todayAttendance.clock_out_at;
  const canSubmitShiftClosing = useMemo(() => {
    if (!shiftClosingData || shiftClosingSubmitting) return false;
    if (shiftClosingData.closing?.status === "closed") return false;

    const parsed = Number(cashCounted);
    return cashCounted !== "" && Number.isFinite(parsed) && parsed >= 0;
  }, [cashCounted, shiftClosingData, shiftClosingSubmitting]);

  const currentWorkingDuration = useMemo(() => {
    if (!todayAttendance?.clock_in_at) return null;
    if (todayAttendance.clock_out_at) return null;
    if (!currentTime) return null;

    const clockInTime = new Date(
      todayAttendance.clock_in_at.includes("T")
        ? todayAttendance.clock_in_at
        : todayAttendance.clock_in_at.replace(" ", "T")
    );
    const diffMs = currentTime.getTime() - clockInTime.getTime();
    if (diffMs <= 0) return "0 minutes";

    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }, [todayAttendance, currentTime]);



  const checkInWarning = useMemo(() => {
    if (!canClockIn || !staff?.shift || !currentTime) return null;

    const [graceHour, graceMinute] = staff.shift.check_in_grace_until.split(":").map(Number);
    const graceTimeToday = new Date(currentTime);
    graceTimeToday.setHours(graceHour, graceMinute, 0, 0);

    if (currentTime > graceTimeToday) {
      return `⚠️ You are past the Clock In grace period (${formatTime(staff.shift.check_in_grace_until)}). Your attendance will be marked as Late.`;
    }
    return null;
  }, [canClockIn, staff, currentTime]);

  const scheduleWarning = useMemo(() => {
    if (!canClockIn) return null;
    if (!staff?.shift) {
      return "⚠️ You have no shift scheduled for today. Clocking in will be recorded as an unscheduled override. Please contact your manager.";
    }
    return null;
  }, [canClockIn, staff]);

  const historyDates = useMemo(() => {
    const start = dateRange.startDate;
    const end = dateRange.endDate;

    const dates: string[] = [];
    if (start && end && start <= end) {
      let current = end;
      while (current >= start) {
        dates.push(current);
        current = addDaysToDateString(current, -1);
        if (dates.length > 366) break;
      }
    }
    return dates;
  }, [dateRange]);

  const getResolvedShiftForDate = useCallback((dateStr: string) => {
    // 1. Check daily assignments
    const daily = dailyAssignments.find((a) => a.work_date === dateStr);
    if (daily?.shift) return normalizeShift(daily.shift);

    // 2. Check weekly assignments
    const wday = getIsoWeekday(dateStr);
    const weekly = weeklyAssignments.find((a) => a.weekday === wday);
    if (weekly?.shift) return normalizeShift(weekly.shift);

    return null;
  }, [dailyAssignments, weeklyAssignments]);

  const recentAttendanceDays = useMemo(() => {
    return historyDates.map((date) => {
      const dbAttendance = attendanceList.find((record) => record.attendance_date === date) ?? null;
      const resolvedShift = getResolvedShiftForDate(date);
      const attendance = dbAttendance ? {
        ...dbAttendance,
        shift_id: resolvedShift?.id ?? null,
        shift: resolvedShift,
      } : null;

      return {
        date,
        attendance,
        assignedShift: resolvedShift
      };
    });
  }, [attendanceList, historyDates, getResolvedShiftForDate]);

  const fetchPageData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch staff basic details
      const staffResult = await supabase
        .from("staff")
        .select("id, staff_code, name, email, phone, role, staff_type, status")
        .eq("id", userId)
        .maybeSingle();

      if (staffResult.error) throw staffResult.error;

      let resolvedShiftId: string | null = null;
      let finalStaff: StaffRecord | null = null;

      if (staffResult.data) {
        const rawStaff = staffResult.data;

        // 2. Fetch daily and weekly assignments in parallel (both today-specific and global schedules)
        const weekday = getIsoWeekday(today);
        const [dailyResult, weeklyResult, allDailyResult, allWeeklyResult] = await Promise.all([
          supabase
            .from("staff_shift_daily_assignments")
            .select("shift_id")
            .eq("staff_id", userId)
            .eq("work_date", today)
            .in("status", ["assigned", "completed"])
            .maybeSingle(),
          supabase
            .from("staff_shift_weekly_assignments")
            .select("shift_id")
            .eq("staff_id", userId)
            .eq("weekday", weekday)
            .eq("status", "assigned")
            .maybeSingle(),
          supabase
            .from("staff_shift_daily_assignments")
            .select("work_date, shift_id, shift:shifts(id, shift_name, start_time, check_in_grace_until, end_time, check_out_grace_until)")
            .eq("staff_id", userId)
            .in("status", ["assigned", "completed"]),
          supabase
            .from("staff_shift_weekly_assignments")
            .select("weekday, shift_id, shift:shifts(id, shift_name, start_time, check_in_grace_until, end_time, check_out_grace_until)")
            .eq("staff_id", userId)
            .eq("status", "assigned"),
        ]);

        if (dailyResult.data?.shift_id) {
          resolvedShiftId = dailyResult.data.shift_id;
        } else if (weeklyResult.data?.shift_id) {
          resolvedShiftId = weeklyResult.data.shift_id;
        }

        if (allDailyResult.data) {
          setDailyAssignments(allDailyResult.data);
        }
        if (allWeeklyResult.data) {
          setWeeklyAssignments(allWeeklyResult.data);
        }

        // 3. Fetch active shift details
        let resolvedShift: ShiftRecord | null = null;
        if (resolvedShiftId) {
          const shiftResult = await supabase
            .from("shifts")
            .select("id, shift_name, start_time, check_in_grace_until, end_time, check_out_grace_until")
            .eq("id", resolvedShiftId)
            .maybeSingle();

          if (shiftResult.error) throw shiftResult.error;

          if (shiftResult.data) {
            resolvedShift = {
              id: shiftResult.data.id,
              shift_name: shiftResult.data.shift_name,
              start_time: shiftResult.data.start_time,
              check_in_grace_until: shiftResult.data.check_in_grace_until,
              end_time: shiftResult.data.end_time,
              check_out_grace_until: shiftResult.data.check_out_grace_until,
            };
          }
        }

        finalStaff = {
          id: toSafeString(rawStaff.id),
          staff_code: toSafeString(rawStaff.staff_code),
          name: toSafeString(rawStaff.name),
          email: toNullableString(rawStaff.email),
          phone: toNullableString(rawStaff.phone),
          role: toSafeString(rawStaff.role),
          staff_type: toNullableString(rawStaff.staff_type),
          status: toSafeString(rawStaff.status),
          shift_id: resolvedShiftId,
          shift: resolvedShift,
        };
      }

      setStaff(finalStaff);

      // 4. Query store settings, today's attendance, and history list in parallel
      const [storeResult, todayAttendanceResult, historyAttendanceResult] = await Promise.all([
        supabase
          .from("store_settings")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
        supabase
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
              shift:attendance_shift_id_fkey (
                id,
                shift_name,
                start_time,
                check_in_grace_until,
                end_time,
                check_out_grace_until
              )
            `,
          )
          .eq("staff_id", userId)
          .eq("attendance_date", today)
          .maybeSingle(),
        supabase
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
              shift:attendance_shift_id_fkey (
                id,
                shift_name,
                start_time,
                check_in_grace_until,
                end_time,
                check_out_grace_until
              )
            `,
          )
          .eq("staff_id", userId)
          .gte("attendance_date", dateRange.startDate)
          .lte("attendance_date", dateRange.endDate)
          .order("attendance_date", { ascending: false }),
      ]);

      if (storeResult.error) throw storeResult.error;
      if (todayAttendanceResult.error) throw todayAttendanceResult.error;
      if (historyAttendanceResult.error) throw historyAttendanceResult.error;

      setStoreSettings((storeResult.data ?? null) as StoreSettings | null);

      const normalizedHistoryList = (
        (historyAttendanceResult.data ?? []) as Record<string, unknown>[]
      )
        .map(normalizeAttendance)
        .filter((attendance) => attendance.id);

      setAttendanceList(normalizedHistoryList);

      if (todayAttendanceResult.data) {
        const normalizedTodayAttendance = normalizeAttendance(
          todayAttendanceResult.data as Record<string, unknown>,
        );

        setTodayAttendance({
          ...normalizedTodayAttendance,
          shift_id: finalStaff?.shift?.id ?? null,
          shift: finalStaff?.shift ?? null,
        });
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error("Failed to fetch staff attendance page data:", error);
      showError("Failed to load staff attendance data.");
    } finally {
      setLoading(false);
    }
  }, [today, userId, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadShiftClosingData = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      if (!userId || currentUser?.role !== "staff") return;

      setShiftClosingError("");
      if (!quiet) setShiftClosingLoading(true);
      if (quiet) setShiftClosingRefreshing(true);

      try {
        const params = new URLSearchParams({ businessDate: today });
        const response = await fetch(`/api/staff/bookkeeping/shift-closing?${params.toString()}`, {
          headers: {
            "x-user-id": userId,
            "x-user-name": currentUser?.name ?? staff?.name ?? "Staff",
            "x-user-role": "staff",
          },
        });

        const result = (await response.json().catch(() => ({}))) as {
          data?: ShiftClosingData;
          error?: string;
        };

        if (!response.ok || !result.data) {
          setShiftClosingData(null);
          setShiftClosingError(result.error || "Shift closing data could not be loaded.");
          return;
        }

        setShiftClosingData(result.data);
        setCashCounted(
          result.data.closing?.cashCounted === null || result.data.closing?.cashCounted === undefined
            ? ""
            : String(result.data.closing.cashCounted),
        );
        setClosingNotes(result.data.closing?.notes || "");
      } catch (error) {
        console.error("Failed to load shift closing inside attendance:", error);
        setShiftClosingData(null);
        setShiftClosingError(error instanceof Error ? error.message : "Shift closing data could not be loaded.");
      } finally {
        setShiftClosingLoading(false);
        setShiftClosingRefreshing(false);
      }
    },
    [currentUser?.name, currentUser?.role, staff?.name, today, userId],
  );

  useEffect(() => {
    if (!loading && canUseEndShift) {
      void loadShiftClosingData();
    }
  }, [canUseEndShift, loadShiftClosingData, loading]);

  useEffect(() => {
    if (!canUseEndShift && activeAttendanceTab === "end-shift") {
      setActiveAttendanceTab("absence");
    }
  }, [activeAttendanceTab, canUseEndShift]);

  const stopQrScanner = useCallback(async () => {
    scannerHasDecodedRef.current = false;
    scannerStartingRef.current = false;

    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.warn("Scanner was not running or failed to stop:", error);
      }

      try {
        html5QrCodeRef.current.clear();
      } catch (error) {
        console.warn("Failed to clear QR scanner:", error);
      }

      html5QrCodeRef.current = null;
    }

    setScannerOpen(false);
    setScannerLoading(false);
  }, []);

  const startQrScanner = useCallback(async () => {
    if (scannerStartingRef.current) return;

    setCodeError("");
    setScannerMessage("");
    setScannerOpen(true);
    setScannerLoading(true);
    scannerStartingRef.current = true;
    scannerHasDecodedRef.current = false;

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150);
    });

    try {
      const html5QrcodeModule = await import("html5-qrcode");
      const Html5Qrcode = html5QrcodeModule.Html5Qrcode as unknown as Html5QrcodeConstructor;
      const scannerInstance = new Html5Qrcode(QR_READER_ELEMENT_ID);

      html5QrCodeRef.current = scannerInstance;

      await scannerInstance.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          disableFlip: true,
        },
        (decodedText: string) => {
          if (scannerHasDecodedRef.current) return;

          const scannedCode = extractPresenceCodeFromQrText(decodedText);

          if (!scannedCode) return;

          scannerHasDecodedRef.current = true;
          setPresenceCode(scannedCode);
          setCodeError("");
          setQrStatus("verified");
          setScannerMessage("QR was read successfully. Continue attendance submission.");

          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          void stopQrScanner();
        },
      );

      setScannerLoading(false);
      setScannerMessage("Point the camera at the attendance QR available at the outlet.");
    } catch (error) {
      console.error("Failed to open html5-qrcode scanner:", error);
      setScannerLoading(false);
      setScannerMessage(getScannerErrorMessage(error));
      scannerStartingRef.current = false;
    }
  }, [stopQrScanner]);

  useEffect(() => {
    return () => {
      void stopQrScanner();
    };
  }, [stopQrScanner]);

  const handleVerifyManualCode = () => {
    const trimmed = presenceCode.trim();
    if (!trimmed) return;
    setPresenceCode(trimmed);
    setQrStatus("verified");
    setCodeError("");
    void stopQrScanner();
  };

  const handleAttendanceSubmit = async () => {
    setCodeError("");
    setLocationMessage("");

    if (!userId) {
      showError("Staff session was not found. Please log in again.");
      return;
    }

    if (!staff) {
      showError("Staff data was not found.");
      return;
    }

    if (staff.status !== "active") {
      showError("This staff account is inactive and cannot submit attendance.");
      return;
    }

    if (!staff.staff_code) {
      showError("Staff code was not found. Contact the owner or manager.");
      return;
    }

    if (!staff.shift_id || !staff.shift) {
      showError("Staff has no assigned shift. Contact the owner or manager.");
      return;
    }

    if (isCompletedToday) {
      showError("Today's attendance is already complete.");
      return;
    }

    if (!storeSettings) {
      showError("Outlet location settings are not available. Contact the owner or manager.");
      return;
    }

    if (storeSettings.store_latitude === null || storeSettings.store_longitude === null) {
      showError("Outlet location has not been configured. Contact the owner or manager.");
      return;
    }

    if (!storeSettings.attendance_radius_meters || storeSettings.attendance_radius_meters <= 0) {
      showError("Outlet attendance radius is not valid. Contact the owner or manager.");
      return;
    }

    const normalizedCode = presenceCode.trim();

    if (!normalizedCode) {
      const message = "Scan the attendance QR first.";
      setCodeError(message);
      showError(message);
      return;
    }

    setSubmitting(true);

    try {
      setLocationMessage("Checking your location...");

      let position: GeolocationPosition;

      try {
        position = await getCurrentLocation();
      } catch (locationError) {
        throw new Error(getLocationErrorMessage(locationError));
      }

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Location data is invalid. Enable device location and try again.");
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error("Location data is invalid. Enable device location and try again.");
      }

      if (accuracy === null) {
        throw new Error("Location accuracy is not available. Enable high-accuracy location mode and try again.");
      }

      if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
        throw new Error(
          `Location accuracy is not sufficient. Current accuracy is around ${Math.round(accuracy)} m, maximum ${MAX_LOCATION_ACCURACY_METERS} m. Enable GPS/high-accuracy location and scan again.`,
        );
      }

      setLocationMessage(
        `Location was read with accuracy ±${Math.round(accuracy)} m. Processing attendance...`,
      );

      const { data, error } = await supabase.rpc("submit_qr_attendance", {
        p_code: normalizedCode,
        p_credential: staff.staff_code,
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy: accuracy,
      });

      if (error) throw error;

      const result = data as {
        success?: boolean;
        title?: string;
        message?: string;
        statusLabel?: string;
        distanceMeters?: number | string | null;
      } | null;

      if (!result?.success) {
        throw new Error("Attendance could not be processed. Please scan the latest QR code.");
      }

      setPresenceCode("");
      setLocationMessage("");
      await fetchPageData();

      const formattedDistance = result.distanceMeters
        ? ` Distance: ${formatDistance(result.distanceMeters)}.`
        : "";

      const successMessage = result.statusLabel
        ? `${result.title ?? "Attendance submitted"}. Status: ${result.statusLabel}.${formattedDistance}`
        : `${result.message ?? "Attendance submitted."}${formattedDistance}`;

      showSuccess(successMessage);
    } catch (error) {
      console.error("Failed to submit attendance:", error);

      let rawMessage = "Failed to submit attendance.";
      if (error instanceof Error) {
        rawMessage = error.message;
      } else if (error && typeof error === "object" && "message" in error) {
        rawMessage = String((error as any).message);
      } else if (typeof error === "string") {
        rawMessage = error;
      }

      const message = rawMessage.replace(/^ERROR:\s*/i, "");

      setCodeError(message);
      setQrStatus("invalid");
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShiftClosingSubmit = async () => {
    if (!userId || currentUser?.role !== "staff") {
      setShiftClosingError("Staff access is required.");
      return;
    }

    setShiftClosingSubmitting(true);
    setShiftClosingError("");
    setShiftClosingNotice("");

    try {
      const response = await fetch("/api/staff/bookkeeping/shift-closing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          "x-user-name": currentUser?.name ?? staff?.name ?? "Staff",
          "x-user-role": "staff",
        },
        body: JSON.stringify({
          businessDate: today,
          cashCounted,
          notes: closingNotes,
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
        setShiftClosingError(result.error || "Shift closing could not be submitted.");
        return;
      }

      const difference = Number(result.data?.cashDifference ?? 0);
      setShiftClosingNotice(
        `Shift closing submitted as ${formatClosingStatus(result.data?.status)}. Difference: ${formatCurrency(difference)}.`,
      );
      await loadShiftClosingData({ quiet: true });
    } catch (error) {
      console.error("Failed to submit shift closing inside attendance:", error);
      setShiftClosingError(error instanceof Error ? error.message : "Shift closing could not be submitted.");
    } finally {
      setShiftClosingSubmitting(false);
    }
  };



  const renderMobileTabset = () => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:hidden">
      {visibleAttendanceTabs.map((tab) => {
        const isActive = activeAttendanceTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveAttendanceTab(tab.id)}
            className={`rounded-lg border px-3 py-2.5 text-left transition ${
              isActive
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            <p className="text-sm font-bold">{tab.label}</p>
            <p className={`mt-0.5 text-xs ${isActive ? "text-gray-200" : "text-gray-400"}`}>
              {tab.description}
            </p>
          </button>
        );
      })}
    </div>
  );

  const renderMetricCard = (
    label: string,
    value: string,
    detail: string,
    toneClass: string = OWNER_SEMANTIC_TONES.neutral.cardClass,
  ) => (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-gray-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-gray-600">{detail}</p>
    </div>
  );

  const renderStatusBadge = (label: string, className: string) => (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );

  const renderAbsencePanel = () => (
    <div className="w-full mx-auto py-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Greeting & Action Cards */}
        <div className="lg:col-span-5 space-y-5">
          {/* Greeting Header */}
          <div className="rounded-2xl bg-black p-6 text-white flex items-center justify-between animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">{staff?.name ?? "Staff"}</h2>
              <p className="text-xs text-blue-200/70 font-medium mt-0.5">
                {staff?.staff_code ?? "-"} / {staff?.staff_type ?? staff?.role ?? "-"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md shrink-0">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>
          </div>

          {/* Roster & Actions Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Shift Roster</p>
                {staff?.shift ? (
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    Working hours: <span className="font-extrabold text-blue-900">{formatTime(staff.shift.start_time)} - {formatTime(staff.shift.end_time)}</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-rose-600 mt-0.5">No shift assigned today</p>
                )}
              </div>
              {staff?.shift && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {staff.shift.shift_name}
                </span>
              )}
            </div>

            {/* Side-by-side Clock In/Out Action Panels */}
            <div className="grid grid-cols-2 gap-4">
              {/* Clock In */}
              <button
                type="button"
                onClick={() => {
                  if (canClockIn) {
                    void startQrScanner();
                  }
                }}
                disabled={!canClockIn || submitting}
                className={`rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-200 border-2 select-none outline-none ${
                  canClockIn
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500/10 text-white hover:scale-[1.02] active:scale-[0.98]"
                    : todayAttendance?.clock_in_at
                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                    : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                }`}
              >
                <div className={`p-3 rounded-xl mb-3 transition-colors ${
                  canClockIn ? "bg-white/20" : todayAttendance?.clock_in_at ? "bg-emerald-100/60 text-emerald-600" : "bg-gray-100"
                }`}>
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a14.815 14.815 0 002.812 8.685M9.984 8.485A3.75 3.75 0 0116.5 10.5c0 .979-.15 1.921-.428 2.806m-6.072 1.688A14.772 14.772 0 0012 19.5M12 6.75a3.75 3.75 0 00-3.75 3.75m0 0a11.22 11.22 0 002.593 7.02" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Clock In</p>
                {todayAttendance?.clock_in_at ? (
                  <p className="text-[11px] font-bold text-emerald-700 mt-1">
                    In: {formatTime(todayAttendance.clock_in_at.split(" ")[1] || todayAttendance.clock_in_at.split("T")[1])}
                  </p>
                ) : (
                  <p className={`text-[10px] mt-1 ${canClockIn ? "text-emerald-100 font-semibold" : "text-gray-400"}`}>
                    {canClockIn ? "Ready to Scan" : "Not available"}
                  </p>
                )}
              </button>

              {/* Clock Out */}
              <button
                type="button"
                onClick={() => {
                  if (canClockOut) {
                    void startQrScanner();
                  }
                }}
                disabled={!canClockOut || submitting}
                className={`rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-200 border-2 select-none outline-none ${
                  canClockOut
                    ? "bg-gradient-to-br from-rose-700 to-red-800 border-rose-900/10 text-white  hover:scale-[1.02] active:scale-[0.98]"
                    : todayAttendance?.clock_out_at
                    ? "bg-gray-50 border-gray-200 text-gray-400"
                    : todayAttendance?.clock_in_at
                    ? "bg-rose-50/50 border-rose-100 text-rose-800"
                    : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                }`}
              >
                <div className={`p-3 rounded-xl mb-3 transition-colors ${
                  canClockOut ? "bg-white/20" : todayAttendance?.clock_out_at ? "bg-gray-200" : todayAttendance?.clock_in_at ? "bg-rose-100/60 text-rose-600" : "bg-gray-100"
                }`}>
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a14.815 14.815 0 002.812 8.685M9.984 8.485A3.75 3.75 0 0116.5 10.5c0 .979-.15 1.921-.428 2.806m-6.072 1.688A14.772 14.772 0 0012 19.5M12 6.75a3.75 3.75 0 00-3.75 3.75m0 0a11.22 11.22 0 002.593 7.02" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Clock Out</p>
                {todayAttendance?.clock_out_at ? (
                  <p className="text-[11px] font-bold text-gray-500 mt-1">
                    Out: {formatTime(todayAttendance.clock_out_at.split(" ")[1] || todayAttendance.clock_out_at.split("T")[1])}
                  </p>
                ) : todayAttendance?.clock_in_at ? (
                  <p className="text-[10px] mt-1 text-white animate-pulse font-bold">
                    Ready to Clock Out
                  </p>
                ) : (
                  <p className="text-[10px] mt-1 text-gray-400">
                    Not active yet
                  </p>
                )}
              </button>
            </div>

            {/* QR Scan Status Banner inside Action Card */}
            {presenceCode.trim() ? (
              <div className={`rounded-xl border p-3.5 flex items-center justify-between text-xs font-semibold ${
                qrStatus === "verified"
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                  : qrStatus === "invalid"
                  ? "border-rose-200 bg-rose-50/50 text-rose-800"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    QR Status: {qrStatus === "verified" ? "Verified Outlet" : qrStatus === "invalid" ? "Invalid QR Code" : "Unscanned"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {qrStatus === "unscanned" && (
                    <span className="text-[9px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      Pending Verification
                    </span>
                  )}
                  {qrStatus === "verified" && (
                    <button
                      type="button"
                      onClick={() => void handleAttendanceSubmit()}
                      disabled={submitting}
                      className="text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg  transition-all"
                    >
                      {submitting ? "Submitting..." : "Submit Now"}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Grace & Schedule Warnings */}
            {(checkInWarning || scheduleWarning) && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                {checkInWarning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 leading-normal">
                    {checkInWarning}
                  </div>
                )}
                {scheduleWarning && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 leading-normal">
                    {scheduleWarning}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location warning if not configured */}
          {(!storeSettings || storeSettings.store_latitude === null || storeSettings.store_longitude === null) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              Outlet GPS location coordinates are incomplete. Please ask the manager to complete configuration.
            </div>
          )}

          {codeError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 leading-normal">
              {codeError}
            </div>
          ) : null}

          {locationMessage ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800 leading-normal">
              {locationMessage}
            </div>
          ) : null}
        </div>

        {/* Right Column: Today's Presence Details & Inline History */}
        <div className="lg:col-span-7 space-y-5">
          {/* Today's Presence Details Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Today&apos;s Attendance</h3>
              <span className="text-xs text-gray-500 font-semibold">
                {getTodayFullDateString(today)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold">Clock In:</span>
                <span className="font-extrabold text-gray-950">
                  {todayAttendance?.clock_in_at
                    ? formatTime(todayAttendance.clock_in_at.split(" ")[1] || todayAttendance.clock_in_at.split("T")[1])
                    : "--:--:--"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold">Clock Out:</span>
                <span className="font-extrabold text-gray-950">
                  {todayAttendance?.clock_out_at
                    ? formatTime(todayAttendance.clock_out_at.split(" ")[1] || todayAttendance.clock_out_at.split("T")[1])
                    : "--:--:--"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold">Status:</span>
                <div>
                  {todayAttendance ? (
                    <div className="flex items-center gap-1.5">
                      {todayAttendance.clock_in_at && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          getStatusClassName(todayAttendance.check_in_status)
                        }`}>
                          In: {getStatusLabel(todayAttendance.check_in_status)}
                        </span>
                      )}
                      {todayAttendance.clock_out_at && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          getStatusClassName(todayAttendance.check_out_status)
                        }`}>
                          Out: {getStatusLabel(todayAttendance.check_out_status)}
                        </span>
                      )}
                      {!todayAttendance.clock_out_at && (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                          Working
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-bold text-gray-500">
                      Not Clocked In
                    </span>
                  )}
                </div>
              </div>

              {todayAttendance && (
                <div className="flex flex-col text-sm border-t border-gray-50 pt-3 space-y-1.5 mb-6">
                  <span className="text-gray-500 font-semibold">Details:</span>
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed space-y-1">
                    {canClockOut && currentWorkingDuration && (
                      <p className="font-semibold text-blue-800">
                        Current Duration: {currentWorkingDuration}
                      </p>
                    )}
                    {todayAttendance.clock_in_at && todayAttendance.clock_in_distance_meters !== undefined && (
                      <p>
                        Clock In Location: {formatDistance(todayAttendance.clock_in_distance_meters)} from outlet
                      </p>
                    )}
                    {todayAttendance.clock_out_at && todayAttendance.clock_out_distance_meters !== undefined && (
                      <p>
                        Clock Out Location: {formatDistance(todayAttendance.clock_out_distance_meters)} from outlet
                      </p>
                    )}
                    {todayAttendance.clock_in_at && todayAttendance.clock_out_at && (
                      <p className="font-semibold text-emerald-800">
                        Total Duration: {getDuration(todayAttendance.clock_in_at, todayAttendance.clock_out_at)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trigger button for History modal */}
          <div>
            <button
              type="button"
              onClick={() => setHistoryModalOpen(true)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700  transition hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Attendance History
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShiftClosingPanel = () => (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 ">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-950">End Shift</h2>
              <p className="mt-1 text-sm text-gray-500">Blind cash count for today&apos;s assigned shift.</p>
            </div>
            {shiftClosingData
              ? renderStatusBadge(
                  formatClosingStatus(shiftClosingData.closing?.status),
                  getClosingStatusClassName(shiftClosingData.closing?.status),
                )
              : null}
          </div>

          {shiftClosingLoading ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-5 text-sm font-semibold text-gray-500">
              Loading shift closing...
            </div>
          ) : shiftClosingData ? (
            <div className="mt-4 space-y-3">
              <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.info.cardClass}`}>
                <p className="text-sm font-bold text-gray-950">Blind Cash Count</p>
                <p className="mt-1 text-sm leading-6 text-gray-700">
                  Count physical cash first. Expected cash is hidden until submit.
                </p>
              </div>

              {renderMetricCard(
                "Shift",
                shiftClosingData.shift.shiftName,
                `${formatTime(shiftClosingData.shift.startTime)} - ${formatTime(shiftClosingData.shift.endTime)}`,
              )}
              {renderMetricCard(
                "Business Date",
                shiftClosingData.businessDate,
                shiftClosingData.staff.name,
              )}

              <button
                type="button"
                onClick={() => void loadShiftClosingData({ quiet: true })}
                disabled={shiftClosingRefreshing || shiftClosingLoading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${shiftClosingRefreshing ? "animate-spin" : ""}`} />
                Refresh Data
              </button>
            </div>
          ) : (
            <div className={`mt-4 rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
              {getSetupGuidance(shiftClosingError) || shiftClosingError || "Shift closing is not ready yet."}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 ">
        <div>
          <h2 className="text-base font-bold text-gray-950">Cash Submission</h2>
          <p className="mt-1 text-sm text-gray-500">Submit counted drawer cash after the shift ends.</p>
        </div>

        {shiftClosingData ? (
          <div className="mt-4 flex flex-1 flex-col">
            <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Cash Counted
              <input
                type="number"
                min="0"
                value={cashCounted}
                onChange={(event) => setCashCounted(event.target.value)}
                placeholder="Enter counted cash"
                disabled={shiftClosingData.closing?.status === "closed"}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              Notes
              <textarea
                value={closingNotes}
                onChange={(event) => setClosingNotes(event.target.value)}
                placeholder="Optional note, required by SOP if there is a cash difference."
                rows={4}
                disabled={shiftClosingData.closing?.status === "closed"}
                className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </label>
            </div>

            <button
              type="button"
              onClick={handleShiftClosingSubmit}
              disabled={!canSubmitShiftClosing}
              className="mt-auto flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {shiftClosingSubmitting ? "Submitting..." : "Submit Shift Closing"}
            </button>
          </div>
        ) : null}

        {shiftClosingError && shiftClosingData ? (
          <div className={`mt-4 rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
            {getSetupGuidance(shiftClosingError) || shiftClosingError}
          </div>
        ) : null}

        {shiftClosingNotice ? (
          <div className={`mt-4 rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.success.badgeClass}`}>
            {shiftClosingNotice}
          </div>
        ) : null}
      </section>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-white lg:h-[calc(100vh-56px)] lg:overflow-hidden">
      <div className="flex min-h-[calc(100dvh-56px)] lg:h-full lg:min-h-0">
          <SidebarTabset
            title="Staff Attendance"
            description="Daily absence and end-shift tasks."
            items={visibleAttendanceTabs}
            activeId={activeAttendanceTab}
            onSelect={setActiveAttendanceTab}
          />

          <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4 md:p-5">
              {renderMobileTabset()}
              {activeAttendanceTab === "absence" ? (
                renderAbsencePanel()
              ) : (
                renderShiftClosingPanel()
              )}
            </div>
          </section>


        {scannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white ">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Scan QR Attendance</h3>
                  <p className="text-sm text-gray-500">Point the camera at the attendance QR.</p>
                </div>

                <button
                  type="button"
                  onClick={() => void stopQrScanner()}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="p-5">
                <div className="relative min-h-80 overflow-hidden rounded-2xl bg-black">
                  <div id={QR_READER_ELEMENT_ID} className="min-h-80 w-full" />

                  {scannerLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                      <div className="text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                        <p className="mt-3 text-sm font-medium">Opening camera...</p>
                      </div>
                    </div>
                  )}
                </div>

                {scannerMessage && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {scannerMessage}
                  </div>
                )}



                {/* Manual Code Entry (Alternative) */}
                <div className="mt-5  pt-4 space-y-2 text-left">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Manual Code Entry (Alternative)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={presenceCode}
                      onChange={(event) => {
                        const val = event.target.value;
                        setPresenceCode(val);
                        setQrStatus("unscanned");
                        setCodeError("");
                      }}
                      placeholder="Enter outlet presence code"
                      className="h-10 flex-1 rounded-xl border border-gray-200 bg-white px-3 font-mono text-xs uppercase outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400 text-gray-900"
                      disabled={submitting}
                    />
                    {presenceCode.trim() && qrStatus !== "verified" && (
                      <button
                        type="button"
                        onClick={handleVerifyManualCode}
                        className="px-4 rounded-xl bg-gray-900 text-white text-xs font-bold transition hover:bg-gray-800"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {historyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white  flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Attendance History</h3>
                  <p className="text-xs text-gray-500">Filter and view past attendance records.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-5">
                {/* Original DateRangeFilter component */}
                <DateRangeFilter value={dateRange} onChange={setDateRange} />

                {/* Flat History List */}
                <div className="border border-gray-200 rounded-2xl p-5 bg-white space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <h4 className="text-sm font-bold text-gray-900">Attendance Records</h4>
                  </div>

                  <div className="space-y-4 divide-y divide-gray-100">
                    {recentAttendanceDays.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <h5 className="mt-2 text-sm font-semibold text-gray-900">No Attendance History</h5>
                        <p className="mt-1 text-xs text-gray-500">No records found for the selected date range.</p>
                      </div>
                    ) : (
                      recentAttendanceDays.map(({ date, attendance, assignedShift }) => {
                        const isWorkingNow = attendance && attendance.clock_in_at && !attendance.clock_out_at;
                        return (
                          <div
                            key={date}
                            className="py-4 first:pt-0 last:pb-0 flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50/50 rounded-xl px-2 transition-all text-left"
                          >
                            {/* Column 1: Date & Shift (Span 4) */}
                            <div className="md:col-span-4 space-y-0.5">
                              <p className="font-bold text-gray-950 text-sm md:text-base">{formatDate(date)}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-600">
                                  {attendance?.shift?.shift_name ?? assignedShift?.shift_name ?? "No Shift Assigned"}
                                </span>
                                {(attendance?.shift?.shift_name || assignedShift?.shift_name) && (
                                  <span className="text-[10px] font-bold text-gray-400">
                                    ({formatTime(attendance?.shift?.start_time ?? assignedShift?.start_time)} - {formatTime(attendance?.shift?.end_time ?? assignedShift?.end_time)})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Column 2: Clock In details (Span 4) */}
                            <div className="md:col-span-4 mt-2 md:mt-0 space-y-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Clock In</span>
                              {attendance?.clock_in_at ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-900">
                                    {formatTime(attendance.clock_in_at.split(" ")[1] || attendance.clock_in_at.split("T")[1])}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                      getStatusClassName(attendance.check_in_status)
                                    }`}>
                                      {getStatusLabel(attendance.check_in_status)}
                                    </span>
                                    {attendance.clock_in_distance_meters !== null && (
                                      <span className="text-[10px] text-gray-500 font-semibold">
                                        {formatDistance(attendance.clock_in_distance_meters)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-400">-</p>
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold bg-rose-50 border-rose-200 text-rose-700">
                                    Absent
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Column 3: Clock Out & Duration details (Span 4) */}
                            <div className="md:col-span-4 mt-2 md:mt-0 space-y-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Clock Out</span>
                              {isWorkingNow ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 animate-pulse">
                                    Working
                                  </span>
                                  <p className="text-[11px] font-semibold text-blue-800">
                                    {currentWorkingDuration ? `Current Duration: ${currentWorkingDuration}` : "Current Duration: --"}
                                  </p>
                                </div>
                              ) : attendance?.clock_out_at ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-900">
                                    {formatTime(attendance.clock_out_at.split(" ")[1] || attendance.clock_out_at.split("T")[1])}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                      getStatusClassName(attendance.check_out_status)
                                    }`}>
                                      {getStatusLabel(attendance.check_out_status)}
                                    </span>
                                    {attendance.clock_out_distance_meters !== null && (
                                      <span className="text-[10px] text-gray-500 font-semibold">
                                        {formatDistance(attendance.clock_out_distance_meters)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 font-semibold mt-1">
                                    Duration: {getDuration(attendance.clock_in_at, attendance.clock_out_at)}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-400">-</p>
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold bg-gray-50 border-gray-200 text-gray-600">
                                    Not Clocked Out
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
