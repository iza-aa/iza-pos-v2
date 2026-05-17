"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar, FloatingAIAssistant, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/owner/login";

  useEffect(() => {
    setupNetworkMonitoring();
  }, []);

  return (
    <RoleGuard allowedRole="owner" loginPath="/owner/login" verifyActiveStaff={false}>
      <div>
        {!isLoginPage && <Navbar role="owner" canSwitchRole={false} />}
        <main>{children}</main>
        {!isLoginPage && <FloatingAIAssistant />}
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}