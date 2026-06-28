"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/app/components/shared/i18n";
import StandardTable from "@/app/components/shared/StandardTable";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  AttendanceRecord,
  ActiveStaffRecord,
  ShiftRecord,
  ViewMode,
} from "../types";
import {
  formatDate,
  formatDateTime,
  formatDistance,
  formatTime,
  toTitleCase,
  getCheckInStatusLabel,
  getCheckOutStatusLabel,
  getCheckInStatusClassName,
  getCheckOutStatusClassName,
} from "../utils";

interface AttendanceMonitorProps {
  attendanceList: AttendanceRecord[];
  staffList: ActiveStaffRecord[];
  shiftList: ShiftRecord[];
  loading: boolean;
  viewMode: ViewMode;
  fetchAttendanceData: (force?: boolean) => Promise<void>;
}

export default function AttendanceMonitor({
  attendanceList,
  staffList,
  shiftList,
  loading,
  viewMode,
  fetchAttendanceData,
}: AttendanceMonitorProps) {
  const { t } = useLanguage();

  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("all");

  const filteredAttendanceList = useMemo(() => {
    return attendanceList.filter((attendance) => {
      const matchShift =
        selectedShiftId === "all" || attendance.shift_id === selectedShiftId;
      const matchStaff =
        selectedStaffId === "all" || attendance.staff_id === selectedStaffId;
      return matchShift && matchStaff;
    });
  }, [attendanceList, selectedShiftId, selectedStaffId]);

  const summary = useMemo(() => {
    const total = staffList.length;
    const clockedIn = filteredAttendanceList.filter(
      (a) => a.clock_in_at && !a.clock_out_at,
    ).length;
    const clockedOut = filteredAttendanceList.filter(
      (a) => a.clock_in_at && a.clock_out_at,
    ).length;
    const late = filteredAttendanceList.filter(
      (a) => a.check_in_status === "late",
    ).length;
    const earlyLeave = filteredAttendanceList.filter(
      (a) => a.check_out_status === "early_leave",
    ).length;
    const overtime = filteredAttendanceList.filter(
      (a) => a.check_out_status === "overtime",
    ).length;
    const notClockedIn = filteredAttendanceList.filter(
      (a) => !a.clock_in_at,
    ).length;

    return {
      total,
      clockedIn,
      clockedOut,
      late,
      earlyLeave,
      overtime,
      notClockedIn,
    };
  }, [filteredAttendanceList, staffList.length]);

  const renderStatusBadge = (label: string, className: string) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );

  const renderSummaryCard = (
    label: string,
    value: number,
    icon: React.ReactNode,
    description: string,
    tone: keyof typeof OWNER_SEMANTIC_TONES = "neutral",
  ) => (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${OWNER_SEMANTIC_TONES[tone].cardClass}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-4 text-3xl font-bold text-gray-950">{value}</p>
      <p className="mt-3 text-sm text-gray-600">{description}</p>
    </div>
  );

  const renderAttendanceCard = (attendance: AttendanceRecord) => {
    const staffName = attendance.staff?.name ?? t("owner.staff.staffNotFound");
    const staffCode = attendance.staff?.staff_code ?? "-";
    const staffType = toTitleCase(attendance.staff?.staff_type);
    const shiftName = attendance.shift?.shift_name ?? t("owner.staff.noShift");
    const shiftTime = attendance.shift
      ? `${formatTime(attendance.shift.start_time)} - ${formatTime(attendance.shift.end_time)}`
      : "--:-- - --:--";

    return (
      <div
        key={attendance.id}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">{staffCode}</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">
              {staffName}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{staffType}</p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-gray-500">
              {formatDate(attendance.attendance_date)}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {shiftName}
            </p>
            <p className="text-xs text-gray-500">{shiftTime}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Clock In</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {formatDateTime(attendance.clock_in_at)}
            </p>

            <div className="mt-3">
              {renderStatusBadge(
                getCheckInStatusLabel(attendance.check_in_status),
                getCheckInStatusClassName(attendance.check_in_status),
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Distance: {formatDistance(attendance.clock_in_distance_meters)}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Clock Out</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {formatDateTime(attendance.clock_out_at)}
            </p>

            <div className="mt-3">
              {renderStatusBadge(
                getCheckOutStatusLabel(attendance.check_out_status),
                getCheckOutStatusClassName(attendance.check_out_status),
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Distance: {formatDistance(attendance.clock_out_distance_meters)}
            </p>
          </div>
        </div>

        {(attendance.late_reason ||
          attendance.early_leave_reason ||
          attendance.overtime_reason ||
          attendance.notes) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notes
            </p>

            {attendance.late_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Late: {attendance.late_reason}
              </p>
            )}

            {attendance.early_leave_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Early leave: {attendance.early_leave_reason}
              </p>
            )}

            {attendance.overtime_reason && (
              <p className="mt-2 text-sm text-gray-700">
                Overtime: {attendance.overtime_reason}
              </p>
            )}

            {attendance.notes && (
              <p className="mt-2 text-sm text-gray-700">
                Notes: {attendance.notes}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAttendanceTable = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-5 ">
      <h2 className="text-base font-bold text-gray-900">
        {t("owner.staff.attendanceTable")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 mb-4 ">
        Concrete attendance records for clock-in, clock-out, status, and
        location distance.
      </p>

      <StandardTable
        columns={[
          {
            key: "staff",
            header: t("owner.staff.staff"),
            sortValue: (attendance) => attendance.staff?.name ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {attendance.staff?.name ?? t("owner.staff.staffNotFound")}
                </p>
                <p className="text-xs text-gray-500">
                  {attendance.staff?.staff_code ?? "-"} -{" "}
                  {toTitleCase(attendance.staff?.staff_type)}
                </p>
              </div>
            ),
          },
          {
            key: "shift",
            header: t("owner.bookkeeping.shift"),
            sortValue: (attendance) => attendance.shift?.shift_name ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {attendance.shift?.shift_name ?? t("owner.staff.noShift")}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(attendance.shift?.start_time)} -{" "}
                  {formatTime(attendance.shift?.end_time)}
                </p>
              </div>
            ),
          },
          {
            key: "date",
            header: t("owner.bookkeeping.date"),
            sortValue: (attendance) => attendance.attendance_date,
            render: (attendance) => formatDate(attendance.attendance_date),
          },
          {
            key: "clock_in",
            header: t("owner.staff.clockIn"),
            sortValue: (attendance) => attendance.clock_in_at ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(attendance.clock_in_at)}
                </p>
                <div className="mt-2">
                  {renderStatusBadge(
                    getCheckInStatusLabel(attendance.check_in_status),
                    getCheckInStatusClassName(attendance.check_in_status),
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "clock_out",
            header: t("owner.staff.clockOut"),
            sortValue: (attendance) => attendance.clock_out_at ?? "",
            render: (attendance) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(attendance.clock_out_at)}
                </p>
                <div className="mt-2">
                  {renderStatusBadge(
                    getCheckOutStatusLabel(attendance.check_out_status),
                    getCheckOutStatusClassName(attendance.check_out_status),
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: t("owner.staff.status"),
            sortValue: (attendance) =>
              `${attendance.check_in_status ?? ""} ${attendance.check_out_status ?? ""}`,
            render: (attendance) => (
              <div className="space-y-2">
                {attendance.check_in_status === "late" &&
                  renderStatusBadge(
                    "Late Reason Needed",
                    OWNER_SEMANTIC_TONES.danger.badgeClass,
                  )}
                {attendance.check_out_status === "early_leave" &&
                  renderStatusBadge(
                    "Early Leave",
                    OWNER_SEMANTIC_TONES.warning.badgeClass,
                  )}
                {attendance.check_out_status === "overtime" &&
                  renderStatusBadge(
                    "Overtime",
                    OWNER_SEMANTIC_TONES.premium.badgeClass,
                  )}
                {!attendance.check_in_status &&
                  renderStatusBadge(
                    "Not Clocked In",
                    OWNER_SEMANTIC_TONES.neutral.badgeClass,
                  )}
                {attendance.check_in_status &&
                  !attendance.check_out_status &&
                  !attendance.clock_out_at &&
                  renderStatusBadge(
                    "Currently Working",
                    OWNER_SEMANTIC_TONES.info.badgeClass,
                  )}
              </div>
            ),
          },
          {
            key: "distance",
            header: t("owner.staff.distance"),
            sortValue: (attendance) =>
              Number(attendance.clock_in_distance_meters ?? 0),
            render: (attendance) => (
              <div className="space-y-1">
                <p>In: {formatDistance(attendance.clock_in_distance_meters)}</p>
                <p>
                  Out: {formatDistance(attendance.clock_out_distance_meters)}
                </p>
              </div>
            ),
          },
        ]}
        data={filteredAttendanceList}
        getRowKey={(attendance) => attendance.id}
        loading={loading}
        emptyLabel="No attendance data yet."
        minWidthClassName="min-w-[1040px]"
      />
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {renderSummaryCard(
          t("owner.staff.totalStaff"),
          summary.total,
          <CalendarDaysIcon className="h-5 w-5" />,
          "Active users with shifts",
        )}

        {renderSummaryCard(
          "Not Clocked In",
          summary.notClockedIn,
          <ExclamationTriangleIcon className="h-5 w-5" />,
          t("owner.staff.notClockedIn"),
          "waiting",
        )}

        {renderSummaryCard(
          "Clock In",
          summary.clockedIn,
          <ClockIcon className="h-5 w-5" />,
          t("owner.staff.clockedInSentence"),
          "info",
        )}

        {renderSummaryCard(
          "Clock Out",
          summary.clockedOut,
          <CheckCircleIcon className="h-5 w-5" />,
          t("owner.staff.clockedOutSentence"),
          "success",
        )}

        {renderSummaryCard(
          "Late",
          summary.late,
          <ExclamationTriangleIcon className="h-5 w-5" />,
          "Users clock in late.",
          "danger",
        )}

        {renderSummaryCard(
          "Early Leave",
          summary.earlyLeave,
          <FunnelIcon className="h-5 w-5" />,
          "Users clock out early.",
          "warning",
        )}

        {renderSummaryCard(
          "Overtime",
          summary.overtime,
          <UserGroupIcon className="h-5 w-5" />,
          "Users clock out late.",
          "premium",
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t("owner.staff.attendanceMonitorTitle")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Monitor clock in and clock out for active users with assigned
              shifts.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
              className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="all">{t("owner.staff.allStaff")}</option>

              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.staff_code})
                </option>
              ))}
            </select>

            <select
              value={selectedShiftId}
              onChange={(event) => setSelectedShiftId(event.target.value)}
              className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="all">{t("owner.staff.allShifts")}</option>

              {shiftList.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.shift_name} ({formatTime(shift.start_time)} -{" "}
                  {formatTime(shift.end_time)})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => fetchAttendanceData(true)}
              className="h-10 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {filteredAttendanceList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-4 text-base font-bold text-gray-900">
            No attendance data yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Data will appear after staff clock in or clock out from the
            attendance page.
          </p>
        </div>
      ) : viewMode === "table" ? (
        renderAttendanceTable()
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredAttendanceList.map((attendance) =>
            renderAttendanceCard(attendance),
          )}
        </div>
      )}
    </>
  );
}
