"use client";

import {
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { getInitials } from "@/lib/utils";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import type { Staff } from "@/lib/types";

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
};

type StaffCardRecord = Staff & {
  email?: string | null;
  phone?: string | null;
  staff_type?: string | null;
  hired_date?: string | null;
  shift_id?: string | null;
  shift?: ShiftRecord | null;
  login_code?: string | null;
  login_code_expires_at?: string | null;
  pin_hash?: string | null;
  password_hash?: string | null;
  must_change_pin?: boolean | null;
};

interface StaffCardProps {
  staff: StaffCardRecord;
  onEdit: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  onGenerateAccessCode?: () => void;
  isGeneratingAccessCode?: boolean;
}

const formatLabel = (value: unknown) => {
  const text = String(value ?? "").trim();

  if (!text) return "-";

  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatStaffType = (value: unknown) => {
  const staffType = String(value ?? "").trim().toLowerCase();

  if (!staffType) return "Not Assigned";
  if (staffType === "cashier") return "Cashier";
  if (staffType === "barista") return "Barista";
  if (staffType === "kitchen") return "Kitchen";
  if (staffType === "waiter") return "Waiter";

  return formatLabel(staffType);
};

const formatRole = (value: unknown) => {
  const role = String(value ?? "").trim().toLowerCase();

  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  if (role === "staff") return "Staff";

  return formatLabel(role);
};

const formatStatus = (value: unknown) => {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "on-leave") return "On Leave";
  if (status === "terminated") return "Terminated";

  return formatLabel(status);
};

const formatHiredDate = (value: unknown) => {
  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";

  return value.slice(0, 5);
};

const getShiftLabel = (staff: StaffCardRecord) => {
  if (staff.shift?.shift_name) return staff.shift.shift_name;

  return "No Shift";
};

const getShiftTimeLabel = (staff: StaffCardRecord) => {
  if (!staff.shift) return "-";

  return `${formatTime(staff.shift.start_time)} - ${formatTime(staff.shift.end_time)}`;
};

const getRoleBadgeClass = (role: unknown) => {
  const normalizedRole = String(role ?? "").trim().toLowerCase();

  if (normalizedRole === "owner") return OWNER_SEMANTIC_TONES.dark.badgeClass;
  if (normalizedRole === "manager") return OWNER_SEMANTIC_TONES.premium.badgeClass;

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const getStatusBadgeClass = (status: unknown) => {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (normalizedStatus === "active") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (normalizedStatus === "inactive") return OWNER_SEMANTIC_TONES.neutral.badgeClass;
  if (normalizedStatus === "on-leave") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (normalizedStatus === "terminated") return OWNER_SEMANTIC_TONES.danger.badgeClass;

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const getStaffTypeBadgeClass = (staffType: unknown) => {
  const normalizedStaffType = String(staffType ?? "").trim().toLowerCase();

  if (normalizedStaffType === "cashier") return OWNER_SEMANTIC_TONES.cashier.badgeClass;
  if (normalizedStaffType === "barista") return OWNER_SEMANTIC_TONES.coffee.badgeClass;
  if (normalizedStaffType === "kitchen") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (normalizedStaffType === "waiter") return OWNER_SEMANTIC_TONES.info.badgeClass;

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

export default function StaffCard({
  staff,
  onEdit,
  onDelete,
  showActions = true,
  onGenerateAccessCode,
  isGeneratingAccessCode = false,
}: StaffCardProps) {
  const staffRole = String(staff.role ?? "").toLowerCase();
  const shouldShowStaffType = staffRole === "staff";

  const phoneText = staff.phone?.trim() || "-";
  const emailText = staff.email?.trim() || "-";
  const statusText = formatStatus(staff.status);
  const roleText = formatRole(staff.role);
  const staffTypeText = formatStaffType(staff.staff_type);
  const hiredDateText = formatHiredDate(staff.hired_date);
  const shiftText = getShiftLabel(staff);
  const shiftTimeText = getShiftTimeLabel(staff);

  return (
    <div className="flex break-inside-avoid flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative border-b border-gray-100 bg-[#F7F7F5] p-5 pb-14">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Staff ID</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-700">
              {staff.staff_code || "-"}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
              staff.status,
            )}`}
          >
            {statusText}
          </span>
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gray-900 text-xl font-bold text-white shadow-lg">
            {getInitials(staff.name)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-12">
        <div className="text-center">
          <h3 className="truncate text-lg font-bold text-gray-900">{staff.name || "-"}</h3>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                staff.role,
              )}`}
            >
              {roleText}
            </span>

            {shouldShowStaffType && (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStaffTypeBadgeClass(
                  staff.staff_type,
                )}`}
              >
                {staffTypeText}
              </span>
            )}

            {!shouldShowStaffType && (
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Management
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Work Shift
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900">{shiftText}</p>
            <p className="mt-1 text-xs text-gray-500">{shiftTimeText}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center gap-3">
              <PhoneIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="min-w-0 truncate text-gray-700">{phoneText}</span>
            </div>

            <div className="flex items-center gap-3">
              <EnvelopeIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="min-w-0 truncate text-gray-700">{emailText}</span>
            </div>

            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="min-w-0 truncate text-gray-700">Start Work: {hiredDateText}</span>
            </div>
          </div>
        </div>
      </div>

      {(showActions || onGenerateAccessCode) && (
        <div
          className={`grid gap-2 border-t border-gray-100 bg-gray-50 p-4 ${
            showActions && onDelete ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {onGenerateAccessCode ? (
            <button
              type="button"
              onClick={onGenerateAccessCode}
              disabled={isGeneratingAccessCode}
              className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingAccessCode ? "Generating..." : "Generate Code"}
            </button>
          ) : null}

          {showActions ? (
            <button
              type="button"
              onClick={onEdit}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Edit
            </button>
          ) : null}

          {showActions && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-red-50 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
