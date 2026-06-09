"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardDocumentIcon, KeyIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Staff } from "@/lib/types";
import { useLanguage } from "@/app/components/shared/i18n";
import { getStaffAccessState } from "./staffAccessUtils";

type StaffRole = "owner" | "manager" | "staff";
type StaffType = "barista" | "kitchen" | "waiter" | "cashier";
type EditableStaffStatus = "active" | "inactive" | "on-leave";

export type StaffShiftOption = {
  id: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean | null;
};

type StaffRecordValue = Staff & {
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  staff_type?: string | null;
  status?: string | null;
  login_code?: string | null;
  login_code_expires_at?: string | null;
  pin_hash?: string | null;
  password_hash?: string | null;
  must_change_pin?: boolean | null;
  shift_id?: string | null;
  weekly_shift_overrides?: WeeklyShiftOverride[];
};

type WeeklyShiftOverride = {
  weekday: number;
  shift_id: string;
};

type StaffFormData = {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  staff_type: StaffType | null;
  shift_id: string | null;
  status: EditableStaffStatus;
};

interface EditStaffModalProps {
  isOpen: boolean;
  staff: Staff | null;
  shifts?: StaffShiftOption[];
  onClose: () => void;
  onSave: (updatedStaff: Staff) => void | Promise<void>;
  onGeneratePass?: (id: string) => void | Promise<void>;
  onCopyCode?: (code: string) => void;
  isGeneratingCode?: boolean;
}

const STAFF_TYPE_OPTIONS: Array<{
  value: StaffType;
  label: string;
}> = [
  { value: "cashier", label: "Cashier" },
  { value: "barista", label: "Barista" },
  { value: "kitchen", label: "Kitchen" },
  { value: "waiter", label: "Waiter" },
];

const ROLE_OPTIONS: Array<{
  value: StaffRole;
  label: string;
}> = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

const STATUS_OPTIONS: Array<{
  value: EditableStaffStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on-leave", label: "On Leave" },
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const normalizeRole = (value: unknown): StaffRole => {
  if (value === "owner") return "owner";
  if (value === "manager") return "manager";
  return "staff";
};

const normalizeStaffType = (
  value: unknown,
  role: StaffRole,
): StaffType | null => {
  if (role !== "staff") return null;

  if (value === "barista") return "barista";
  if (value === "kitchen") return "kitchen";
  if (value === "waiter") return "waiter";
  if (value === "cashier") return "cashier";

  if (value === "server" || value === "pelayan" || value === "waitress") {
    return "waiter";
  }

  if (value === "bar") {
    return "barista";
  }

  return "barista";
};

const normalizeStatus = (value: unknown): EditableStaffStatus => {
  if (value === "inactive") return "inactive";
  if (value === "on-leave") return "on-leave";
  return "active";
};

const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";

  return value.slice(0, 5);
};

export default function EditStaffModal({
  isOpen,
  staff,
  shifts = [],
  onClose,
  onSave,
  onGeneratePass,
  onCopyCode,
  isGeneratingCode = false,
}: EditStaffModalProps) {
  const { t } = useLanguage();
  const activeShifts = useMemo(
    () => shifts.filter((shift) => shift.is_active !== false),
    [shifts],
  );

  const defaultShiftId = activeShifts[0]?.id ?? null;

  const [formData, setFormData] = useState<StaffFormData>({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    staff_type: "barista",
    shift_id: null,
    status: "active",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weeklyShiftOverrides, setWeeklyShiftOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!staff || !isOpen) return;

    const staffRecord = staff as StaffRecordValue;
    const normalizedRole = normalizeRole(staffRecord.role);
    const canUseShift = normalizedRole === "staff" || normalizedRole === "manager";
    const currentShiftId = toSafeString(staffRecord.shift_id) || null;

    setFormData({
      name: toSafeString(staffRecord.name),
      email: toSafeString(staffRecord.email),
      phone: toSafeString(staffRecord.phone),
      role: normalizedRole,
      staff_type: normalizeStaffType(staffRecord.staff_type, normalizedRole),
      shift_id: canUseShift ? currentShiftId ?? defaultShiftId : null,
      status: normalizeStatus(staffRecord.status),
    });
    setWeeklyShiftOverrides(
      (staffRecord.weekly_shift_overrides || []).reduce<Record<number, string>>((current, override) => {
        if (override.weekday >= 1 && override.weekday <= 7 && override.shift_id) {
          current[override.weekday] = override.shift_id;
        }
        return current;
      }, {}),
    );

    setError("");
    setLoading(false);
  }, [staff, isOpen, defaultShiftId]);

  if (!isOpen || !staff) {
    return null;
  }

  const staffRecord = staff as StaffRecordValue;
  const canUseShift = formData.role === "staff" || formData.role === "manager";
  const accessState = getStaffAccessState({
    role: formData.role,
    login_code: staffRecord.login_code,
    login_code_expires_at: staffRecord.login_code_expires_at,
    pin_hash: staffRecord.pin_hash,
    password_hash: staffRecord.password_hash,
    must_change_pin: staffRecord.must_change_pin,
  });
  const translatedAccessAction =
    accessState.actionLabel === "Regenerate Code"
      ? t("owner.staff.regenerateCode")
      : accessState.actionLabel === "Create Login Code"
        ? t("owner.staff.createLoginCode")
        : accessState.actionLabel === "Create Reset Code"
          ? t("owner.staff.createResetCode")
          : accessState.actionLabel === "Reset PIN"
            ? t("owner.staff.resetPin")
            : accessState.actionLabel;

  const handleRoleChange = (role: StaffRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      staff_type:
        role === "staff" ? normalizeStaffType(prev.staff_type, role) : null,
      shift_id: role === "staff" || role === "manager" ? prev.shift_id ?? defaultShiftId : null,
    }));
  };

  const handleStaffTypeChange = (staffTypeValue: string) => {
    setFormData((prev) => ({
      ...prev,
      staff_type: normalizeStaffType(staffTypeValue, prev.role),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const selectedShiftId = canUseShift ? formData.shift_id ?? defaultShiftId : null;

    if (!formData.name.trim()) {
      setError(t("owner.staff.nameRequired"));
      return;
    }

    if (formData.role === "staff" && !formData.staff_type) {
      setError(t("owner.staff.staffTypeRequired"));
      return;
    }

    if (canUseShift && activeShifts.length > 0 && !selectedShiftId) {
      setError(t("owner.staff.shiftRequired"));
      return;
    }

    setLoading(true);

    try {
      const staffRecord = staff as StaffRecordValue;

      const updatedStaff = {
        ...staffRecord,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        role: formData.role,
        staff_type:
          formData.role === "staff"
            ? normalizeStaffType(formData.staff_type, formData.role)
            : null,
        shift_id: selectedShiftId,
        weekly_shift_overrides: canUseShift
          ? Object.entries(weeklyShiftOverrides)
              .filter(([, shiftId]) => Boolean(shiftId))
              .map(([weekday, shiftId]) => ({
                weekday: Number(weekday),
                shift_id: shiftId,
              }))
          : [],
        status: formData.status,
      };

      await onSave(updatedStaff as unknown as Staff);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t("owner.staff.saveFailed");

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderShiftOptions = () => {
    if (!canUseShift) {
      return <option value="">Tidak diperlukan</option>;
    }

    if (activeShifts.length === 0) {
      return <option value="">No active shift yet</option>;
    }

    return activeShifts.map((shift) => (
      <option key={shift.id} value={shift.id}>
        {shift.shift_name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
      </option>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t("owner.staff.editTitle")}</h2>
            <p className="text-sm text-gray-500">
              Perbarui data staff, role, tipe staff, shift, dan status.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close edit staff modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-160px)] space-y-5 overflow-y-auto px-6 py-5"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("owner.staff.staffName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="Enter staff name"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="staff@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              No WhatsApp
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="08123456789"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(event) => handleRoleChange(event.target.value as StaffRole)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                disabled={loading}
              >
                {ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {t("owner.staff.status")}
              </label>
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: event.target.value as EditableStaffStatus,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                disabled={loading}
              >
                {STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("owner.staff.staffType")}
            </label>
            <select
              value={formData.staff_type ?? ""}
              onChange={(event) => handleStaffTypeChange(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
              disabled={loading || formData.role !== "staff"}
            >
              {formData.role !== "staff" && <option value="">Tidak diperlukan</option>}

              {formData.role === "staff" &&
                STAFF_TYPE_OPTIONS.map((staffTypeOption) => (
                  <option key={staffTypeOption.value} value={staffTypeOption.value}>
                    {staffTypeOption.label}
                  </option>
                ))}
            </select>

            {formData.role !== "staff" && (
              <p className="mt-2 text-xs text-gray-500">
                {t("owner.staff.staffTypeHelper")}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("owner.staff.workShift")} {canUseShift && activeShifts.length > 0 && <span className="text-red-500">*</span>}
            </label>
            <select
              value={
                canUseShift
                  ? formData.shift_id ?? defaultShiftId ?? ""
                  : ""
              }
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  shift_id: event.target.value || null,
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
              disabled={loading || !canUseShift || activeShifts.length === 0}
              required={canUseShift && activeShifts.length > 0}
            >
              {renderShiftOptions()}
            </select>

            <p className="mt-2 text-xs text-gray-500">
              Default shift is used every day unless a weekly override below is set.
            </p>
          </div>

          {canUseShift ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t("owner.staff.weeklyOverride")}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {t("owner.staff.weeklyOverrideHelper")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const usedDays = new Set(Object.keys(weeklyShiftOverrides).map(Number));
                    const nextDay = WEEKDAY_OPTIONS.find((day) => !usedDays.has(day.value));
                    const nextShiftId = activeShifts.find((shift) => shift.id !== (formData.shift_id ?? defaultShiftId))?.id
                      ?? activeShifts[0]?.id
                      ?? "";

                    if (!nextDay || !nextShiftId) return;

                    setWeeklyShiftOverrides((current) => ({
                      ...current,
                      [nextDay.value]: nextShiftId,
                    }));
                  }}
                  disabled={loading || activeShifts.length === 0 || Object.keys(weeklyShiftOverrides).length >= WEEKDAY_OPTIONS.length}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("owner.staff.addWeeklyOverride")}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {Object.entries(weeklyShiftOverrides).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-xs font-semibold text-gray-500">
                    No weekly override. This staff uses the default shift every day.
                  </p>
                ) : null}

                {Object.entries(weeklyShiftOverrides)
                  .sort(([left], [right]) => Number(left) - Number(right))
                  .map(([weekday, shiftId]) => (
                    <div key={weekday} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]">
                      <select
                        value={weekday}
                        onChange={(event) => {
                          const nextWeekday = Number(event.target.value);
                          const currentWeekday = Number(weekday);
                          setWeeklyShiftOverrides((current) => {
                            const next = { ...current };
                            const currentShiftId = next[currentWeekday];

                            delete next[currentWeekday];
                            next[nextWeekday] = currentShiftId;
                            return next;
                          });
                        }}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        disabled={loading}
                      >
                        {WEEKDAY_OPTIONS.map((day) => (
                          <option
                            key={day.value}
                            value={day.value}
                            disabled={Boolean(weeklyShiftOverrides[day.value]) && day.value !== Number(weekday)}
                          >
                            {day.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={shiftId}
                        onChange={(event) => {
                          setWeeklyShiftOverrides((current) => ({
                            ...current,
                            [Number(weekday)]: event.target.value,
                          }));
                        }}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        disabled={loading || activeShifts.length === 0}
                      >
                        {activeShifts.map((shift) => (
                          <option key={shift.id} value={shift.id}>
                            {shift.shift_name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklyShiftOverrides((current) => {
                            const next = { ...current };
                            delete next[Number(weekday)];
                            return next;
                          });
                        }}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {accessState.shouldShowAccess && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <KeyIcon className="h-5 w-5 text-gray-500" />
                    <p className="text-sm font-bold text-gray-900">
                    {t("owner.staff.access")}
                    </p>
                  </div>

                  <div className="mt-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${accessState.badgeClass}`}
                    >
                      {accessState.label}
                    </span>

                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {accessState.description}
                    </p>
                  </div>

                  {accessState.canCopyCode && staffRecord.login_code && (
                    <button
                      type="button"
                      onClick={() => onCopyCode?.(staffRecord.login_code!)}
                      disabled={loading || isGeneratingCode}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      Copy Active Code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void onGeneratePass?.(staffRecord.id)}
                  disabled={loading || isGeneratingCode || !onGeneratePass}
                  className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingCode ? t("owner.staff.generating") : translatedAccessAction}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("owner.staff.cancel")}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t("owner.staff.saving") : t("owner.staff.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
