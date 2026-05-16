"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { supabase } from "@/lib/config/supabaseClient";
import { showSuccess, showError } from "@/lib/services/errorHandling";
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

type PresenceCode = {
  id: string;
  code: string;
  expires_at: string;
  used_count?: number | null;
  is_active?: boolean | null;
  attendance_date?: string | null;
};

type RawRelationValue = Record<string, unknown> | Record<string, unknown>[] | null;


type BarcodeDetectorBarcode = {
  rawValue: string;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorBarcode[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

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

const getLocalTimestampForDb = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const timeToMinutes = (timeValue: string) => {
  const [hour = "0", minute = "0"] = timeValue.split(":");
  return Number(hour) * 60 + Number(minute);
};

const getNowMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const getCheckInStatus = (shift: ShiftRecord): Exclude<CheckInStatus, null> => {
  const nowMinutes = getNowMinutes();
  const startMinutes = timeToMinutes(shift.start_time);
  const graceMinutes = timeToMinutes(shift.check_in_grace_until);

  if (nowMinutes < startMinutes) return "early";
  if (nowMinutes <= graceMinutes) return "on_time";
  return "late";
};

const getCheckOutStatus = (
  shift: ShiftRecord,
): Exclude<CheckOutStatus, null> => {
  const nowMinutes = getNowMinutes();
  const endMinutes = timeToMinutes(shift.end_time);
  const graceMinutes = timeToMinutes(shift.check_out_grace_until);

  if (nowMinutes < endMinutes) return "early_leave";
  if (nowMinutes <= graceMinutes) return "on_time";
  return "overtime";
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

const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
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

const generateRandomCode = () => {
  return Math.random().toString(36).slice(2, 12).toUpperCase();
};


const extractPresenceCodeFromQrText = (text: string) => {
  const trimmedText = text.trim();

  if (!trimmedText) return "";

  try {
    const url = new URL(trimmedText);
    const code = url.searchParams.get("code");

    if (code) {
      return code.trim().toUpperCase();
    }
  } catch {
    // QR may contain only the raw code, not a full URL.
  }

  const codeMatch = trimmedText.match(/[?&]code=([^&]+)/i);

  if (codeMatch?.[1]) {
    return decodeURIComponent(codeMatch[1]).trim().toUpperCase();
  }

  return trimmedText.trim().toUpperCase();
};

const createNextPresenceCode = async () => {
  const tomorrow = new Date();
  tomorrow.setMinutes(tomorrow.getMinutes() + 1);

  const expiresAt = `${tomorrow.getFullYear()}-${String(
    tomorrow.getMonth() + 1,
  ).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")} ${String(
    tomorrow.getHours(),
  ).padStart(2, "0")}:${String(tomorrow.getMinutes()).padStart(2, "0")}:${String(
    tomorrow.getSeconds(),
  ).padStart(2, "0")}`;

  await supabase.from("presence_code").insert({
    code: generateRandomCode(),
    expires_at: expiresAt,
    attendance_date: getTodayDateString(),
    is_active: true,
    used_count: 0,
  });
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerTimeoutRef = useRef<number | null>(null);
  const scannerActiveRef = useRef(false);

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

  const stopQrScanner = useCallback(() => {
    scannerActiveRef.current = false;

    if (scannerTimeoutRef.current !== null) {
      window.clearTimeout(scannerTimeoutRef.current);
      scannerTimeoutRef.current = null;
    }

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScannerOpen(false);
    setScannerLoading(false);
  }, []);

  const scanCurrentVideoFrame = useCallback(async () => {
    if (!scannerActiveRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !window.BarcodeDetector) {
      scannerTimeoutRef.current = window.setTimeout(scanCurrentVideoFrame, 500);
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      scannerTimeoutRef.current = window.setTimeout(scanCurrentVideoFrame, 300);
      return;
    }

    try {
      const canvasContext = canvas.getContext("2d");

      if (!canvasContext) {
        scannerTimeoutRef.current = window.setTimeout(scanCurrentVideoFrame, 500);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const barcodes = await detector.detect(canvas);
      const rawQrValue = barcodes[0]?.rawValue ?? "";
      const scannedCode = extractPresenceCodeFromQrText(rawQrValue);

      if (scannedCode) {
        setPresenceCode(scannedCode);
        setCodeError("");
        setScannerMessage(`Kode QR terbaca: ${scannedCode}`);
        stopQrScanner();
        return;
      }
    } catch (error) {
      console.error("QR scan error:", error);
    }

    scannerTimeoutRef.current = window.setTimeout(scanCurrentVideoFrame, 500);
  }, [stopQrScanner]);

  const startQrScanner = useCallback(async () => {
    setCodeError("");
    setScannerMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerOpen(true);
      setScannerMessage(
        "Browser tidak mendukung akses kamera. Gunakan kamera bawaan HP untuk scan QR, lalu salin kode dari URL.",
      );
      return;
    }

    if (!window.BarcodeDetector) {
      setScannerOpen(true);
      setScannerMessage(
        "Browser ini belum mendukung pembaca QR otomatis. Gunakan kamera bawaan HP untuk scan QR, lalu salin kode dari URL ke input manual.",
      );
      return;
    }

    setScannerOpen(true);
    setScannerLoading(true);
    scannerActiveRef.current = true;

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (exactEnvironmentError) {
        console.warn(
          "Kamera belakang exact tidak tersedia, mencoba kamera belakang ideal.",
          exactEnvironmentError,
        );

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      }

      scannerStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScannerLoading(false);
      setScannerMessage("Arahkan kamera belakang ke QR live di layar kasir.");
      scannerTimeoutRef.current = window.setTimeout(scanCurrentVideoFrame, 350);
    } catch (error) {
      console.error("Failed to open rear camera:", error);
      scannerActiveRef.current = false;
      setScannerLoading(false);
      setScannerMessage(
        "Gagal membuka kamera belakang. Pastikan izin kamera diberikan, halaman dibuka lewat HTTPS, dan browser mendukung kamera belakang.",
      );
    }
  }, [scanCurrentVideoFrame]);

  useEffect(() => {
    return () => {
      scannerActiveRef.current = false;

      if (scannerTimeoutRef.current !== null) {
        window.clearTimeout(scannerTimeoutRef.current);
      }

      if (scannerStreamRef.current) {
        scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const validatePresenceCode = async () => {
    const normalizedCode = presenceCode.trim().toUpperCase();

    if (!normalizedCode) {
      throw new Error("Masukkan kode QR presensi terlebih dahulu.");
    }

    const { data, error } = await supabase
      .from("presence_code")
      .select("id, code, expires_at, used_count, is_active, attendance_date")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .eq("attendance_date", today)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("Kode QR tidak valid atau sudah tidak aktif.");
    }

    const presenceCodeData = data as PresenceCode;
    const expiresAt = new Date(
      presenceCodeData.expires_at.includes("T")
        ? presenceCodeData.expires_at
        : presenceCodeData.expires_at.replace(" ", "T"),
    );

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      throw new Error("Kode QR sudah expired. Scan QR terbaru di layar kasir.");
    }

    return presenceCodeData;
  };

  const validateLocation = async () => {
    if (!storeSettings) {
      throw new Error("Lokasi cafe belum diset oleh owner.");
    }

    if (
      storeSettings.store_latitude === null ||
      storeSettings.store_longitude === null
    ) {
      throw new Error("Latitude dan longitude cafe belum diset oleh owner.");
    }

    setLocationMessage("Meminta akses lokasi device...");

    const position = await getCurrentLocation();
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const distance = calculateDistanceMeters(
      latitude,
      longitude,
      storeSettings.store_latitude,
      storeSettings.store_longitude,
    );

    const allowedRadius = storeSettings.attendance_radius_meters || 150;

    if (distance > allowedRadius) {
      throw new Error(
        `Lokasi Anda di luar radius absensi. Jarak saat ini ${Math.round(
          distance,
        )} m, radius maksimal ${allowedRadius} m.`,
      );
    }

    setLocationMessage(
      `Lokasi valid. Jarak dari cafe sekitar ${Math.round(distance)} m.`,
    );

    return {
      latitude,
      longitude,
      distance,
    };
  };

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

    if (!staff.shift_id || !staff.shift) {
      showError("Staff belum memiliki shift kerja. Hubungi owner/manager.");
      return;
    }

    if (isCompletedToday) {
      showError("Absensi hari ini sudah lengkap.");
      return;
    }

    setSubmitting(true);

    try {
      const codeData = await validatePresenceCode();
      const location = await validateLocation();
      const nowTimestamp = getLocalTimestampForDb();
      let actionLabel = "";
      let statusLabel = "";

      if (!todayAttendance) {
        const checkInStatus = getCheckInStatus(staff.shift);

        const { error } = await supabase.from("attendance").insert({
          staff_id: staff.id,
          shift_id: staff.shift_id,
          presence_code_id: codeData.id,
          attendance_date: today,
          clock_in_at: nowTimestamp,
          clock_in_latitude: location.latitude,
          clock_in_longitude: location.longitude,
          clock_in_distance_meters: Number(location.distance.toFixed(2)),
          clock_in_method: "manual_code",
          check_in_status: checkInStatus,
          notes: `Clock in dari halaman login staff dengan kode ${codeData.code}`,
        });

        if (error) throw error;

        actionLabel = "Clock in";
        statusLabel = getStatusLabel(checkInStatus);
      } else if (!todayAttendance.clock_out_at) {
        const checkOutStatus = getCheckOutStatus(staff.shift);

        const { error } = await supabase
          .from("attendance")
          .update({
            clock_out_at: nowTimestamp,
            clock_out_latitude: location.latitude,
            clock_out_longitude: location.longitude,
            clock_out_distance_meters: Number(location.distance.toFixed(2)),
            clock_out_method: "manual_code",
            check_out_status: checkOutStatus,
            notes: todayAttendance.notes
              ? `${todayAttendance.notes} | Clock out dengan kode ${codeData.code}`
              : `Clock out dari halaman login staff dengan kode ${codeData.code}`,
            updated_at: nowTimestamp,
          })
          .eq("id", todayAttendance.id);

        if (error) throw error;

        actionLabel = "Clock out";
        statusLabel = getStatusLabel(checkOutStatus);
      }

      await supabase
        .from("presence_code")
        .update({
          used_count: (codeData.used_count ?? 0) + 1,
          is_active: false,
        })
        .eq("id", codeData.id);

      await createNextPresenceCode();

      setPresenceCode("");
      await fetchPageData();
      showSuccess(`${actionLabel} berhasil. Status: ${statusLabel}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal melakukan absensi.";

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
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto ">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Absensi Staff
            </h1>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              Test clock in dan clock out dari akun staff yang sedang login.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <p className="font-semibold text-gray-900">
              {formatDate(today)}
            </p>
            <p className="text-gray-500">Validasi QR + lokasi + shift</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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

            <div className="mt-6 rounded-2xl bg-gray-50 p-4">
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

            <div className="mt-6 rounded-2xl border border-gray-200 p-4">
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

            <div className="mt-6 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Kode QR Presensi
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
                <button
                  type="button"
                  onClick={startQrScanner}
                  disabled={submitting || Boolean(isCompletedToday)}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Buka Kamera
                </button>

                <input
                  type="text"
                  value={presenceCode}
                  onChange={(event) => {
                    setPresenceCode(event.target.value.toUpperCase());
                    setCodeError("");
                  }}
                  placeholder="Scan QR atau masukkan kode manual"
                  className="h-12 rounded-xl border border-gray-300 px-4 font-mono text-sm uppercase outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
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
                  className="h-12 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <QrCodeIcon className="h-5 w-5 text-gray-500" />
                  <p className="mt-2 text-xs font-semibold text-gray-900">
                    QR Dinamis
                  </p>
                  <p className="text-xs text-gray-500">Valid 60 detik</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <MapPinIcon className="h-5 w-5 text-gray-500" />
                  <p className="mt-2 text-xs font-semibold text-gray-900">
                    Lokasi
                  </p>
                  <p className="text-xs text-gray-500">
                    Radius {storeSettings?.attendance_radius_meters ?? 150} m
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <KeyIcon className="h-5 w-5 text-gray-500" />
                  <p className="mt-2 text-xs font-semibold text-gray-900">
                    Session
                  </p>
                  <p className="text-xs text-gray-500">Login staff aktif</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">
                Riwayat Absensi
              </h3>
              <p className="text-sm text-gray-500">
                Menampilkan 30 data absensi terakhir dari akun staff ini.
              </p>
            </div>

            {attendanceList.length === 0 ? (
              <div className="p-12 text-center">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Belum ada data absensi
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Clock in pertama akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Tanggal
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Shift
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Clock In
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Clock Out
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Durasi
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Jarak
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 bg-white">
                    {attendanceList.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(attendance.attendance_date)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {attendance.shift?.shift_name ?? "-"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(attendance.shift?.start_time)} - {formatTime(attendance.shift?.end_time)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDateTime(attendance.clock_in_at)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              attendance.check_in_status,
                            )}`}
                          >
                            {getStatusLabel(attendance.check_in_status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDateTime(attendance.clock_out_at)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              attendance.check_out_status,
                            )}`}
                          >
                            {getStatusLabel(attendance.check_out_status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {getDuration(
                            attendance.clock_in_at,
                            attendance.clock_out_at,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          <p>In: {formatDistance(attendance.clock_in_distance_meters)}</p>
                          <p>Out: {formatDistance(attendance.clock_out_distance_meters)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {scannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Scan QR Presensi</h2>
                  <p className="text-sm text-gray-500">Arahkan kamera belakang ke QR live di layar kasir.</p>
                </div>

                <button
                  type="button"
                  onClick={stopQrScanner}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Tutup
                </button>
              </div>

              <div className="p-5">
                <div className="relative overflow-hidden rounded-2xl bg-black">
                  <video
                    ref={videoRef}
                    className="h-90 w-full object-cover"
                    playsInline
                    muted
                  />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-56 rounded-3xl border-4 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
                  </div>

                  {scannerLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                      <div className="text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                        <p className="mt-3 text-sm font-medium">Membuka kamera...</p>
                      </div>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {scannerMessage && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {scannerMessage}
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-500">
                  Kalau kamera belakang tidak terbuka di HP, pastikan halaman dibuka melalui HTTPS atau localhost dan izin kamera sudah diberikan.
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
                Lokasi cafe belum lengkap. Owner perlu mengatur latitude,
                longitude, dan radius di Staff Manager bagian Presensi.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}