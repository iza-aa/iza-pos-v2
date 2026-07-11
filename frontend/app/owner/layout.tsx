"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";

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

  // Override manifest so iOS "Add to Home Screen" opens /owner/dashboard instead of /
  useEffect(() => {
    const existingLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    const previousHref = existingLink?.href ?? null;

    if (existingLink) {
      existingLink.href = "/owner-manifest.json";
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/owner-manifest.json";
      document.head.appendChild(link);
    }

    return () => {
      // Restore original manifest when leaving owner pages
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
    <RoleGuard allowedRole="owner" loginPath="/owner/login">
      <div>
        <Navbar role="owner" canSwitchRole={true} />
        <main>{children}</main>
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}
