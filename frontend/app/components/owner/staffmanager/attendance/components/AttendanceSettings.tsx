"use client";

import { useState } from "react";
import { useLanguage } from "@/app/components/shared/i18n";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import {
  ClockIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ShiftRecord, StoreSettingsFormData, ShiftFormData } from "../types";
import { formatTime } from "../utils";

interface AttendanceSettingsProps {
  storeFormData: StoreSettingsFormData;
  setStoreFormData: React.Dispatch<React.SetStateAction<StoreSettingsFormData>>;
  shiftList: ShiftRecord[];
  storeLoading: boolean;
  locationLoading: boolean;
  shiftLoading: boolean;
  handleUseCurrentLocation: () => Promise<void>;
  handleSaveStoreSettings: (e: React.FormEvent) => Promise<void>;
  handleSaveShift: (
    formData: ShiftFormData,
    editingShift: ShiftRecord | null,
    onSuccess?: () => void,
  ) => Promise<void>;
  handleToggleShiftStatus: (shift: ShiftRecord) => Promise<void>;
  handleDeleteShift: (shift: ShiftRecord) => Promise<void>;
}

const EMPTY_SHIFT_FORM: ShiftFormData = {
  shift_name: "",
  check_in_window_start: "06:00",
  start_time: "08:00",
  check_in_grace_until: "08:15",
  end_time: "15:00",
  check_out_grace_until: "15:15",
  check_out_window_end: "18:00",
  is_active: true,
};

export default function AttendanceSettings({
  storeFormData,
  setStoreFormData,
  shiftList,
  storeLoading,
  locationLoading,
  shiftLoading,
  handleUseCurrentLocation,
  handleSaveStoreSettings,
  handleSaveShift,
  handleToggleShiftStatus,
  handleDeleteShift,
}: AttendanceSettingsProps) {
  const { t } = useLanguage();

  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [shiftFormData, setShiftFormData] =
    useState<ShiftFormData>(EMPTY_SHIFT_FORM);

  const openCreateShiftForm = () => {
    setEditingShift(null);
    setShiftFormData(EMPTY_SHIFT_FORM);
    setShowShiftForm(true);
  };

  const openEditShiftForm = (shift: ShiftRecord) => {
    setEditingShift(shift);
    setShiftFormData({
      shift_name: shift.shift_name,
      check_in_window_start: shift.check_in_window_start || "",
      start_time: shift.start_time,
      check_in_grace_until: shift.check_in_grace_until,
      end_time: shift.end_time,
      check_out_grace_until: shift.check_out_grace_until,
      check_out_window_end: shift.check_out_window_end || "",
      is_active: shift.is_active ?? true,
    });
    setShowShiftForm(true);
  };

  const closeShiftForm = () => {
    setShowShiftForm(false);
    setEditingShift(null);
  };

  const onSaveShift = () => {
    handleSaveShift(shiftFormData, editingShift, closeShiftForm);
  };

  const renderStatusBadge = (label: string, className: string) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );

  const hasLocation =
    !!storeFormData.store_latitude.trim() &&
    !!storeFormData.store_longitude.trim();

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t("owner.staff.attendanceLocation")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Set the cafe location point and validation radius so staff can
              only clock in or clock out when they are near the cafe.
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              hasLocation
                ? OWNER_SEMANTIC_TONES.success.badgeClass
                : OWNER_SEMANTIC_TONES.warning.badgeClass
            }`}
          >
            <MapPinIcon className="h-4 w-4" />
            {hasLocation ? "Location Set" : "Location Not Set"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Cafe Name
            </label>
            <input
              type="text"
              value={storeFormData.store_name}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  store_name: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="Cafe name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Latitude
            </label>
            <input
              type="text"
              value={storeFormData.store_latitude}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  store_latitude: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="-7.1234567"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Longitude
            </label>
            <input
              type="text"
              value={storeFormData.store_longitude}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  store_longitude: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="110.1234567"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("owner.staff.attendanceRadius")}
            </label>
            <input
              type="number"
              min="1"
              value={storeFormData.attendance_radius_meters}
              onChange={(event) =>
                setStoreFormData((prev) => ({
                  ...prev,
                  attendance_radius_meters: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="150"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Use the owner or cashier device location while at the cafe to fill
            latitude and longitude automatically.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locationLoading || storeLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MapPinIcon className="h-4 w-4" />
              {locationLoading ? "Getting Location..." : "Use Current Location"}
            </button>

            <button
              type="button"
              onClick={handleSaveStoreSettings}
              disabled={storeLoading || locationLoading}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {storeLoading
                ? t("owner.staff.saving")
                : t("owner.staff.saveLocation")}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mt-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t("owner.staff.shiftManagement")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure start time, lateness tolerance, end time, and normal
              clock-out limit.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateShiftForm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <PlusIcon className="h-4 w-4" />
            {t("owner.staff.addShift")}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {shiftList.map((shift) => (
            <div
              key={shift.id}
              className={`rounded-2xl border p-4 ${
                shift.is_active === false
                  ? "border-gray-200 bg-gray-50 opacity-75"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {shift.shift_name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTime(shift.start_time)} -{" "}
                    {formatTime(shift.end_time)}
                  </p>
                </div>

                {renderStatusBadge(
                  shift.is_active === false ? "Inactive" : "Active",
                  shift.is_active === false
                    ? OWNER_SEMANTIC_TONES.neutral.badgeClass
                    : OWNER_SEMANTIC_TONES.success.badgeClass,
                )}
              </div>

              <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                <div className="flex justify-between gap-3">
                  <span>On-time clock in</span>
                  <span className="font-semibold text-gray-900">
                    {formatTime(shift.start_time)} -{" "}
                    {formatTime(shift.check_in_grace_until)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>On-time clock out</span>
                  <span className="font-semibold text-gray-900">
                    {formatTime(shift.end_time)} -{" "}
                    {formatTime(shift.check_out_grace_until)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => openEditShiftForm(shift)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  {t("owner.staff.edit")}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleShiftStatus(shift)}
                  disabled={shiftLoading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PowerIcon className="h-4 w-4" />
                  {shift.is_active === false ? "Activate" : "Deactivate"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteShift(shift)}
                  disabled={shiftLoading}
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border bg-white text-xs font-semibold transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
                >
                  <TrashIcon className="h-4 w-4" />
                  {t("owner.staff.deleteShift")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {shiftList.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <ClockIcon className="mx-auto h-9 w-9 text-gray-400" />
            <h3 className="mt-3 text-sm font-bold text-gray-900">
              No shifts yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t("owner.staff.shiftFormDescription")}
            </p>
          </div>
        )}
      </div>

      {showShiftForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingShift
                    ? t("owner.staff.editShift")
                    : t("owner.staff.addShift")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Shift defines start time, lateness tolerance, end time, and
                  overtime limits for staff.
                </p>
              </div>

              <button
                type="button"
                onClick={closeShiftForm}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close shift form"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {t("owner.staff.shiftName")}
                </label>
                <input
                  type="text"
                  value={shiftFormData.shift_name}
                  onChange={(event) =>
                    setShiftFormData((prev) => ({
                      ...prev,
                      shift_name: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder={t("owner.staff.shiftNamePlaceholder")}
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                <h4 className="text-sm font-bold text-gray-900">
                  Clock In (Absen Masuk)
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Buka Absen Masuk
                    </label>
                    <input
                      type="time"
                      value={shiftFormData.check_in_window_start}
                      onChange={(event) =>
                        setShiftFormData((prev) => ({
                          ...prev,
                          check_in_window_start: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Jadwal Masuk Shift
                    </label>
                    <input
                      type="time"
                      value={shiftFormData.start_time}
                      onChange={(event) =>
                        setShiftFormData((prev) => ({
                          ...prev,
                          start_time: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Toleransi Telat s/d
                    </label>
                    <input
                      type="time"
                      value={shiftFormData.check_in_grace_until}
                      onChange={(event) =>
                        setShiftFormData((prev) => ({
                          ...prev,
                          check_in_grace_until: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                <h4 className="text-sm font-bold text-gray-900">
                  Clock Out (Absen Keluar)
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Jadwal Pulang Shift
                    </label>
                    <input
                      type="time"
                      value={shiftFormData.end_time}
                      onChange={(event) =>
                        setShiftFormData((prev) => ({
                          ...prev,
                          end_time: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Dihitung Normal s/d
                    </label>
                    <input
                      type="time"
                      value={shiftFormData.check_out_grace_until}
                      onChange={(event) =>
                        setShiftFormData((prev) => ({
                          ...prev,
                          check_out_grace_until: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Batas Akhir Absen
                    </label>
                    <input
                      type="time"
                      value={shiftFormData.check_out_window_end}
                      onChange={(event) =>
                        setShiftFormData((prev) => ({
                          ...prev,
                          check_out_window_end: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={shiftFormData.is_active}
                  onChange={(event) =>
                    setShiftFormData((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t("owner.staff.shiftAvailable")}
                </span>
              </label>
            </div>

            <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeShiftForm}
                disabled={shiftLoading}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("owner.staff.cancel")}
              </button>

              <button
                type="button"
                onClick={onSaveShift}
                disabled={shiftLoading}
                className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shiftLoading
                  ? t("owner.staff.saving")
                  : t("owner.staff.saveShift")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
