"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getCurrentUser } from "@/lib/utils";
import { useLanguage } from "../i18n";

type UserRole = "owner" | "manager" | "staff";

type ProfileModalProps = {
  onClose: () => void;
};

type CurrentUser = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  staff_code?: string | null;
  staff_type?: string | null;
  profile_picture?: string | null;
};

const getProfilePath = (role?: string | null) => {
  if (role === "owner") return "/owner/profile";
  if (role === "manager") return "/manager/profile";
  return "/staff/profile";
};

const getLogoutPath = (role?: string | null) => {
  if (role === "manager") return "/manager/login";
  if (role === "owner") return "/owner/login";
  return "/staff/login";
};

const getFallbackAvatar = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}&background=e5e7eb&color=374151`;
};

const readUserFromStorage = (): CurrentUser => {
  if (typeof window === "undefined") return {};

  const currentUser = getCurrentUser?.() as CurrentUser | null;

  return {
    id: currentUser?.id ?? localStorage.getItem("user_id"),
    name: currentUser?.name ?? localStorage.getItem("user_name"),
    role: currentUser?.role ?? localStorage.getItem("user_role"),
    staff_code: currentUser?.staff_code ?? localStorage.getItem("staff_code"),
    staff_type: currentUser?.staff_type ?? localStorage.getItem("staff_type"),
    profile_picture:
      currentUser?.profile_picture ?? localStorage.getItem("profile_picture"),
  };
};

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<CurrentUser>({});

  useEffect(() => {
    setUser(readUserFromStorage());
  }, []);

  const displayName = user.name || "User";
  const role = (user.role || "staff") as UserRole;
  const roleLabel = role === "owner" || role === "manager" || role === "staff"
    ? t(`role.${role}` as "role.owner" | "role.manager" | "role.staff")
    : t("role.user");
  const profilePath = getProfilePath(role);
  const avatarSrc = user.profile_picture || getFallbackAvatar(displayName);

  const subtitle = useMemo(() => {
    const parts = [roleLabel];

    if (user.staff_code) parts.push(user.staff_code);
    if (role === "staff" && user.staff_type) parts.push(user.staff_type);

    return parts.filter(Boolean).join(" • ");
  }, [role, roleLabel, user.staff_code, user.staff_type]);

  const handleNavigate = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleLogout = () => {
    const logoutPath = getLogoutPath(role);

    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    localStorage.removeItem("staff_type");
    localStorage.removeItem("staff_code");
    localStorage.removeItem("profile_picture");

    onClose();
    router.push(logoutPath);
  };

  return (
    <div className="fixed inset-0 z-90" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/10"
        aria-label={t("profile.open")}
        onClick={onClose}
      />

      <div className="absolute right-4 top-16 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-gray-100 bg-white p-4 shadow-2xl md:right-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={avatarSrc}
              alt={displayName}
              className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).src = getFallbackAvatar(displayName);
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="truncate text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={t("common.close")}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleNavigate(profilePath)}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm">
              <UserCircleIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{t("profile.manage")}</span>
              <span className="block text-xs text-gray-500">{t("profile.manageDescription")}</span>
            </span>
          </button>

        </div>

        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            {t("profile.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
