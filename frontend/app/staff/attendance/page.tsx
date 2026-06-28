"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { canAccessEndShift } from "@/lib/utils/staffAccess";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { SidebarTabset, DateRangeFilter, getDefaultDateRange, type DateRangeValue } from "@/app/components/shared";
import { getJakartaTodayDate } from "@/lib/services/bookkeeping/bookkeepingDate";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";


import type { CheckInStatus, CheckOutStatus, StaffAttendanceTab, ShiftRecord, StaffRecord, AttendanceRecord, StoreSettings, ShiftClosingData, AssignmentRecord, Html5QrcodeConfig, Html5QrcodeInstance, Html5QrcodeConstructor, RawRelationValue } from "./types";
import { QR_READER_ELEMENT_ID, MAX_LOCATION_ACCURACY_METERS, staffAttendanceTabs } from "./constants";
import { toSafeString, toNullableString, normalizeStaffPosition, getUnknownErrorMessage, getSingleRelation, normalizeShift, normalizeCheckInStatus, normalizeCheckOutStatus, normalizeAttendance, getTodayDateString, getIsoWeekday, addDaysToDateString, getStatusLabel, getStatusClassName, getCurrentLocation, getLocationErrorMessage, formatDate, getTodayFullDateString, formatTime, formatDistance, getDuration, formatCurrency, formatClosingStatus, getClosingStatusClassName, getSetupGuidance, extractPresenceCodeFromQrText, getScannerErrorMessage } from "./utils";

import { useAttendanceData } from "./hooks/useAttendanceData";

export default function AttendancePage() {
  const {
    currentUser,
    userId,
    today,
    staff,
    setStaff,
    storeSettings,
    setStoreSettings,
    attendanceList,
    setAttendanceList,
    weeklyAssignments,
    setWeeklyAssignments,
    dailyAssignments,
    setDailyAssignments,
    todayAttendance,
    setTodayAttendance,
    activeAttendanceTab,
    setActiveAttendanceTab,
    dateRange,
    setDateRange,
    currentTime,
    setCurrentTime,
    qrStatus,
    setQrStatus,
    presenceCode,
    setPresenceCode,
    codeError,
    setCodeError,
    locationMessage,
    setLocationMessage,
    scannerOpen,
    setScannerOpen,
    historyModalOpen,
    setHistoryModalOpen,
    scannerMessage,
    setScannerMessage,
    scannerLoading,
    setScannerLoading,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    shiftClosingData,
    setShiftClosingData,
    shiftClosingLoading,
    setShiftClosingLoading,
    shiftClosingRefreshing,
    setShiftClosingRefreshing,
    shiftClosingSubmitting,
    setShiftClosingSubmitting,
    shiftClosingError,
    setShiftClosingError,
    shiftClosingNotice,
    setShiftClosingNotice,
    cashCounted,
    setCashCounted,
    closingNotes,
    setClosingNotes,
    openingCashActual,
    setOpeningCashActual,
    openingNotes,
    setOpeningNotes,
    actualClosingFloat,
    setActualClosingFloat,
    envelopeNumber,
    setEnvelopeNumber,
    isOpeningShiftSubmitting,
    setIsOpeningShiftSubmitting,
    isCashMovementSubmitting,
    setIsCashMovementSubmitting,
    movementForm,
    setMovementForm,
    movementsList,
    setMovementsList,
    cashMovementModalOpen,
    setCashMovementModalOpen,
    canUseEndShift,
    visibleAttendanceTabs,
    html5QrCodeRef,
    scannerStartingRef,
    scannerHasDecodedRef,
    canClockIn,
    canClockOut,
    isCompletedToday,
    canSubmitShiftClosing,
    currentWorkingDuration,
    checkInWarning,
    scheduleWarning,
    historyDates,
    getResolvedShiftForDate,
    recentAttendanceDays,
    fetchPageData,
    loadShiftClosingData,
    stopQrScanner,
    startQrScanner,
    handleVerifyManualCode,
    handleAttendanceSubmit,
    handleShiftClosingSubmit,
    handleShiftOpeningSubmit,
    handleCashMovementSubmit,
    renderMobileTabset,
    renderMetricCard,
    renderStatusBadge
  } = useAttendanceData();

  const renderAbsencePanel = () => (
    <div className="w-full mx-auto py-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Greeting & Action Cards */}
        <div className="lg:col-span-5 space-y-5">
          {/* Greeting Header */}
          <div className="rounded-2xl bg-black p-6 text-white flex items-center justify-between animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">{staff?.name ?? "Staff"}</h2>
              <p className="text-xs text-blue-200/70 font-medium mt-0.5">
                {staff?.staff_code ?? "-"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md shrink-0">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>
          </div>

          {/* Roster & Actions Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5">
            <div className="flex items-center justify-between ">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-gray-600">Shift Roster</p>
                {staff?.shift ? (
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    Working hours: <span className="font-extrabold text-blue-900">{formatTime(staff.shift.start_time)} - {formatTime(staff.shift.end_time)}</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-rose-600 mt-0.5"></p>
                )}
              </div>
              {staff?.shift && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {staff.shift.shift_name}
                </span>
              )}
            </div>

            {/* Side-by-side Clock In/Out Action Panels */}
            <div className="grid grid-cols-2 gap-4">
              {/* Clock In */}
              <button
                type="button"
                onClick={() => {
                  if (canClockIn) {
                    void startQrScanner();
                  }
                }}
                disabled={!canClockIn || submitting}
                className={`rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-200 border-2 select-none outline-none ${
                  canClockIn
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500/10 text-white hover:scale-[1.02] active:scale-[0.98]"
                    : todayAttendance?.clock_in_at
                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                    : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                }`}
              >
                <div className={`p-3 rounded-xl mb-3 transition-colors ${
                  canClockIn ? "bg-white/20" : todayAttendance?.clock_in_at ? "bg-emerald-100/60 text-emerald-600" : "bg-gray-100"
                }`}>
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a14.815 14.815 0 002.812 8.685M9.984 8.485A3.75 3.75 0 0116.5 10.5c0 .979-.15 1.921-.428 2.806m-6.072 1.688A14.772 14.772 0 0012 19.5M12 6.75a3.75 3.75 0 00-3.75 3.75m0 0a11.22 11.22 0 002.593 7.02" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Clock In</p>
                {todayAttendance?.clock_in_at ? (
                  <p className="text-[11px] font-bold text-emerald-700 mt-1">
                    In: {formatTime(todayAttendance.clock_in_at.split(" ")[1] || todayAttendance.clock_in_at.split("T")[1])}
                  </p>
                ) : (
                  <p className={`text-[10px] mt-1 ${canClockIn ? "text-emerald-100 font-semibold" : "text-gray-400"}`}>
                    {canClockIn ? "Ready to Scan" : "Not available"}
                  </p>
                )}
              </button>

              {/* Clock Out */}
              <button
                type="button"
                onClick={() => {
                  if (canClockOut) {
                    void startQrScanner();
                  }
                }}
                disabled={!canClockOut || submitting}
                className={`rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-200 border-2 select-none outline-none ${
                  canClockOut
                    ? "bg-gradient-to-br from-rose-700 to-red-800 border-rose-900/10 text-white  hover:scale-[1.02] active:scale-[0.98]"
                    : todayAttendance?.clock_out_at
                    ? "bg-gray-50 border-gray-200 text-gray-400"
                    : todayAttendance?.clock_in_at
                    ? "bg-rose-50/50 border-rose-100 text-rose-800"
                    : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                }`}
              >
                <div className={`p-3 rounded-xl mb-3 transition-colors ${
                  canClockOut ? "bg-white/20" : todayAttendance?.clock_out_at ? "bg-gray-200" : todayAttendance?.clock_in_at ? "bg-rose-100/60 text-rose-600" : "bg-gray-100"
                }`}>
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a14.815 14.815 0 002.812 8.685M9.984 8.485A3.75 3.75 0 0116.5 10.5c0 .979-.15 1.921-.428 2.806m-6.072 1.688A14.772 14.772 0 0012 19.5M12 6.75a3.75 3.75 0 00-3.75 3.75m0 0a11.22 11.22 0 002.593 7.02" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Clock Out</p>
                {todayAttendance?.clock_out_at ? (
                  <p className="text-[11px] font-bold text-gray-500 mt-1">
                    Out: {formatTime(todayAttendance.clock_out_at.split(" ")[1] || todayAttendance.clock_out_at.split("T")[1])}
                  </p>
                ) : todayAttendance?.clock_in_at ? (
                  <p className="text-[10px] mt-1 text-white animate-pulse font-bold">
                    Ready to Clock Out
                  </p>
                ) : (
                  <p className="text-[10px] mt-1 text-gray-400">
                    Not active yet
                  </p>
                )}
              </button>
            </div>

            {/* QR Scan Status Banner inside Action Card */}
            {presenceCode.trim() ? (
              <div className={`rounded-xl border p-3.5 flex items-center justify-between text-xs font-semibold ${
                qrStatus === "verified"
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                  : qrStatus === "invalid"
                  ? "border-rose-200 bg-rose-50/50 text-rose-800"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    QR Status: {qrStatus === "verified" ? "Verified Outlet" : qrStatus === "invalid" ? "Invalid QR Code" : "Unscanned"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {qrStatus === "unscanned" && (
                    <span className="text-[9px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      Pending Verification
                    </span>
                  )}
                  {qrStatus === "verified" && (
                    <button
                      type="button"
                      onClick={() => void handleAttendanceSubmit()}
                      disabled={submitting}
                      className="text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg  transition-all"
                    >
                      {submitting ? "Submitting..." : "Submit Now"}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Grace & Schedule Warnings */}
            {(checkInWarning || scheduleWarning) && (
              <div className="space-y-2">
                {checkInWarning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 leading-normal">
                    {checkInWarning}
                  </div>
                )}
                {scheduleWarning && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 leading-normal">
                    {scheduleWarning}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location warning if not configured */}
          {(!storeSettings || storeSettings.store_latitude === null || storeSettings.store_longitude === null) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              Outlet GPS location coordinates are incomplete. Please ask the manager to complete configuration.
            </div>
          )}

          {codeError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 leading-normal">
              {codeError}
            </div>
          ) : null}

          {locationMessage ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800 leading-normal">
              {locationMessage}
            </div>
          ) : null}
        </div>

        {/* Right Column: Today's Presence Details & Inline History */}
        <div className="lg:col-span-7 space-y-5">
          {/* Today's Presence Details Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between  pb-3">
              <h3 className="text-sm font-bold text-gray-900">Today&apos;s Attendance</h3>
              <span className="text-xs text-gray-500 font-semibold">
                {getTodayFullDateString(today)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold">Clock In:</span>
                <span className="font-extrabold text-gray-950">
                  {todayAttendance?.clock_in_at
                    ? formatTime(todayAttendance.clock_in_at.split(" ")[1] || todayAttendance.clock_in_at.split("T")[1])
                    : "--:--:--"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold">Clock Out:</span>
                <span className="font-extrabold text-gray-950">
                  {todayAttendance?.clock_out_at
                    ? formatTime(todayAttendance.clock_out_at.split(" ")[1] || todayAttendance.clock_out_at.split("T")[1])
                    : "--:--:--"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold">Status:</span>
                <div>
                  {todayAttendance ? (
                    <div className="flex items-center gap-1.5">
                      {todayAttendance.clock_in_at && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          getStatusClassName(todayAttendance.check_in_status)
                        }`}>
                          In: {getStatusLabel(todayAttendance.check_in_status)}
                        </span>
                      )}
                      {todayAttendance.clock_out_at && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          getStatusClassName(todayAttendance.check_out_status)
                        }`}>
                          Out: {getStatusLabel(todayAttendance.check_out_status)}
                        </span>
                      )}
                      {!todayAttendance.clock_out_at && (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                          Working
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-bold text-gray-500">
                      Not Clocked In
                    </span>
                  )}
                </div>
              </div>

              {todayAttendance && (
                <div className="flex flex-col text-sm border-t border-gray-50 pt-3 space-y-1.5 mb-6">
                  <span className="text-gray-500 font-semibold">Details:</span>
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed space-y-1">
                    {canClockOut && currentWorkingDuration && (
                      <p className="font-semibold text-blue-800">
                        Current Duration: {currentWorkingDuration}
                      </p>
                    )}
                    {todayAttendance.clock_in_at && todayAttendance.clock_in_distance_meters !== undefined && (
                      <p>
                        Clock In Location: {formatDistance(todayAttendance.clock_in_distance_meters)} from outlet
                      </p>
                    )}
                    {todayAttendance.clock_out_at && todayAttendance.clock_out_distance_meters !== undefined && (
                      <p>
                        Clock Out Location: {formatDistance(todayAttendance.clock_out_distance_meters)} from outlet
                      </p>
                    )}
                    {todayAttendance.clock_in_at && todayAttendance.clock_out_at && (
                      <p className="font-semibold text-emerald-800">
                        Total Duration: {getDuration(todayAttendance.clock_in_at, todayAttendance.clock_out_at)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trigger button for History modal */}
          <div>
            <button
              type="button"
              onClick={() => setHistoryModalOpen(true)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700  transition hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Attendance History
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShiftClosingPanel = () => {
    if (shiftClosingLoading) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm font-semibold text-gray-500">
          Loading shift closing...
        </div>
      );
    }

    if (shiftClosingError && !shiftClosingData) {
      return (
        <div className={`rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
          {getSetupGuidance(shiftClosingError) || shiftClosingError || "Shift closing is not ready yet."}
        </div>
      );
    }

    if (!shiftClosingData) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm font-semibold text-gray-500">
          No shift data available.
        </div>
      );
    }

    const isShiftOpen = shiftClosingData.closing?.status === "open";
    const isShiftReopenable =
      shiftClosingData.closing?.status === "open" ||
      shiftClosingData.closing?.status === "needs_review" ||
      shiftClosingData.closing?.status === "reopened";

    // 1. Shift is not open yet (opening phase)
    if (!shiftClosingData.closing) {
      const expectedOpening = shiftClosingData.snapshot?.openingCash ?? 300000;
      return (
        <div className="grid gap-6 max-w-2xl mx-auto py-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6 shadow-sm text-left">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Open Shift</h2>
              <p className="mt-1 text-sm text-gray-500">Confirm the physical cash drawer float to open the shift.</p>
            </div>

            <div className={`rounded-xl border p-4 bg-blue-50 border-blue-100 ${OWNER_SEMANTIC_TONES.info.cardClass}`}>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-600">Expected Opening Float:</span>
                <span className="text-base font-bold text-gray-900">{formatCurrency(expectedOpening)}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                This is the actual closing float from the previous shift. Please count the drawer cash to verify it matches.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Actual Cash Counted (IDR)
                <input
                  type="number"
                  min="0"
                  value={openingCashActual}
                  onChange={(e) => setOpeningCashActual(e.target.value)}
                  placeholder="Enter counted cash in drawer"
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Opening Notes / Variance Reason
                <textarea
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  placeholder="Explain if the actual cash differs from the expected float."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </label>
            </div>

            {shiftClosingError && (
              <div className={`rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
                {shiftClosingError}
              </div>
            )}

            {shiftClosingNotice && (
              <div className={`rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.success.badgeClass}`}>
                {shiftClosingNotice}
              </div>
            )}

            <button
              type="button"
              onClick={handleShiftOpeningSubmit}
              disabled={isOpeningShiftSubmitting || !openingCashActual}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isOpeningShiftSubmitting ? "Opening Shift..." : "Open Active Shift"}
            </button>
          </div>
        </div>
      );
    }

    // 2. Active Shift or Submitted Summary
    const closing = shiftClosingData.closing;
    const snapshot = shiftClosingData.snapshot;

    return (
      <div className="grid gap-6 xl:grid-cols-12 text-left">
        {/* Left Column: Shift Information & Active Movements (Span 7) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Active Shift Information</h3>
                <p className="text-xs text-gray-500">Business Date: {shiftClosingData.businessDate}</p>
              </div>
              {renderStatusBadge(
                formatClosingStatus(closing?.status),
                getClosingStatusClassName(closing?.status),
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {renderMetricCard(
                "Shift",
                shiftClosingData.shift.shiftName,
                `${formatTime(shiftClosingData.shift.startTime)} - ${formatTime(shiftClosingData.shift.endTime)}`,
              )}
              {renderMetricCard(
                "Cashier",
                shiftClosingData.staff.name,
                `Code: ${shiftClosingData.staff.staffCode ?? "-"}`,
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs font-semibold text-gray-500">Opening Cash</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(closing?.openingCashActual ?? closing?.openingCash ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Gross Sales</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(closing?.grossSales ?? snapshot?.grossSales ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Net Sales</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(closing?.netSales ?? snapshot?.netSales ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Cash Sales (Paid)</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {closing?.cashExpected !== null && closing?.cashExpected !== undefined
                    ? formatCurrency(closing?.cashExpected ?? 0)
                    : formatCurrency(snapshot?.cashExpected ?? 0)}
                </p>
              </div>
            </div>

            {/* Quick Actions (only if shift is active) */}
            {isShiftOpen && (
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovementForm({ type: "cash_in", amount: "", reason: "" });
                    setCashMovementModalOpen(true);
                  }}
                  className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition hover:border-gray-900"
                >
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Cash In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovementForm({ type: "cash_out", amount: "", reason: "" });
                    setCashMovementModalOpen(true);
                  }}
                  className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition hover:border-gray-900"
                >
                  <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                  Cash Out
                </button>
              </div>
            )}
          </div>

          {/* Cash Movements Log */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">Shift Cash Movements</h3>
            {movementsList.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No cash movements recorded during this shift.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold">
                      <th className="py-2">Time</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 pl-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-semibold text-gray-700">
                    {movementsList.map((m: any) => {
                      const isPositive = m.type === "cash_in";
                      const isDrop = m.type === "cash_drop";
                      return (
                        <tr key={m.id}>
                          <td className="py-2.5 text-gray-500">{formatTime(m.created_at?.split("T")[1])}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                              isPositive
                                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                                : isDrop
                                ? "bg-blue-50 border-blue-100 text-blue-800"
                                : "bg-rose-50 border-rose-100 text-rose-800"
                            }`}>
                              {m.type === "cash_in" ? "Cash In" : m.type === "cash_drop" ? "Cash Drop" : "Cash Out"}
                            </span>
                          </td>
                          <td className={`py-2.5 text-right font-bold ${isPositive ? "text-emerald-700" : isDrop ? "text-blue-700" : "text-rose-700"}`}>
                            {isPositive ? "+" : "-"}{formatCurrency(m.amount)}
                          </td>
                          <td className="py-2.5 pl-4 text-gray-500 max-w-xs truncate">{m.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Handover / Submission Panel (Span 5) */}
        <div className="xl:col-span-5 space-y-6">
          {/* If the shift is open, show the cash submission input fields */}
          {isShiftReopenable ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-gray-900">Drawer Cash Count Submission</h3>
                <p className="mt-1 text-xs text-gray-500">Perform blind cash count first. Discrepancies will be flagged for review.</p>
              </div>

              {closing?.status === "needs_review" && closing?.notes && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 space-y-1">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Manager Notes / Correction:</span>
                  <p className="text-sm font-semibold text-rose-950 whitespace-pre-wrap">{closing.notes}</p>
                </div>
              )}

              {closing?.status === "reopened" && closing?.notes && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 space-y-1">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Owner Notes / Reopened Reason:</span>
                  <p className="text-sm font-semibold text-amber-950 whitespace-pre-wrap">{closing.notes}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="block text-sm font-semibold text-gray-700">
                  Envelope Number / Code
                  <div className="mt-2 flex h-11 w-full items-center rounded-lg border border-amber-200 bg-amber-50/50 px-4 text-sm font-bold text-amber-900 font-mono tracking-wider">
                    {envelopeNumber || "Generating code..."}
                  </div>
                  <p className="mt-1 text-xs text-amber-700 font-semibold">Please write this Code on your physical envelope before submitting.</p>
                </div>

                <label className="block text-sm font-semibold text-gray-700">
                  Total Cash Counted in Drawer (IDR)
                  <input
                    type="number"
                    min="0"
                    value={cashCounted}
                    onChange={(event) => setCashCounted(event.target.value)}
                    placeholder="Count and enter physical cash"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </label>

                <label className="block text-sm font-semibold text-gray-700">
                  Closing Float Left in Drawer (IDR)
                  <input
                    type="number"
                    min="0"
                    value={actualClosingFloat}
                    onChange={(event) => setActualClosingFloat(event.target.value)}
                    placeholder="Amount to keep in drawer for next shift"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Default standard float is {formatCurrency(300000)}.</span>
                </label>

                <label className="block text-sm font-semibold text-gray-700">
                  Shift Notes
                  <textarea
                    value={closingNotes}
                    onChange={(event) => setClosingNotes(event.target.value)}
                    placeholder="Optional details, required if there is any expected variance."
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </label>
              </div>

              {shiftClosingError && (
                <div className={`rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
                  {shiftClosingError}
                </div>
              )}

              {shiftClosingNotice && (
                <div className={`rounded-lg border p-4 text-sm ${OWNER_SEMANTIC_TONES.success.badgeClass}`}>
                  {shiftClosingNotice}
                </div>
              )}

              <button
                type="button"
                onClick={handleShiftClosingSubmit}
                disabled={!canSubmitShiftClosing || shiftClosingSubmitting}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {shiftClosingSubmitting ? "Submitting Closing..." : "Submit Shift Closing"}
              </button>
            </div>
          ) : (
            // Shift is ended/submitted (read-only mode)
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-gray-900">Closing Summary</h3>
                <p className="mt-1 text-xs text-gray-500">Submitted shift details (read-only).</p>
              </div>

              {closing?.snapshot_json?.envelopeNumber && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center space-y-1.5 shadow-sm">
                  <span className="text-xs text-amber-800 font-bold uppercase tracking-wider block">Write this code on your physical envelope:</span>
                  <div className="text-lg font-black text-amber-950 select-all font-mono tracking-wider">
                    {closing.snapshot_json.envelopeNumber}
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm font-semibold">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Envelope Number:</span>
                  <span className="text-gray-900 font-extrabold">{closing?.snapshot_json?.envelopeNumber || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Opening Variance:</span>
                  <span className={`font-extrabold ${(closing?.openingVariance ?? 0) < 0 ? "text-rose-600" : (closing?.openingVariance ?? 0) > 0 ? "text-emerald-600" : "text-gray-900"}`}>
                    {formatCurrency(closing?.openingVariance ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Opening Variance Note:</span>
                  <span className="text-gray-900 text-xs italic">{closing?.openingVarianceNote || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Expected Drawer Cash:</span>
                  <span className="text-gray-900 font-extrabold">{formatCurrency(closing?.expectedDrawerCash ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Actual Cash Counted:</span>
                  <span className="text-gray-900 font-extrabold">{formatCurrency(closing?.cashCounted ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Difference:</span>
                  <span className={`font-extrabold ${(closing?.cashDifference ?? 0) < 0 ? "text-rose-600" : (closing?.cashDifference ?? 0) > 0 ? "text-emerald-600" : "text-gray-900"}`}>
                    {formatCurrency(closing?.cashDifference ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Closing Float Kept:</span>
                  <span className="text-gray-900 font-extrabold">{formatCurrency(closing?.actualClosingFloat ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Cash to Deposit:</span>
                  <span className="text-gray-900 font-extrabold text-blue-700">{formatCurrency(closing?.cashToDeposit ?? 0)}</span>
                </div>
                <div className="flex flex-col pt-1">
                  <span className="text-gray-500">Closing Notes:</span>
                  <span className="text-gray-900 text-xs mt-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100 italic leading-relaxed">{closing?.notes || "-"}</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs font-semibold text-blue-800 leading-normal flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>This shift closing has been submitted. The manager will review the physical cash envelope and verify the final balance.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-white lg:h-[calc(100vh-56px)] lg:overflow-hidden">
      <div className="flex min-h-[calc(100dvh-56px)] lg:h-full lg:min-h-0">
          <SidebarTabset
            title="Staff Attendance"
            description="Daily absence and end-shift tasks."
            items={visibleAttendanceTabs}
            activeId={activeAttendanceTab}
            onSelect={setActiveAttendanceTab}
          />

          <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4 md:p-5">
              {renderMobileTabset()}
              {activeAttendanceTab === "absence" ? (
                renderAbsencePanel()
              ) : (
                renderShiftClosingPanel()
              )}
            </div>
          </section>


        {scannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white ">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Scan QR Attendance</h3>
                  <p className="text-sm text-gray-500">Point the camera at the attendance QR.</p>
                </div>

                <button
                  type="button"
                  onClick={() => void stopQrScanner()}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="p-5">
                <div className="relative min-h-80 overflow-hidden rounded-2xl bg-black">
                  <div id={QR_READER_ELEMENT_ID} className="min-h-80 w-full" />

                  {scannerLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                      <div className="text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                        <p className="mt-3 text-sm font-medium">Opening camera...</p>
                      </div>
                    </div>
                  )}
                </div>

                {scannerMessage && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {scannerMessage}
                  </div>
                )}



                {/* Manual Code Entry (Alternative) */}
                <div className="mt-5  pt-4 space-y-2 text-left">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Manual Code Entry (Alternative)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={presenceCode}
                      onChange={(event) => {
                        const val = event.target.value;
                        setPresenceCode(val);
                        setQrStatus("unscanned");
                        setCodeError("");
                      }}
                      placeholder="Enter outlet presence code"
                      className="h-10 flex-1 rounded-xl border border-gray-200 bg-white px-3 font-mono text-xs uppercase outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400 text-gray-900"
                      disabled={submitting}
                    />
                    {presenceCode.trim() && qrStatus !== "verified" && (
                      <button
                        type="button"
                        onClick={handleVerifyManualCode}
                        className="px-4 rounded-xl bg-gray-900 text-white text-xs font-bold transition hover:bg-gray-800"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {historyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white  flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Attendance History</h3>
                  <p className="text-xs text-gray-500">Filter and view past attendance records.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-5">
                {/* Original DateRangeFilter component */}
                <DateRangeFilter value={dateRange} onChange={setDateRange} />

                {/* Flat History List */}
                <div className="border border-gray-200 rounded-2xl p-5 bg-white space-y-4">
                  <div className="pb-3">
                    <h4 className="text-sm font-bold text-gray-900">Attendance Records</h4>
                  </div>

                  <div className="space-y-4 divide-y divide-gray-100">
                    {recentAttendanceDays.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <h5 className="mt-2 text-sm font-semibold text-gray-900">No Attendance History</h5>
                        <p className="mt-1 text-xs text-gray-500">No records found for the selected date range.</p>
                      </div>
                    ) : (
                      recentAttendanceDays.map(({ date, attendance, assignedShift }) => {
                        const isWorkingNow = attendance && attendance.clock_in_at && !attendance.clock_out_at;
                        return (
                          <div
                            key={date}
                            className="py-4 first:pt-0 last:pb-0 flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50/50 rounded-xl px-2 transition-all text-left"
                          >
                            {/* Column 1: Date & Shift (Span 4) */}
                            <div className="md:col-span-4 space-y-0.5">
                              <p className="font-bold text-gray-950 text-sm md:text-base">{formatDate(date)}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-600">
                                  {attendance?.shift?.shift_name ?? assignedShift?.shift_name ?? "No Shift Assigned"}
                                </span>
                                {(attendance?.shift?.shift_name || assignedShift?.shift_name) && (
                                  <span className="text-[10px] font-bold text-gray-400">
                                    ({formatTime(attendance?.shift?.start_time ?? assignedShift?.start_time)} - {formatTime(attendance?.shift?.end_time ?? assignedShift?.end_time)})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Column 2: Clock In details (Span 4) */}
                            <div className="md:col-span-4 mt-2 md:mt-0 space-y-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Clock In</span>
                              {attendance?.clock_in_at ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-900">
                                    {formatTime(attendance.clock_in_at.split(" ")[1] || attendance.clock_in_at.split("T")[1])}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                      getStatusClassName(attendance.check_in_status)
                                    }`}>
                                      {getStatusLabel(attendance.check_in_status)}
                                    </span>
                                    {attendance.clock_in_distance_meters !== null && (
                                      <span className="text-[10px] text-gray-500 font-semibold">
                                        {formatDistance(attendance.clock_in_distance_meters)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-400">-</p>
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold bg-rose-50 border-rose-200 text-rose-700">
                                    Absent
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Column 3: Clock Out & Duration details (Span 4) */}
                            <div className="md:col-span-4 mt-2 md:mt-0 space-y-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Clock Out</span>
                              {isWorkingNow ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 animate-pulse">
                                    Working
                                  </span>
                                  <p className="text-[11px] font-semibold text-blue-800">
                                    {currentWorkingDuration ? `Current Duration: ${currentWorkingDuration}` : "Current Duration: --"}
                                  </p>
                                </div>
                              ) : attendance?.clock_out_at ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-900">
                                    {formatTime(attendance.clock_out_at.split(" ")[1] || attendance.clock_out_at.split("T")[1])}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                      getStatusClassName(attendance.check_out_status)
                                    }`}>
                                      {getStatusLabel(attendance.check_out_status)}
                                    </span>
                                    {attendance.clock_out_distance_meters !== null && (
                                      <span className="text-[10px] text-gray-500 font-semibold">
                                        {formatDistance(attendance.clock_out_distance_meters)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 font-semibold mt-1">
                                    Duration: {getDuration(attendance.clock_in_at, attendance.clock_out_at)}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-gray-400">-</p>
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold bg-gray-50 border-gray-200 text-gray-600">
                                    Not Clocked Out
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {cashMovementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in text-left">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Record Cash Movement</h3>
                  <p className="text-xs text-gray-500">Log cash added or removed from the drawer.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCashMovementModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-semibold">Movement Type</label>
                  <select
                    value={movementForm.type}
                    onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900 text-gray-900"
                  >
                    <option value="cash_in">Cash In (Float Addition)</option>
                    <option value="cash_out">Cash Out (Expense / Paid Out)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-semibold">Amount (IDR)</label>
                  <input
                    type="number"
                    min="1"
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-semibold">Reason / Description</label>
                  <input
                    type="text"
                    value={movementForm.reason}
                    onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                    placeholder="e.g. Paid supplier, additional change"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-900 text-gray-900"
                  />
                </div>

                {shiftClosingError && (
                  <div className={`rounded-lg border p-4 text-xs ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
                    {shiftClosingError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCashMovementSubmit}
                  disabled={isCashMovementSubmitting || !movementForm.amount || !movementForm.reason}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {isCashMovementSubmitting ? "Recording..." : "Record Movement"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
