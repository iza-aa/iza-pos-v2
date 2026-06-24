"use client";

import { useState } from "react";
import { UserPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/app/components/shared/i18n";
import {
  STAFF_POSITIONS,
  getStaffPositionLabel,
  type StaffPosition,
} from "@/lib/staff/positions";

type StaffRole = "manager" | "staff";

interface AddStaffModalProps {
  onClose: () => void;
  onSave: (staffData: NewStaffData) => Promise<void>;
}

export interface NewStaffData {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  positions: StaffPosition[];
  primary_position: StaffPosition | null;
  staff_type?: StaffPosition | null;
  password?: string;
}

const roleOptions: Array<{ value: StaffRole; label: string }> = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
];

const createInitialFormData = (): NewStaffData => ({
  name: "",
  email: "",
  phone: "",
  role: "staff",
  positions: ["cashier"],
  primary_position: "cashier",
  staff_type: "cashier",
  password: "",
});

export default function AddStaffModal({
  onClose,
  onSave,
}: AddStaffModalProps) {
  const { t } = useLanguage();

  const [formData, setFormData] = useState<NewStaffData>(() =>
    createInitialFormData(),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isOperationalStaff = formData.role === "staff";
  const isLoginRole = formData.role === "manager";


  const handleRoleChange = (role: StaffRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      positions:
        role === "staff"
          ? prev.positions.length > 0
            ? prev.positions
            : ["cashier"]
          : [],
      primary_position:
        role === "staff"
          ? prev.primary_position ?? prev.positions[0] ?? "cashier"
          : null,
      staff_type:
        role === "staff"
          ? prev.primary_position ?? prev.positions[0] ?? "cashier"
          : null,
      password: role === "manager" ? prev.password ?? "" : "",
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

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password?.trim() ?? "";

    if (!name) {
      setError(t("owner.staff.nameRequired"));
      return;
    }

    if (isLoginRole) {
      if (!email) {
        setError(t("owner.staff.emailRequiredManager"));
        return;
      }

      if (password.length < 6) {
        setError(t("owner.staff.passwordManagerMin"));
        return;
      }
    }

    if (
      isOperationalStaff &&
      (formData.positions.length === 0 || !formData.primary_position)
    ) {
      setError("Pilih minimal satu posisi dan tentukan posisi utama.");
      return;
    }

    const payload: NewStaffData = {
      name,
      email,
      phone,
      role: formData.role,
      positions: isOperationalStaff ? formData.positions : [],
      primary_position: isOperationalStaff ? formData.primary_position : null,
      staff_type: isOperationalStaff ? formData.primary_position : null,
      password: isLoginRole ? password : undefined,
    };


    setLoading(true);

    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("owner.staff.addError", { message: t("owner.staff.unknownError") });
      setError(message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-2">
              <UserPlusIcon className="h-5 w-5 text-gray-700" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">{t("owner.staff.addTitle")}</h2>
              <p className="text-xs text-gray-500">
                {t("owner.staff.addDescription")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100"
            aria-label="Close modal"
            disabled={loading}
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("owner.staff.fullName")} <span className="text-red-500">*</span>
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
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("owner.staff.role")} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(event) => handleRoleChange(event.target.value as StaffRole)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              required
              disabled={loading}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {isOperationalStaff && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Posisi Staff <span className="text-red-500">*</span>
              </label>
              <p className="mb-3 text-xs leading-5 text-gray-500">
                Pilih semua posisi yang dapat dikerjakan. Posisi utama dipakai
                sebagai default selama masa transisi sistem.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STAFF_POSITIONS.map((position) => {
                  const selected = formData.positions.includes(position);
                  const primary = formData.primary_position === position;

                  return (
                    <div
                      key={position}
                      className={`rounded-xl border p-3 transition ${
                        selected
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
                        className={`mt-2 flex items-center gap-2 text-xs ${
                          selected
                            ? "cursor-pointer text-gray-600"
                            : "cursor-not-allowed text-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="primary-position"
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


          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("owner.staff.email")} {isLoginRole && <span className="text-red-500">*</span>}
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
              placeholder="staff@example.com"
              required={isLoginRole}
              disabled={loading}
            />
            {isLoginRole && (
              <p className="mt-1 text-xs text-gray-500">
                Manager memakai email dan password untuk login.
              </p>
            )}
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

          {isLoginRole && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {t("owner.staff.password")} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                placeholder="Minimal 6 karakter"
                minLength={6}
                required={isLoginRole}
                disabled={loading}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
