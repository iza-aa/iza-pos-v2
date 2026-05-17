"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar, Toast as ToastContainer } from "../components/ui";
import RoleGuard from "../components/shared/auth/RoleGuard";
import { setupNetworkMonitoring } from "@/lib/services/errorHandling";
import { getCurrentUser } from "@/lib/utils";

type StaffType = "kitchen" | "cashier" | "barista" | "waiter";
type UserRole = "staff" | "manager" | "owner";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/staff/login";
  const [staffType, setStaffType] = useState<StaffType | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setupNetworkMonitoring();
    setStaffType(localStorage.getItem("staff_type") as StaffType | null);

    const user = getCurrentUser();
    const role = user?.role;

    if (role === "owner" || role === "manager" || role === "staff") {
      setCurrentRole(role);
    }
  }, []);

  return (
    <RoleGuard allowedRole="staff" loginPath="/staff/login">
      <div>
        {!isLogin && (
          <Navbar
            role="staff"
            staffType={staffType}
            canSwitchRole={currentRole === "owner"}
          />
        )}
        <main>{children}</main>
        <ToastContainer />
      </div>
    </RoleGuard>
  );
}