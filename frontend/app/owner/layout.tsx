'use client'

import { usePathname } from "next/navigation";
import OwnerNavbar from "../components/ui/navbar/owner/page";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/owner/login";

  return (
    <div>
      {!isLogin && <OwnerNavbar />}
      <main>{children}</main>
    </div>
  );
}