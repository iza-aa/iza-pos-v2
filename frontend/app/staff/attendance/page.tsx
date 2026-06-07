"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { canAccessEndShift } from "@/lib/utils/staffAccess";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { SidebarTabset } from "@/app/components/shared";
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

const normalizeStaff = (rawStaff: Record<string, unknown>): StaffRecord => {
  return {
    id: toSafeString(rawStaff.id),
    staff_code: toSafeString(rawStaff.staff_code),
    name: toSafeString(rawStaff.name),
    email: toNullableString(rawStaff.email),
    phone: toNullableString(rawStaff.phone),
    role: toSafeString(rawStaff.role),
    staff_type: toNullableString(rawStaff.staff_type),
    status: toSafeString(rawStaff.status),
    shift_id: toNullableString(rawStaff.shift_id),
    shift: normalizeShift(rawStaff.shift),
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

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDaysToDateString = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const getRecentDateStrings = (endDate: string, count: number) => {
  return Array.from({ length: count }, (_, index) =>
    addDaysToDateString(endDate, index - count + 1),
  );
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
  if (status === "late") return OWNER_SEMANTIC_TONES.danger.badgeClass;
  if (status === "early_leave") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (status === "overtime") return OWNER_SEMANTIC_TONES.premium.badgeClass;
  if (status === "early") return OWNER_SEMANTIC_TONES.info.badgeClass;
  if (status === "on_time") return OWNER_SEMANTIC_TONES.success.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
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

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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

  return `${hour}h ${minute}m`;
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

  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(
    null,
  );
  const [activeAttendanceTab, setActiveAttendanceTab] =
    useState<StaffAttendanceTab>("absence");
  const [presenceCode, setPresenceCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
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
    staffType: currentUser?.staffType ?? staff?.staff_type,
  });
  const visibleAttendanceTabs = canUseEndShift
    ? staffAttendanceTabs
    : staffAttendanceTabs.filter((tab) => tab.id !== "end-shift");

  const html5QrCodeRef = useRef<Html5QrcodeInstance | null>(null);
  const scannerStartingRef = useRef(false);
  const scannerHasDecodedRef = useRef(false);

  const today = useMemo(() => getTodayDateString(), []);

  const canClockIn = !todayAttendance;
  const canClockOut = todayAttendance && !todayAttendance.clock_out_at;
  const isCompletedToday = todayAttendance && todayAttendance.clock_out_at;
  const canSubmitShiftClosing = useMemo(() => {
    if (!shiftClosingData || shiftClosingSubmitting) return false;
    if (shiftClosingData.closing?.status === "closed") return false;

    const parsed = Number(cashCounted);
    return cashCounted !== "" && Number.isFinite(parsed) && parsed >= 0;
  }, [cashCounted, shiftClosingData, shiftClosingSubmitting]);
  const recentAttendanceDays = useMemo(() => {
    return getRecentDateStrings(today, 3).map((date) => ({
      date,
      attendance:
        attendanceList.find((record) => record.attendance_date === date) ?? null,
    }));
  }, [attendanceList, today]);

  const fetchPageData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [staffResult, storeResult, attendanceResult] = await Promise.all([
        supabase
          .from("staff")
          .select(
            `
              id,
              staff_code,
              name,
              email,
              phone,
              role,
              staff_type,
              status,
              shift_id,
              shift:staff_shift_id_fkey (
                id,
                shift_name,
                start_time,
                check_in_grace_until,
                end_time,
                check_out_grace_until
              )
            `,
          )
          .eq("id", userId)
          .maybeSingle(),
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
          .order("attendance_date", { ascending: false })
          .order("clock_in_at", { ascending: false, nullsFirst: false })
          .limit(30),
      ]);

      if (staffResult.error) throw staffResult.error;
      if (storeResult.error) throw storeResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      if (staffResult.data) {
        setStaff(normalizeStaff(staffResult.data as Record<string, unknown>));
      } else {
        setStaff(null);
      }

      setStoreSettings((storeResult.data ?? null) as StoreSettings | null);

      const normalizedAttendanceList = (
        (attendanceResult.data ?? []) as Record<string, unknown>[]
      )
        .map(normalizeAttendance)
        .filter((attendance) => attendance.id);

      setAttendanceList(normalizedAttendanceList);

      const todayRecord = normalizedAttendanceList.find(
        (attendance) => attendance.attendance_date === today,
      );

      setTodayAttendance(todayRecord ?? null);
    } catch (error) {
      console.error("Failed to fetch staff attendance page data:", error);
      showError("Failed to load staff attendance data.");
    } finally {
      setLoading(false);
    }
  }, [today, userId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

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
      const rawMessage =
        error instanceof Error ? error.message : "Failed to submit attendance.";
      const message = rawMessage.replace(/^ERROR:\s*/i, "");

      setCodeError(message);
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

  const currentActionLabel = canClockIn
    ? "Clock In"
    : canClockOut
      ? "Clock Out"
      : "Attendance Completed";

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
    <div className="grid gap-4 xl:min-h-full xl:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="flex min-h-0 flex-col space-y-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-950">{staff?.name ?? "Staff"}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {staff?.staff_code ?? "-"} / {staff?.staff_type ?? staff?.role ?? "-"}
              </p>
            </div>

            {renderStatusBadge(
              isCompletedToday ? "Completed" : canClockOut ? "Working" : "Not Clocked In",
              isCompletedToday
                ? OWNER_SEMANTIC_TONES.success.badgeClass
                : canClockOut
                  ? OWNER_SEMANTIC_TONES.info.badgeClass
                  : OWNER_SEMANTIC_TONES.neutral.badgeClass,
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.info.cardClass}`}>
              <p className="text-sm font-bold text-gray-950">QR Attendance</p>
              <p className="mt-1 text-sm leading-6 text-gray-700">
                Scan the official outlet QR and keep location access enabled.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {renderMetricCard(
                "Clock In",
                formatDateTime(todayAttendance?.clock_in_at),
                getStatusLabel(todayAttendance?.check_in_status),
                todayAttendance?.clock_in_at
                  ? OWNER_SEMANTIC_TONES.success.cardClass
                  : OWNER_SEMANTIC_TONES.neutral.cardClass,
              )}
              {renderMetricCard(
                "Clock Out",
                formatDateTime(todayAttendance?.clock_out_at),
                getStatusLabel(todayAttendance?.check_out_status),
                todayAttendance?.clock_out_at
                  ? OWNER_SEMANTIC_TONES.success.cardClass
                  : OWNER_SEMANTIC_TONES.neutral.cardClass,
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={startQrScanner}
                disabled={submitting || Boolean(isCompletedToday)}
                className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open Camera
              </button>
              <button
                type="button"
                onClick={handleAttendanceSubmit}
                disabled={
                  submitting ||
                  Boolean(isCompletedToday) ||
                  !presenceCode.trim() ||
                  !staff?.shift ||
                  !storeSettings ||
                  storeSettings.store_latitude === null ||
                  storeSettings.store_longitude === null
                }
                className="h-11 rounded-lg bg-gray-900 px-5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {submitting ? "Processing..." : currentActionLabel}
              </button>
            </div>

            <input
              type="text"
              value={presenceCode}
              onChange={(event) => {
                setPresenceCode(event.target.value.trim());
                setCodeError("");
              }}
              placeholder="QR code"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 font-mono text-sm uppercase outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              disabled={submitting || Boolean(isCompletedToday)}
            />

            {codeError ? (
              <div className={`rounded-lg border p-3 text-sm ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
                {codeError}
              </div>
            ) : null}

            {locationMessage ? (
              <div className={`rounded-lg border p-3 text-sm ${OWNER_SEMANTIC_TONES.info.badgeClass}`}>
                {locationMessage}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-950">Assigned Shift</h2>
          {staff?.shift ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {renderMetricCard(
                "Shift",
                staff.shift.shift_name,
                `${formatTime(staff.shift.start_time)} - ${formatTime(staff.shift.end_time)}`,
              )}
              {renderMetricCard(
                "Clock In Window",
                `${formatTime(staff.shift.start_time)} - ${formatTime(staff.shift.check_in_grace_until)}`,
                "Attendance grace period",
              )}
              {renderMetricCard(
                "Clock Out Window",
                `${formatTime(staff.shift.end_time)} - ${formatTime(staff.shift.check_out_grace_until)}`,
                "Checkout grace period",
              )}
            </div>
          ) : (
            <div className={`mt-3 rounded-lg border p-3 text-sm ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
              Staff has no assigned shift.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {renderMetricCard("Method", "QR Attendance", "Outlet code verification")}
          {renderMetricCard(
            "Radius",
            storeSettings?.attendance_radius_meters
              ? `${storeSettings.attendance_radius_meters} m`
              : "Not Set",
            "Location validation range",
          )}
          {renderMetricCard(
            "Today",
            isCompletedToday ? "Completed" : canClockOut ? "Working" : "Ready",
            formatDate(today),
            isCompletedToday
              ? OWNER_SEMANTIC_TONES.success.cardClass
              : canClockOut
                ? OWNER_SEMANTIC_TONES.info.cardClass
                : OWNER_SEMANTIC_TONES.neutral.cardClass,
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-gray-950">Attendance History</h2>
            <p className="mt-1 text-sm text-gray-500">Latest attendance records for this staff account.</p>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-2 xl:overflow-y-auto xl:pr-1">
            {recentAttendanceDays.map(({ date, attendance }) => {
              const absent = !attendance;

              return (
                <div
                  key={date}
                  className="rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-bold text-gray-950">{formatDate(date)}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {attendance?.shift?.shift_name ?? "No Shift"}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600 lg:text-right">
                      <p>Duration: {attendance ? getDuration(attendance.clock_in_at, attendance.clock_out_at) : "-"}</p>
                      <p>In: {attendance ? formatDistance(attendance.clock_in_distance_meters) : "-"}</p>
                      <p>Out: {attendance ? formatDistance(attendance.clock_out_distance_meters) : "-"}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Clock In</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {attendance ? formatDateTime(attendance.clock_in_at) : "-"}
                      </p>
                      <div className="mt-2">
                        {renderStatusBadge(
                          absent ? "Absent" : getStatusLabel(attendance?.check_in_status),
                          absent
                            ? OWNER_SEMANTIC_TONES.danger.badgeClass
                            : getStatusClassName(attendance?.check_in_status),
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Clock Out</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {attendance ? formatDateTime(attendance.clock_out_at) : "-"}
                      </p>
                      <div className="mt-2">
                        {renderStatusBadge(
                          absent ? "Absent" : getStatusLabel(attendance?.check_out_status),
                          absent
                            ? OWNER_SEMANTIC_TONES.danger.badgeClass
                            : getStatusClassName(attendance?.check_out_status),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!storeSettings || storeSettings.store_latitude === null || storeSettings.store_longitude === null ? (
          <div className={`rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
            Outlet location is incomplete. Complete the outlet location and attendance radius first.
          </div>
        ) : null}
      </section>
    </div>
  );

  const renderShiftClosingPanel = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
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

      <section className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
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
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
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

                <p className="mt-4 text-xs text-gray-500">
                  Make sure camera permission is enabled before scanning.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
