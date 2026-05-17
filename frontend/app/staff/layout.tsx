"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";

type StaffType = "kitchen" | "cashier" | "barista" | "waiter";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/staff/login";
  const [staffType, setStaffType] = useState<StaffType | null>(null);

  useEffect(() => {
    setStaffType(localStorage.getItem("staff_type") as StaffType | null);
    setupNetworkMonitoring();
  }, []);

  return (
    <RoleGuard allowedRole="staff" loginPath="/staff/login">
      <div>
        {!isLoginPage && (
          <Navbar role="staff" staffType={staffType} canSwitchRole={false} />
        )}
        <main>{children}</main>
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}