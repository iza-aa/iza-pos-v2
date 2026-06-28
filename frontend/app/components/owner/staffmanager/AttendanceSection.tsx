"use client";

import { useLanguage } from "@/app/components/shared/i18n";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";

import {
  ViewMode,
  DateRangeMode,
  AttendanceSectionView,
  AttendanceSectionProps,
} from "./attendance/types";

import { useAttendanceData } from "./attendance/hooks/useAttendanceData";
import AttendanceMonitor from "./attendance/components/AttendanceMonitor";
import AttendanceSettings from "./attendance/components/AttendanceSettings";

export default function AttendanceSection({
  onClose,
  viewMode = "card",
  dateRangeMode = "today",
  customStartDate,
  customEndDate,
  onShiftChanged,
  section = "monitor",
  requester,
}: AttendanceSectionProps) {
  const { t } = useLanguage();

  const {
    attendanceList,
    shiftList,
    staffList,
    storeFormData,
    setStoreFormData,
    loading,
    shiftLoading,
    storeLoading,
    locationLoading,
    fetchError,
    fetchAttendanceData,
    handleUseCurrentLocation,
    handleSaveStoreSettings,
    handleSaveShift,
    handleToggleShiftStatus,
    handleDeleteShift,
  } = useAttendanceData({
    dateRangeMode,
    customStartDate,
    customEndDate,
  });

  if (loading && section !== "monitor") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-3 text-sm text-gray-500">
            {t("owner.staff.attendanceLoading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fetchError && (
        <div
          className={`rounded-2xl border p-4 text-sm ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{fetchError}</p>
            <button
              type="button"
              onClick={() => fetchAttendanceData(true)}
              className={`rounded-xl border bg-white px-4 py-2 text-sm font-semibold transition hover:bg-red-50 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {section === "settings" ? (
        <AttendanceSettings
          storeFormData={storeFormData}
          setStoreFormData={setStoreFormData}
          shiftList={shiftList}
          storeLoading={storeLoading}
          locationLoading={locationLoading}
          shiftLoading={shiftLoading}
          handleUseCurrentLocation={handleUseCurrentLocation}
          handleSaveStoreSettings={handleSaveStoreSettings}
          handleSaveShift={async (formData, editingShift, onSuccess) => {
            await handleSaveShift(formData, editingShift, onSuccess);
            if (onShiftChanged) {
              await onShiftChanged();
            }
          }}
          handleToggleShiftStatus={async (shift) => {
            await handleToggleShiftStatus(shift);
            if (onShiftChanged) {
              await onShiftChanged();
            }
          }}
          handleDeleteShift={async (shift) => {
            await handleDeleteShift(shift);
            if (onShiftChanged) {
              await onShiftChanged();
            }
          }}
        />
      ) : null}

      {section === "monitor" ? (
        <AttendanceMonitor
          attendanceList={attendanceList}
          staffList={staffList}
          shiftList={shiftList}
          loading={loading}
          viewMode={viewMode}
          fetchAttendanceData={fetchAttendanceData}
        />
      ) : null}
    </div>
  );
}
