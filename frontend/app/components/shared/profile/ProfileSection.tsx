"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CameraIcon,
  CheckCircleIcon,
  KeyIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { sanitizePhoneNumber } from "@/lib/utils";
import { useLanguage } from "../i18n";

type RoleScope = "owner" | "manager" | "staff";

type ProfileSectionProps = {
  roleScope: RoleScope;
};

type StaffProfile = {
  id: string;
  staff_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  staff_type: string | null;
  status: string;
  profile_picture: string | null;
};

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

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

const PROFILE_IMAGE_TARGET_KB = 180;
const PROFILE_IMAGE_TARGET_BYTES = PROFILE_IMAGE_TARGET_KB * 1024;
const PROFILE_IMAGE_MAX_DIMENSION = 512;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const sanitizePinValue = (value: string) => value.replace(/\D/g, "").slice(0, PIN_LENGTH);

const isSequentialPin = (pin: string) => {
  const digits = pin.split("").map((value) => Number(value));
  const ascending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] + 1);
  const descending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] - 1);

  return ascending || descending;
};

type Translator = ReturnType<typeof useLanguage>["t"];

const validateNewPin = (pin: string, t: Translator) => {
  if (!PIN_PATTERN.test(pin)) {
    return t("profile.pinLengthError", { length: PIN_LENGTH });
  }

  if (WEAK_PINS.has(pin) || isSequentialPin(pin)) {
    return t("profile.pinWeakError");
  }

  return "";
};

const getRoleLabel = (role: string, t: Translator) => {
  if (role === "owner") return t("owner.staff.owner");
  if (role === "manager") return t("owner.staff.manager");
  if (role === "staff") return t("owner.staff.staff");
  return role || t("profile.user");
};

const getStatusLabel = (status: string, t: Translator) => {
  if (status === "active") return t("owner.bookkeeping.enabled");
  if (status === "inactive") return t("owner.staff.inactive");
  if (status === "on-leave") return t("owner.staff.onLeave");
  if (status === "terminated") return t("owner.staff.terminated");
  return status || "-";
};

const getFallbackAvatar = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}&background=e5e7eb&color=374151`;
};


const dispatchProfileUpdatedEvent = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("profile:updated"));
};

const getCurrentUserId = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("user_id") || "";
};

const readImageFile = (file: File, t: Translator) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(t("profile.imageReadError")));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error(t("profile.fileReadError")));
    reader.readAsDataURL(file);
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number, t: Translator) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(t("profile.photoCompressError")));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
};

const drawImageToCanvas = (image: HTMLImageElement, maxDimension: number, t: Translator) => {
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(t("profile.photoCompressUnsupported"));
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas;
};

const compressProfilePhoto = async (file: File, t: Translator) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(t("profile.photoFormatError"));
  }

  const image = await readImageFile(file, t);
  let maxDimension = PROFILE_IMAGE_MAX_DIMENSION;
  let bestBlob: Blob | null = null;

  for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
    const canvas = drawImageToCanvas(image, maxDimension, t);

    for (let quality = 0.82; quality >= 0.42; quality -= 0.08) {
      const blob = await canvasToBlob(canvas, Number(quality.toFixed(2)), t);
      bestBlob = blob;

      if (blob.size <= PROFILE_IMAGE_TARGET_BYTES) {
        return new File([blob], "profile-photo.webp", { type: "image/webp" });
      }
    }

    maxDimension = Math.max(192, Math.round(maxDimension * 0.82));
  }

  if (!bestBlob) {
    throw new Error(t("profile.photoCompressError"));
  }

  return new File([bestBlob], "profile-photo.webp", { type: "image/webp" });
};

function PinBoxesInput({
  label,
  value,
  onChange,
  helperText,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);

  const digits = useMemo(
    () => Array.from({ length: PIN_LENGTH }, (_, index) => value[index] ?? ""),
    [value],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">{value.length}/{PIN_LENGTH}</span>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          maxLength={PIN_LENGTH}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(sanitizePinValue(event.target.value))}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          disabled={disabled}
          className={`w-full rounded-lg border p-3 transition ${
            focused ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-100" : "border-gray-200 bg-white"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-text hover:border-gray-300"}`}
        >
          <div className="grid grid-cols-6 gap-2">
            {digits.map((digit, index) => {
              const activeSlot = focused && index === Math.min(value.length, PIN_LENGTH - 1);

              return (
                <div
                  key={`${label}-${index}`}
                  className={`flex h-11 items-center justify-center rounded-lg border text-lg font-semibold ${
                    digit
                      ? "border-blue-200 bg-blue-50 text-gray-900"
                      : activeSlot
                        ? "border-blue-400 bg-white text-gray-400"
                        : "border-gray-200 bg-gray-50 text-gray-300"
                  }`}
                >
                  {digit || (activeSlot ? "|" : "•")}
                </div>
              );
            })}
          </div>
        </button>
      </div>

      {helperText ? <p className="mt-2 text-xs text-gray-400">{helperText}</p> : null}
    </div>
  );
}

export default function ProfileSection({ roleScope }: ProfileSectionProps) {
  useSessionValidation();
  const { t } = useLanguage();

  const searchParams = useSearchParams();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePicture, setProfilePicture] = useState("");

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPinForm, setShowPinForm] = useState(false);

  const showSecurityFirst = searchParams.get("section") === "security";
  const canChangePin = profile?.role === "staff";

  const avatarSrc = profilePicture || getFallbackAvatar(name || profile?.name || "User");
  const hasProfileChanges = useMemo(() => {
    if (!profile) return false;

    return (
      name.trim() !== profile.name.trim() ||
      email.trim() !== (profile.email ?? "") ||
      sanitizePhoneNumber(phone) !== sanitizePhoneNumber(profile.phone ?? "") ||
      profilePicture !== (profile.profile_picture ?? "")
    );
  }, [email, name, phone, profile, profilePicture]);

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const userId = getCurrentUserId();

      if (!userId) {
        setError(t("profile.sessionMissing"));
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("staff")
        .select("id, staff_code, name, email, phone, role, staff_type, status, profile_picture")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError(t("profile.notFound"));
        return;
      }

      const normalizedProfile = data as StaffProfile;
      setProfile(normalizedProfile);
      setName(normalizedProfile.name || "");
      setEmail(normalizedProfile.email || "");
      setPhone(normalizedProfile.phone || "");
      setProfilePicture(normalizedProfile.profile_picture || "");

      if (typeof window !== "undefined") {
        localStorage.setItem("user_name", normalizedProfile.name || t("profile.user"));
        localStorage.setItem("user_role", normalizedProfile.role || roleScope);
        localStorage.setItem("staff_code", normalizedProfile.staff_code || "");
        localStorage.setItem("staff_type", normalizedProfile.staff_type || "");
        localStorage.setItem("profile_picture", normalizedProfile.profile_picture || "");
        dispatchProfileUpdatedEvent();
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : t("profile.loadError");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    if (showSecurityFirst && profile?.role === "staff") {
      setShowPinForm(true);
      window.setTimeout(() => {
        document.getElementById("profile-security-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 350);
    }
  }, [showSecurityFirst, loading, profile?.role]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile || !hasProfileChanges) return;

    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = sanitizePhoneNumber(phone);

      if (!trimmedName) {
        const message = t("profile.nameRequired");
        showError(message);
        return;
      }

      const { error: updateError } = await supabase
        .from("staff")
        .update({
          name: trimmedName,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
          profile_picture: profilePicture || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({
        ...profile,
        name: trimmedName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        profile_picture: profilePicture || null,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("user_name", trimmedName);
        localStorage.setItem("profile_picture", profilePicture || "");
        dispatchProfileUpdatedEvent();
      }

      const message = t("profile.updated");
      showSuccess(message);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t("profile.saveError");
      showError(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !profile) return;

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      const compressedFile = await compressProfilePhoto(file, t);
      const formData = new FormData();
      formData.append("staff_id", profile.id);
      formData.append("file", compressedFile, "profile-photo.webp");

      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as ApiResult & { profile_picture?: string };

      if (!response.ok || !result.success || !result.profile_picture) {
        throw new Error(result.error || t("profile.photoUploadError"));
      }

      const publicUrl = result.profile_picture;

      setProfile({ ...profile, profile_picture: publicUrl });
      setProfilePicture(publicUrl);

      if (typeof window !== "undefined") {
        localStorage.setItem("profile_picture", publicUrl);
        dispatchProfileUpdatedEvent();
      }

      const sizeKb = Math.max(1, Math.round(compressedFile.size / 1024));
      showSuccess(t("profile.photoUpdated", { size: sizeKb }));
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : t("profile.photoUploadError");
      showError(message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) return;

    setSavingPin(true);
    setError("");
    setSuccess("");

    try {
      if (!PIN_PATTERN.test(currentPin)) {
        setError(t("profile.oldPinLengthError", { length: PIN_LENGTH }));
        return;
      }

      const newPinError = validateNewPin(newPin, t);

      if (newPinError) {
        setError(newPinError);
        return;
      }

      if (newPin !== confirmPin) {
        setError(t("profile.pinConfirmMismatch"));
        return;
      }

      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_pin",
          staff_code: profile.staff_code,
          current_pin: currentPin,
          new_pin: newPin,
          confirm_pin: confirmPin,
        }),
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        setError(result.error || t("profile.pinUpdateError"));
        return;
      }

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setShowPinForm(false);
      setSuccess(result.message || t("profile.pinUpdated"));
    } catch (pinError) {
      const message = pinError instanceof Error ? pinError.message : t("profile.pinUpdateError");
      setError(message);
    } finally {
      setSavingPin(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">{t("profile.loading")}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <img
                src={avatarSrc}
                alt={name || t("profile.title")}
                className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src = getFallbackAvatar(name || t("profile.user"));
                }}
              />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUploadPhoto}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("profile.changePhoto")}
                title={t("profile.changePhoto")}
              >
                {uploadingPhoto ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
                ) : (
                  <CameraIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-gray-400">{t("profile.title")}</p>
              <h1 className="text-2xl font-bold text-gray-900">{profile?.name || t("profile.user")}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {getRoleLabel(profile?.role || roleScope, t)} • {profile?.staff_code || "-"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {t("profile.status")}: <span className="font-semibold text-gray-900">{getStatusLabel(profile?.status || "", t)}</span>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircleIcon className="h-5 w-5" />
            {success}
          </div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <form onSubmit={handleSaveProfile} className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-black">
                <UserCircleIcon className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t("profile.personalData")}</h2>
                <p className="text-sm text-gray-500">{t("profile.personalDescription")}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t("profile.name")}</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={t("profile.namePlaceholder")}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t("profile.phone")}</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                  value={phone}
                  onChange={(event) =>
                    setPhone(sanitizePhoneNumber(event.target.value))
                  }
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={
                  savingProfile ||
                  uploadingPhoto ||
                  !hasProfileChanges
                }
                className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? t("common.saving") : t("profile.saveChanges")}
              </button>
            </div>
          </form>

          <aside className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">{t("profile.accountInfo")}</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-gray-400">{t("owner.staff.staffIdLabel")}</p>
                <p className="font-semibold text-gray-900">{profile?.staff_code || "-"}</p>
              </div>
              <div>
                <p className="text-gray-400">{t("owner.staff.role")}</p>
                <p className="font-semibold text-gray-900">{getRoleLabel(profile?.role || roleScope, t)}</p>
              </div>
              <div>
                <p className="text-gray-400">{t("owner.staff.type")}</p>
                <p className="font-semibold capitalize text-gray-900">{profile?.staff_type || "-"}</p>
              </div>
              <div>
                <p className="text-gray-400">{t("profile.status")}</p>
                <p className="font-semibold text-gray-900">{getStatusLabel(profile?.status || "", t)}</p>
              </div>
            </div>
          </aside>
        </section>

        {canChangePin ? (
          <section
            id="profile-security-section"
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-black">
                  <KeyIcon className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t("profile.security")}</h2>
                  <p className="text-sm text-gray-500">
                    {t("profile.securityDescription")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowPinForm((current) => !current);
                  setCurrentPin("");
                  setNewPin("");
                  setConfirmPin("");
                  setError("");
                  setSuccess("");
                }}
                className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                {showPinForm ? t("profile.closePinForm") : t("profile.changePin")}
              </button>
            </div>

            {showPinForm ? (
              <form onSubmit={handleChangePin} className="mt-6 grid gap-4 lg:grid-cols-3">
                <PinBoxesInput
                  label={t("profile.oldPin")}
                  value={currentPin}
                  onChange={setCurrentPin}
                  disabled={savingPin}
                  helperText={t("profile.oldPinHelper")}
                />
                <PinBoxesInput
                  label={t("profile.newPin")}
                  value={newPin}
                  onChange={setNewPin}
                  disabled={savingPin}
                  helperText={t("profile.newPinHelper")}
                />
                <PinBoxesInput
                  label={t("profile.confirmPin")}
                  value={confirmPin}
                  onChange={setConfirmPin}
                  disabled={savingPin}
                  helperText={t("profile.confirmPinHelper")}
                />

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end lg:col-span-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinForm(false);
                      setCurrentPin("");
                      setNewPin("");
                      setConfirmPin("");
                      setError("");
                    }}
                    disabled={savingPin}
                    className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={savingPin}
                    className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingPin ? t("common.updating") : t("profile.saveNewPin")}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
