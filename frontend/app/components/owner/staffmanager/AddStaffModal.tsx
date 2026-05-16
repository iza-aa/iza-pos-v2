"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

type StaffRole = "manager" | "staff";
type StaffType = "cashier" | "barista" | "kitchen" | "waiter";

export type StaffShiftOption = {
  id: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean | null;
};

interface AddStaffModalProps {
  onClose: () => void;
  onSave: (staffData: NewStaffData) => Promise<void>;
  shifts?: StaffShiftOption[];
}

export interface NewStaffData {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  staff_type?: StaffType | null;
  shift_id?: string | null;
  password?: string;
}

const roleOptions: Array<{ value: StaffRole; label: string }> = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
];

const staffTypeOptions: Array<{ value: StaffType; label: string }> = [
  { value: "cashier", label: "Kasir" },
  { value: "barista", label: "Barista" },
  { value: "kitchen", label: "Kitchen" },
  { value: "waiter", label: "Waiter" },
];

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";

  return value.slice(0, 5);
};

const createInitialFormData = (defaultShiftId: string | null): NewStaffData => ({
  name: "",
  email: "",
  phone: "",
  role: "staff",
  staff_type: "cashier",
  shift_id: defaultShiftId,
  password: "",
});

export default function AddStaffModal({
  onClose,
  onSave,
  shifts = [],
}: AddStaffModalProps) {
  const activeShifts = useMemo(
    () => shifts.filter((shift) => shift.is_active !== false),
    [shifts],
  );

  const defaultShiftId = activeShifts[0]?.id ?? null;

  const [formData, setFormData] = useState<NewStaffData>(() =>
    createInitialFormData(defaultShiftId),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isOperationalStaff = formData.role === "staff";
  const isLoginRole = formData.role === "manager";
  const canUseShift = formData.role === "staff" || formData.role === "manager";

  useEffect(() => {
    if (!canUseShift || activeShifts.length === 0 || formData.shift_id) return;

    setFormData((prev) => ({
      ...prev,
      shift_id: defaultShiftId,
    }));
  }, [activeShifts.length, canUseShift, defaultShiftId, formData.shift_id]);

  const handleRoleChange = (role: StaffRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      staff_type: role === "staff" ? prev.staff_type ?? "cashier" : null,
      shift_id:
        role === "staff" || role === "manager"
          ? prev.shift_id ?? defaultShiftId
          : null,
      password: role === "manager" ? prev.password ?? "" : "",
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password?.trim() ?? "";
    const selectedShiftId = canUseShift ? formData.shift_id ?? defaultShiftId : null;

    if (!name) {
      setError("Nama staff wajib diisi.");
      return;
    }

    if (isLoginRole) {
      if (!email) {
        setError("Email wajib diisi untuk Manager.");
        return;
      }

      if (password.length < 6) {
        setError("Password manager minimal 6 karakter.");
        return;
      }
    }

    if (isOperationalStaff && !formData.staff_type) {
      setError("Tipe staff wajib dipilih.");
      return;
    }

    if (canUseShift && activeShifts.length > 0 && !selectedShiftId) {
      setError("Shift wajib dipilih untuk Staff atau Manager.");
      return;
    }

    const payload: NewStaffData = {
      name,
      email,
      phone,
      role: formData.role,
      staff_type: isOperationalStaff ? formData.staff_type ?? "cashier" : null,
      shift_id: selectedShiftId,
      password: isLoginRole ? password : undefined,
    };

    setLoading(true);

    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menambahkan staff.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderShiftOptions = () => {
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
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-2">
              <UserPlusIcon className="h-5 w-5 text-gray-700" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">Tambah Staff</h2>
              <p className="text-xs text-gray-500">
                Buat akun staff operasional atau manager.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100"
            aria-label="Tutup modal"
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
              Nama Lengkap <span className="text-red-500">*</span>
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
              Role <span className="text-red-500">*</span>
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
                Tipe Staff <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staff_type ?? "cashier"}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    staff_type: event.target.value as StaffType,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                required
                disabled={loading}
              >
                {staffTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canUseShift && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Shift Kerja {activeShifts.length > 0 && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.shift_id ?? defaultShiftId ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    shift_id: event.target.value || null,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                disabled={loading || activeShifts.length === 0}
                required={activeShifts.length > 0}
              >
                {renderShiftOptions()}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Shift ini dipakai untuk validasi jam masuk, keterlambatan, jam pulang, dan lembur.
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Email {isLoginRole && <span className="text-red-500">*</span>}
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
                Password <span className="text-red-500">*</span>
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
