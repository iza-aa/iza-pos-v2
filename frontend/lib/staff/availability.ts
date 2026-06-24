import {
  getStaffPositions,
  normalizeStaffPosition,
  normalizeStaffPositions,
  type StaffPosition,
  type StaffPositionAssignment,
} from "./positions";

export type AvailabilityStaffRecord = {
  id: string;
  name: string;
  staff_code: string;
  role: string | null;
  staff_type?: string | null;
  status?: string | null;
  profile_picture?: string | null;
  staff_positions?: StaffPositionAssignment[] | null;
};

export type AvailabilityAttendanceRecord = {
  staff_id: string;
  shift_id?: string | null;
  attendance_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

export type AvailabilityScheduleRecord = {
  staff_id: string;
  shift_id: string | null;
  status?: string | null;
};

export type AvailableStaffRow = {
  id: string;
  name: string;
  staffCode: string;
  role: string | null;
  positions: StaffPosition[];
  profilePicture: string | null;
  isAvailable: boolean;
  availabilityReason:
    | "available"
    | "not_clocked_in"
    | "clocked_out"
    | "position_mismatch";
  attendance: {
    date: string;
    clockInAt: string | null;
    clockOutAt: string | null;
  } | null;
  schedule: {
    shiftId: string | null;
    source: "daily" | "weekly" | "none";
    matchesSchedule: boolean | null;
  };
};

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export const getJakartaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
};

export const getIsoWeekdayFromDateString = (dateString: string) => {
  // Use 12:00:00Z to avoid any timezone offset issues at the edges of the day
  const date = new Date(`${dateString}T12:00:00Z`);
  const day = date.getUTCDay();

  return day === 0 ? 7 : day;
};

export const parseAvailabilityPositions = (
  values: Array<string | null>,
): StaffPosition[] => {
  const splitValues = values.flatMap((value) =>
    String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  return normalizeStaffPositions(splitValues);
};

export const isValidDateString = (value: string) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

export const buildAvailableStaffRows = ({
  staff,
  attendance,
  dailySchedules,
  weeklySchedules,
  requestedPositions,
}: {
  staff: AvailabilityStaffRecord[];
  attendance: AvailabilityAttendanceRecord[];
  dailySchedules: AvailabilityScheduleRecord[];
  weeklySchedules: AvailabilityScheduleRecord[];
  requestedPositions: StaffPosition[];
}): AvailableStaffRow[] => {
  const attendanceByStaffId = new Map(
    attendance.map((record) => [record.staff_id, record]),
  );
  const dailyScheduleByStaffId = new Map(
    dailySchedules.map((record) => [record.staff_id, record]),
  );
  const weeklyScheduleByStaffId = new Map(
    weeklySchedules.map((record) => [record.staff_id, record]),
  );

  return staff
    .map((staffMember) => {
      const positions = getStaffPositions(staffMember);
      const hasRequestedPosition =
        requestedPositions.length === 0 ||
        requestedPositions.some((position) => positions.includes(position));
      const attendanceRecord = attendanceByStaffId.get(staffMember.id) ?? null;
      const dailySchedule = dailyScheduleByStaffId.get(staffMember.id);
      const weeklySchedule = weeklyScheduleByStaffId.get(staffMember.id);
      const scheduledShiftId =
        dailySchedule?.shift_id ??
        weeklySchedule?.shift_id ??
        null;
      const scheduleSource = dailySchedule
        ? "daily"
        : weeklySchedule
          ? "weekly"
          : "none";
      const isClockedIn = Boolean(attendanceRecord?.clock_in_at);
      const isClockedOut = Boolean(attendanceRecord?.clock_out_at);
      const isAvailable = hasRequestedPosition && isClockedIn && !isClockedOut;
      const availabilityReason = !hasRequestedPosition
        ? "position_mismatch"
        : !isClockedIn
          ? "not_clocked_in"
          : isClockedOut
            ? "clocked_out"
            : "available";

      return {
        id: staffMember.id,
        name: staffMember.name,
        staffCode: staffMember.staff_code,
        role: staffMember.role,
        positions,
        profilePicture: staffMember.profile_picture ?? null,
        isAvailable,
        availabilityReason,
        attendance: attendanceRecord
          ? {
              date: attendanceRecord.attendance_date,
              clockInAt: attendanceRecord.clock_in_at,
              clockOutAt: attendanceRecord.clock_out_at,
            }
          : null,
        schedule: {
          shiftId: scheduledShiftId,
          source: scheduleSource,
          matchesSchedule: scheduledShiftId
            ? attendanceRecord?.shift_id
              ? scheduledShiftId === attendanceRecord.shift_id
              : null
            : null,
        },
      } satisfies AvailableStaffRow;
    })
    .filter((staffMember) => staffMember.positions.length > 0)
    .sort((left, right) => {
      if (left.isAvailable !== right.isAvailable) {
        return left.isAvailable ? -1 : 1;
      }

      return left.name.localeCompare(right.name, "id-ID");
    });
};

export const normalizeAvailabilityPosition = normalizeStaffPosition;
