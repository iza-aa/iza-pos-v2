"use client";

import { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Staff } from "@/lib/types";

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
  shift_id?: string | null;
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
}

const STAFF_TYPE_OPTIONS: Array<{
  value: StaffType;
  label: string;
}> = [
  { value: "cashier", label: "Kasir" },
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
}: EditStaffModalProps) {
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

    setError("");
    setLoading(false);
  }, [staff, isOpen, defaultShiftId]);

  if (!isOpen || !staff) {
    return null;
  }

  const canUseShift = formData.role === "staff" || formData.role === "manager";

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
      setError("Nama staff wajib diisi.");
      return;
    }

    if (formData.role === "staff" && !formData.staff_type) {
      setError("Tipe staff wajib dipilih untuk role Staff.");
      return;
    }

    if (canUseShift && activeShifts.length > 0 && !selectedShiftId) {
      setError("Shift wajib dipilih untuk Staff atau Manager.");
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
        status: formData.status,
      };

      await onSave(updatedStaff as unknown as Staff);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Gagal menyimpan perubahan staff.";

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
      return <option value="">Belum ada shift aktif</option>;
    }

    return activeShifts.map((shift) => (
      <option key={shift.id} value={shift.id}>
        {shift.shift_name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
      </option>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Staff</h2>
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
              Nama Staff <span className="text-red-500">*</span>
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
              placeholder="Masukkan nama staff"
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
                Status
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
              Tipe Staff
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
                Tipe staff hanya digunakan untuk role Staff.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Shift Kerja {canUseShift && activeShifts.length > 0 && <span className="text-red-500">*</span>}
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
              Shift digunakan untuk menentukan tepat waktu, terlambat, pulang lebih awal, dan overtime.
            </p>
          </div>

          <div className="flex gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
