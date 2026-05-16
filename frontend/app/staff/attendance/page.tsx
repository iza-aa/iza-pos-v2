"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  MapPinIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

type CheckInStatus = "early" | "on_time" | "late" | null;
type CheckOutStatus = "early_leave" | "on_time" | "overtime" | null;

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
};

type StaffRecord = {
  id: string;
  staff_code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  staff_type?: string | null;
  status: string;
  shift_id?: string | null;
  shift?: ShiftRecord | null;
};

type AttendanceRecord = {
  id: string;
  staff_id: string;
  shift_id: string | null;
  attendance_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  check_in_status: CheckInStatus;
  check_out_status: CheckOutStatus;
  clock_in_distance_meters?: number | string | null;
  clock_out_distance_meters?: number | string | null;
  late_reason?: string | null;
  early_leave_reason?: string | null;
  overtime_reason?: string | null;
  notes?: string | null;
  shift?: ShiftRecord | null;
};

type StoreSettings = {
  id: string;
  store_name: string;
  store_latitude: number | null;
  store_longitude: number | null;
  attendance_radius_meters: number;
  is_active: boolean;
};


type Html5QrcodeConfig = {
  fps?: number;
  qrbox?: { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
};

type Html5QrcodeInstance = {
  start: (
    cameraConfig: { facingMode: "environment" | "user" } | string,
    config: Html5QrcodeConfig,
    onScanSuccess: (decodedText: string) => void,
    onScanFailure?: (errorMessage: string) => void,
  ) => Promise<void | null>;
  stop: () => Promise<void>;
  clear: () => void;
};

type Html5QrcodeConstructor = new (elementId: string) => Html5QrcodeInstance;

type RawRelationValue = Record<string, unknown> | Record<string, unknown>[] | null;

const QR_READER_ELEMENT_ID = "staff-attendance-qr-reader";

const toSafeString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

const toNullableString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value : null;
};

const getSingleRelation = <T extends Record<string, unknown>>(
  value: unknown,
): T | null => {
  if (!value) return null;

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (
      firstValue &&
      typeof firstValue === "object" &&
      !Array.isArray(firstValue)
    ) {
      return firstValue as T;
    }

    return null;
  }

  if (typeof value === "object") {
    return value as T;
  }

  return null;
};

const normalizeShift = (value: RawRelationValue | unknown): ShiftRecord | null => {
  const shift = getSingleRelation<Record<string, unknown>>(value);

  if (!shift) return null;

  const id = toSafeString(shift.id);
  const shiftName = toSafeString(shift.shift_name);

  if (!id || !shiftName) return null;

  return {
    id,
    shift_name: shiftName,
    start_time: toSafeString(shift.start_time),
    check_in_grace_until: toSafeString(shift.check_in_grace_until),
    end_time: toSafeString(shift.end_time),
    check_out_grace_until: toSafeString(shift.check_out_grace_until),
  };
};

const normalizeStaff = (rawStaff: Record<string, unknown>): StaffRecord => {
  return {
    id: toSafeString(rawStaff.id),
    staff_code: toSafeString(rawStaff.staff_code),
    name: toSafeString(rawStaff.name),
    email: toNullableString(rawStaff.email),
    phone: toNullableString(rawStaff.phone),
    role: toSafeString(rawStaff.role),
    staff_type: toNullableString(rawStaff.staff_type),
    status: toSafeString(rawStaff.status),
    shift_id: toNullableString(rawStaff.shift_id),
    shift: normalizeShift(rawStaff.shift),
  };
};

const normalizeCheckInStatus = (value: unknown): CheckInStatus => {
  if (value === "early") return "early";
  if (value === "on_time") return "on_time";
  if (value === "late") return "late";
  return null;
};

const normalizeCheckOutStatus = (value: unknown): CheckOutStatus => {
  if (value === "early_leave") return "early_leave";
  if (value === "on_time") return "on_time";
  if (value === "overtime") return "overtime";
  return null;
};

const normalizeAttendance = (
  rawAttendance: Record<string, unknown>,
): AttendanceRecord => {
  return {
    id: toSafeString(rawAttendance.id),
    staff_id: toSafeString(rawAttendance.staff_id),
    shift_id: toNullableString(rawAttendance.shift_id),
    attendance_date: toSafeString(rawAttendance.attendance_date),
    clock_in_at: toNullableString(rawAttendance.clock_in_at),
    clock_out_at: toNullableString(rawAttendance.clock_out_at),
    check_in_status: normalizeCheckInStatus(rawAttendance.check_in_status),
    check_out_status: normalizeCheckOutStatus(rawAttendance.check_out_status),
    clock_in_distance_meters:
      typeof rawAttendance.clock_in_distance_meters === "number" ||
      typeof rawAttendance.clock_in_distance_meters === "string"
        ? rawAttendance.clock_in_distance_meters
        : null,
    clock_out_distance_meters:
      typeof rawAttendance.clock_out_distance_meters === "number" ||
      typeof rawAttendance.clock_out_distance_meters === "string"
        ? rawAttendance.clock_out_distance_meters
        : null,
    late_reason: toNullableString(rawAttendance.late_reason),
    early_leave_reason: toNullableString(rawAttendance.early_leave_reason),
    overtime_reason: toNullableString(rawAttendance.overtime_reason),
    notes: toNullableString(rawAttendance.notes),
    shift: normalizeShift(rawAttendance.shift),
  };
};

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getStatusLabel = (status?: CheckInStatus | CheckOutStatus) => {
  if (status === "early") return "Datang Lebih Awal";
  if (status === "late") return "Terlambat";
  if (status === "early_leave") return "Pulang Lebih Awal";
  if (status === "overtime") return "Lembur";
  if (status === "on_time") return "Tepat Waktu";
  return "Belum Ada";
};

const getStatusClassName = (status?: CheckInStatus | CheckOutStatus) => {
  if (status === "late") return "bg-red-100 text-red-700";
  if (status === "early_leave") return "bg-orange-100 text-orange-700";
  if (status === "overtime") return "bg-purple-100 text-purple-700";
  if (status === "early") return "bg-blue-100 text-blue-700";
  if (status === "on_time") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
};

const getCurrentLocation = () => {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser tidak mendukung akses lokasi."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";
  return value.slice(0, 5);
};

const formatDistance = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "-";

  const distance = Number(value);

  if (Number.isNaN(distance)) return "-";

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`;
  }

  return `${Math.round(distance)} m`;
};

const getDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "-";

  const startDate = new Date(start.includes("T") ? start : start.replace(" ", "T"));
  const endDate = new Date(end.includes("T") ? end : end.replace(" ", "T"));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const hour = Math.floor(diffMs / 3600000);
  const minute = Math.floor((diffMs % 3600000) / 60000);

  return `${hour}j ${minute}m`;
};

const extractPresenceCodeFromQrText = (text: string) => {
  const trimmedText = text.trim();

  if (!trimmedText) return "";

  try {
    const url = new URL(trimmedText);
    const code = url.searchParams.get("code");

    if (code) {
      return code.trim();
    }
  } catch {
    // QR may contain only the raw code, not a full URL.
  }

  const codeMatch = trimmedText.match(/[?&]code=([^&]+)/i);

  if (codeMatch?.[1]) {
    return decodeURIComponent(codeMatch[1]).trim();
  }

  return trimmedText.trim();
};

const getScannerErrorMessage = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (/permission|notallowed|denied/i.test(errorMessage)) {
    return "Akses kamera ditolak. Aktifkan izin kamera lalu coba lagi.";
  }

  if (/notfound|not found|overconstrained/i.test(errorMessage)) {
    return "Kamera tidak ditemukan. Pastikan perangkat memiliki kamera dan izin kamera aktif.";
  }

  if (/notreadable|trackstart|in use/i.test(errorMessage)) {
    return "Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  }

  return "Gagal membuka scanner QR. Periksa izin kamera lalu coba lagi.";
};

export default function AttendancePage() {
  useSessionValidation();

  const currentUser = getCurrentUser();
  const userId = currentUser?.id ?? null;

  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(
    null,
  );
  const [presenceCode, setPresenceCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const html5QrCodeRef = useRef<Html5QrcodeInstance | null>(null);
  const scannerStartingRef = useRef(false);
  const scannerHasDecodedRef = useRef(false);

  const today = useMemo(() => getTodayDateString(), []);

  const canClockIn = !todayAttendance;
  const canClockOut = todayAttendance && !todayAttendance.clock_out_at;
  const isCompletedToday = todayAttendance && todayAttendance.clock_out_at;

  const fetchPageData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [staffResult, storeResult, attendanceResult] = await Promise.all([
        supabase
          .from("staff")
          .select(
            `
              id,
              staff_code,
              name,
              email,
              phone,
              role,
              staff_type,
              status,
              shift_id,
              shift:staff_shift_id_fkey (
                id,
                shift_name,
                start_time,
                check_in_grace_until,
                end_time,
                check_out_grace_until
              )
            `,
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("store_settings")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("attendance")
          .select(
            `
              id,
              staff_id,
              shift_id,
              attendance_date,
              clock_in_at,
              clock_out_at,
              check_in_status,
              check_out_status,
              clock_in_distance_meters,
              clock_out_distance_meters,
              late_reason,
              early_leave_reason,
              overtime_reason,
              notes,
              shift:attendance_shift_id_fkey (
                id,
                shift_name,
                start_time,
                check_in_grace_until,
                end_time,
                check_out_grace_until
              )
            `,
          )
          .eq("staff_id", userId)
          .order("attendance_date", { ascending: false })
          .order("clock_in_at", { ascending: false, nullsFirst: false })
          .limit(30),
      ]);

      if (staffResult.error) throw staffResult.error;
      if (storeResult.error) throw storeResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      if (staffResult.data) {
        setStaff(normalizeStaff(staffResult.data as Record<string, unknown>));
      } else {
        setStaff(null);
      }

      setStoreSettings((storeResult.data ?? null) as StoreSettings | null);

      const normalizedAttendanceList = (
        (attendanceResult.data ?? []) as Record<string, unknown>[]
      )
        .map(normalizeAttendance)
        .filter((attendance) => attendance.id);

      setAttendanceList(normalizedAttendanceList);

      const todayRecord = normalizedAttendanceList.find(
        (attendance) => attendance.attendance_date === today,
      );

      setTodayAttendance(todayRecord ?? null);
    } catch (error) {
      console.error("Failed to fetch staff attendance page data:", error);
      showError("Gagal mengambil data absensi staff.");
    } finally {
      setLoading(false);
    }
  }, [today, userId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const stopQrScanner = useCallback(async () => {
    scannerHasDecodedRef.current = false;
    scannerStartingRef.current = false;

    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.warn("Scanner was not running or failed to stop:", error);
      }

      try {
        html5QrCodeRef.current.clear();
      } catch (error) {
        console.warn("Failed to clear QR scanner:", error);
      }

      html5QrCodeRef.current = null;
    }

    setScannerOpen(false);
    setScannerLoading(false);
  }, []);

  const startQrScanner = useCallback(async () => {
    if (scannerStartingRef.current) return;

    setCodeError("");
    setScannerMessage("");
    setScannerOpen(true);
    setScannerLoading(true);
    scannerStartingRef.current = true;
    scannerHasDecodedRef.current = false;

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150);
    });

    try {
      const html5QrcodeModule = await import("html5-qrcode");
      const Html5Qrcode = html5QrcodeModule.Html5Qrcode as unknown as Html5QrcodeConstructor;
      const scannerInstance = new Html5Qrcode(QR_READER_ELEMENT_ID);

      html5QrCodeRef.current = scannerInstance;

      await scannerInstance.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          disableFlip: true,
        },
        (decodedText: string) => {
          if (scannerHasDecodedRef.current) return;

          const scannedCode = extractPresenceCodeFromQrText(decodedText);

          if (!scannedCode) return;

          scannerHasDecodedRef.current = true;
          setPresenceCode(scannedCode);
          setCodeError("");
          setScannerMessage("QR berhasil terbaca. Silakan lanjutkan presensi.");

          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          void stopQrScanner();
        },
      );

      setScannerLoading(false);
      setScannerMessage("Arahkan kamera ke QR presensi yang tersedia di outlet.");
    } catch (error) {
      console.error("Failed to open html5-qrcode scanner:", error);
      setScannerLoading(false);
      setScannerMessage(getScannerErrorMessage(error));
      scannerStartingRef.current = false;
    }
  }, [stopQrScanner]);

  useEffect(() => {
    return () => {
      void stopQrScanner();
    };
  }, [stopQrScanner]);

  const handleAttendanceSubmit = async () => {
    setCodeError("");
    setLocationMessage("");

    if (!userId) {
      showError("Session staff tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (!staff) {
      showError("Data staff tidak ditemukan.");
      return;
    }

    if (staff.status !== "active") {
      showError("Akun staff tidak aktif dan tidak bisa melakukan absensi.");
      return;
    }

    if (!staff.staff_code) {
      showError("Kode staff tidak ditemukan. Hubungi owner/manager.");
      return;
    }

    if (!staff.shift_id || !staff.shift) {
      showError("Staff belum memiliki shift kerja. Hubungi owner/manager.");
      return;
    }

    if (isCompletedToday) {
      showError("Absensi hari ini sudah lengkap.");
      return;
    }

    const normalizedCode = presenceCode.trim();

    if (!normalizedCode) {
      const message = "Scan QR presensi terlebih dahulu.";
      setCodeError(message);
      showError(message);
      return;
    }

    setSubmitting(true);

    try {
      setLocationMessage("Memeriksa lokasi Anda...");

      const position = await getCurrentLocation();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null;

      setLocationMessage("Lokasi berhasil dibaca. Memproses absensi...");

      const { data, error } = await supabase.rpc("submit_qr_attendance", {
        p_code: normalizedCode,
        p_credential: staff.staff_code,
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy: accuracy,
      });

      if (error) throw error;

      const result = data as {
        success?: boolean;
        title?: string;
        message?: string;
        statusLabel?: string;
        distanceMeters?: number | string | null;
      } | null;

      if (!result?.success) {
        throw new Error("Absensi gagal diproses. Silakan scan QR terbaru.");
      }

      setPresenceCode("");
      setLocationMessage("");
      await fetchPageData();

      const successMessage = result.statusLabel
        ? `${result.title ?? "Absensi berhasil"}. Status: ${result.statusLabel}.`
        : result.message ?? "Absensi berhasil.";

      showSuccess(successMessage);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Gagal melakukan absensi.";
      const message = rawMessage.replace(/^ERROR:\s*/i, "");

      setCodeError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentActionLabel = canClockIn
    ? "Clock In"
    : canClockOut
      ? "Clock Out"
      : "Absensi Selesai";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Memuat data absensi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Absensi Staff
            </h1>
            <p className="mt-1 text-sm text-gray-600 md:text-base">
              Lakukan presensi dengan QR resmi yang tersedia di outlet.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm">
            <p className="font-semibold text-gray-900">{formatDate(today)}</p>
            <p className="text-gray-500">Presensi terverifikasi</p>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 py-4 md:px-6">
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-white">
                <ClockIcon className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {staff?.name ?? "Staff"}
                </h2>
                <p className="text-sm text-gray-500">
                  {staff?.staff_code ?? "-"} • {staff?.staff_type ?? staff?.role ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Shift Kerja
              </p>

              {staff?.shift ? (
                <div className="mt-2">
                  <p className="text-lg font-bold text-gray-900">
                    {staff.shift.shift_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatTime(staff.shift.start_time)} - {formatTime(staff.shift.end_time)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-gray-500">Masuk tepat waktu</p>
                      <p className="font-semibold text-gray-900">
                        {formatTime(staff.shift.start_time)} - {formatTime(staff.shift.check_in_grace_until)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-gray-500">Pulang tepat waktu</p>
                      <p className="font-semibold text-gray-900">
                        {formatTime(staff.shift.end_time)} - {formatTime(staff.shift.check_out_grace_until)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-red-600">
                  Staff belum memiliki shift kerja.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status Hari Ini
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {currentActionLabel}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isCompletedToday
                      ? "bg-green-100 text-green-700"
                      : canClockOut
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {isCompletedToday
                    ? "Selesai"
                    : canClockOut
                      ? "Sudah Clock In"
                      : "Belum Clock In"}
                </span>
              </div>

              {todayAttendance && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Clock In</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDateTime(todayAttendance.clock_in_at)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                        todayAttendance.check_in_status,
                      )}`}
                    >
                      {getStatusLabel(todayAttendance.check_in_status)}
                    </span>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Clock Out</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDateTime(todayAttendance.clock_out_at)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                        todayAttendance.check_out_status,
                      )}`}
                    >
                      {getStatusLabel(todayAttendance.check_out_status)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2.5">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Presensi QR
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Scan QR resmi di outlet untuk mencatat kehadiran.
                </p>
              </div>

              <button
                type="button"
                onClick={startQrScanner}
                disabled={submitting || Boolean(isCompletedToday)}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buka Kamera
              </button>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  value={presenceCode}
                  onChange={(event) => {
                    setPresenceCode(event.target.value.trim());
                    setCodeError("");
                  }}
                  placeholder="Kode QR"
                  className="h-11 min-w-0 rounded-xl border border-gray-300 px-4 font-mono text-sm uppercase outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  disabled={submitting || Boolean(isCompletedToday)}
                />

                <button
                  type="button"
                  onClick={handleAttendanceSubmit}
                  disabled={
                    submitting ||
                    Boolean(isCompletedToday) ||
                    !presenceCode.trim() ||
                    !staff?.shift
                  }
                  className="h-11 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Memproses..." : currentActionLabel}
                </button>
              </div>

              {codeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {codeError}
                </div>
              )}

              {locationMessage && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {locationMessage}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Pastikan Anda berada di area outlet saat melakukan presensi.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <KeyIcon className="h-6 w-6 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Metode</p>
                    <p className="font-bold text-gray-900">QR Presensi</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-6 w-6 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Radius</p>
                    <p className="font-bold text-gray-900">
                      {storeSettings?.attendance_radius_meters ?? 0} m
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <QrCodeIcon className="h-6 w-6 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-bold text-gray-900">
                      {isCompletedToday ? "Selesai" : "Siap Absen"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Riwayat Absensi
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Riwayat presensi staff terbaru.
              </p>

              <div className="mt-4 space-y-3 xl:max-h-[calc(100vh-370px)] xl:overflow-y-auto xl:pr-1">
                {attendanceList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    Belum ada riwayat absensi.
                  </div>
                ) : (
                  attendanceList.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-bold text-gray-900">
                            {formatDate(attendance.attendance_date)}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {attendance.shift?.shift_name ?? "Tanpa Shift"}
                          </p>
                        </div>

                        <div className="text-sm text-gray-600 lg:text-right">
                          <p>
                            Durasi: {getDuration(attendance.clock_in_at, attendance.clock_out_at)}
                          </p>
                          <p>
                            Jarak in: {formatDistance(attendance.clock_in_distance_meters)}
                          </p>
                          <p>
                            Jarak out: {formatDistance(attendance.clock_out_distance_meters)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Clock In</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatDateTime(attendance.clock_in_at)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              attendance.check_in_status,
                            )}`}
                          >
                            {getStatusLabel(attendance.check_in_status)}
                          </span>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Clock Out</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatDateTime(attendance.clock_out_at)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              attendance.check_out_status,
                            )}`}
                          >
                            {getStatusLabel(attendance.check_out_status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {scannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Scan QR Presensi</h3>
                  <p className="text-sm text-gray-500">Arahkan kamera ke QR presensi.</p>
                </div>

                <button
                  type="button"
                  onClick={() => void stopQrScanner()}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Tutup
                </button>
              </div>

              <div className="p-5">
                <div className="relative min-h-80 overflow-hidden rounded-2xl bg-black">
                  <div id={QR_READER_ELEMENT_ID} className="min-h-80 w-full" />

                  {scannerLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                      <div className="text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                        <p className="mt-3 text-sm font-medium">Membuka kamera...</p>
                      </div>
                    </div>
                  )}
                </div>

                {scannerMessage && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {scannerMessage}
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-500">
                  Pastikan izin kamera aktif sebelum melakukan scan.
                </p>
              </div>
            </div>
          </div>
        )}

        {!storeSettings?.store_latitude || !storeSettings?.store_longitude ? (
          <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <p>
                Lokasi outlet belum lengkap. Lengkapi pengaturan lokasi dan radius presensi terlebih dahulu.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}