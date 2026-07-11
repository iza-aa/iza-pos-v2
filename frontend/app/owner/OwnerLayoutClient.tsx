"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";
import GlobalNotificationPrompt from "../components/shared/notifications/GlobalNotificationPrompt";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const isPublicPage =
    pathname === "/owner/login" ||
    pathname === "/owner/forgot-password" ||
    pathname === "/owner/reset-password";

  useEffect(() => {
    setMounted(true);
    setupNetworkMonitoring();
  }, []);

  if (!mounted) {
    return null;
  }

  if (isPublicPage) {
    return (
      <div>
        <main>{children}</main>
        <ToastContainer />
      </div>
    );
  }

  return (
    <RoleGuard allowedRole="owner" loginPath="/owner/login">
      <div>
        <Navbar role="owner" canSwitchRole={true} />
        <main>{children}</main>
        <GlobalNotificationPrompt role="owner" />
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}
