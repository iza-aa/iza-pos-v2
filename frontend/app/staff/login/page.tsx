"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { logActivity } from "@/lib/services/activity/activityLogger";

const slides = [
  {
    img: "/logo/coffeelogin.jpg",
    quote:
      "Tempatnya cozy banget buat nugas atau nongkrong bareng teman. Kopinya juga enak, rasa dan aromanya pas banget!",
    author: "Rina Putri",
  },
  {
    img: "/logo/coffeelogin2.jpg",
    quote:
      "Pelayanan cepat dan ramah, suasana cafenya bikin betah. Latte-nya wajib dicoba, creamy tapi tetap strong.",
    author: "Dimas Aditya",
  },
  {
    img: "/logo/coffeelogin3.jpg",
    quote:
      "Desain interiornya estetik, cocok buat photo-photo. Harganya juga terjangkau untuk kualitas kopi se-enak ini.",
    author: "Lia Kartika",
  },
];

const PIN_LENGTH = 6;
const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`);
const WEAK_PINS = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
  "112233",
  "121212",
]);

const sanitizePinLikeValue = (value: string) => value.replace(/\D/g, "").slice(0, PIN_LENGTH);

const isSequentialPin = (pin: string) => {
  const digits = pin.split("").map((value) => Number(value));
  const ascending = digits.every(
    (digit, index) => index === 0 || digit === digits[index - 1] + 1,
  );
  const descending = digits.every(
    (digit, index) => index === 0 || digit === digits[index - 1] - 1,
  );

  return ascending || descending;
};

const validatePinFormat = (pin: string) => {
  if (!PIN_PATTERN.test(pin)) {
    return `PIN / kode login harus ${PIN_LENGTH} digit angka.`;
  }

  return "";
};

const validateNewPin = (pin: string) => {
  const formatError = validatePinFormat(pin);

  if (formatError) return formatError;

  if (WEAK_PINS.has(pin) || isSequentialPin(pin)) {
    return "PIN terlalu mudah ditebak. Gunakan kombinasi angka lain.";
  }

  return "";
};

type LoginResult = {
  success?: boolean;
  error?: string;
  must_set_pin?: boolean;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  staff_type?: string | null;
  staff_code?: string;
  message?: string;
};

type PendingPinSetup = {
  userName: string;
  staffCode: string;
  userRole: string;
  staffType: string | null;
  loginCode: string;
};

type PinBoxesInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  statusText?: string;
  error?: boolean;
};

const saveSession = (result: LoginResult) => {
  if (!result.user_id || !result.user_name || !result.user_role || !result.staff_code) {
    return;
  }

  localStorage.setItem("user_id", result.user_id);
  localStorage.setItem("user_name", result.user_name);
  localStorage.setItem("user_role", result.user_role);
  localStorage.setItem("staff_type", result.staff_type ?? "");
  localStorage.setItem("staff_code", result.staff_code);
};

const redirectByRole = (role?: string) => {
  if (role === "manager") {
    window.location.href = "/manager/menu";
    return;
  }

  window.location.href = "/staff/attendance";
};

function PinBoxesInput({
  id,
  label,
  value,
  onChange,
  helperText,
  disabled = false,
  autoComplete,
  autoFocus = false,
  statusText,
  error = false,
}: PinBoxesInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => window.clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  const digits = useMemo(
    () => Array.from({ length: PIN_LENGTH }, (_, index) => value[index] ?? ""),
    [value],
  );

  const handleWrapperClick = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-600">
          {label}
        </label>
        <span className="text-xs font-medium text-gray-400">{value.length}/{PIN_LENGTH}</span>
      </div>

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={PIN_LENGTH}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => onChange(sanitizePinLikeValue(event.target.value))}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          aria-label={label}
        />

        <button
          type="button"
          onClick={handleWrapperClick}
          disabled={disabled}
          className={`w-full rounded-2xl border p-4 text-left transition ${
            error
              ? "border-red-300 bg-red-50"
              : isFocused
                ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-100"
                : "border-gray-200 bg-white hover:border-gray-300"
          } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-text"}`}
        >
          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {digits.map((digit, index) => {
              const isActiveSlot = isFocused && index === Math.min(value.length, PIN_LENGTH - 1);
              const isFilled = digit !== "";

              return (
                <div
                  key={`${id}-digit-${index}`}
                  className={`flex h-12 items-center justify-center rounded-lg border text-lg font-semibold transition sm:h-14 sm:text-xl ${
                    error
                      ? "border-red-200 bg-white text-red-500"
                      : isFilled
                        ? "border-blue-200 bg-blue-50 text-gray-900"
                        : isActiveSlot
                          ? "border-blue-400 bg-white text-gray-400"
                          : "border-gray-200 bg-gray-50 text-gray-300"
                  }`}
                >
                  {isFilled ? "*" : isActiveSlot ? "|" : "•"}
                </div>
              );
            })}
          </div>
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className={`text-xs ${error ? "text-red-500" : "text-gray-400"}`}>
          {helperText ?? `Masukkan ${PIN_LENGTH} digit angka.`}
        </p>
        {value.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
            disabled={disabled}
          >
            Hapus
          </button>
        ) : null}
      </div>

      {statusText ? <p className="mt-2 text-xs text-gray-500">{statusText}</p> : null}
    </div>
  );
}

export default function LoginStaffPage() {
  const [staffId, setStaffId] = useState("");
  const [credential, setCredential] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pendingPinSetup, setPendingPinSetup] = useState<PendingPinSetup | null>(null);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const logSuccessfulLogin = async (result: LoginResult) => {
    await logActivity({
      action: "LOGIN",
      category: "AUTH",
      description: `${result.user_role === "manager" ? "Manager" : "Staff"} ${
        result.user_name
      } (${result.staff_code}) logged in successfully`,
      resourceType: "Authentication",
      resourceName: `${result.staff_type ?? "staff"} - ${result.staff_code}`,
      severity: "info",
    });
  };

  const logFailedLogin = async () => {
    await logActivity({
      action: "LOGIN",
      category: "AUTH",
      description: "Failed staff login attempt",
      resourceType: "Authentication",
      severity: "critical",
      notes: `Failed authentication attempt for staff code: ${staffId}`,
      tags: ["login", "failed", "security-alert"],
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");

    const normalizedCredential = sanitizePinLikeValue(credential);
    const credentialError = validatePinFormat(normalizedCredential);

    if (!staffId.trim()) {
      setError("Staff ID wajib diisi.");
      return;
    }

    if (credentialError) {
      setError(credentialError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          staff_code: staffId.trim().toUpperCase(),
          credential: normalizedCredential,
        }),
      });

      const result = (await response.json()) as LoginResult;

      if (response.ok && result.success && result.must_set_pin) {
        setPendingPinSetup({
          userName: result.user_name ?? "Staff",
          staffCode: result.staff_code ?? staffId.trim().toUpperCase(),
          userRole: result.user_role ?? "staff",
          staffType: result.staff_type ?? null,
          loginCode: normalizedCredential,
        });
        setInfo(result.message || "Kode login valid. Silakan buat PIN baru.");
        setCredential("");
        return;
      }

      if (response.ok && result.success) {
        saveSession(result);
        await logSuccessfulLogin(result);
        redirectByRole(result.user_role);
        return;
      }

      setError(result.error || "Staff ID atau PIN / kode login salah.");
      await logFailedLogin();
    } catch {
      setError("Gagal login. Periksa koneksi lalu coba lagi.");
      await logFailedLogin();
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingPinSetup) return;

    setError("");
    setInfo("");

    const normalizedNewPin = sanitizePinLikeValue(newPin);
    const normalizedConfirmPin = sanitizePinLikeValue(confirmPin);
    const newPinError = validateNewPin(normalizedNewPin);

    if (newPinError) {
      setError(newPinError);
      return;
    }

    if (normalizedNewPin !== normalizedConfirmPin) {
      setError("Konfirmasi PIN tidak sama.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_pin",
          staff_code: pendingPinSetup.staffCode,
          login_code: pendingPinSetup.loginCode,
          new_pin: normalizedNewPin,
          confirm_pin: normalizedConfirmPin,
        }),
      });

      const result = (await response.json()) as LoginResult;

      if (response.ok && result.success) {
        saveSession(result);
        await logSuccessfulLogin(result);
        redirectByRole(result.user_role);
        return;
      }

      setError(result.error || "Gagal menyimpan PIN baru.");
    } catch {
      setError("Gagal menyimpan PIN baru. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setPendingPinSetup(null);
    setNewPin("");
    setConfirmPin("");
    setCredential("");
    setError("");
    setInfo("");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden w-[85%] items-center justify-center bg-white py-8 pl-8  lg:block">
        <div className="relative flex h-full w-full items-end overflow-hidden rounded-3xl bg-black/70 shadow-xl">
          <img
            src={slides[current].img}
            alt="Testimonial"
            className="absolute inset-0 z-0 h-full w-full rounded-3xl object-cover"
          />
          <div className="absolute inset-0 z-10 rounded-3xl bg-black/45" />
          <div className="relative z-20 w-full p-10 text-white">
            <span className="inline-flex bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              IZA POS Staff Access
            </span>
            <p className="mt-6 mb-4  text-2xl font-medium leading-snug">
              “{slides[current].quote}”
            </p>
            <div className="mb-2 text-sm font-semibold">{slides[current].author}</div>
            <div className="mt-5 flex items-center gap-2">
              {slides.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 transition-all duration-300 ${
                    idx === current
                      ? "w-16 bg-linear-to-r from-blue-500 via-white to-red-500"
                      : "w-8 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-5 py-8 sm:px-2 lg:w-[36%]">
        <div className="w-full p-6 sm:p-6">
          <div className="mb-8 flex items-center justify-center">
            <img src="/logo/IZALogo2.png" alt="Logo" className="mr-3 w-20" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {pendingPinSetup ? "Buat PIN Baru" : "Staff Login"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {pendingPinSetup
                ? `Halo ${pendingPinSetup.userName}, buat PIN ${PIN_LENGTH} digit untuk login berikutnya.`
                : `Masuk menggunakan Staff ID dan ${PIN_LENGTH} digit PIN atau kode login sementara.`}
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {info}
            </div>
          ) : null}

          {!pendingPinSetup ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">Staff ID</label>
                <input
                  type="text"
                  value={staffId}
                  onChange={(event) => setStaffId(event.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="STF001"
                  autoComplete="username"
                  required
                />
              </div>

              <PinBoxesInput
                id="staff-credential"
                label="PIN"
                value={credential}
                onChange={setCredential}
                disabled={loading}
                autoComplete="current-password"
                autoFocus
                error={Boolean(error)}
                helperText="Input dibuat seperti kode PIN agar lebih mudah dipakai staff."
                statusText="Lupa PIN? Hubungi manager untuk reset akses."
              />

              <button
                type="submit"
                className="w-full font-semibold bg-linear-to-r from-black to-gray-600 text-white py-3 rounded-lg hover:opacity-95 transition-opacity"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>

              <div className="text-center">
                <a
                  href="/manager/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Login as Manager
                </a>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSetPin}>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Staff ID <span className="font-semibold">{pendingPinSetup.staffCode}</span> berhasil
                diverifikasi. Silakan buat PIN baru untuk login selanjutnya.
              </div>

              <PinBoxesInput
                id="new-pin"
                label="PIN Baru"
                value={newPin}
                onChange={setNewPin}
                disabled={loading}
                autoComplete="new-password"
                autoFocus
                error={Boolean(error)}
                helperText={`Gunakan ${PIN_LENGTH} digit angka dan hindari kombinasi yang mudah ditebak.`}
              />

              <PinBoxesInput
                id="confirm-pin"
                label="Konfirmasi PIN Baru"
                value={confirmPin}
                onChange={setConfirmPin}
                disabled={loading}
                autoComplete="new-password"
                error={Boolean(error)}
                helperText="Masukkan ulang PIN yang sama untuk konfirmasi."
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-linear-to-r from-blue-600 to-blue-700 py-3.5 font-semibold text-white transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Simpan PIN & Masuk"}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                Kembali ke Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
