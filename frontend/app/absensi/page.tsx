"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  MapPinIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type PresenceCode = {
  id: string;
  code: string;
  expires_at: string;
  attendance_date: string | null;
  is_active: boolean;
  used_count: number | null;
};

type StoreSettings = {
  id: string;
  store_name: string;
  store_latitude: number | null;
  store_longitude: number | null;
  attendance_radius_meters: number;
  is_active: boolean;
};

type StaffRecord = {
  id: string;
  staff_code: string;
  name: string;
  role: string;
  staff_type: string | null;
  status: string;
  login_code: string | null;
  login_code_expires_at: string | null;
  shift_id: string | null;
};

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time: string;
  check_in_grace_until: string;
  end_time: string;
  check_out_grace_until: string;
};

type AttendanceRecord = {
  id: string;
  staff_id: string;
  shift_id: string | null;
  attendance_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type AttendanceResult = {
  type: "clock_in" | "clock_out" | "complete";
  title: string;
  message: string;
  statusLabel?: string;
  statusTone?: "green" | "blue" | "red" | "orange" | "purple";
};

const QR_REFRESH_SECONDS = 60;

const toDbTimestamp = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};

const getNowDbTimestamp = () => {
  return toDbTimestamp(new Date());
};

const parseDbTimestamp = (value?: string | null) => {
  if (!value) return null;

  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
};

const generatePresenceCode = () => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();

  return `${randomPart}${timePart}`;
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";
  return value.slice(0, 5);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = parseDbTimestamp(value);

  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const normalizeCredential = (value: string) => {
  return value.trim();
};

const getMinutesFromTime = (value: string) => {
  const [hourText, minuteText] = value.slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;

  return hour * 60 + minute;
};

const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
};

const getLocation = () => {
  return new Promise<CurrentLocation>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser tidak mendukung akses lokasi."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        reject(
          new Error(
            "Lokasi tidak dapat diakses. Izinkan lokasi untuk melakukan absensi.",
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
};

const getStatusClassName = (tone?: AttendanceResult["statusTone"]) => {
  if (tone === "green") return "bg-green-50 text-green-700 border-green-200";
  if (tone === "blue") return "bg-blue-50 text-blue-700 border-blue-200";
  if (tone === "red") return "bg-red-50 text-red-700 border-red-200";
  if (tone === "orange")
    return "bg-orange-50 text-orange-700 border-orange-200";
  if (tone === "purple")
    return "bg-purple-50 text-purple-700 border-purple-200";

  return "bg-gray-50 text-gray-700 border-gray-200";
};

const getCheckInStatus = (shift: ShiftRecord) => {
  const currentMinutes = getCurrentMinutes();
  const startMinutes = getMinutesFromTime(shift.start_time);
  const graceMinutes = getMinutesFromTime(shift.check_in_grace_until);

  if (currentMinutes < startMinutes) {
    return {
      value: "early",
      label: "Datang Lebih Awal",
      tone: "blue" as const,
    };
  }

  if (currentMinutes <= graceMinutes) {
    return {
      value: "on_time",
      label: "Masuk Tepat Waktu",
      tone: "green" as const,
    };
  }

  return {
    value: "late",
    label: "Terlambat",
    tone: "red" as const,
  };
};

const getCheckOutStatus = (shift: ShiftRecord) => {
  const currentMinutes = getCurrentMinutes();
  const endMinutes = getMinutesFromTime(shift.end_time);
  const graceMinutes = getMinutesFromTime(shift.check_out_grace_until);

  if (currentMinutes < endMinutes) {
    return {
      value: "early_leave",
      label: "Pulang Lebih Awal",
      tone: "orange" as const,
    };
  }

  if (currentMinutes <= graceMinutes) {
    return {
      value: "on_time",
      label: "Pulang Tepat Waktu",
      tone: "green" as const,
    };
  }

  return {
    value: "overtime",
    label: "Lembur",
    tone: "purple" as const,
  };
};

const fetchActiveStoreSettings = async () => {
  const { data, error } = await supabase
    .from("store_settings")
    .select(
      "id, store_name, store_latitude, store_longitude, attendance_radius_meters, is_active",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data as StoreSettings | null;
};

const fetchValidPresenceCode = async (code: string) => {
  const { data, error } = await supabase
    .from("presence_code")
    .select("id, code, expires_at, attendance_date, is_active, used_count")
    .eq("code", code)
    .eq("is_active", true)
    .gt("expires_at", getNowDbTimestamp())
    .maybeSingle();

  if (error) throw error;

  return data as PresenceCode | null;
};

const createNewPresenceCode = async () => {
  const today = getTodayDate();
  const newCode = generatePresenceCode();
  const expiresAt = new Date(Date.now() + QR_REFRESH_SECONDS * 1000);

  await supabase
    .from("presence_code")
    .update({ is_active: false })
    .eq("attendance_date", today)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("presence_code")
    .insert({
      code: newCode,
      expires_at: toDbTimestamp(expiresAt),
      attendance_date: today,
      is_active: true,
      used_count: 0,
      shift_id: null,
    })
    .select("id, code, expires_at, attendance_date, is_active, used_count")
    .single();

  if (error) throw error;

  return data as PresenceCode;
};

const fetchOrCreateActivePresenceCode = async () => {
  const today = getTodayDate();

  const { data, error } = await supabase
    .from("presence_code")
    .select("id, code, expires_at, attendance_date, is_active, used_count")
    .eq("attendance_date", today)
    .eq("is_active", true)
    .gt("expires_at", getNowDbTimestamp())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as PresenceCode;

  return createNewPresenceCode();
};

const invalidateAndRotatePresenceCode = async (presenceCode: PresenceCode) => {
  await supabase
    .from("presence_code")
    .update({
      is_active: false,
      used_count: (presenceCode.used_count ?? 0) + 1,
    })
    .eq("id", presenceCode.id);

  await createNewPresenceCode();
};

const fetchStaffByCredential = async (credential: string) => {
  const normalizedCredential = normalizeCredential(credential);

  const staffSelect =
    "id, staff_code, name, role, staff_type, status, login_code, login_code_expires_at, shift_id";

  const { data: staffByCode, error: staffCodeError } = await supabase
    .from("staff")
    .select(staffSelect)
    .eq("staff_code", normalizedCredential)
    .maybeSingle();

  if (staffCodeError) throw staffCodeError;

  if (staffByCode) {
    return {
      staff: staffByCode as StaffRecord,
      matchedBy: "staff_code" as const,
    };
  }

  const { data: staffByLoginCode, error: loginCodeError } = await supabase
    .from("staff")
    .select(staffSelect)
    .eq("login_code", normalizedCredential)
    .maybeSingle();

  if (loginCodeError) throw loginCodeError;

  if (!staffByLoginCode) return null;

  return {
    staff: staffByLoginCode as StaffRecord,
    matchedBy: "login_code" as const,
  };
};

const fetchShift = async (shiftId: string) => {
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "id, shift_name, start_time, check_in_grace_until, end_time, check_out_grace_until",
    )
    .eq("id", shiftId)
    .maybeSingle();

  if (error) throw error;

  return data as ShiftRecord | null;
};

const fetchTodayAttendance = async (staffId: string, shiftId: string) => {
  const { data, error } = await supabase
    .from("attendance")
    .select(
      "id, staff_id, shift_id, attendance_date, clock_in_at, clock_out_at",
    )
    .eq("staff_id", staffId)
    .eq("shift_id", shiftId)
    .eq("attendance_date", getTodayDate())
    .maybeSingle();

  if (error) throw error;

  return data as AttendanceRecord | null;
};

export default function AbsensiPage() {
  const [mode, setMode] = useState<"kiosk" | "scan">("kiosk");
  const [scanCode, setScanCode] = useState("");
  const [activeCode, setActiveCode] = useState<PresenceCode | null>(null);
  const [kioskLoading, setKioskLoading] = useState(true);
  const [kioskError, setKioskError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(QR_REFRESH_SECONDS);
  const qrRotationInProgressRef = useRef(false);

  const [credential, setCredential] = useState("");
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [attendanceResult, setAttendanceResult] =
    useState<AttendanceResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code") ?? "";

    if (codeFromUrl) {
      setMode("scan");
      setScanCode(codeFromUrl);
    } else {
      setMode("kiosk");
    }
  }, []);

  const qrTargetUrl = useMemo(() => {
    if (!activeCode || typeof window === "undefined") return "";

    return `${window.location.origin}/absensi?code=${encodeURIComponent(
      activeCode.code,
    )}`;
  }, [activeCode]);

  const qrImageUrl = useMemo(() => {
    if (!qrTargetUrl) return "";

    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(
      qrTargetUrl,
    )}`;
  }, [qrTargetUrl]);

  useEffect(() => {
    if (mode !== "kiosk") return;

    let cancelled = false;

    const syncCode = async () => {
      try {
        setKioskError("");
        const code = await fetchOrCreateActivePresenceCode();

        if (!cancelled) {
          setActiveCode(code);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal memuat QR absensi.";

        if (!cancelled) {
          setKioskError(message);
        }
      } finally {
        if (!cancelled) {
          setKioskLoading(false);
        }
      }
    };

    syncCode();

    const interval = window.setInterval(syncCode, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "kiosk" || !activeCode) return;

    const updateRemainingSeconds = () => {
      const expiresAt = parseDbTimestamp(activeCode.expires_at);
      const seconds = Math.max(
        0,
        Math.ceil(((expiresAt?.getTime() ?? 0) - Date.now()) / 1000),
      );

      setRemainingSeconds(seconds);

      if (seconds <= 0 && !qrRotationInProgressRef.current) {
        qrRotationInProgressRef.current = true;

        createNewPresenceCode()
          .then((newCode) => {
            setActiveCode(newCode);
            setRemainingSeconds(QR_REFRESH_SECONDS);
          })
          .catch((error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Gagal mengganti QR absensi.";
            setKioskError(message);
          })
          .finally(() => {
            qrRotationInProgressRef.current = false;
          });
      }
    };

    updateRemainingSeconds();

    const interval = window.setInterval(updateRemainingSeconds, 1000);

    return () => window.clearInterval(interval);
  }, [activeCode, mode]);

  const handleRequestLocation = async () => {
    setLocationLoading(true);
    setScanError("");

    try {
      const location = await getLocation();
      setCurrentLocation(location);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil lokasi perangkat.";
      setScanError(message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmitAttendance = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setScanError("");
    setAttendanceResult(null);

    const normalizedCredential = normalizeCredential(credential);

    if (!scanCode) {
      setScanError("Kode QR tidak ditemukan. Silakan scan QR absensi ulang.");
      return;
    }

    if (!normalizedCredential) {
      setScanError("Masukkan Staff ID atau kode login terlebih dahulu.");
      return;
    }

    setSubmitLoading(true);

    try {
      const validPresenceCode = await fetchValidPresenceCode(scanCode);

      if (!validPresenceCode) {
        throw new Error(
          "QR sudah expired atau sudah digunakan. Silakan scan QR terbaru.",
        );
      }

      const storeSettings = await fetchActiveStoreSettings();

      if (!storeSettings) {
        throw new Error("Pengaturan lokasi cafe belum tersedia.");
      }

      if (
        storeSettings.store_latitude === null ||
        storeSettings.store_longitude === null
      ) {
        throw new Error(
          "Lokasi cafe belum diatur. Owner perlu mengatur lokasi di menu Presensi.",
        );
      }

      const location = currentLocation ?? (await getLocation());
      setCurrentLocation(location);

      const distance = calculateDistanceMeters(
        location.latitude,
        location.longitude,
        storeSettings.store_latitude,
        storeSettings.store_longitude,
      );

      if (distance > storeSettings.attendance_radius_meters) {
        throw new Error(
          `Lokasi Anda di luar radius absensi. Jarak saat ini ${Math.round(
            distance,
          )} meter dari cafe.`,
        );
      }

      const staffLookup = await fetchStaffByCredential(normalizedCredential);

      if (!staffLookup) {
        throw new Error("Staff ID atau kode login tidak ditemukan.");
      }

      const { staff, matchedBy } = staffLookup;

      if (staff.status !== "active") {
        throw new Error(
          "Akun staff tidak aktif dan tidak bisa melakukan absensi.",
        );
      }

      if (matchedBy === "login_code" && staff.login_code_expires_at) {
        const expiresAt = parseDbTimestamp(
          staff.login_code_expires_at,
        )?.getTime();

        if (expiresAt && expiresAt <= Date.now()) {
          throw new Error(
            "Kode login staff sudah expired. Minta generate ulang ke owner.",
          );
        }
      }

      if (!staff.shift_id) {
        throw new Error(
          "Staff belum memiliki shift. Owner perlu assign shift terlebih dahulu.",
        );
      }

      const shift = await fetchShift(staff.shift_id);

      if (!shift) {
        throw new Error("Shift staff tidak ditemukan atau sudah dihapus.");
      }

      const todayAttendance = await fetchTodayAttendance(staff.id, shift.id);
      const now = getNowDbTimestamp();

      if (!todayAttendance) {
        const checkInStatus = getCheckInStatus(shift);

        const { error } = await supabase.from("attendance").insert({
          staff_id: staff.id,
          shift_id: shift.id,
          presence_code_id: validPresenceCode.id,
          attendance_date: getTodayDate(),
          clock_in_at: now,
          clock_in_latitude: location.latitude,
          clock_in_longitude: location.longitude,
          clock_in_distance_meters: Number(distance.toFixed(2)),
          clock_in_method: "qr",
          check_in_status: checkInStatus.value,
        });

        if (error) throw error;

        await invalidateAndRotatePresenceCode(validPresenceCode);

        setAttendanceResult({
          type: "clock_in",
          title: "Clock In Berhasil",
          message: `${staff.name} berhasil clock in untuk ${shift.shift_name}.`,
          statusLabel: checkInStatus.label,
          statusTone: checkInStatus.tone,
        });

        setCredential("");
        return;
      }

      if (todayAttendance.clock_in_at && !todayAttendance.clock_out_at) {
        const checkOutStatus = getCheckOutStatus(shift);

        const { error } = await supabase
          .from("attendance")
          .update({
            clock_out_at: now,
            clock_out_latitude: location.latitude,
            clock_out_longitude: location.longitude,
            clock_out_distance_meters: Number(distance.toFixed(2)),
            clock_out_method: "qr",
            check_out_status: checkOutStatus.value,
            updated_at: now,
          })
          .eq("id", todayAttendance.id);

        if (error) throw error;

        await invalidateAndRotatePresenceCode(validPresenceCode);

        setAttendanceResult({
          type: "clock_out",
          title: "Clock Out Berhasil",
          message: `${staff.name} berhasil clock out dari ${shift.shift_name}.`,
          statusLabel: checkOutStatus.label,
          statusTone: checkOutStatus.tone,
        });

        setCredential("");
        return;
      }

      await invalidateAndRotatePresenceCode(validPresenceCode);

      setAttendanceResult({
        type: "complete",
        title: "Absensi Hari Ini Sudah Lengkap",
        message: `${staff.name} sudah memiliki clock in dan clock out untuk hari ini.`,
        statusLabel: "Selesai",
        statusTone: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memproses absensi.";
      setScanError(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (mode === "kiosk") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <section className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center bg-gray-900 p-8 text-white md:p-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <QrCodeIcon className="h-8 w-8" />
              </div>

              <h1 className="mt-8 text-3xl font-bold md:text-5xl">
                Absensi Staff
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-gray-300 md:text-lg">
                Scan QR ini untuk clock in atau clock out. QR otomatis berubah
                setiap 1 menit dan langsung berganti setelah digunakan.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Durasi QR
                  </p>
                  <p className="mt-1 text-2xl font-bold">60s</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Validasi
                  </p>
                  <p className="mt-1 text-2xl font-bold">Lokasi</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Sistem
                  </p>
                  <p className="mt-1 text-2xl font-bold">Shift</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8 md:p-12">
              {kioskLoading ? (
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-gray-900" />
                  <p className="mt-4 text-sm font-medium text-gray-500">
                    Memuat QR absensi...
                  </p>
                </div>
              ) : kioskError ? (
                <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-700">
                  <XCircleIcon className="mx-auto h-10 w-10" />
                  <p className="mt-3 text-sm font-semibold">{kioskError}</p>
                </div>
              ) : activeCode && qrImageUrl ? (
                <>
                  <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                    <img
                      src={qrImageUrl}
                      alt="QR Absensi Staff"
                      className="h-72 w-72 rounded-2xl md:h-80 md:w-80"
                    />
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">Kode aktif</p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-gray-900">
                      {activeCode.code}
                    </p>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                      <ClockIcon className="h-4 w-4" />
                      Berganti dalam {remainingSeconds}s
                    </div>

                    <p className="mt-4 text-xs text-gray-400">
                      Halaman ini bisa dibiarkan menyala 24 jam di device kasir.
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="bg-gray-900 px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheckIcon className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-xl font-bold">Form Absensi Staff</h1>
              <p className="text-sm text-gray-300">
                Validasi QR, lokasi, dan shift.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitAttendance} className="space-y-5 p-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Kode QR
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-gray-900">
              {scanCode || "-"}
            </p>
          </div>

          {scanError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {scanError}
            </div>
          )}

          {attendanceResult && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-6 w-6 shrink-0 text-green-700" />
                <div>
                  <h2 className="font-bold text-green-800">
                    {attendanceResult.title}
                  </h2>
                  <p className="mt-1 text-sm text-green-700">
                    {attendanceResult.message}
                  </p>

                  {attendanceResult.statusLabel && (
                    <span
                      className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
                        attendanceResult.statusTone,
                      )}`}
                    >
                      {attendanceResult.statusLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Staff ID / Kode Login
            </label>
            <div className="relative">
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                placeholder="Contoh: STF001 atau kode login"
                className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                disabled={submitLoading}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestLocation}
            disabled={locationLoading || submitLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MapPinIcon className="h-5 w-5" />
            {locationLoading
              ? "Mengambil lokasi..."
              : currentLocation
                ? `Lokasi Aktif ±${Math.round(currentLocation.accuracy)}m`
                : "Izinkan Lokasi"}
          </button>

          <button
            type="submit"
            disabled={submitLoading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLoading ? "Memproses Absensi..." : "Submit Absensi"}
          </button>

          <p className="text-center text-xs leading-5 text-gray-500">
            Sistem otomatis menentukan clock in atau clock out berdasarkan data
            presensi hari ini dan shift yang sudah diatur owner.
          </p>
        </form>
      </section>
    </main>
  );
}