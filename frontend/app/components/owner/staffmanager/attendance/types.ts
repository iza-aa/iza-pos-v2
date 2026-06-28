export type ViewMode = "card" | "table";
export type DateRangeMode = "all" | "today" | "week" | "month" | "custom";
export type AttendanceSectionView = "monitor" | "settings";
export type CheckInStatus = "early" | "on_time" | "late" | "out_of_shift" | null;
export type CheckOutStatus = "early_leave" | "on_time" | "overtime" | "out_of_shift" | null;

export type ShiftRecord = {
  id: string;
  shift_name: string;
  check_in_window_start: string | null;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
  check_out_window_end: string | null;
  is_active?: boolean | null;
};

export type ShiftFormData = {
  shift_name: string;
  check_in_window_start: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
  check_out_window_end: string;
  is_active: boolean;
};

export type StoreSettingsRecord = {
  id: string;
  store_name: string;
  store_latitude: number | null;
  store_longitude: number | null;
  attendance_radius_meters: number;
  is_active: boolean;
};

export type StoreSettingsFormData = {
  store_name: string;
  store_latitude: string;
  store_longitude: string;
  attendance_radius_meters: string;
};

export type AttendanceStaff = {
  id: string;
  name: string;
  staff_code: string;
  staff_type?: string | null;
  role?: string | null;
};

export type ActiveStaffRecord = AttendanceStaff & {
  shift_id: string | null;
};

export type AttendanceShift = {
  id: string;
  shift_name: string;
  check_in_window_start: string | null;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
  check_out_window_end: string | null;
};

export type AttendanceRecord = {
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

export type RawAttendanceRecord = {
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

export interface AttendanceSectionProps {
  onClose?: () => void;
  viewMode?: ViewMode;
  dateRangeMode?: DateRangeMode;
  customStartDate?: string;
  customEndDate?: string;
  onShiftChanged?: () => void | Promise<void>;
  section?: AttendanceSectionView;
  requester?: Record<string, unknown> | null;
}

export type AttendanceDataSnapshot = {
  shiftList: ShiftRecord[];
  staffList: ActiveStaffRecord[];
  storeSettings: StoreSettingsRecord | null;
  storeFormData: StoreSettingsFormData;
  attendanceList: AttendanceRecord[];
};

export type AttendanceFetchParams = {
  dateRangeMode: DateRangeMode;
  customStartDate: string;
  customEndDate: string;
  force?: boolean;
};
