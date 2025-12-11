'use client'

import { useEffect } from 'react';
import { usePathname } from "next/navigation";
import { Navbar, FloatingAIAssistant, Toast as ToastContainer } from "../components/ui";
import { setupNetworkMonitoring } from '@/lib/errorHandling';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/owner/login";

  useEffect(() => {
    setupNetworkMonitoring();
  }, []);

  return (
    <div>
      {!isLogin && <Navbar role="owner" canSwitchRole={true} />}
      <main>{children}</main>
      {!isLogin && <FloatingAIAssistant />}
      <ToastContainer />
    </div>
  );
}