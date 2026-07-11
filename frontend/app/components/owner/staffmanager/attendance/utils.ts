import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import {
  getPrimaryStaffPosition,
  type StaffPositionAssignment,
} from "@/lib/staff/positions";
import type {
  CheckInStatus,
  CheckOutStatus,
  AttendanceStaff,
  ActiveStaffRecord,
  AttendanceShift,
  AttendanceRecord,
  RawAttendanceRecord,
  AttendanceFetchParams,
} from "./types";

export const getAttendanceFetchKey = ({
  dateRangeMode,
  customStartDate,
  customEndDate,
}: AttendanceFetchParams) => {
  return `${dateRangeMode}|${customStartDate}|${customEndDate}`;
};

export const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

export const toNullableString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value : null;
};

export const toNullableNumberOrString = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return value;
  return null;
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

export const normalizeCheckInStatus = (value: unknown): CheckInStatus => {
  const strValue = typeof value === "string" ? value : "";
  if (strValue === "early") return "early";
  if (strValue === "on_time") return "on_time";
  if (strValue === "late") return "late";
  if (strValue === "out_of_shift") return "out_of_shift";
  return null;
};

export const normalizeCheckOutStatus = (value: unknown): CheckOutStatus => {
  const strValue = typeof value === "string" ? value : "";
  if (strValue === "early_leave") return "early_leave";
  if (strValue === "on_time") return "on_time";
  if (strValue === "overtime") return "overtime";
  if (strValue === "out_of_shift") return "out_of_shift";
  return null;
};

export const normalizeStaff = (value: unknown): AttendanceStaff | null => {
  const staff = getSingleRelation<Record<string, unknown>>(value);

  if (!staff) return null;

  const id = toSafeString(staff.id);
  const name = toSafeString(staff.name);
  const staffCode = toSafeString(staff.staff_code);

  if (!id || !name || !staffCode) return null;

  const staffPositions = (staff.staff_positions ?? null) as
    StaffPositionAssignment[] | null;
  const primaryPos = getPrimaryStaffPosition({
    staff_positions: staffPositions,
  });

  return {
    id,
    name,
    staff_code: staffCode,
    staff_type: primaryPos,
    role: toNullableString(staff.role),
  };
};

export const normalizeActiveStaff = (
  value: unknown,
): ActiveStaffRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const staff = value as Record<string, unknown>;
  const id = toSafeString(staff.id);
  const name = toSafeString(staff.name);
  const staffCode = toSafeString(staff.staff_code);

  if (!id || !name || !staffCode) return null;

  const staffPositions = (staff.staff_positions ?? null) as
    StaffPositionAssignment[] | null;
  const primaryPos = getPrimaryStaffPosition({
    staff_positions: staffPositions,
  });

  return {
    id,
    name,
    staff_code: staffCode,
    staff_type: primaryPos,
    role: toNullableString(staff.role),
    shift_id: toNullableString(staff.shift_id),
  };
};

export const normalizeShift = (value: unknown): AttendanceShift | null => {
  const shift = getSingleRelation<Record<string, unknown>>(value);

  if (!shift) return null;

  const id = toSafeString(shift.id);
  const shiftName = toSafeString(shift.shift_name);
  const checkInWindowStart = toNullableString(shift.check_in_window_start);
  const startTime = toSafeString(shift.start_time);
  const checkInGraceUntil = toSafeString(shift.check_in_grace_until);
  const endTime = toSafeString(shift.end_time);
  const checkOutGraceUntil = toSafeString(shift.check_out_grace_until);
  const checkOutWindowEnd = toNullableString(shift.check_out_window_end);

  if (!id || !shiftName) return null;

  return {
    id,
    shift_name: shiftName,
    check_in_window_start: checkInWindowStart,
    start_time: startTime,
    check_in_grace_until: checkInGraceUntil,
    end_time: endTime,
    check_out_grace_until: checkOutGraceUntil,
    check_out_window_end: checkOutWindowEnd,
  };
};

export const normalizeAttendanceRecord = (
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

export const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatDateTime = (value?: string | null) => {
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

export const toTitleCase = (value?: string | null) => {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getCheckInStatusLabel = (status: CheckInStatus) => {
  if (status === "early") return "Early Arrival";
  if (status === "on_time") return "On-Time Clock In";
  if (status === "late") return "Late";
  if (status === "out_of_shift") return "Di Luar Shift";
  return "Not Clocked In";
};

export const getCheckOutStatusLabel = (status: CheckOutStatus) => {
  if (status === "early_leave") return "Early Leave";
  if (status === "on_time") return "On-Time Clock Out";
  if (status === "overtime") return "Overtime";
  if (status === "out_of_shift") return "Di Luar Shift";
  return "Not Clocked Out";
};

export const getCheckInStatusClassName = (status: CheckInStatus) => {
  if (status === "late") return OWNER_SEMANTIC_TONES.danger.badgeClass;
  if (status === "early") return OWNER_SEMANTIC_TONES.info.badgeClass;
  if (status === "on_time") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (status === "out_of_shift")
    return "border-gray-300 bg-gray-100 text-gray-700";
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

export const getCheckOutStatusClassName = (status: CheckOutStatus) => {
  if (status === "early_leave") {
    return OWNER_SEMANTIC_TONES.warning.badgeClass;
  }

  if (status === "overtime") {
    return OWNER_SEMANTIC_TONES.premium.badgeClass;
  }

  if (status === "on_time") {
    return OWNER_SEMANTIC_TONES.success.badgeClass;
  }

  if (status === "out_of_shift")
    return "border-gray-300 bg-gray-100 text-gray-700";

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

export const getJakartaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return date.toISOString().split("T")[0];

  return `${year}-${month}-${day}`;
};

export const addDaysToDateString = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return getJakartaDateString(date);
};

export const addMonthsToDateString = (dateString: string, months: number) => {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return getJakartaDateString(date);
};

export const getDateRange = (
  dateRangeMode: import("./types").DateRangeMode,
  customStartDate: string,
  customEndDate: string,
) => {
  const today = getJakartaDateString();

  if (dateRangeMode === "today") {
    return { startDate: today, endDate: today };
  }

  if (dateRangeMode === "week") {
    return { startDate: addDaysToDateString(today, -7), endDate: today };
  }

  if (dateRangeMode === "month") {
    return { startDate: addMonthsToDateString(today, -1), endDate: today };
  }

  if (dateRangeMode === "custom" && customStartDate && customEndDate) {
    return { startDate: customStartDate, endDate: customEndDate };
  }

  return { startDate: null, endDate: null };
};

export const getErrorMessage = (error: unknown, fallback: string) => {
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

export const normalizeTimeForDb = (value: string) => {
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

export const normalizeCoordinateInput = (value: string) => {
  const normalizedValue = value.trim().replace(",", ".");
  if (!normalizedValue) return null;

  const coordinate = Number(normalizedValue);
  if (!Number.isFinite(coordinate)) return null;

  return coordinate;
};

export const normalizeRadiusInput = (value: string) => {
  const radius = Number(value.trim());
  if (!Number.isFinite(radius)) return null;

  return Math.round(radius);
};

export const isValidStoreSettingsForm = (
  formData: import("./types").StoreSettingsFormData,
) => {
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

export const isValidShiftForm = (formData: import("./types").ShiftFormData) => {
  const checkInWindowStart = normalizeTimeForDb(formData.check_in_window_start);
  const startTime = normalizeTimeForDb(formData.start_time);
  const checkInGraceUntil = normalizeTimeForDb(formData.check_in_grace_until);
  const endTime = normalizeTimeForDb(formData.end_time);
  const checkOutGraceUntil = normalizeTimeForDb(formData.check_out_grace_until);
  const checkOutWindowEnd = normalizeTimeForDb(formData.check_out_window_end);

  return (
    !!formData.shift_name.trim() &&
    !!checkInWindowStart &&
    !!startTime &&
    !!checkInGraceUntil &&
    !!endTime &&
    !!checkOutGraceUntil &&
    !!checkOutWindowEnd
  );
};

export const buildStoreSettingsFormData = (
  storeSettingsData: import("./types").StoreSettingsRecord | null,
): import("./types").StoreSettingsFormData => {
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

export const buildAttendanceListWithAbsentStaff = ({
  attendanceList,
  staffList,
  shiftList,
  startDate,
  endDate,
  dailyAssignments,
  weeklyAssignments,
}: {
  attendanceList: import("./types").AttendanceRecord[];
  staffList: import("./types").ActiveStaffRecord[];
  shiftList: import("./types").ShiftRecord[];
  startDate: string | null;
  endDate: string | null;
  dailyAssignments: { staff_id: string; shift_id: string; work_date: string }[];
  weeklyAssignments: { staff_id: string; shift_id: string; weekday: number }[];
}) => {
  if (!startDate || !endDate || startDate !== endDate) {
    return attendanceList;
  }

  const shiftMap = new Map<string, import("./types").ShiftRecord>(
    shiftList.map((shift) => [shift.id, shift]),
  );

  const existingStaffIds = new Set(
    attendanceList
      .filter((attendance) => attendance.attendance_date === startDate)
      .map((attendance) => attendance.staff_id),
  );

  const targetDate = new Date(`${startDate}T00:00:00`);
  const targetDayOfWeek = targetDate.getDay();

  const absentAttendanceList: import("./types").AttendanceRecord[] = staffList
    .filter((staff) => !existingStaffIds.has(staff.id))
    .map((staff) => {
      let assignedShiftId: string | null = null;

      const daily = dailyAssignments.find(
        (a) => a.staff_id === staff.id && a.work_date === startDate,
      );

      if (daily) {
        assignedShiftId = daily.shift_id;
      } else {
        const weekly = weeklyAssignments.find(
          (a) => a.staff_id === staff.id && a.weekday === targetDayOfWeek,
        );
        if (weekly) {
          assignedShiftId = weekly.shift_id;
        }
      }

      if (!assignedShiftId) return null;

      const staffShift = assignedShiftId ? shiftMap.get(assignedShiftId) : null;

      return {
        id: `absent-${staff.id}-${startDate}`,
        staff_id: staff.id,
        shift_id: assignedShiftId,
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
              check_in_window_start: staffShift.check_in_window_start,
              start_time: staffShift.start_time,
              check_in_grace_until: staffShift.check_in_grace_until,
              end_time: staffShift.end_time,
              check_out_grace_until: staffShift.check_out_grace_until,
              check_out_window_end: staffShift.check_out_window_end,
            }
          : null,
      } as import("./types").AttendanceRecord;
    })
    .filter(
      (record): record is import("./types").AttendanceRecord => record !== null,
    );

  return [...attendanceList, ...absentAttendanceList].sort((a, b) => {
    if (a.attendance_date !== b.attendance_date) {
      return b.attendance_date.localeCompare(a.attendance_date);
    }
    const aClock = a.clock_in_at || "";
    const bClock = b.clock_in_at || "";
    return bClock.localeCompare(aClock);
  });
};
