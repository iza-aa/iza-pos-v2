import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { canAccessEndShift } from "@/lib/utils/staffAccess";
import { createClient } from "@/lib/supabase/client";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { getJakartaTodayDate } from "@/lib/services/bookkeeping/bookkeepingDate";
import { getDefaultDateRange, type DateRangeValue } from "@/app/components/shared";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";

import type { CheckInStatus, CheckOutStatus, StaffAttendanceTab, ShiftRecord, StaffRecord, AttendanceRecord, StoreSettings, ShiftClosingData, AssignmentRecord, Html5QrcodeConfig, Html5QrcodeInstance, Html5QrcodeConstructor, RawRelationValue } from "../types";
import { QR_READER_ELEMENT_ID, MAX_LOCATION_ACCURACY_METERS, staffAttendanceTabs } from "../constants";
import { toSafeString, toNullableString, normalizeStaffPosition, getUnknownErrorMessage, getSingleRelation, normalizeShift, normalizeCheckInStatus, normalizeCheckOutStatus, normalizeAttendance, getTodayDateString, getIsoWeekday, addDaysToDateString, getStatusLabel, getStatusClassName, getCurrentLocation, getLocationErrorMessage, formatDate, getTodayFullDateString, formatTime, formatDistance, getDuration, formatCurrency, formatClosingStatus, getClosingStatusClassName, getSetupGuidance, extractPresenceCodeFromQrText, getScannerErrorMessage } from "../utils";

export function useAttendanceData() {
  useSessionValidation();
  
  const supabase = useMemo(() => createClient(), []);

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

  const [openingCashActual, setOpeningCashActual] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [actualClosingFloat, setActualClosingFloat] = useState("0");
  const [envelopeNumber, setEnvelopeNumber] = useState("");
  const [isOpeningShiftSubmitting, setIsOpeningShiftSubmitting] = useState(false);
  const [isCashMovementSubmitting, setIsCashMovementSubmitting] = useState(false);
  const [movementForm, setMovementForm] = useState({ type: "cash_in", amount: "", reason: "" });
  const [movementsList, setMovementsList] = useState<any[]>([]);
  const [cashMovementModalOpen, setCashMovementModalOpen] = useState(false);

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
    if (shiftClosingData.closing?.status === "closed" || shiftClosingData.closing?.status === "submitted") return false;

    const parsedCash = Number(cashCounted);
    const parsedFloat = Number(actualClosingFloat);
    return (
      cashCounted !== "" &&
      Number.isFinite(parsedCash) &&
      parsedCash >= 0 &&
      actualClosingFloat !== "" &&
      Number.isFinite(parsedFloat) &&
      parsedFloat >= 0
    );
  }, [cashCounted, actualClosingFloat, shiftClosingData, shiftClosingSubmitting]);

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
      return `You are past the Clock In grace period (${formatTime(staff.shift.check_in_grace_until)}). Your attendance will be marked as Late.`;
    }
    return null;
  }, [canClockIn, staff, currentTime]);

  const scheduleWarning = useMemo(() => {
    if (!canClockIn) return null;
    if (!staff?.shift) {
      return "You have no shift scheduled for today. Clocking in will be recorded as an unscheduled override. Please contact your manager.";
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
        .select("id, staff_code, name, email, phone, role, status, staff_positions(id, position, is_primary, is_active)")
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
          staff_type: null,
          status: toSafeString(rawStaff.status),
          shift_id: resolvedShiftId,
          shift: resolvedShift,
          staff_positions: Array.isArray(rawStaff.staff_positions)
            ? rawStaff.staff_positions.map(normalizeStaffPosition)
            : [],
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
          data?: any;
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
        setClosingNotes("");
        setOpeningCashActual(
          result.data.closing?.openingCashActual === null || result.data.closing?.openingCashActual === undefined
            ? ""
            : String(result.data.closing.openingCashActual),
        );
        setOpeningNotes(result.data.closing?.openingVarianceNote || "");
        setActualClosingFloat(
          result.data.closing?.actualClosingFloat === null || result.data.closing?.actualClosingFloat === undefined
            ? "0"
            : String(result.data.closing.actualClosingFloat),
        );
        setEnvelopeNumber(
          result.data.envelopeNumber || result.data.closing?.snapshot_json?.envelopeNumber || ""
        );

        // Fetch movements
        const responseMovements = await fetch(`/api/staff/bookkeeping/cash-movement?businessDate=${today}`, {
          headers: {
            "x-user-id": userId,
            "x-user-name": currentUser?.name ?? staff?.name ?? "Staff",
            "x-user-role": "staff",
          },
        });
        const resultMovements = await responseMovements.json().catch(() => ({}));
        if (responseMovements.ok && resultMovements.data) {
          setMovementsList(resultMovements.data);
        }
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
        const errorMsg = getLocationErrorMessage(locationError);
        setCodeError(errorMsg);
        setQrStatus("invalid");
        showError(errorMsg);
        setSubmitting(false);
        return;
      }

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        const errorMsg = "Location data is invalid. Enable device location and try again.";
        setCodeError(errorMsg);
        setQrStatus("invalid");
        showError(errorMsg);
        setSubmitting(false);
        return;
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        const errorMsg = "Location data is invalid. Enable device location and try again.";
        setCodeError(errorMsg);
        setQrStatus("invalid");
        showError(errorMsg);
        setSubmitting(false);
        return;
      }

      if (accuracy === null) {
        const errorMsg = "Location accuracy is not available. Enable high-accuracy location mode and try again.";
        setCodeError(errorMsg);
        setQrStatus("invalid");
        showError(errorMsg);
        setSubmitting(false);
        return;
      }

      if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
        const errorMsg = `Location accuracy is not sufficient. Current accuracy is around ${Math.round(accuracy)} m, maximum ${MAX_LOCATION_ACCURACY_METERS} m. Enable GPS/high-accuracy location and scan again.`;
        setCodeError(errorMsg);
        setQrStatus("invalid");
        showError(errorMsg);
        setSubmitting(false);
        return;
      }

      setLocationMessage(
        `Location was read with accuracy ±${Math.round(accuracy)} m. Processing attendance...`
      );

      const { data, error } = await supabase.rpc("submit_qr_attendance", {
        p_code: normalizedCode,
        p_credential: staff.staff_code,
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy: accuracy,
      });

      if (error) {
        const errorMsg = error.message || "Failed to submit attendance.";
        setCodeError(errorMsg);
        setQrStatus("invalid");
        showError(errorMsg);
        setSubmitting(false);
        return;
      }

      const result = data as {
        success?: boolean;
        title?: string;
        message?: string;
        statusLabel?: string;
        distanceMeters?: number | string | null;
      } | null;

      if (!result?.success) {
        const errorMsg = "Attendance could not be processed. Please scan the latest QR code.";
        setCodeError(errorMsg);
        setQrStatus("invalid");
        showError(errorMsg);
        setSubmitting(false);
        return;
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
          action: "close_shift",
          cashCounted,
          actualClosingFloat,
          envelopeNumber,
          notes: closingNotes,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        data?: {
          status: string;
          cashDifference: number;
          envelopeNumber?: string;
        };
        error?: string;
      };

      if (!response.ok || !result.success) {
        setShiftClosingError(result.error || "Shift closing could not be submitted.");
        return;
      }

      const difference = Number(result.data?.cashDifference ?? 0);
      const envelopeNum = result.data?.envelopeNumber || "";
      setShiftClosingNotice(
        `Shift closing submitted successfully. Please write this Envelope Code on your physical envelope: ${envelopeNum}`,
      );
      await loadShiftClosingData({ quiet: true });
    } catch (error) {
      console.error("Failed to submit shift closing inside attendance:", error);
      setShiftClosingError(error instanceof Error ? error.message : "Shift closing could not be submitted.");
    } finally {
      setShiftClosingSubmitting(false);
    }
  };

  const handleShiftOpeningSubmit = async () => {
    if (!userId || currentUser?.role !== "staff") {
      setShiftClosingError("Staff access is required.");
      return;
    }

    setIsOpeningShiftSubmitting(true);
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
          action: "open_shift",
          openingCashActual,
          notes: openingNotes,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        data?: {
          status: string;
          openingVariance: number;
        };
        error?: string;
      };

      if (!response.ok || !result.success) {
        setShiftClosingError(result.error || "Shift opening could not be processed.");
        return;
      }

      setShiftClosingNotice(
        `Shift opened successfully. Opening Variance: ${formatCurrency(Number(result.data?.openingVariance ?? 0))}.`
      );
      await loadShiftClosingData({ quiet: true });
    } catch (error) {
      console.error("Failed to open shift:", error);
      setShiftClosingError(error instanceof Error ? error.message : "Shift opening could not be processed.");
    } finally {
      setIsOpeningShiftSubmitting(false);
    }
  };

  const handleCashMovementSubmit = async () => {
    if (!userId || currentUser?.role !== "staff") {
      setShiftClosingError("Staff access is required.");
      return;
    }

    setIsCashMovementSubmitting(true);
    setShiftClosingError("");
    setShiftClosingNotice("");

    try {
      const response = await fetch("/api/staff/bookkeeping/cash-movement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          "x-user-name": currentUser?.name ?? staff?.name ?? "Staff",
          "x-user-role": "staff",
        },
        body: JSON.stringify({
          businessDate: today,
          type: movementForm.type,
          amount: movementForm.amount,
          reason: movementForm.reason,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        setShiftClosingError(result.error || "Cash movement could not be recorded.");
        return;
      }

      setShiftClosingNotice("Cash movement recorded successfully.");
      setMovementForm({ type: "cash_in", amount: "", reason: "" });
      setCashMovementModalOpen(false);
      await loadShiftClosingData({ quiet: true });
    } catch (error) {
      console.error("Failed to record cash movement:", error);
      setShiftClosingError(error instanceof Error ? error.message : "Cash movement could not be recorded.");
    } finally {
      setIsCashMovementSubmitting(false);
    }
  };

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

  return {
    currentUser,
    userId,
    today,
    staff,
    setStaff,
    storeSettings,
    setStoreSettings,
    attendanceList,
    setAttendanceList,
    weeklyAssignments,
    setWeeklyAssignments,
    dailyAssignments,
    setDailyAssignments,
    todayAttendance,
    setTodayAttendance,
    activeAttendanceTab,
    setActiveAttendanceTab,
    dateRange,
    setDateRange,
    currentTime,
    setCurrentTime,
    qrStatus,
    setQrStatus,
    presenceCode,
    setPresenceCode,
    codeError,
    setCodeError,
    locationMessage,
    setLocationMessage,
    scannerOpen,
    setScannerOpen,
    historyModalOpen,
    setHistoryModalOpen,
    scannerMessage,
    setScannerMessage,
    scannerLoading,
    setScannerLoading,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    shiftClosingData,
    setShiftClosingData,
    shiftClosingLoading,
    setShiftClosingLoading,
    shiftClosingRefreshing,
    setShiftClosingRefreshing,
    shiftClosingSubmitting,
    setShiftClosingSubmitting,
    shiftClosingError,
    setShiftClosingError,
    shiftClosingNotice,
    setShiftClosingNotice,
    cashCounted,
    setCashCounted,
    closingNotes,
    setClosingNotes,
    openingCashActual,
    setOpeningCashActual,
    openingNotes,
    setOpeningNotes,
    actualClosingFloat,
    setActualClosingFloat,
    envelopeNumber,
    setEnvelopeNumber,
    isOpeningShiftSubmitting,
    setIsOpeningShiftSubmitting,
    isCashMovementSubmitting,
    setIsCashMovementSubmitting,
    movementForm,
    setMovementForm,
    movementsList,
    setMovementsList,
    cashMovementModalOpen,
    setCashMovementModalOpen,
    canUseEndShift,
    visibleAttendanceTabs,
    html5QrCodeRef,
    scannerStartingRef,
    scannerHasDecodedRef,
    canClockIn,
    canClockOut,
    isCompletedToday,
    canSubmitShiftClosing,
    currentWorkingDuration,
    checkInWarning,
    scheduleWarning,
    historyDates,
    getResolvedShiftForDate,
    recentAttendanceDays,
    fetchPageData,
    loadShiftClosingData,
    stopQrScanner,
    startQrScanner,
    handleVerifyManualCode,
    handleAttendanceSubmit,
    handleShiftClosingSubmit,
    handleShiftOpeningSubmit,
    handleCashMovementSubmit,
    renderMetricCard,
    renderStatusBadge
  };
}
