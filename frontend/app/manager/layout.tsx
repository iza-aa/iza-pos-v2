"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/manager/login";

  useEffect(() => {
    setupNetworkMonitoring();
  }, []);

  return (
    <RoleGuard allowedRole="manager" loginPath="/manager/login">
      <div>
        {!isLoginPage && <Navbar role="manager" canSwitchRole={false} />}
        <main>{children}</main>
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}