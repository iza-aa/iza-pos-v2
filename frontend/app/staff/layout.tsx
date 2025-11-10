'use client'

import Navbar from "../components/ui/navbar/page";
import { usePathname } from "next/navigation";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Jangan tampilkan navbar di halaman login staff
  const hideNavbar = pathname === "/staff/login";

  return (
    <div>
      {!hideNavbar && <Navbar />}
      <main>{children}</main>
    </div>
  );
}