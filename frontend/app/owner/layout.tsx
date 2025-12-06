'use client'

import { usePathname } from "next/navigation";
import Navbar from "../components/ui/navbar/Navbar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/owner/login";

  return (
    <div>
      {!isLogin && <Navbar role="owner" canSwitchRole={true} />}
      <main>{children}</main>
    </div>
  );
}