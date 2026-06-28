import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import {
  showError,
  showSuccess,
  showConfirmation,
} from "@/lib/services/errorHandling";

import {
  AttendanceFetchParams,
  AttendanceDataSnapshot,
  DateRangeMode,
  ActiveStaffRecord,
  ShiftRecord,
  StoreSettingsRecord,
  StoreSettingsFormData,
  AttendanceRecord,
  RawAttendanceRecord,
  ShiftFormData,
} from "../types";

import {
  getAttendanceFetchKey,
  normalizeActiveStaff,
  normalizeAttendanceRecord,
  buildStoreSettingsFormData,
  buildAttendanceListWithAbsentStaff,
  getDateRange,
  getErrorMessage,
  isValidShiftForm,
  isValidStoreSettingsForm,
} from "../utils";

const FETCH_CACHE_TTL_MS = 5000;

let attendanceDataCache: AttendanceDataSnapshot | null = null;
let attendanceDataCacheKey = "";
let attendanceDataCacheAt = 0;
let attendanceFetchPromise: Promise<AttendanceDataSnapshot> | null = null;
let attendanceFetchPromiseKey = "";

export const loadAttendanceSnapshot = async ({
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
        "id, shift_name, check_in_window_start, start_time, check_in_grace_until, end_time, check_out_grace_until, check_out_window_end, is_active",
      )
      .order("start_time", { ascending: true });

    const staffPromise = supabase
      .from("staff")
      .select(
        `
          id,
          name,
          staff_code,
          role,
          shift_id,
          staff_positions (
            id,
            staff_id,
            position,
            is_primary,
            is_active
          )
        `,
      )
      .eq("status", "active")
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
            role,
            staff_positions (
              id,
              staff_id,
              position,
              is_primary,
              is_active
            )
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

    let dailyAssignmentsPromise: PromiseLike<{
      data: { staff_id: string; shift_id: string; work_date: string }[] | null;
      error: unknown;
    }> = Promise.resolve({ data: [], error: null });
    let weeklyAssignmentsPromise: PromiseLike<{
      data: { staff_id: string; shift_id: string; weekday: number }[] | null;
      error: unknown;
    }> = Promise.resolve({ data: [], error: null });

    if (startDate && endDate && startDate === endDate) {
      dailyAssignmentsPromise = supabase
        .from("staff_shift_daily_assignments")
        .select("staff_id, shift_id, work_date")
        .eq("work_date", startDate);

      weeklyAssignmentsPromise = supabase
        .from("staff_shift_weekly_assignments")
        .select("staff_id, shift_id, weekday");
    }

    const [
      shiftsResult,
      staffResult,
      attendanceResult,
      storeSettingsResult,
      dailyResult,
      weeklyResult,
    ] = await Promise.all([
      shiftsPromise,
      staffPromise,
      attendanceQuery,
      storeSettingsPromise,
      dailyAssignmentsPromise,
      weeklyAssignmentsPromise,
    ]);

    if (shiftsResult.error) throw shiftsResult.error;
    if (staffResult.error) throw staffResult.error;
    if (attendanceResult.error) throw attendanceResult.error;
    if (storeSettingsResult.error) throw storeSettingsResult.error;
    if (dailyResult.error) throw dailyResult.error;
    if (weeklyResult.error) throw weeklyResult.error;

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
        dailyAssignments: (dailyResult.data ?? []) as {
          staff_id: string;
          shift_id: string;
          work_date: string;
        }[],
        weeklyAssignments: (weeklyResult.data ?? []) as {
          staff_id: string;
          shift_id: string;
          weekday: number;
        }[],
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

export const useAttendanceData = ({
  dateRangeMode,
  customStartDate,
  customEndDate,
}: {
  dateRangeMode: DateRangeMode;
  customStartDate?: string;
  customEndDate?: string;
}) => {
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [shiftList, setShiftList] = useState<ShiftRecord[]>([]);
  const [staffList, setStaffList] = useState<ActiveStaffRecord[]>([]);
  const [storeSettings, setStoreSettings] =
    useState<StoreSettingsRecord | null>(null);
  const [storeFormData, setStoreFormData] = useState<StoreSettingsFormData>(
    buildStoreSettingsFormData(null),
  );

  const [loading, setLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAttendanceData = useCallback(
    async (force = false) => {
      try {
        setFetchError(null);
        if (force) {
          setLoading(true);
        }

        const snapshot = await loadAttendanceSnapshot({
          dateRangeMode,
          customStartDate: customStartDate || "",
          customEndDate: customEndDate || "",
          force,
        });

        setShiftList(snapshot.shiftList);
        setStaffList(snapshot.staffList);
        setStoreSettings(snapshot.storeSettings);
        setStoreFormData(snapshot.storeFormData);
        setAttendanceList(snapshot.attendanceList);
      } catch (err) {
        console.error("Error loading attendance data:", err);
        const message = getErrorMessage(err, "Failed to load attendance data");
        setFetchError(message);
        showError(message);
      } finally {
        setLoading(false);
      }
    },
    [dateRangeMode, customStartDate, customEndDate],
  );

  useEffect(() => {
    fetchAttendanceData(true);
  }, [fetchAttendanceData]);

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        },
      );

      setStoreFormData((prev) => ({
        ...prev,
        store_latitude: position.coords.latitude.toString(),
        store_longitude: position.coords.longitude.toString(),
      }));

      showSuccess("Location updated successfully");
    } catch (err: unknown) {
      console.error("Error getting location:", err);
      const errorMessage =
        err instanceof GeolocationPositionError
          ? err.message
          : "Failed to get current location";
      showError(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidStoreSettingsForm(storeFormData)) {
      return;
    }

    setStoreLoading(true);

    try {
      const latitude = Number.parseFloat(storeFormData.store_latitude);
      const longitude = Number.parseFloat(storeFormData.store_longitude);
      const radius = Number.parseInt(
        storeFormData.attendance_radius_meters,
        10,
      );

      const payload = {
        store_name: storeFormData.store_name,
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

      if (error) throw error;

      showSuccess("Store settings saved successfully");
      await fetchAttendanceData(true);
    } catch (err) {
      console.error("Error saving store settings:", err);
      const message = getErrorMessage(err, "Failed to save store settings");
      showError(message);
    } finally {
      setStoreLoading(false);
    }
  };

  const handleSaveShift = async (
    shiftFormData: ShiftFormData,
    editingShift: ShiftRecord | null,
    onSuccess?: () => void,
  ) => {
    if (!isValidShiftForm(shiftFormData)) {
      return;
    }

    setShiftLoading(true);

    try {
      const payload = {
        shift_name: shiftFormData.shift_name,
        check_in_window_start: shiftFormData.check_in_window_start || null,
        start_time: shiftFormData.start_time,
        check_in_grace_until:
          shiftFormData.check_in_grace_until || shiftFormData.start_time,
        end_time: shiftFormData.end_time,
        check_out_grace_until:
          shiftFormData.check_out_grace_until || shiftFormData.end_time,
        check_out_window_end: shiftFormData.check_out_window_end || null,
        is_active: shiftFormData.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error } = editingShift
        ? await supabase
            .from("shifts")
            .update(payload)
            .eq("id", editingShift.id)
        : await supabase.from("shifts").insert([payload]);

      if (error) throw error;

      showSuccess(
        editingShift
          ? "Shift updated successfully"
          : "Shift created successfully",
      );

      if (onSuccess) onSuccess();
      await fetchAttendanceData(true);
    } catch (err) {
      console.error("Error saving shift:", err);
      const message = getErrorMessage(err, "Failed to save shift");
      showError(message);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleToggleShiftStatus = async (shift: ShiftRecord) => {
    const nextStatus = !shift.is_active;
    const actionLabel = nextStatus ? "activate" : "deactivate";

    const confirmed = await showConfirmation(
      `Are you sure you want to ${actionLabel} the shift "${shift.shift_name}"?`,
      `${nextStatus ? "Activate" : "Deactivate"} Shift`,
    );

    if (!confirmed) return;

    setShiftLoading(true);

    try {
      const { error } = await supabase
        .from("shifts")
        .update({
          is_active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shift.id);

      if (error) throw error;

      showSuccess(
        `Shift ${nextStatus ? "activated" : "deactivated"} successfully`,
      );
      await fetchAttendanceData(true);
    } catch (err) {
      console.error(`Error toggling shift status:`, err);
      const message = getErrorMessage(err, `Failed to ${actionLabel} shift`);
      showError(message);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleDeleteShift = async (shift: ShiftRecord) => {
    const confirmed = await showConfirmation(
      `Are you sure you want to permanently delete the shift "${shift.shift_name}"? This action cannot be undone.`,
      "Delete Shift",
    );

    if (!confirmed) return;

    setShiftLoading(true);

    try {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", shift.id);

      if (error) throw error;

      showSuccess("Shift deleted successfully");
      await fetchAttendanceData(true);
    } catch (err) {
      console.error("Error deleting shift:", err);
      const message = getErrorMessage(err, "Failed to delete shift");
      showError(message);
    } finally {
      setShiftLoading(false);
    }
  };

  return {
    attendanceList,
    shiftList,
    staffList,
    storeSettings,
    storeFormData,
    setStoreFormData,
    loading,
    shiftLoading,
    storeLoading,
    locationLoading,
    fetchError,
    fetchAttendanceData,
    handleUseCurrentLocation,
    handleSaveStoreSettings,
    handleSaveShift,
    handleToggleShiftStatus,
    handleDeleteShift,
  };
};
