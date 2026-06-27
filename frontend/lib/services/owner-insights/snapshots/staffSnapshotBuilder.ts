import type { SupabaseClient } from "@supabase/supabase-js";
import { average, buildMetric } from "../domain/metricSnapshotBuilder";
import {
  buildRecommendationPeriodContext,
  getPeriodLengthDays,
  isDateInPeriod,
} from "../domain/periodService";
import {
  applyInsightOrderCorrections,
  type InsightOrderCorrectionRow,
} from "../domain/orderCorrectionUtils";
import type {
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationChartPoint,
  RecommendationMetric,
  RecommendationSnapshot,
} from "../domain/recommendationSnapshotTypes";

type StaffRow = {
  id: string;
  name?: string | null;
  role?: string | null;
  status?: string | null;
  staff_positions?: Array<{ position: string; is_primary: boolean }> | null;
};

type AttendanceRow = {
  id: string;
  staff_id?: string | null;
  attendance_date?: string | null;
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  check_in_status?: string | null;
  check_out_status?: string | null;
};

type OrderRow = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  order_date?: string | null;
  created_at?: string | null;
  created_by?: string | null;
};

type OrderItemRow = {
  order_id?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  served_by?: string | null;
};

const cancelledStatuses = new Set(["cancelled", "canceled", "void", "refunded"]);
const invalidPaymentStatuses = new Set([
  "cancelled",
  "canceled",
  "failed",
  "refunded",
  "void",
  "unpaid",
  "pending",
]);

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getJakartaDateParts = (value: string | null | undefined) => {
  if (!value) return null;

  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    hour: getPart("hour") === "24" ? "00" : getPart("hour").padStart(2, "0"),
  };
};

const getOrderBusinessDate = (order: OrderRow) =>
  getJakartaDateParts(order.created_at)?.date || String(order.order_date ?? "");

const getBusinessHourFromTimestamp = (value: string | null | undefined) =>
  getJakartaDateParts(value)?.hour ?? "00";

const isValidSalesOrder = (order: OrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const payment = String(order.payment_status ?? "").toLowerCase();

  if (cancelledStatuses.has(status)) return false;
  if (invalidPaymentStatuses.has(payment)) return false;

  return true;
};

const getMinutesBetween = (
  start: string | null | undefined,
  end: string | null | undefined,
) => {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  const minutes = (endTime - startTime) / 60_000;
  if (minutes < 0 || minutes > 240) return null;
  return minutes;
};

const formatEvidenceNumber = (value: number | string | null, unit: string) => {
  if (value === null) return "not available";
  if (typeof value === "string") return value;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "minutes") return `${value.toFixed(1)} min`;
  return Math.round(value).toLocaleString("id-ID");
};

const buildAttendanceTrend = (
  attendanceRows: AttendanceRow[],
  period: ReturnType<typeof buildRecommendationPeriodContext>,
): RecommendationChartPoint[] => {
  if (period.selected.granularity === "hour") {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourKey = String(hour).padStart(2, "0");
      return {
        period: `${hourKey}:00`,
        clockedIn: attendanceRows.filter(
          (row) => getBusinessHourFromTimestamp(row.clock_in_at) === hourKey,
        ).length,
        late: attendanceRows.filter(
          (row) =>
            row.check_in_status === "late" &&
            getBusinessHourFromTimestamp(row.clock_in_at) === hourKey,
        ).length,
      };
    });
  }

  const grouped = new Map<string, AttendanceRow[]>();
  attendanceRows.forEach((row) => {
    const date = row.attendance_date || "Unknown";
    grouped.set(date, [...(grouped.get(date) ?? []), row]);
  });

  return Array.from(grouped.entries())
    .map(([date, rows]) => ({
      period: date,
      clockedIn: rows.filter((row) => row.clock_in_at).length,
      late: rows.filter((row) => row.check_in_status === "late").length,
    }))
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
};

const buildStaffRows = ({
  activeStaff,
  attendanceRows,
  orders,
  orderItems,
  periodDays,
}: {
  activeStaff: StaffRow[];
  attendanceRows: AttendanceRow[];
  orders: OrderRow[];
  orderItems: OrderItemRow[];
  periodDays: number;
}) => {
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const orderItemsInRange = orderItems.filter(
    (item) => item.order_id && orderById.has(item.order_id),
  );

  return activeStaff.map((staff) => {
    const records = attendanceRows.filter((row) => row.staff_id === staff.id);
    const late = records.filter((row) => row.check_in_status === "late").length;
    const overtime = records.filter(
      (row) => row.check_out_status === "overtime",
    ).length;
    const earlyLeave = records.filter(
      (row) => row.check_out_status === "early_leave",
    ).length;
    const clockedIn = records.filter((row) => row.clock_in_at).length;
    const attendanceRate = periodDays
      ? clampScore((clockedIn / periodDays) * 100)
      : 0;
    const createdOrderIds = orders
      .filter((order) => order.created_by === staff.id)
      .map((order) => order.id);
    const servedOrderIds = orderItemsInRange
      .filter((item) => item.served_by === staff.id && item.order_id)
      .map((item) => item.order_id as string);
    const handledOrderIds = new Set([...createdOrderIds, ...servedOrderIds]);
    const serviceMinutes = orderItemsInRange
      .filter((item) => item.served_by === staff.id)
      .map((item) => getMinutesBetween(item.ready_at, item.served_at))
      .filter((minutes): minutes is number => minutes !== null);
    const averageServiceMinutes = serviceMinutes.length
      ? average(serviceMinutes)
      : null;
    const speedScore =
      averageServiceMinutes === null
        ? null
        : clampScore(100 - (averageServiceMinutes / 30) * 100);
    const performanceScore = clampScore(
      attendanceRate -
        late * 5 -
        earlyLeave * 4 +
        overtime * 2 +
        (speedScore ?? 0) * 0.15,
    );

    const staffRoleStr = Array.isArray(staff.staff_positions) && staff.staff_positions.length > 0
      ? staff.staff_positions.map((p) => p.position.replace(/_/g, " ")).join(", ")
      : staff.role || "Staff";

    return {
      id: staff.id,
      name: staff.name || "Staff",
      role: staffRoleStr,
      ordersHandled: handledOrderIds.size,
      averageServiceMinutes,
      serviceSampleSize: serviceMinutes.length,
      late,
      overtime,
      earlyLeave,
      clockedIn,
      attendanceRate,
      performanceScore,
    };
  });
};

const buildRadarMetrics = ({
  staffRows,
  attendanceRows,
}: {
  staffRows: ReturnType<typeof buildStaffRows>;
  attendanceRows: AttendanceRow[];
}) => {
  const averageScore = (values: number[]) => Math.round(average(values));
  const maxOrdersHandled = Math.max(0, ...staffRows.map((row) => row.ordersHandled));
  const attendanceBase = Math.max(1, attendanceRows.length);
  const speedValues = staffRows
    .map((row) =>
      row.averageServiceMinutes === null
        ? null
        : clampScore(100 - (row.averageServiceMinutes / 30) * 100),
    )
    .filter((value): value is number => value !== null);

  return {
    attendance: averageScore(staffRows.map((row) => row.attendanceRate)),
    ordersHandled: maxOrdersHandled
      ? clampScore(
          (averageScore(staffRows.map((row) => row.ordersHandled)) / maxOrdersHandled) *
            100,
        )
      : 0,
    speed: averageScore(speedValues),
    consistency: averageScore(staffRows.map((row) => row.performanceScore)),
    overtimeControl: clampScore(
      100 -
        (attendanceRows.filter((row) => row.check_out_status === "overtime").length /
          attendanceBase) *
          100,
    ),
    reliability: clampScore(
      100 -
        (attendanceRows.filter((row) => row.check_in_status === "late").length /
          attendanceBase) *
          100,
    ),
  };
};

const buildStaffAllowedIssues = ({
  metrics,
  radar,
  staffRows,
}: {
  metrics: Record<string, RecommendationMetric>;
  radar: ReturnType<typeof buildRadarMetrics>;
  staffRows: ReturnType<typeof buildStaffRows>;
}): RecommendationAllowedIssue[] => {
  const issues: RecommendationAllowedIssue[] = [];
  const activeStaff = Number(metrics.activeStaff.value ?? 0);
  const clockedIn = Number(metrics.clockedIn.value ?? 0);
  const lateCount = Number(metrics.lateCount.value ?? 0);
  const overtimeCount = Number(metrics.overtimeCount.value ?? 0);
  const totalAttributedOrders = Number(metrics.totalAttributedOrders.value ?? 0);
  const serviceSampleSize = Number(metrics.serviceSampleSize.value ?? 0);
  const averageServiceMinutes = metrics.averageServiceMinutes.value;
  const staffWithOrders = staffRows.filter((row) => row.ordersHandled > 0).length;

  if (activeStaff === 0) {
    issues.push({
      id: "staff-no-active-staff",
      title: "No Active Staff Found",
      priority: "high",
      confidence: "high",
      problem: "No active non-owner staff were found for staff performance analysis.",
      evidence: [`Active Staff is ${formatEvidenceNumber(activeStaff, "count")}.`],
      recommendationHint:
        "Verify staff status and role setup before using staff performance analytics.",
      expectedImpact:
        "Correct staff master data is required before the owner can read attendance and productivity signals.",
      metricKeys: ["activeStaff"],
    });
  }

  if (clockedIn === 0 && activeStaff > 0) {
    issues.push({
      id: "staff-no-attendance-records",
      title: "No Attendance Records In Period",
      priority: "medium",
      confidence: "high",
      problem: "Active staff exist, but no clock-in records were found in the selected period.",
      evidence: [
        `Active Staff is ${formatEvidenceNumber(activeStaff, "count")}.`,
        `Clocked In is ${formatEvidenceNumber(clockedIn, "count")}.`,
      ],
      recommendationHint:
        "Check whether staff are using the attendance workflow consistently before judging performance.",
      expectedImpact:
        "Reliable attendance data lets the owner distinguish real staffing issues from missing records.",
      metricKeys: ["activeStaff", "clockedIn"],
    });
  }

  if (lateCount > 0) {
    issues.push({
      id: "staff-late-attendance",
      title: "Late Attendance Needs Attention",
      priority: lateCount >= 3 ? "high" : "medium",
      confidence: "high",
      problem: "Late attendance records were detected in the selected period.",
      evidence: [
        `Late Count is ${formatEvidenceNumber(lateCount, "count")}.`,
        `Reliability score is ${formatEvidenceNumber(radar.reliability, "percent")}.`,
      ],
      recommendationHint:
        "Review shift start discipline, schedule clarity, and clock-in habits without blaming individuals from aggregate data alone.",
      expectedImpact:
        "Reducing late arrivals improves staffing readiness during opening and peak service windows.",
      metricKeys: ["lateCount", "reliabilityScore"],
    });
  }

  if (overtimeCount > 0) {
    issues.push({
      id: "staff-overtime-control",
      title: "Overtime Control Needs Review",
      priority: overtimeCount >= 3 ? "medium" : "low",
      confidence: "high",
      problem: "Overtime records were detected in the selected period.",
      evidence: [
        `Overtime Count is ${formatEvidenceNumber(overtimeCount, "count")}.`,
        `Overtime Control score is ${formatEvidenceNumber(radar.overtimeControl, "percent")}.`,
      ],
      recommendationHint:
        "Compare overtime with order volume and shift coverage before adding labor hours.",
      expectedImpact:
        "Better overtime control helps protect labor cost while keeping service coverage adequate.",
      metricKeys: ["overtimeCount", "overtimeControlScore"],
    });
  }

  if (totalAttributedOrders === 0 && activeStaff > 0) {
    issues.push({
      id: "staff-no-order-attribution",
      title: "No Staff Order Attribution",
      priority: "medium",
      confidence: "high",
      problem: "No valid orders were attributed to staff through order creation or served item records.",
      evidence: [
        `Total Attributed Orders is ${formatEvidenceNumber(totalAttributedOrders, "count")}.`,
        `Staff With Orders is ${formatEvidenceNumber(staffWithOrders, "count")}.`,
      ],
      recommendationHint:
        "Ensure POS order creation and serve actions save created_by or served_by so productivity can be measured fairly.",
      expectedImpact:
        "Order attribution makes productivity analytics useful and prevents unfair staff evaluation.",
      metricKeys: ["totalAttributedOrders", "staffWithOrders"],
    });
  }

  if (serviceSampleSize === 0) {
    issues.push({
      id: "staff-service-time-data-gap",
      title: "Service Time Needs Timestamp Data",
      priority: "low",
      confidence: "high",
      problem: "Average service time cannot be calculated because ready-to-served timestamp samples are unavailable.",
      evidence: [
        `Service Sample Size is ${formatEvidenceNumber(serviceSampleSize, "count")}.`,
        `Average Service Time is ${formatEvidenceNumber(averageServiceMinutes ?? null, "minutes")}.`,
      ],
      recommendationHint:
        "Make sure order items save ready_at, served_at, and served_by when staff complete service actions.",
      expectedImpact:
        "Complete service timestamps allow the owner to measure service speed instead of guessing.",
      metricKeys: ["serviceSampleSize", "averageServiceMinutes"],
    });
  }

  if (typeof averageServiceMinutes === "number" && averageServiceMinutes > 20) {
    issues.push({
      id: "staff-service-speed-slow",
      title: "Average Service Time Is High",
      priority: averageServiceMinutes > 30 ? "high" : "medium",
      confidence: "high",
      problem: "Average service time is above the target service window.",
      evidence: [
        `Average Service Time is ${formatEvidenceNumber(averageServiceMinutes, "minutes")}.`,
        `Service Sample Size is ${formatEvidenceNumber(serviceSampleSize, "count")}.`,
      ],
      recommendationHint:
        "Review kitchen handoff, ready-to-serve flow, and staff coverage during periods with longer service times.",
      expectedImpact:
        "Reducing service time improves table flow, customer experience, and peak-hour capacity.",
      metricKeys: ["averageServiceMinutes", "serviceSampleSize"],
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "staff-monitor-baseline",
      title: "Staff Signals Are Stable",
      priority: "low",
      confidence: "medium",
      problem: "No critical staff issue was detected from selected-period metrics.",
      evidence: [
        `Active Staff is ${formatEvidenceNumber(activeStaff, "count")}.`,
        `Clocked In is ${formatEvidenceNumber(clockedIn, "count")}.`,
        `Total Attributed Orders is ${formatEvidenceNumber(totalAttributedOrders, "count")}.`,
      ],
      recommendationHint:
        "Keep monitoring attendance, late count, overtime, order attribution, and service timestamp coverage.",
      expectedImpact:
        "A stable staff baseline helps the owner make staffing decisions only when a real operational signal appears.",
      metricKeys: ["activeStaff", "clockedIn", "totalAttributedOrders"],
    });
  }

  return issues.slice(0, 5);
};

export async function buildStaffRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const period = buildRecommendationPeriodContext(insightPeriod);
  const [
    staffResult,
    attendanceResult,
    ordersResult,
    orderItemsResult,
    orderCorrectionsResult,
  ] =
    await Promise.all([
      supabase.from("staff").select("id,name,role,status,staff_positions(position,is_primary)").order("name", { ascending: true }),
      supabase
        .from("attendance")
        .select(
          "id,staff_id,attendance_date,clock_in_at,clock_out_at,check_in_status,check_out_status",
        ),
      supabase
        .from("orders")
        .select("id,status,payment_status,order_date,created_at,created_by")
        .order("created_at", { ascending: true }),
      supabase.from("order_items").select("order_id,ready_at,served_at,served_by"),
      supabase.from("order_corrections").select("id,order_id,status,physical_status,note"),
    ]);

  if (staffResult.error) {
    throw new Error(`Owner AI could not read staff: ${staffResult.error.message}`);
  }

  if (attendanceResult.error) {
    throw new Error(
      `Owner AI could not read attendance: ${attendanceResult.error.message}`,
    );
  }

  if (ordersResult.error) {
    throw new Error(
      `Owner AI could not read staff order attribution: ${ordersResult.error.message}`,
    );
  }

  if (orderItemsResult.error) {
    throw new Error(
      `Owner AI could not read staff service records: ${orderItemsResult.error.message}`,
    );
  }

  if (orderCorrectionsResult.error) {
    throw new Error(
      `Owner AI could not read staff order corrections: ${orderCorrectionsResult.error.message}`,
    );
  }

  const staff = (staffResult.data ?? []) as StaffRow[];
  const attendance = (attendanceResult.data ?? []) as AttendanceRow[];
  const orders = applyInsightOrderCorrections(
    (ordersResult.data ?? []) as OrderRow[],
    (orderCorrectionsResult.data ?? []) as InsightOrderCorrectionRow[],
  );
  const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
  const activeStaff = staff.filter(
    (row) =>
      row.status === "active" && String(row.role ?? "").toLowerCase() !== "owner",
  );
  const activeStaffIds = new Set(activeStaff.map((row) => row.id));
  const selectedAttendance = attendance.filter(
    (row) =>
      row.attendance_date &&
      isDateInPeriod(row.attendance_date, period.selected) &&
      row.staff_id &&
      activeStaffIds.has(row.staff_id),
  );
  const selectedOrders = orders
    .filter((order) => isDateInPeriod(getOrderBusinessDate(order), period.selected))
    .filter(isValidSalesOrder);
  const periodDays = getPeriodLengthDays(period.selected);
  const staffRows = buildStaffRows({
    activeStaff,
    attendanceRows: selectedAttendance,
    orders: selectedOrders,
    orderItems,
    periodDays,
  });
  const radar = buildRadarMetrics({
    staffRows,
    attendanceRows: selectedAttendance,
  });
  const serviceMinutes = staffRows
    .map((row) => row.averageServiceMinutes)
    .filter((minutes): minutes is number => minutes !== null);
  const totalAttributedOrders = staffRows.reduce(
    (sum, row) => sum + row.ordersHandled,
    0,
  );
  const metrics = {
    activeStaff: buildMetric({
      value: activeStaff.length,
      previousValue: null,
      unit: "count",
      source: "active staff rows excluding owner role",
      displayLabel: "Active Staff",
    }),
    clockedIn: buildMetric({
      value: selectedAttendance.filter((row) => row.clock_in_at).length,
      previousValue: null,
      unit: "count",
      source: "attendance.clock_in_at in selected period",
      displayLabel: "Clocked In",
    }),
    lateCount: buildMetric({
      value: selectedAttendance.filter((row) => row.check_in_status === "late").length,
      previousValue: null,
      unit: "count",
      source: "attendance.check_in_status equals late",
      displayLabel: "Late Count",
    }),
    overtimeCount: buildMetric({
      value: selectedAttendance.filter(
        (row) => row.check_out_status === "overtime",
      ).length,
      previousValue: null,
      unit: "count",
      source: "attendance.check_out_status equals overtime",
      displayLabel: "Overtime Count",
    }),
    totalAttributedOrders: buildMetric({
      value: totalAttributedOrders,
      previousValue: null,
      unit: "count",
      source: "unique orders created_by staff or order_items served_by staff",
      displayLabel: "Total Attributed Orders",
    }),
    staffWithOrders: buildMetric({
      value: staffRows.filter((row) => row.ordersHandled > 0).length,
      previousValue: null,
      unit: "count",
      source: "staff rows with at least one attributed order",
      displayLabel: "Staff With Orders",
    }),
    averageServiceMinutes: buildMetric({
      value: serviceMinutes.length ? average(serviceMinutes) : null,
      previousValue: null,
      unit: "minutes",
      source: "order_items.ready_at to order_items.served_at grouped by served_by",
      displayLabel: "Average Service Time",
    }),
    serviceSampleSize: buildMetric({
      value: staffRows.reduce((sum, row) => sum + row.serviceSampleSize, 0),
      previousValue: null,
      unit: "count",
      source: "count of valid ready_at to served_at samples",
      displayLabel: "Service Sample Size",
    }),
    attendanceScore: buildMetric({
      value: radar.attendance,
      previousValue: null,
      unit: "percent",
      source: "average staff attendance rate over selected period",
      displayLabel: "Attendance Score",
    }),
    reliabilityScore: buildMetric({
      value: radar.reliability,
      previousValue: null,
      unit: "percent",
      source: "late attendance penalty across attendance records",
      displayLabel: "Reliability Score",
    }),
    overtimeControlScore: buildMetric({
      value: radar.overtimeControl,
      previousValue: null,
      unit: "percent",
      source: "overtime attendance penalty across attendance records",
      displayLabel: "Overtime Control Score",
    }),
  } satisfies Record<string, RecommendationMetric>;

  return {
    category: "staff",
    period,
    metrics,
    charts: {
      performanceRadar: {
        title: "Staff Performance Radar",
        description:
          "Attendance, handled orders, speed, consistency, overtime control, and reliability.",
        points: [
          { metric: "Attendance", value: radar.attendance },
          { metric: "Orders Handled", value: radar.ordersHandled },
          { metric: "Speed", value: radar.speed },
          { metric: "Consistency", value: radar.consistency },
          { metric: "Overtime Control", value: radar.overtimeControl },
          { metric: "Reliability", value: radar.reliability },
        ],
      },
      productivity: {
        title: "Productivity",
        description:
          "Orders created or served by each staff member in the selected period.",
        points: staffRows.map((row) => ({
          staffName: row.name,
          role: row.role,
          ordersHandled: row.ordersHandled,
          performanceScore: row.performanceScore,
        })),
      },
      attendanceTrend: {
        title: "Attendance Trend",
        description: "Clock-in and late records over the selected period.",
        points: buildAttendanceTrend(selectedAttendance, period),
      },
    },
    tables: {
      staffPerformance: {
        title: "Staff Performance Table",
        description: "Concrete numbers for fair staff evaluation.",
        rows: staffRows.map((row) => ({
          staffName: row.name,
          role: row.role,
          ordersHandled: row.ordersHandled,
          averageServiceMinutes: row.averageServiceMinutes,
          late: row.late,
          overtime: row.overtime,
          attendanceRate: row.attendanceRate,
          performanceScore: row.performanceScore,
        })),
      },
    },
    allowedIssues: buildStaffAllowedIssues({
      metrics,
      radar,
      staffRows,
    }),
    dataQuality: {
      missingFields: [],
      unsupportedClaims: [
        "Do not blame or rank individual staff unless the recommendation is directly supported by staffPerformance rows.",
        "Do not claim service is slow when serviceSampleSize is 0 or averageServiceMinutes is null.",
        "Do not treat owner role as staff; owner rows are excluded from active staff metrics.",
        "Do not infer payroll cost because wage data is not included.",
      ],
      warnings: totalAttributedOrders === 0
        ? ["No staff order attribution was found through created_by or served_by."]
        : [],
    },
    diagnostics: {
      fetchedStaffRows: staff.length,
      activeNonOwnerStaffRows: activeStaff.length,
      selectedAttendanceRows: selectedAttendance.length,
      selectedOrderRows: selectedOrders.length,
      fetchedOrderItemRows: orderItems.length,
    },
  };
}
