"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
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

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      <td className="sticky left-0 z-10 bg-white px-4 py-3">
        <div className="h-4 w-28 animate-pulse rounded-md bg-gray-200" />
        <div className="mt-1.5 h-3 w-20 animate-pulse rounded-md bg-gray-100" />
      </td>
      {WEEKDAYS.map((day) => (
        <td key={day.value} className="px-2 py-3">
          <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100" />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="ml-auto h-8 w-16 animate-pulse rounded-lg bg-gray-100" />
      </td>
    </tr>
  );
}

// Shift pill badge
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

// Dropdown for shift selection
function ShiftDropdown({
  shifts,
  currentShiftId,
  onSelect,
  onClose,
  colorMap,
}: {
  shifts: ShiftRow[];
  currentShiftId: string;
  onSelect: (shiftId: string) => void;
  onClose: () => void;
  colorMap: Map<string, number>;
}) {
  return (
    <div className="absolute z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <button
        type="button"
        onClick={() => { onSelect(""); onClose(); }}
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
            onClick={() => { onSelect(shift.id); onClose(); }}
            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-gray-50 ${isSelected ? "font-semibold" : ""}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
            <span className="flex-1">
              {shift.shift_name}
              <span className="ml-1 text-gray-400">
                {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
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
  const [savedSchedule, setSavedSchedule] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingStaffId, setSavingStaffId] = useState("");
  const [savedStaffId, setSavedStaffId] = useState("");
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

      setStaff(result.data?.staff || []);
      setShifts(result.data?.shifts || []);
      setSchedule(nextSchedule);
      setSavedSchedule(structuredClone(nextSchedule));
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

  // Close dropdown when clicking outside
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

  // Assign a stable color index per shift id
  const shiftColorMap = useMemo(() => {
    const map = new Map<string, number>();
    shifts.forEach((shift, idx) => map.set(shift.id, idx));
    return map;
  }, [shifts]);

  const updateDay = (staffId: string, weekday: number, shiftId: string) => {
    setSchedule((current) => {
      const next = {
        ...current,
        [staffId]: { ...(current[staffId] || {}) },
      };

      if (shiftId) {
        next[staffId][weekday] = shiftId;
      } else {
        delete next[staffId][weekday];
      }

      return next;
    });
  };

  const isDirty = (staffId: string) =>
    JSON.stringify(schedule[staffId] || {}) !==
    JSON.stringify(savedSchedule[staffId] || {});

  const saveStaffSchedule = async (staffId: string) => {
    setSavingStaffId(staffId);

    try {
      const overrides = Object.entries(schedule[staffId] || {}).map(
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
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Shift roster could not be saved.");
      }

      setSavedSchedule((current) => ({
        ...current,
        [staffId]: { ...(schedule[staffId] || {}) },
      }));
      setSavedStaffId(staffId);
      setTimeout(() => setSavedStaffId(""), 2000);
      showSuccess("Shift roster saved.");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Shift roster could not be saved.",
      );
    } finally {
      setSavingStaffId("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="hidden">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
              <CalendarDaysIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Shift Roster</h2>
              <p className="mt-0.5 max-w-xl text-sm leading-5 text-gray-500">
                Plan weekly shifts from Monday to Sunday for each staff member.
                Empty days mean off days and do not block attendance overrides.
              </p>
            </div>
          </div>

        </div>

        {/* Shift legend */}
        {shifts.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-400">Shift:</span>
              {shifts.map((shift) => {
                const idx = shiftColorMap.get(shift.id) ?? 0;
                const color = SHIFT_COLORS[idx % SHIFT_COLORS.length];
                return (
                  <span
                    key={shift.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${color.bg} ${color.border} ${color.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                    {shift.shift_name} · {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Calendar table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Shift Roster</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-gray-500">
              Plan weekly shifts for each staff member. Empty days mean off days,
              and attendance can still record the staff who actually comes in.
            </p>
          </div>

        </div>


        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-900">
              <th className="sticky left-0 z-10 min-w-52 bg-gray-900 px-4 py-3.5 font-semibold text-gray-200">
                Staff
              </th>
              {WEEKDAYS.map((day) => (
                <th
                  key={day.value}
                  className={`min-w-[120px] px-3 py-3.5 text-center ${day.isWeekend ? "text-amber-300" : "text-gray-200"}`}
                >
                  <p className="text-sm font-bold">{day.shortLabel}</p>
                  <p className={`text-[10px] font-normal ${day.isWeekend ? "text-amber-400/70" : "text-gray-500"}`}>
                    {day.label}
                  </p>
                </th>
              ))}
              <th className="min-w-[100px] px-4 py-3.5 text-right font-semibold text-gray-200">
                Save
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              : staff.map((staffMember) => {
                  const dirty = isDirty(staffMember.id);
                  const isSaving = savingStaffId === staffMember.id;
                  const justSaved = savedStaffId === staffMember.id && !dirty;

                  return (
                    <tr
                      key={staffMember.id}
                      className={`align-top transition-colors ${justSaved ? "bg-emerald-50/40" : "hover:bg-gray-50/50"}`}
                    >
                      {/* Staff name column */}
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <StaffAvatar staff={staffMember} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{staffMember.name}</p>
                            <p className="text-[11px] text-gray-400">
                              {staffMember.staff_code} · {getRoleLabel(staffMember.role)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Day columns */}
                      {WEEKDAYS.map((day) => {
                        const assignedShiftId = schedule[staffMember.id]?.[day.value] || "";
                        const assignedShift = assignedShiftId ? shiftById.get(assignedShiftId) ?? null : null;
                        const colorIdx = assignedShiftId ? shiftColorMap.get(assignedShiftId) ?? 0 : 0;
                        const isOpen =
                          openDropdown?.staffId === staffMember.id &&
                          openDropdown.weekday === day.value;

                        return (
                          <td
                            key={day.value}
                            className={`px-2 py-2.5 ${day.isWeekend ? "bg-amber-50/20" : ""}`}
                          >
                            <div className="relative" data-shift-dropdown>
                              <ShiftPill
                                shift={assignedShift}
                                colorIndex={colorIdx}
                                disabled={loading || shifts.length === 0}
                                onClick={() =>
                                  setOpenDropdown(
                                    isOpen
                                      ? null
                                      : { staffId: staffMember.id, weekday: day.value },
                                  )
                                }
                              />
                              {isOpen && (
                                <ShiftDropdown
                                  shifts={shifts}
                                  currentShiftId={assignedShiftId}
                                  colorMap={shiftColorMap}
                                  onSelect={(shiftId) =>
                                    updateDay(staffMember.id, day.value, shiftId)
                                  }
                                  onClose={() => setOpenDropdown(null)}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Save button column */}
                      <td className="px-4 py-2.5 text-right">
                        {justSaved ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                            <CheckIcon className="h-3.5 w-3.5" />
                            Saved
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void saveStaffSchedule(staffMember.id)}
                            disabled={!dirty || isSaving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            {isSaving ? (
                              <>
                                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                Saving
                              </>
                            ) : (
                              <>
                                <CheckIcon className="h-3.5 w-3.5" />
                                Save
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!loading && staff.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <CalendarDaysIcon className="h-7 w-7 text-gray-400" />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">No active staff yet</p>
              <p className="mt-1 text-xs text-gray-500">
                Add staff first before arranging the weekly roster.
              </p>
            </div>
          </div>
        )}

        {!loading && shifts.length === 0 && staff.length > 0 && (
          <div className="border-t border-dashed border-gray-200 px-5 py-4 text-sm text-amber-700">
            <strong>No shifts yet.</strong> Add shifts in Attendance Settings first.
          </div>
        )}
      </div>
    </div>
  );
}
