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
  const [mounted, setMounted] = useState(false);
  const isPublicPage =
    pathname === "/manager/login" ||
    pathname === "/manager/forgot-password" ||
    pathname === "/manager/reset-password";
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setMounted(true);
    setupNetworkMonitoring();
    const user = getCurrentUser();
    const role = user?.role;

    if (role === "owner" || role === "manager" || role === "staff") {
      setCurrentRole(role);
    }
  }, []);

  // Override manifest so iOS "Add to Home Screen" opens /manager/menu instead of /
  useEffect(() => {
    const existingLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    const previousHref = existingLink?.href ?? null;

    if (existingLink) {
      existingLink.href = "/manager-manifest.json";
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manager-manifest.json";
      document.head.appendChild(link);
    }

    return () => {
      // Restore original manifest when leaving manager pages
      const link = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (link && previousHref) {
        link.href = previousHref;
      }
    };
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
    <RoleGuard allowedRole="manager" loginPath="/manager/login">
      <div>
        <Navbar role="manager" canSwitchRole={currentRole === "owner"} />
        <main>{children}</main>
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}