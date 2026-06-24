"use client";

import { useEffect, useState } from "react";
import { ClipboardDocumentIcon, KeyIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Staff } from "@/lib/types";
import { useLanguage } from "@/app/components/shared/i18n";
import { getStaffAccessState } from "./staffAccessUtils";
import {
  STAFF_POSITIONS,
  getPrimaryStaffPosition,
  getStaffPositionLabel,
  getStaffPositions,
  type StaffPosition,
  type StaffPositionAssignment,
} from "@/lib/staff/positions";

type StaffRole = "owner" | "manager" | "staff";
type EditableStaffStatus = "active" | "inactive" | "on-leave";

type StaffRecordValue = Staff & {
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  staff_type?: string | null;
  staff_positions?: StaffPositionAssignment[] | null;
  positions?: StaffPosition[];
  primary_position?: StaffPosition | null;
  status?: string | null;
  login_code?: string | null;
  login_code_expires_at?: string | null;
  pin_hash?: string | null;
  password_hash?: string | null;
  must_change_pin?: boolean | null;
};

type StaffFormData = {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  positions: StaffPosition[];
  primary_position: StaffPosition | null;
  staff_type: StaffPosition | null;
  status: EditableStaffStatus;
};

interface EditStaffModalProps {
  isOpen: boolean;
  staff: Staff | null;
  onClose: () => void;
  onSave: (updatedStaff: Staff) => void | Promise<void>;
  onGeneratePass?: (id: string) => void | Promise<void>;
  onCopyCode?: (code: string) => void;
  isGeneratingCode?: boolean;
  allowOwnerRole?: boolean;
}

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


const normalizeRole = (value: unknown): StaffRole => {
  if (value === "owner") return "owner";
  if (value === "manager") return "manager";
  return "staff";
};

const normalizeStatus = (value: unknown): EditableStaffStatus => {
  if (value === "inactive") return "inactive";
  if (value === "on-leave") return "on-leave";
  return "active";
};

const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};


export default function EditStaffModal({
  isOpen,
  staff,
  onClose,
  onSave,
  onGeneratePass,
  onCopyCode,
  isGeneratingCode = false,
  allowOwnerRole = true,
}: EditStaffModalProps) {
  const { t } = useLanguage();

  const [formData, setFormData] = useState<StaffFormData>({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    positions: ["barista"],
    primary_position: "barista",
    staff_type: "barista",
    status: "active",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const roleOptions = allowOwnerRole
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((roleOption) => roleOption.value !== "owner");

  useEffect(() => {
    if (!staff || !isOpen) return;

    const staffRecord = staff as StaffRecordValue;
    const normalizedRole = normalizeRole(staffRecord.role);
    const positions =
      normalizedRole === "staff" ? getStaffPositions(staffRecord) : [];
    const primaryPosition =
      normalizedRole === "staff"
        ? getPrimaryStaffPosition(staffRecord) ?? positions[0] ?? "barista"
        : null;

    setFormData({
      name: toSafeString(staffRecord.name),
      email: toSafeString(staffRecord.email),
      phone: toSafeString(staffRecord.phone),
      role: normalizedRole,
      positions,
      primary_position: primaryPosition,
      staff_type: primaryPosition,
      status: normalizeStatus(staffRecord.status),
    });

    setError("");
    setLoading(false);
  }, [staff, isOpen]);

  if (!isOpen || !staff) {
    return null;
  }

  const staffRecord = staff as StaffRecordValue;
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
      positions:
        role === "staff"
          ? prev.positions.length > 0
            ? prev.positions
            : ["barista"]
          : [],
      primary_position:
        role === "staff"
          ? prev.primary_position ?? prev.positions[0] ?? "barista"
          : null,
      staff_type:
        role === "staff"
          ? prev.primary_position ?? prev.positions[0] ?? "barista"
          : null,
    }));
  };

  const togglePosition = (position: StaffPosition) => {
    setFormData((previous) => {
      const alreadySelected = previous.positions.includes(position);
      const nextPositions = alreadySelected
        ? previous.positions.filter((item) => item !== position)
        : [...previous.positions, position];
      const nextPrimary =
        nextPositions.length === 0
          ? null
          : previous.primary_position &&
            nextPositions.includes(previous.primary_position)
            ? previous.primary_position
            : nextPositions[0];

      return {
        ...previous,
        positions: nextPositions,
        primary_position: nextPrimary,
        staff_type: nextPrimary,
      };
    });
  };

  const setPrimaryPosition = (position: StaffPosition) => {
    setFormData((previous) => ({
      ...previous,
      primary_position: position,
      staff_type: position,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError(t("owner.staff.nameRequired"));
      return;
    }

    if (
      formData.role === "staff" &&
      (formData.positions.length === 0 || !formData.primary_position)
    ) {
      setError("Select at least one position and choose a primary position.");
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
        positions: formData.role === "staff" ? formData.positions : [],
        primary_position:
          formData.role === "staff" ? formData.primary_position : null,
        staff_type:
          formData.role === "staff" ? formData.primary_position : null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t("owner.staff.editTitle")}</h2>
            <p className="text-sm text-gray-500">
              Update staff details, role, positions, and status.
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
                {roleOptions.map((roleOption) => (
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

          {formData.role === "staff" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Posisi Staff
              </label>
              <p className="mb-3 text-xs leading-5 text-gray-500">
                Pilih semua posisi yang dapat dikerjakan. Posisi utama
                menjadi default selama masa transisi sistem.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STAFF_POSITIONS.map((position) => {
                  const selected = formData.positions.includes(position);
                  const primary = formData.primary_position === position;

                  return (
                    <div
                      key={position}
                      className={`rounded-xl border p-3 transition ${selected
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 bg-white"
                        }`}
                    >
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePosition(position)}
                          disabled={loading}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {getStaffPositionLabel(position)}
                      </label>
                      <label
                        className={`mt-2 flex items-center gap-2 text-xs ${selected
                          ? "cursor-pointer text-gray-600"
                          : "cursor-not-allowed text-gray-300"
                          }`}
                      >
                        <input
                          type="radio"
                          name="edit-primary-position"
                          checked={primary}
                          onChange={() => setPrimaryPosition(position)}
                          disabled={loading || !selected}
                        />
                        Posisi utama
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
