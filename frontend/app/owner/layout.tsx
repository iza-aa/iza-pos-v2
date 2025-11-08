'use client'

// filepath: d:\iza-pos-v2\frontend\app\owner\layout.tsx
import { usePathname } from "next/navigation";
import Navbar from "../components/navbar/page";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/owner/login";

  return (
    <div>
      {!isLogin && <Navbar />}
      <main>{children}</main>
    </div>
  );
}