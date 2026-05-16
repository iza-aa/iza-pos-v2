"use client";

import { useEffect, useMemo, useState } from "react";
import { getStaffStatusColor, getStaffStatusStyle } from "@/lib/utils";
import { isLoginCodeValid } from "@/lib/constants";
import type { Staff } from "@/lib/types";

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
};

type StaffTableRecord = Staff & {
  email?: string | null;
  phone?: string | null;
  staff_type?: string | null;
  hired_date?: string | null;
  shift_id?: string | null;
  shift?: ShiftRecord | null;
};

interface StaffTableProps {
  staffList: Staff[];
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  onGeneratePass: (id: string) => void;
  onCopyCode: (code: string) => void;
  showActions?: boolean;
}

type CurrentStaffSession = Record<string, unknown> | null;

const normalizeText = (value: unknown) => {
  return String(value ?? "").trim().toLowerCase();
};

const titleCase = (value: unknown) => {
  const text = String(value ?? "").trim();

  if (!text) return "-";

  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getRoleLabel = (role: unknown) => {
  const normalizedRole = normalizeText(role);

  if (normalizedRole === "owner") return "Owner";
  if (normalizedRole === "manager") return "Manager";
  if (normalizedRole === "staff") return "Staff";

  return titleCase(role);
};

const getStaffTypeLabel = (staff: StaffTableRecord) => {
  const role = normalizeText(staff.role);
  const staffType = normalizeText(staff.staff_type);

  if (role === "owner" || role === "manager") return "Management";

  if (staffType === "cashier") return "Cashier";
  if (staffType === "barista") return "Barista";
  if (staffType === "kitchen") return "Kitchen";
  if (staffType === "waiter") return "Waiter";

  return "-";
};

const getShiftLabel = (staff: StaffTableRecord) => {
  if (staff.shift?.shift_name) return staff.shift.shift_name;

  return "No Shift";
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";

  return value.slice(0, 5);
};

const getShiftTimeLabel = (staff: StaffTableRecord) => {
  if (!staff.shift) return "-";

  return `${formatTime(staff.shift.start_time)} - ${formatTime(staff.shift.end_time)}`;
};

const getStatusLabel = (status: unknown) => {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "active") return "Active";
  if (normalizedStatus === "inactive") return "Inactive";
  if (normalizedStatus === "on-leave") return "On Leave";
  if (normalizedStatus === "terminated") return "Terminated";

  return titleCase(status);
};

const getRoleBadgeClass = (role: unknown) => {
  const normalizedRole = normalizeText(role);

  if (normalizedRole === "owner") {
    return "bg-gray-900 text-white border-gray-900";
  }

  if (normalizedRole === "manager") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
};

const getStaffTypeBadgeClass = (staff: StaffTableRecord) => {
  const role = normalizeText(staff.role);
  const staffType = normalizeText(staff.staff_type);

  if (role === "owner" || role === "manager") {
    return "bg-slate-50 text-slate-600 border-slate-200";
  }

  if (staffType === "cashier") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (staffType === "barista") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (staffType === "kitchen") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  if (staffType === "waiter") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-gray-50 text-gray-500 border-gray-200";
};

const getShiftBadgeClass = (staff: StaffTableRecord) => {
  if (!staff.shift_id) return "bg-gray-50 text-gray-500 border-gray-200";

  return "bg-indigo-50 text-indigo-700 border-indigo-200";
};

const formatDate = (value: unknown) => {
  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const extractCurrentStaffCandidate = (value: unknown): CurrentStaffSession => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  const candidate =
    record.staff ??
    record.user ??
    record.currentStaff ??
    record.currentUser ??
    (record.data as Record<string, unknown> | undefined)?.staff ??
    (record.data as Record<string, unknown> | undefined)?.user ??
    record;

  if (!candidate || typeof candidate !== "object") return null;

  return candidate as Record<string, unknown>;
};

const readCurrentStaffFromBrowser = (): CurrentStaffSession => {
  if (typeof window === "undefined") return null;

  const keys = [
    "staff",
    "currentStaff",
    "currentUser",
    "user",
    "authUser",
    "loggedInStaff",
    "iza_staff",
    "session",
  ];

  for (const key of keys) {
    const rawValue =
      window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);

    if (!rawValue) continue;

    try {
      const parsed = JSON.parse(rawValue);
      const candidate = extractCurrentStaffCandidate(parsed);

      if (candidate) return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

const isCurrentLoggedInStaff = (
  staff: StaffTableRecord,
  currentStaff: CurrentStaffSession,
) => {
  if (!currentStaff) return false;

  const currentId = normalizeText(currentStaff.id ?? currentStaff.staff_id);
  const currentStaffCode = normalizeText(
    currentStaff.staff_code ?? currentStaff.staffCode,
  );
  const currentEmail = normalizeText(currentStaff.email);
  const currentPhone = normalizeText(currentStaff.phone);
  const currentName = normalizeText(currentStaff.name);

  const staffId = normalizeText(staff.id);
  const staffCode = normalizeText(staff.staff_code);
  const staffEmail = normalizeText(staff.email);
  const staffPhone = normalizeText(staff.phone);
  const staffName = normalizeText(staff.name);

  return (
    (!!currentId && currentId === staffId) ||
    (!!currentStaffCode && currentStaffCode === staffCode) ||
    (!!currentEmail && currentEmail === staffEmail) ||
    (!!currentPhone && currentPhone === staffPhone) ||
    (!!currentName && currentName === staffName)
  );
};

export default function StaffTable({
  staffList,
  onEdit,
  onDelete,
  onGeneratePass,
  onCopyCode,
  showActions = true,
}: StaffTableProps) {
  const [currentStaff, setCurrentStaff] = useState<CurrentStaffSession>(null);

  useEffect(() => {
    setCurrentStaff(readCurrentStaffFromBrowser());
  }, []);

  const normalizedStaffList = useMemo(() => {
    return staffList as StaffTableRecord[];
  }, [staffList]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1380px] table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="w-[10%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                ID Staff
              </th>
              <th className="w-[15%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Staff
              </th>
              <th className="w-[9%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="w-[10%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Tipe
              </th>
              <th className="w-[13%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Shift
              </th>
              <th className="w-[12%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                No WA
              </th>
              <th className="w-[15%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="w-[9%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="w-[9%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Masuk
              </th>
              {showActions && (
                <th className="w-[11%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Aksi
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {normalizedStaffList.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? 10 : 9}
                  className="px-5 py-12 text-center text-sm text-gray-500"
                >
                  Belum ada data staff.
                </td>
              </tr>
            ) : (
              normalizedStaffList.map((staff) => {
                const role = normalizeText(staff.role);
                const shouldShowLoginCode = role !== "manager" && role !== "owner";
                const hasValidLoginCode = isLoginCodeValid(
                  staff.login_code,
                  staff.login_code_expires_at,
                );
                const isSelf = isCurrentLoggedInStaff(staff, currentStaff);
                const isOwner = normalizeText(staff.role) === "owner";
                const canDelete = Boolean(onDelete) && !isSelf && !isOwner;

                return (
                  <tr
                    key={staff.id}
                    className={`transition hover:bg-gray-50 ${
                      isSelf ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-4 align-middle">
                      <div className="font-mono text-sm font-semibold text-gray-900">
                        {staff.staff_code || "-"}
                      </div>
                      {isSelf && (
                        <div className="mt-1 text-xs font-medium text-blue-700">
                          Akun Anda
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {staff.name || "-"}
                      </div>

                      {shouldShowLoginCode && (
                        <div className="mt-1 text-xs text-gray-500">
                          {hasValidLoginCode ? (
                            <button
                              type="button"
                              onClick={() => onCopyCode(staff.login_code!)}
                              className="font-mono hover:underline"
                            >
                              {staff.login_code}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onGeneratePass(staff.id)}
                              className="font-semibold text-gray-700 hover:underline"
                            >
                              Generate Pass
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClass(
                          staff.role,
                        )}`}
                      >
                        {getRoleLabel(staff.role)}
                      </span>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStaffTypeBadgeClass(
                          staff,
                        )}`}
                      >
                        {getStaffTypeLabel(staff)}
                      </span>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getShiftBadgeClass(
                          staff,
                        )}`}
                      >
                        {getShiftLabel(staff)}
                      </span>
                      <div className="mt-1 text-xs text-gray-500">
                        {getShiftTimeLabel(staff)}
                      </div>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <div className="truncate text-sm text-gray-700">
                        {staff.phone || "-"}
                      </div>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <div className="truncate text-sm text-gray-700">
                        {staff.email || "-"}
                      </div>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStaffStatusColor(
                          staff.status,
                        )}`}
                        style={getStaffStatusStyle(staff.status)}
                      >
                        {getStatusLabel(staff.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <div className="text-sm text-gray-700">
                        {formatDate(staff.hired_date)}
                      </div>
                    </td>

                    {showActions && (
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(staff.id)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            Edit
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete?.(staff.id)}
                              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}