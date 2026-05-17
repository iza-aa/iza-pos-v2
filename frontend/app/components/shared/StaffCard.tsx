"use client";

import {
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  IdentificationIcon,
  KeyIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import {
  getAvatarColor,
  getInitials,
  getStaffRoleColor,
  getStaffRoleStyle,
  getStaffStatusColor,
  getStaffStatusStyle,
} from "@/lib/utils";
import { isLoginCodeValid } from "@/lib/constants";
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
  onGeneratePass: () => void;
  onCopyCode: (code: string) => void;
  showActions?: boolean;
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

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getShiftLabel = (staff: StaffCardRecord) => {
  if (staff.shift?.shift_name) return staff.shift.shift_name;

  return "No Shift";
};

const getShiftTimeLabel = (staff: StaffCardRecord) => {
  if (!staff.shift) return "-";

  return `${formatTime(staff.shift.start_time)} - ${formatTime(staff.shift.end_time)}`;
};

const getAccessState = (staff: StaffCardRecord) => {
  const hasPin = Boolean(staff.pin_hash || staff.password_hash);
  const hasValidLoginCode = isLoginCodeValid(staff.login_code, staff.login_code_expires_at);
  const hasAnyLoginCode = Boolean(staff.login_code);

  if (hasValidLoginCode && staff.must_change_pin) {
    return {
      label: "Menunggu PIN Baru",
      description: `Kode aktif sampai ${formatDateTime(staff.login_code_expires_at)}`,
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      actionLabel: "Salin / Buat Ulang Kode",
    };
  }

  if (hasValidLoginCode) {
    return {
      label: "Kode Aktivasi Aktif",
      description: `Berlaku sampai ${formatDateTime(staff.login_code_expires_at)}`,
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      actionLabel: "Salin / Buat Ulang Kode",
    };
  }

  if (!hasPin && hasAnyLoginCode) {
    return {
      label: "Kode Expired",
      description: "Buat ulang kode agar staff bisa aktivasi akun.",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      actionLabel: "Buat Ulang Kode",
    };
  }

  if (!hasPin) {
    return {
      label: "Belum Aktivasi",
      description: "Staff belum memiliki PIN login.",
      badgeClass: "border-gray-200 bg-gray-50 text-gray-700",
      actionLabel: "Buat Kode Login",
    };
  }

  if (staff.must_change_pin) {
    return {
      label: "Perlu Reset PIN",
      description: "Staff perlu login dengan kode sementara.",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      actionLabel: "Buat Kode Reset",
    };
  }

  return {
    label: "Aktif",
    description: "Staff dapat login menggunakan PIN.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    actionLabel: "Reset PIN",
  };
};

export default function StaffCard({
  staff,
  onEdit,
  onDelete,
  onGeneratePass,
  showActions = true,
}: StaffCardProps) {
  const staffRole = String(staff.role ?? "").toLowerCase();
  const shouldShowLoginAccess = staffRole === "staff";
  const shouldShowStaffType = staffRole === "staff";

  const phoneText = staff.phone?.trim() || "-";
  const emailText = staff.email?.trim() || "-";
  const statusText = formatStatus(staff.status);
  const roleText = formatRole(staff.role);
  const staffTypeText = formatStaffType(staff.staff_type);
  const hiredDateText = formatHiredDate(staff.hired_date);
  const shiftText = getShiftLabel(staff);
  const shiftTimeText = getShiftTimeLabel(staff);
  const accessState = getAccessState(staff);

  return (
    <div className="flex break-inside-avoid flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative border-b border-gray-100 bg-linear-to-r from-gray-100 to-white p-5 pb-14">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Staff ID</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-700">
              {staff.staff_code || "-"}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStaffStatusColor(
              staff.status,
            )}`}
            style={getStaffStatusStyle(staff.status)}
          >
            {statusText}
          </span>
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-xl font-bold text-white shadow-lg ${getAvatarColor(
              staff.name,
            )}`}
          >
            {getInitials(staff.name)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-12">
        <div className="text-center">
          <h3 className="truncate text-lg font-bold text-gray-900">{staff.name || "-"}</h3>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStaffRoleColor(
                staff.role,
              )}`}
              style={getStaffRoleStyle(staff.role)}
            >
              {roleText}
            </span>

            {shouldShowStaffType && (
              <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
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
                Shift Kerja
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
              <span className="min-w-0 truncate text-gray-700">Masuk: {hiredDateText}</span>
            </div>

            <div className="flex items-center gap-3">
              <IdentificationIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="min-w-0 truncate text-gray-700">{staff.staff_code || "-"}</span>
            </div>
          </div>

          {shouldShowLoginAccess && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <KeyIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Akses Staff
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${accessState.badgeClass}`}
                  >
                    {accessState.label}
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    {accessState.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onGeneratePass}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  {accessState.actionLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div
          className={`grid gap-2 border-t border-gray-100 bg-gray-50 p-4 ${
            onDelete ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Edit
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-red-50"
              style={{ color: "#FF6859", borderColor: "#FF6859" }}
            >
              Hapus
            </button>
          )}
        </div>
      )}
    </div>
  );
}