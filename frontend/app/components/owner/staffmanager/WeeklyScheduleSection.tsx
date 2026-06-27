"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { getInitials } from "@/lib/utils";

type ShiftRow = {
  id: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
};

type StaffRow = {
  id: string;
  name: string;
  staff_code: string;
  role: string;
  profile_picture?: string | null;
};

type AssignmentRow = {
  staff_id: string;
  weekday: number;
  shift_id: string;
};

type ScheduleResponse = {
  data?: {
    assignments?: AssignmentRow[];
    staff?: StaffRow[];
    shifts?: ShiftRow[];
  };
  error?: string;
};

const WEEKDAYS = [
  { value: 1, shortLabel: "Mon", label: "Monday", isWeekend: false },
  { value: 2, shortLabel: "Tue", label: "Tuesday", isWeekend: false },
  { value: 3, shortLabel: "Wed", label: "Wednesday", isWeekend: false },
  { value: 4, shortLabel: "Thu", label: "Thursday", isWeekend: false },
  { value: 5, shortLabel: "Fri", label: "Friday", isWeekend: false },
  { value: 6, shortLabel: "Sat", label: "Saturday", isWeekend: true },
  { value: 7, shortLabel: "Sun", label: "Sunday", isWeekend: true },
];

const SHIFT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-800", dot: "bg-cyan-500" },
];

const formatTime = (value?: string | null) => value?.slice(0, 5) || "--:--";

const getRoleLabel = (role: string) => {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Staff";
};

function StaffAvatar({ staff }: { staff: StaffRow }) {
  const profilePicture = staff.profile_picture?.trim() || "";

  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-[11px] font-bold text-white">
      {getInitials(staff.name)}
      {profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profilePicture}
          alt={staff.name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}

function ShiftPill({
  shift,
  colorIndex,
  onClick,
  disabled,
}: {
  shift: ShiftRow | null;
  colorIndex: number;
  onClick: () => void;
  disabled: boolean;
}) {
  const color = SHIFT_COLORS[colorIndex % SHIFT_COLORS.length];

  if (!shift) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="group flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 bg-white px-2 py-2 text-xs text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">Off</span>
        <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${color.bg} ${color.border} ${color.text}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
      <span className="min-w-0 flex-1 truncate text-left">{shift.shift_name}</span>
      <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

function ShiftDropdown({
  shifts,
  currentShiftId,
  onSelect,
  onClose,
  colorMap,
  alignRight = false,
}: {
  shifts: ShiftRow[];
  currentShiftId: string;
  onSelect: (shiftId: string) => void;
  onClose: () => void;
  colorMap: Map<string, number>;
  alignRight?: boolean;
}) {
  return (
    <div className={`absolute z-50 mt-1 min-w-45 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ${alignRight ? "right-0" : "left-0"}`}>
      <button
        type="button"
        onClick={() => {
          onSelect("");
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-gray-500 transition hover:bg-gray-50"
      >
        <span className="h-1.5 w-1.5 rounded-full border border-gray-300" />
        Off / Not scheduled
      </button>
      <div className="border-t border-gray-100" />
      {shifts.map((shift) => {
        const idx = colorMap.get(shift.id) ?? 0;
        const color = SHIFT_COLORS[idx % SHIFT_COLORS.length];
        const isSelected = shift.id === currentShiftId;

        return (
          <button
            key={shift.id}
            type="button"
            onClick={() => {
              onSelect(shift.id);
              onClose();
            }}
            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-gray-50 ${isSelected ? "font-semibold" : ""}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
            <span className="flex-1">
              {shift.shift_name}
              <span className="ml-1 text-gray-400">
                {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
              </span>
            </span>
            {isSelected && <CheckIcon className="h-3.5 w-3.5 text-gray-700" />}
          </button>
        );
      })}
    </div>
  );
}

export default function WeeklyScheduleSection() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [schedule, setSchedule] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [dirtyStaffIds, setDirtyStaffIds] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<{ staffId: string; weekday: number } | null>(null);

  const loadSchedule = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/owner/staff-manager/weekly-shifts");
      const result = (await response.json().catch(() => ({}))) as ScheduleResponse;

      if (!response.ok) {
        throw new Error(result.error || "Shift roster could not be loaded.");
      }

      const nextSchedule: Record<string, Record<number, string>> = {};

      (result.data?.assignments || []).forEach((assignment) => {
        nextSchedule[assignment.staff_id] ||= {};
        nextSchedule[assignment.staff_id][assignment.weekday] = assignment.shift_id;
      });

      const staffList = result.data?.staff || [];
      setStaff(staffList.filter((staffMember) => staffMember.role !== "manager" && staffMember.role !== "owner"));
      setShifts(result.data?.shifts || []);
      setSchedule(nextSchedule);
      setDirtyStaffIds(new Set());
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Shift roster could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (!openDropdown) return;

    const handle = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-shift-dropdown]")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openDropdown]);

  const shiftById = useMemo(
    () => new Map(shifts.map((shift) => [shift.id, shift])),
    [shifts],
  );

  const shiftColorMap = useMemo(() => {
    const map = new Map<string, number>();
    shifts.forEach((shift, idx) => map.set(shift.id, idx));
    return map;
  }, [shifts]);

  const updateDay = useCallback((staffId: string, weekday: number, shiftId: string) => {
    setSchedule((current) => {
      const nextStaffSchedule = { ...(current[staffId] || {}) };

      if (shiftId) {
        nextStaffSchedule[weekday] = shiftId;
      } else {
        delete nextStaffSchedule[weekday];
      }

      return {
        ...current,
        [staffId]: nextStaffSchedule,
      };
    });
    setDirtyStaffIds((current) => new Set(current).add(staffId));
  }, []);

  const saveStaffSchedule = async (staffId: string, staffSchedule: Record<number, string>) => {
    try {
      const overrides = Object.entries(staffSchedule || {}).map(
        ([weekday, shiftId]) => ({
          weekday: Number(weekday),
          shiftId,
        }),
      );
      const response = await fetch("/api/owner/staff-manager/weekly-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, overrides }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error || "Shift roster could not be saved.");
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Shift roster could not be saved.",
      );
      throw error;
    }
  };

  const saveDirtySchedules = async () => {
    const staffIdsToSave = Array.from(dirtyStaffIds);

    if (staffIdsToSave.length === 0) return;

    setSavingSchedule(true);

    try {
      for (const staffId of staffIdsToSave) {
        await saveStaffSchedule(staffId, schedule[staffId] || {});
      }

      setDirtyStaffIds(new Set());
      showSuccess("Shift roster saved.");
    } catch {
      // saveStaffSchedule already shows the detailed error.
    } finally {
      setSavingSchedule(false);
    }
  };

  const renderStaffCell = useCallback(
    (staffMember: StaffRow) => {
      const isDirty = dirtyStaffIds.has(staffMember.id);

      return (
        <div className="flex items-center gap-2.5">
          <StaffAvatar staff={staffMember} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">
                {staffMember.name}
              </p>
              {isDirty && <span className="h-2 w-2 rounded-full bg-amber-400" />}
            </div>
            <p className="text-[11px] text-gray-400">
              {staffMember.staff_code} - {getRoleLabel(staffMember.role)}
            </p>
          </div>
        </div>
      );
    },
    [dirtyStaffIds],
  );

  const renderShiftCell = useCallback(
    (staffMember: StaffRow, day: (typeof WEEKDAYS)[number]) => {
      const assignedShiftId = schedule[staffMember.id]?.[day.value] || "";
      const assignedShift = assignedShiftId
        ? shiftById.get(assignedShiftId) ?? null
        : null;
      const colorIdx = assignedShiftId
        ? shiftColorMap.get(assignedShiftId) ?? 0
        : 0;
      const isOpen =
        openDropdown?.staffId === staffMember.id &&
        openDropdown.weekday === day.value;

      return (
        <div className="relative" data-shift-dropdown>
          <ShiftPill
            shift={assignedShift}
            colorIndex={colorIdx}
            disabled={loading || shifts.length === 0}
            onClick={() =>
              setOpenDropdown(
                isOpen ? null : { staffId: staffMember.id, weekday: day.value },
              )
            }
          />
          {isOpen && (
            <ShiftDropdown
              shifts={shifts}
              currentShiftId={assignedShiftId}
              colorMap={shiftColorMap}
              alignRight={day.value >= 6}
              onSelect={(shiftId) =>
                updateDay(staffMember.id, day.value, shiftId)
              }
              onClose={() => setOpenDropdown(null)}
            />
          )}
        </div>
      );
    },
    [
      loading,
      openDropdown,
      schedule,
      shiftById,
      shiftColorMap,
      shifts,
      updateDay,
    ],
  );

  const scheduleColumns = useMemo<Array<StandardTableColumn<StaffRow>>>(() => {
    const dayColumns: Array<StandardTableColumn<StaffRow>> = WEEKDAYS.map((day) => ({
      key: `weekday-${day.value}`,
      header: day.shortLabel,
      render: (staffMember) => renderShiftCell(staffMember, day),
      className: day.isWeekend ? "bg-amber-50/20" : "",
      headerClassName: day.isWeekend ? "text-amber-600" : "",
      isAction: true,
    }));

    return [
      {
        key: "staff",
        header: "Staff",
        render: renderStaffCell,
        sortValue: (staffMember) => staffMember.name,
        className: "w-56",
        headerClassName: "w-56",
      },
      ...dayColumns,
    ];
  }, [renderShiftCell, renderStaffCell]);

  const mobileScheduleRows = useMemo(
    () =>
      WEEKDAYS.map((day) => ({
        key: `weekday-${day.value}`,
        label: day.label,
        render: (staffMember: StaffRow) => renderShiftCell(staffMember, day),
        initiallyVisible: true,
      })),
    [renderShiftCell],
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 ">
        <div className="flex flex-col gap-4  sm:flex-row mb-6 sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Shift Roster</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-gray-500 ">
              Plan weekly shifts for each staff member. Empty days mean off days,
              and attendance can still record the staff who actually comes in.
            </p>
          </div>
        </div>

        <StandardTable
          columns={scheduleColumns}
          data={staff}
          getRowKey={(staffMember) => staffMember.id}
          emptyLabel="No active staff yet. Add staff first before arranging the weekly roster."
          loading={loading}
          skeletonRows={3}
          pagination={false}
          preserveDataOrder
          minWidthClassName="min-w-[1100px]"
          mobileCard={{
            title: renderStaffCell,
            rows: mobileScheduleRows,
            initiallyVisibleRows: 7,
            actions: () => <span className="hidden" />,
            status: (staffMember) =>
              dirtyStaffIds.has(staffMember.id) ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  Unsaved
                </span>
              ) : null,
          }}
        />

        {!loading && shifts.length === 0 && staff.length > 0 && (
          <div className="border-t border-dashed border-gray-200 px-5 py-4 text-sm text-amber-700">
            <strong>No shifts yet.</strong> Add shifts in Attendance Settings first.
          </div>
        )}

        {!loading && staff.length > 0 && shifts.length > 0 && (
          <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-4">
            <button
              type="button"
              onClick={saveDirtySchedules}
              disabled={savingSchedule || dirtyStaffIds.size === 0}
              className="inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingSchedule && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              {savingSchedule ? "Saving..." : dirtyStaffIds.size > 0 ? "Save Changes" : "Saved"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
