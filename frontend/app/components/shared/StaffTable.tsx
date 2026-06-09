"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import StandardTable, { type StandardTableColumn } from "./StandardTable";
import type { Staff } from "@/lib/types";
import { useLanguage } from "./i18n";

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
  showActions?: boolean;
  onGenerateAccessCode?: (id: string) => void;
  generatingAccessStaffId?: string;
  title?: string;
  description?: string;
  loading?: boolean;
}

type CurrentStaffSession = Record<string, unknown> | null;
type SortKey =
  | "staff_code"
  | "name"
  | "role"
  | "staff_type"
  | "shift"
  | "phone"
  | "email"
  | "status"
  | "hired_date";

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

type Translator = ReturnType<typeof useLanguage>["t"];

const getRoleLabel = (role: unknown, t: Translator) => {
  const normalizedRole = normalizeText(role);

  if (normalizedRole === "owner") return t("owner.staff.owner");
  if (normalizedRole === "manager") return t("owner.staff.manager");
  if (normalizedRole === "staff") return t("owner.staff.staff");

  return titleCase(role);
};

const getStaffTypeLabel = (staff: StaffTableRecord, t: Translator) => {
  const role = normalizeText(staff.role);
  const staffType = normalizeText(staff.staff_type);

  if (role === "owner" || role === "manager") return t("owner.staff.management");

  if (staffType === "cashier") return t("owner.staff.cashier");
  if (staffType === "barista") return t("owner.staff.barista");
  if (staffType === "kitchen") return t("owner.staff.kitchen");
  if (staffType === "waiter") return t("owner.staff.waiter");

  return "-";
};

const getShiftLabel = (staff: StaffTableRecord, t: Translator) => {
  if (staff.shift?.shift_name) return staff.shift.shift_name;

  return t("owner.staff.noShift");
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";

  return value.slice(0, 5);
};

const getShiftTimeLabel = (staff: StaffTableRecord) => {
  if (!staff.shift) return "-";

  return `${formatTime(staff.shift.start_time)} - ${formatTime(staff.shift.end_time)}`;
};

const getStatusLabel = (status: unknown, t: Translator) => {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "active") return t("owner.bookkeeping.enabled");
  if (normalizedStatus === "inactive") return t("owner.staff.inactive");
  if (normalizedStatus === "on-leave") return t("owner.staff.onLeave");
  if (normalizedStatus === "terminated") return t("owner.staff.terminated");

  return titleCase(status);
};

const getRoleBadgeClass = (role: unknown) => {
  const normalizedRole = normalizeText(role);

  if (normalizedRole === "owner") {
    return OWNER_SEMANTIC_TONES.dark.badgeClass;
  }

  if (normalizedRole === "manager") {
    return OWNER_SEMANTIC_TONES.premium.badgeClass;
  }

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const getStaffTypeBadgeClass = (staff: StaffTableRecord) => {
  const role = normalizeText(staff.role);
  const staffType = normalizeText(staff.staff_type);

  if (role === "owner" || role === "manager") {
    return OWNER_SEMANTIC_TONES.neutral.badgeClass;
  }

  if (staffType === "cashier") {
    return OWNER_SEMANTIC_TONES.cashier.badgeClass;
  }

  if (staffType === "barista") {
    return OWNER_SEMANTIC_TONES.coffee.badgeClass;
  }

  if (staffType === "kitchen") {
    return OWNER_SEMANTIC_TONES.warning.badgeClass;
  }

  if (staffType === "waiter") {
    return OWNER_SEMANTIC_TONES.info.badgeClass;
  }

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};

const getShiftBadgeClass = (staff: StaffTableRecord) => {
  if (!staff.shift_id) return OWNER_SEMANTIC_TONES.neutral.badgeClass;

  return OWNER_SEMANTIC_TONES.progress.badgeClass;
};

const getStatusBadgeClass = (status: unknown) => {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "active") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (normalizedStatus === "inactive") return OWNER_SEMANTIC_TONES.neutral.badgeClass;
  if (normalizedStatus === "on-leave") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (normalizedStatus === "terminated") return OWNER_SEMANTIC_TONES.danger.badgeClass;

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
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

const getSortValue = (staff: StaffTableRecord, key: SortKey, t: Translator) => {
  if (key === "staff_code") return normalizeText(staff.staff_code);
  if (key === "name") return normalizeText(staff.name);
  if (key === "role") return normalizeText(getRoleLabel(staff.role, t));
  if (key === "staff_type") return normalizeText(getStaffTypeLabel(staff, t));
  if (key === "shift") return normalizeText(getShiftLabel(staff, t));
  if (key === "phone") return normalizeText(staff.phone);
  if (key === "email") return normalizeText(staff.email);
  if (key === "status") return normalizeText(getStatusLabel(staff.status, t));
  if (key === "hired_date") return normalizeText(staff.hired_date);

  return "";
};

export default function StaffTable({
  staffList,
  onEdit,
  onDelete,
  showActions = true,
  onGenerateAccessCode,
  generatingAccessStaffId = "",
  title,
  description,
  loading = false,
}: StaffTableProps) {
  const { t } = useLanguage();
  const [currentStaff, setCurrentStaff] = useState<CurrentStaffSession>(null);

  useEffect(() => {
    setCurrentStaff(readCurrentStaffFromBrowser());
  }, []);

  const normalizedStaffList = useMemo(
    () => [...(staffList as StaffTableRecord[])],
    [staffList],
  );

  const columns = useMemo<Array<StandardTableColumn<StaffTableRecord>>>(() => {
    const baseColumns: Array<StandardTableColumn<StaffTableRecord>> = [
      {
        key: "staff_code",
        header: t("owner.staff.staffIdLabel"),
        sortValue: (staff) => getSortValue(staff, "staff_code", t),
        className: "align-middle",
        render: (staff) => {
          const isSelf = isCurrentLoggedInStaff(staff, currentStaff);

          return (
            <div>
              <p className="font-mono font-semibold text-gray-900">
                {staff.staff_code || "-"}
              </p>
              {isSelf && (
                <p className="mt-1 text-xs font-medium text-blue-700">
                  {t("owner.staff.yourAccount")}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: "name",
        header: t("owner.staff.staff"),
        sortValue: (staff) => getSortValue(staff, "name", t),
        className: "align-middle",
        render: (staff) => (
          <p className="truncate font-semibold text-gray-900">{staff.name || "-"}</p>
        ),
      },
      {
        key: "role",
        header: t("owner.staff.role"),
        sortValue: (staff) => getSortValue(staff, "role", t),
        className: "align-middle",
        render: (staff) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClass(
              staff.role,
            )}`}
          >
            {getRoleLabel(staff.role, t)}
          </span>
        ),
      },
      {
        key: "staff_type",
        header: t("owner.staff.type"),
        sortValue: (staff) => getSortValue(staff, "staff_type", t),
        className: "align-middle",
        render: (staff) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStaffTypeBadgeClass(
              staff,
            )}`}
          >
            {getStaffTypeLabel(staff, t)}
          </span>
        ),
      },
      {
        key: "shift",
        header: t("owner.staff.shift"),
        sortValue: (staff) => getSortValue(staff, "shift", t),
        className: "align-middle",
        render: (staff) => (
          <div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getShiftBadgeClass(
                staff,
              )}`}
            >
              {getShiftLabel(staff, t)}
            </span>
            <p className="mt-1 text-xs text-gray-500">{getShiftTimeLabel(staff)}</p>
          </div>
        ),
      },
      {
        key: "phone",
        header: "WhatsApp",
        sortValue: (staff) => getSortValue(staff, "phone", t),
        className: "align-middle",
        render: (staff) => <p className="truncate">{staff.phone || "-"}</p>,
      },
      {
        key: "email",
        header: "Email",
        sortValue: (staff) => getSortValue(staff, "email", t),
        className: "align-middle",
        render: (staff) => <p className="truncate">{staff.email || "-"}</p>,
      },
      {
        key: "status",
        header: "Status",
        sortValue: (staff) => getSortValue(staff, "status", t),
        className: "align-middle",
        render: (staff) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
              staff.status,
            )}`}
          >
            {getStatusLabel(staff.status, t)}
          </span>
        ),
      },
      {
        key: "hired_date",
        header: t("owner.staff.startDate"),
        sortValue: (staff) => getSortValue(staff, "hired_date", t),
        className: "align-middle",
        render: (staff) => formatDate(staff.hired_date),
      },
    ];

    if (!showActions && !onGenerateAccessCode) return baseColumns;

    return [
      ...baseColumns,
      {
        key: "actions",
        header: t("common.actions"),
        isAction: true,
        className: "align-middle",
        render: (staff) => {
          const isSelf = isCurrentLoggedInStaff(staff, currentStaff);
          const isOwner = normalizeText(staff.role) === "owner";
          const canDelete = Boolean(onDelete) && !isSelf && !isOwner;

          return (
            <div className="flex items-center gap-2">
              {onGenerateAccessCode ? (
                <button
                  type="button"
                  onClick={() => onGenerateAccessCode(staff.id)}
                  disabled={generatingAccessStaffId === staff.id}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingAccessStaffId === staff.id ? t("owner.staff.generating") : t("owner.staff.generateCode")}
                </button>
              ) : null}

              {showActions ? (
                <button
                  type="button"
                  onClick={() => onEdit(staff.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50"
                  title={t("owner.staff.editStaff")}
                  aria-label={t("owner.staff.editStaffName", { name: staff.name || t("owner.staff.staff") })}
                >
                  <PencilSquareIcon className="h-4.5 w-4.5" />
                </button>
              ) : null}

              {showActions && canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete?.(staff.id)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition hover:bg-red-50 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
                  title={t("owner.staff.deleteStaff")}
                  aria-label={t("owner.staff.deleteStaffName", { name: staff.name || t("owner.staff.staff") })}
                >
                  <TrashIcon className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          );
        },
      },
    ];
  }, [currentStaff, generatingAccessStaffId, onDelete, onEdit, onGenerateAccessCode, showActions, t]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-4 md:px-5">
      <div className="mb-4 ">
        <h2 className="text-base font-bold text-gray-900">{title ?? t("owner.staff.dataList")}</h2>
        <p className="mt-1 text-sm text-gray-500">{description ?? t("owner.staff.dataListDescription")}</p>
      </div>
      <StandardTable
        columns={columns}
        data={normalizedStaffList}
        getRowKey={(staff) => staff.id}
        loading={loading}
        emptyLabel={t("owner.staff.noStaffData")}
      />
    </div>
  );
}
