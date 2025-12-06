"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import OwnerNavbar from "../components/ui/navbar/owner/page";
import ManagerNavbar from "../components/ui/navbar/manager/page";

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
    const role = localStorage.getItem("user_role");
    setUserRole(role);
    setMounted(true);
  }, []);

  if (!mounted) {
    return <main>{children}</main>;
  }

  return (
    <div>
      {!isLoginPage && (
        <>
          {userRole === "owner" ? <OwnerNavbar /> : <ManagerNavbar />}
        </>
      )}
      <main>{children}</main>
    </div>
  );
}
