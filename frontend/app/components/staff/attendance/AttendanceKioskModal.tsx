"use client";

import { useEffect, useMemo, useState } from "react";
import { ClockIcon, QrCodeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/app/components/shared/i18n/LanguageProvider";
import { getAttendanceErrorTranslationKey } from "@/lib/services/attendance/attendanceApiErrors";
import { buildAttendanceQrPayload } from "@/lib/services/attendance/attendanceQr";

type PresenceCode = { id: string; code: string; expires_at: string };
type KioskResponse = { success?: boolean; data?: PresenceCode; errorCode?: string };

type AttendanceKioskModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const getRemainingSeconds = (expiresAt?: string) => {
  if (!expiresAt) return 0;
  const normalized = expiresAt.includes("T")
    ? expiresAt
    : expiresAt.replace(" ", "T");
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000))
    : 0;
};

export default function AttendanceKioskModal({ isOpen, onClose }: AttendanceKioskModalProps) {
  const { t } = useLanguage();
  const [activeCode, setActiveCode] = useState<PresenceCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const qrPayload = useMemo(
    () => buildAttendanceQrPayload(activeCode?.code),
    [activeCode?.code],
  );

  const loadCode = async (rotate = false) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/staff/attendance/kiosk-code", {
        method: rotate ? "POST" : "GET",
      });
      const payload = (await response.json().catch(() => ({}))) as KioskResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(t(getAttendanceErrorTranslationKey(payload.errorCode)));
      }

      setActiveCode(payload.data);
      setRemainingSeconds(getRemainingSeconds(payload.data.expires_at));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("staffAttendance.qrUnavailable"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setActiveCode(null);
      setError("");
      setRemainingSeconds(0);
      return;
    }

    void loadCode();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeCode) return;

    const countdown = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(activeCode.expires_at));
    }, 1000);
    const refresh = window.setInterval(() => {
      void loadCode();
    }, 5000);

    return () => {
      window.clearInterval(countdown);
      window.clearInterval(refresh);
    };
  }, [activeCode, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeCode || remainingSeconds > 0 || loading) return;
    void loadCode(true);
  }, [activeCode, isOpen, loading, remainingSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between bg-gray-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <QrCodeIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("staffAttendance.kioskTitle")}</h2>
              <p className="mt-0.5 text-sm text-gray-300">{t("staffAttendance.kioskSubtitle")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-300 transition hover:bg-white/10 hover:text-white" aria-label={t("staffAttendance.closeKiosk")}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="p-6 text-center">
          {loading && !qrPayload ? (
            <div className="py-16">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
              <p className="mt-4 text-sm font-semibold text-gray-600">{t("staffAttendance.preparingQr")}</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
              <p>{error}</p>
              <button type="button" onClick={() => void loadCode()} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800">{t("staffAttendance.retry")}</button>
            </div>
          ) : qrPayload ? (
            <>
              <div className="inline-flex rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <QRCodeSVG value={qrPayload} size={280} level="M" includeMargin aria-label={t("staffAttendance.kioskTitle")} />
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                <ClockIcon className="h-4 w-4" />
                {t("staffAttendance.refreshesIn", { seconds: remainingSeconds })}
              </div>
              <p className="mt-5 text-xs leading-5 text-gray-500">{t("staffAttendance.kioskInstructions")}</p>
            </>
          ) : null}

          <button type="button" onClick={onClose} className="mt-6 h-11 w-full rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-700 transition hover:bg-gray-50">{t("common.close")}</button>
        </div>
      </section>
    </div>
  );
}
