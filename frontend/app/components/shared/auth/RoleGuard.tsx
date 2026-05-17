"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";

type UserRole = "staff" | "manager" | "owner";

type RoleGuardProps = {
  children: React.ReactNode;
  allowedRole: UserRole;
  loginPath: string;
  verifyActiveStaff?: boolean;
};

type GuardState = "checking" | "allowed" | "redirecting";

const dashboardByRole: Record<UserRole, string> = {
  staff: "/staff/dashboard",
  manager: "/manager/dashboard",
  owner: "/owner/dashboard",
};

const loginByRole: Record<UserRole, string> = {
  staff: "/staff/login",
  manager: "/manager/login",
  owner: "/owner/login",
};

const isKnownRole = (role: string | null | undefined): role is UserRole => {
  return role === "staff" || role === "manager" || role === "owner";
};

function RoleGuardLoading() {
  return (
    <main className="flex h-[calc(110vh-64px)] items-center justify-center bg-gray-100 px-6">
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
  verifyActiveStaff = true,
}: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [guardState, setGuardState] = useState<GuardState>("checking");

  const isLoginPage = useMemo(() => pathname === loginPath, [pathname, loginPath]);

  useEffect(() => {
    let isCancelled = false;

    const checkAccess = async () => {
      if (isLoginPage) {
        if (!isCancelled) setGuardState("allowed");
        return;
      }

      if (!isCancelled) setGuardState("checking");

      const currentUser = getCurrentUser();
      const currentRole = currentUser?.role;

      if (!currentUser || !isKnownRole(currentRole)) {
        if (!isCancelled) {
          setGuardState("redirecting");
          router.replace(loginPath);
        }
        return;
      }

      if (currentRole !== allowedRole) {
        if (!isCancelled) {
          setGuardState("redirecting");
          router.replace(dashboardByRole[currentRole] ?? loginByRole[allowedRole]);
        }
        return;
      }

      if (verifyActiveStaff && currentUser.id && allowedRole !== "owner") {
        const { data, error } = await supabase
          .from("staff")
          .select("id, status, role")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (error || !data || data.status !== "active" || data.role !== allowedRole) {
          localStorage.clear();

          if (!isCancelled) {
            setGuardState("redirecting");
            router.replace(loginPath);
          }
          return;
        }
      }

      if (!isCancelled) {
        setGuardState("allowed");
      }
    };

    void checkAccess();

    return () => {
      isCancelled = true;
    };
  }, [allowedRole, isLoginPage, loginPath, router, verifyActiveStaff]);

  if (guardState !== "allowed") {
    return <RoleGuardLoading />;
  }

  return <>{children}</>;
}