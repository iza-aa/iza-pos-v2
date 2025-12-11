"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/authUtils";
import { Navbar, FloatingAIAssistant, Toast as ToastContainer } from "../components/ui";
import { setupNetworkMonitoring } from '@/lib/errorHandling';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/manager/login";
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUserRole(currentUser?.role || null);
    setMounted(true);
    setupNetworkMonitoring();
  }, []);

  if (!mounted) {
    return <main>{children}</main>;
  }

  return (
    <div>
      {!isLoginPage && (
        <Navbar role="manager" canSwitchRole={userRole === "owner"} />
      )}
      <main>{children}</main>
      {!isLoginPage && userRole === "owner" && <FloatingAIAssistant />}
    </div>
  );
}
