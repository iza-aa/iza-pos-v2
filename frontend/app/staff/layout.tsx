"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";
import { getCurrentUser } from "@/lib/utils";
import { canAccessStaffPath, getStaffHomePath } from "@/lib/utils/staffAccess";
import type { StaffPosition } from "@/lib/staff/positions";

type UserRole = "staff" | "manager" | "owner";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/staff/login";
  const [staffType, setStaffType] = useState<StaffPosition | null>(null);
  const [staffPositions, setStaffPositions] = useState<StaffPosition[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setupNetworkMonitoring();
    const user = getCurrentUser();
    const role = user?.role;
    setStaffType(user?.staffType ?? null);
    setStaffPositions(user?.positions ?? []);

    if (role === "owner" || role === "manager" || role === "staff") {
      setCurrentRole(role);
    }

    if (
      !isLogin &&
      user?.role === "staff" &&
      !canAccessStaffPath({
        path: pathname,
        role: user.role,
        positions: user.positions,
        staffType: user.staffType,
      })
    ) {
      router.replace(getStaffHomePath(user.positions, user.staffType));
    }
  }, [isLogin, pathname, router]);

  // Override manifest so iOS "Add to Home Screen" opens /staff instead of /
  useEffect(() => {
    const existingLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    const previousHref = existingLink?.href ?? null;

    if (existingLink) {
      existingLink.href = "/staff-manifest.json";
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/staff-manifest.json";
      document.head.appendChild(link);
    }

    return () => {
      // Restore original manifest when leaving staff pages
      const link = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (link && previousHref) {
        link.href = previousHref;
      }
    };
  }, []);

  return (
    <RoleGuard allowedRole="staff" loginPath="/staff/login">
      <div>
        {!isLogin && (
          <Navbar
            role="staff"
            staffType={staffType}
            staffPositions={staffPositions}
            canSwitchRole={currentRole === "owner"}
          />
        )}
        <main>{children}</main>
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}
