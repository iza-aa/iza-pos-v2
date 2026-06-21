"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, cleanupDeprecatedStorage, storeInternalIdentity } from "@/lib/utils";

type UserRole = "staff" | "manager" | "owner";

type RoleGuardProps = {
  children: React.ReactNode;
  allowedRole: UserRole;
  loginPath: string;
};

type GuardState = "checking" | "allowed" | "redirecting";

const dashboardByRole: Record<UserRole, string> = {
  staff: "/staff/attendance",
  manager: "/manager/menu",
  owner: "/owner/dashboard",
};

const loginByRole: Record<UserRole, string> = {
  staff: "/staff/login",
  manager: "/manager/login",
  owner: "/owner/login",
};

const roleRank: Record<UserRole, number> = {
  staff: 1,
  manager: 2,
  owner: 3,
};

const isKnownRole = (role: string | null | undefined): role is UserRole => {
  return role === "staff" || role === "manager" || role === "owner";
};

const canAccessRoleArea = (currentRole: UserRole, requiredRole: UserRole) => {
  return roleRank[currentRole] >= roleRank[requiredRole];
};

function RoleGuardLoading() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-100 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
        <p className="text-sm font-medium text-gray-900">Memeriksa akses...</p>
        <p className="mt-1 text-xs text-gray-500">Mohon tunggu sebentar.</p>
      </div>
    </main>
  );
}

export default function RoleGuard({
  children,
  allowedRole,
  loginPath,
}: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [guardState, setGuardState] = useState<GuardState>("checking");

  const isLoginPage = useMemo(() => pathname === loginPath, [pathname, loginPath]);

  useEffect(() => {
    setHydrated(true);
    let isCancelled = false;

    const checkAccess = async () => {
      if (isLoginPage) {
        if (!isCancelled) setGuardState("allowed");
        return;
      }

      if (!isCancelled) setGuardState("checking");

      const response = await fetch("/api/internal-session", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      }).catch(() => null);
      const result = response
        ? await response.json().catch(() => ({})) as {
            authenticated?: boolean;
            user?: {
              id: string;
              name: string;
              role: string;
              staff_code?: string | null;
              staff_type?: string | null;
              profile_picture?: string | null;
            };
          }
        : {};
      const currentUser = result.authenticated ? result.user : null;
      const currentRole = currentUser?.role;

      if (!currentUser || !isKnownRole(currentRole)) {
        clearAuth();
        if (!isCancelled) {
          setGuardState("redirecting");
          router.replace(loginPath);
        }
        return;
      }

      if (!canAccessRoleArea(currentRole, allowedRole)) {
        if (!isCancelled) {
          setGuardState("redirecting");
          router.replace(dashboardByRole[currentRole] ?? loginByRole[allowedRole]);
        }
        return;
      }

      storeInternalIdentity({
        id: currentUser.id,
        name: currentUser.name,
        role: currentRole,
        staffCode: currentUser.staff_code,
        staffType: currentUser.staff_type,
        profilePicture: currentUser.profile_picture,
      });
      cleanupDeprecatedStorage();

      if (!isCancelled) setGuardState("allowed");
    };

    void checkAccess();

    return () => {
      isCancelled = true;
    };
  }, [allowedRole, isLoginPage, loginPath, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!hydrated) {
    return null;
  }

  if (guardState !== "allowed") {
    return <RoleGuardLoading />;
  }

  return <>{children}</>;
}
