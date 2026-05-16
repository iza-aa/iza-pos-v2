"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import {
  CheckCircleIcon,
  ClockIcon,
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
  attendance_date: string;
  is_active: boolean;
  used_count: number | null;
};

type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type AttendanceResult = {
  success?: boolean;
  action?: "clock_in" | "clock_out" | "complete";
  title: string;
  message: string;
  statusLabel?: string;
  statusTone?: "green" | "blue" | "red" | "orange" | "purple";
  distanceMeters?: number;
  accuracyMeters?: number;
};

const QR_REFRESH_SECONDS = 60;
const KIOSK_RESYNC_SECONDS = 5;

const normalizeCredential = (value: string) => value.trim();

const parseDbTimestamp = (value?: string | null) => {
  if (!value) return null;

  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return null;

  return date;
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
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

const fetchOrCreateActivePresenceCode = async () => {
  const { data, error } = await supabase.rpc("get_active_presence_code");

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return (rows[0] ?? null) as PresenceCode | null;
};

const rotatePresenceCode = async () => {
  const { data, error } = await supabase.rpc("rotate_presence_code");

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return (rows[0] ?? null) as PresenceCode | null;
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

        if (!cancelled && code) {
          setActiveCode((currentCode) => {
            if (currentCode?.id === code.id) return currentCode;
            return code;
          });
        }
      } catch (error) {
        const message = getErrorMessage(error, "Gagal memuat QR absensi.");

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

    const interval = window.setInterval(
      syncCode,
      KIOSK_RESYNC_SECONDS * 1000,
    );

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

        rotatePresenceCode()
          .then((newCode) => {
            if (newCode) {
              setActiveCode(newCode);
              setRemainingSeconds(QR_REFRESH_SECONDS);
            }
          })
          .catch((error) => {
            const message = getErrorMessage(
              error,
              "Gagal mengganti QR absensi.",
            );
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
      const message = getErrorMessage(error, "Gagal mengambil lokasi perangkat.");
      setScanError(message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmitAttendance = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitLoading) return;

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
      const location = currentLocation ?? (await getLocation());
      setCurrentLocation(location);

      const { data, error } = await supabase.rpc("submit_qr_attendance", {
        p_code: scanCode,
        p_credential: normalizedCredential,
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_accuracy: location.accuracy,
      });

      if (error) throw error;

      const result = data as AttendanceResult;

      setAttendanceResult({
        title: result.title ?? "Absensi Berhasil",
        message: result.message ?? "Data absensi berhasil diproses.",
        action: result.action,
        statusLabel: result.statusLabel,
        statusTone: result.statusTone,
        distanceMeters: result.distanceMeters,
        accuracyMeters: result.accuracyMeters,
      });

      setCredential("");
    } catch (error) {
      const message = getErrorMessage(error, "Gagal memproses absensi.");
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
                setiap 1 menit dan token lama tidak bisa digunakan kembali.
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
                    Status
                  </p>
                  <p className="mt-1 text-2xl font-bold">Aktif</p>
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
                    <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                      <CheckCircleIcon className="h-4 w-4" />
                      QR aktif
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                      <ClockIcon className="h-4 w-4" />
                      Berganti dalam {remainingSeconds}s
                    </div>

                    <p className="mt-4 max-w-sm text-xs leading-5 text-gray-400">
                      Halaman ini bisa dibiarkan menyala di device kasir. Kode
                      teknis tidak ditampilkan untuk menjaga keamanan QR.
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
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
              <div>
                <p className="text-sm font-bold text-green-800">
                  QR berhasil terdeteksi
                </p>
                <p className="mt-1 text-xs leading-5 text-green-700">
                  Masukkan Staff ID atau kode login, lalu izinkan lokasi untuk
                  memproses absensi.
                </p>
              </div>
            </div>
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    {attendanceResult.statusLabel && (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
                          attendanceResult.statusTone,
                        )}`}
                      >
                        {attendanceResult.statusLabel}
                      </span>
                    )}

                    {typeof attendanceResult.distanceMeters === "number" && (
                      <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                        Jarak {Math.round(attendanceResult.distanceMeters)}m
                      </span>
                    )}
                  </div>
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
                autoComplete="off"
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
            Tombol otomatis terkunci saat proses berjalan untuk mencegah double
            submit. Sistem menentukan clock in atau clock out dari data presensi
            hari ini.
          </p>
        </form>
      </section>
    </main>
  );
}