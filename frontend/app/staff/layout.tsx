'use client'

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import { Navbar, FloatingAIAssistant, Toast as ToastContainer } from "../components/ui";
import { setupNetworkMonitoring } from '@/lib/services/errorHandling';

type StaffType = 'kitchen' | 'cashier' | 'barista' | 'waiter';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffType, setStaffType] = useState<StaffType | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUserRole(localStorage.getItem('user_role'));
    const type = localStorage.getItem('staff_type') as StaffType | null;
    setStaffType(type);
    setupNetworkMonitoring();
    
    // Verify staff still exists in database
    const verifyStaff = async () => {
      const user = getCurrentUser();
      
      if (user && user.role === 'staff' && pathname !== '/staff/login') {
        const { data, error } = await supabase
          .from('staff')
          .select('id, status')
          .eq('id', user.id)
          .maybeSingle();
        
        // If staff not found or inactive, logout
        if (error || !data || data.status !== 'active') {
          localStorage.clear();
          router.push('/staff/login');
        }
      }
    };
    
    verifyStaff();
  }, [pathname, router]);

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
      <ToastContainer />
    </div>
  );
}

