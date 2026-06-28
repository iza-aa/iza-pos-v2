export type CheckInStatus = "early" | "on_time" | "late" | null;
export type CheckOutStatus = "early_leave" | "on_time" | "overtime" | null;
export type StaffAttendanceTab = "absence" | "end-shift";

export type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
};

export type StaffRecord = {
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
  staff_positions?: Array<{ id: string; position: string; is_primary: boolean; is_active: boolean }> | null;
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
  shift?: ShiftRecord | null;
};

export type StoreSettings = {
  id: string;
  store_name: string;
  store_latitude: number | null;
  store_longitude: number | null;
  attendance_radius_meters: number;
  is_active: boolean;
};

export type ShiftClosingData = {
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
  snapshot?: {
    openingCash: number;
    grossSales: number;
    netSales: number;
    cashExpected: number | null;
    expectedDrawerCash: number | null;
    cashToDeposit: number | null;
    closingFloat: number;
    floatPolicy: string;
    totalCashIn: number;
    totalCashOut: number;
    totalCashDrop: number;
  } | null;
  closing: {
    id: string;
    status: string;
    grossSales: number;
    netSales: number;
    cashExpected: number | null;
    cashCounted: number | null;
    cashDifference: number | null;
    notes?: string | null;
    openingCash?: number | null;
    openingCashActual?: number | null;
    openingVariance?: number | null;
    openingVarianceNote?: string | null;
    actualClosingFloat?: number | null;
    expectedDrawerCash?: number | null;
    cashToDeposit?: number | null;
    snapshot_json?: any | null;
  } | null;
};

export type AssignmentRecord = {
  weekday?: number;
  work_date?: string;
  shift_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shift: any;
};


export type Html5QrcodeConfig = {
  fps?: number;
  qrbox?: { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
};

export type Html5QrcodeInstance = {
  start: (
    cameraConfig: { facingMode: "environment" | "user" } | string,
    config: Html5QrcodeConfig,
    onScanSuccess: (decodedText: string) => void,
    onScanFailure?: (errorMessage: string) => void,
  ) => Promise<void | null>;
  stop: () => Promise<void>;
  clear: () => void;
};

export type Html5QrcodeConstructor = new (elementId: string) => Html5QrcodeInstance;

export type RawRelationValue = Record<string, unknown> | Record<string, unknown>[] | null;
