'use client'

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import OwnerNavbar from "../components/ui/navbar/owner/page";
import CashierBaristaNavbar from "../components/ui/navbar/staff/cashier.barista/page";
import KitchenNavbar from "../components/ui/navbar/staff/kitchen/page";
import WaiterNavbar from "../components/ui/navbar/staff/waiters/page";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffType, setStaffType] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUserRole(localStorage.getItem('user_role'));
    setStaffType(localStorage.getItem('staff_type'));
  }, []);

  const hideNavbar = pathname === "/staff/login";

  // Don't render navbar until mounted or on login page
  if (!mounted || hideNavbar) {
    return <main>{children}</main>;
  }

  // Owner accessing staff routes → Use Owner Navbar with role selector
  if (userRole === 'owner') {
    return (
      <div>
        <OwnerNavbar />
        <main>{children}</main>
      </div>
    );
  }

  // Staff → Use navbar based on staff_type
  const renderStaffNavbar = () => {
    if (staffType === 'kitchen') return <KitchenNavbar />;
    if (staffType === 'cashier' || staffType === 'barista') return <CashierBaristaNavbar />;
    if (staffType === 'waiter') return <WaiterNavbar />;
    return null; // Fallback
  };

  return (
    <div>
      {renderStaffNavbar()}
      <main>{children}</main>
    </div>
  );
}

