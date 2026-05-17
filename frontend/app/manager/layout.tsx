"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";
import { getCurrentUser } from "@/lib/utils";

type UserRole = "staff" | "manager" | "owner";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/manager/login";
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setupNetworkMonitoring();
    const user = getCurrentUser();
    const role = user?.role;

    if (role === "owner" || role === "manager" || role === "staff") {
      setCurrentRole(role);
    }
  }, []);

  return (
    <RoleGuard allowedRole="manager" loginPath="/manager/login">
      <div>
        {!isLogin && (
          <Navbar role="manager" canSwitchRole={currentRole === "owner"} />
        )}
        <main>{children}</main>
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}