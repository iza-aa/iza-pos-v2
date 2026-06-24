"use client";

import {
  CalendarDaysIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { getInitials } from "@/lib/utils";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import type { Staff } from "@/lib/types";
import { useLanguage } from "./i18n";
import {
  getStaffPositionLabel,
  getOrderedStaffPositions,
  type StaffPosition,
  type StaffPositionAssignment,
} from "@/lib/staff/positions";

type StaffCardRecord = Staff & {
  email?: string | null;
  phone?: string | null;
  staff_type?: string | null;
  staff_positions?: StaffPositionAssignment[] | null;
  positions?: StaffPosition[];
  hired_date?: string | null;
  login_code?: string | null;
  login_code_expires_at?: string | null;
  pin_hash?: string | null;
  password_hash?: string | null;
  must_change_pin?: boolean | null;
  profile_picture?: string | null;
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

const formatRole = (value: unknown, t: ReturnType<typeof useLanguage>["t"]) => {
  const role = String(value ?? "").trim().toLowerCase();

  if (role === "owner") return t("owner.staff.owner");
  if (role === "manager") return t("owner.staff.manager");
  if (role === "staff") return t("owner.staff.staff");

  return formatLabel(role);
};

const formatStatus = (value: unknown, t: ReturnType<typeof useLanguage>["t"]) => {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "active") return t("owner.bookkeeping.enabled");
  if (status === "inactive") return t("owner.staff.inactive");
  if (status === "on-leave") return t("owner.staff.onLeave");
  if (status === "terminated") return t("owner.staff.terminated");

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

const getStaffTypeBadgeClass = (position: StaffPosition) => {
  if (position === "cashier") return OWNER_SEMANTIC_TONES.cashier.badgeClass;
  if (position === "barista") return OWNER_SEMANTIC_TONES.coffee.badgeClass;
  if (position === "kitchen") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (position === "waiter") return OWNER_SEMANTIC_TONES.info.badgeClass;

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
  const { t } = useLanguage();
  const staffRole = String(staff.role ?? "").toLowerCase();
  const shouldShowStaffType = staffRole === "staff";

  const phoneText = staff.phone?.trim() || "-";
  const emailText = staff.email?.trim() || "-";
  const statusText = formatStatus(staff.status, t);
  const roleText = formatRole(staff.role, t);
  const staffPositions = getOrderedStaffPositions(staff);
  const hiredDateText = formatHiredDate(staff.hired_date);
  const profilePicture = staff.profile_picture?.trim() || "";

  return (
    <div className="flex break-inside-avoid flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative border-b border-gray-100 bg-[#F7F7F5] p-5 pb-14">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("owner.staff.staffIdLabel")}</p>
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
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-900 text-xl font-bold text-white shadow-lg">
            {getInitials(staff.name)}
            {profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profilePicture}
                alt={staff.name || t("owner.staff.staff")}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-12">
        <div className="text-center">
          <h3 className="truncate text-lg font-bold text-gray-900">{staff.name || "-"}</h3>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {shouldShowStaffType && (
              <>
                {staffPositions.length > 0 ? (
                  staffPositions.map((position) => (
                    <span
                      key={position}
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStaffTypeBadgeClass(position)}`}
                    >
                      {getStaffPositionLabel(position)}
                    </span>
                  ))
                ) : (
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${OWNER_SEMANTIC_TONES.neutral.badgeClass}`}>
                    {t("owner.staff.notAssigned")}
                  </span>
                )}
              </>
            )}

            {!shouldShowStaffType && (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                  staff.role,
                )}`}
              >
                {roleText}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
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
              <span className="min-w-0 truncate text-gray-700">{t("owner.staff.startWork", { date: hiredDateText })}</span>
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
              {isGeneratingAccessCode ? t("owner.staff.generating") : t("owner.staff.generateCode")}
            </button>
          ) : null}

          {showActions ? (
            <button
              type="button"
              onClick={onEdit}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              {t("owner.staff.edit")}
            </button>
          ) : null}

          {showActions && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-red-50 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
            >
              {t("owner.staff.delete")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
