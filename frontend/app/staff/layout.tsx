'use client'

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/ui/navbar/Navbar";
import FloatingAIAssistant from "../components/ui/FloatingAIAssistant";

type StaffType = 'kitchen' | 'cashier' | 'barista' | 'waiter';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffType, setStaffType] = useState<StaffType | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUserRole(localStorage.getItem('user_role'));
    const type = localStorage.getItem('staff_type') as StaffType | null;
    setStaffType(type);
  }, []);

  const hideNavbar = pathname === "/staff/login";

  // Don't render navbar until mounted or on login page
  if (!mounted || hideNavbar) {
    return <main>{children}</main>;
  }

  return (
    <div>
      <Navbar 
        role="staff" 
        staffType={staffType} 
        canSwitchRole={userRole === 'owner'} 
      />
      <main>{children}</main>
      {userRole === 'owner' && <FloatingAIAssistant />}
    </div>
  );
}

