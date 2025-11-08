'use client'

import { useState } from "react";
import { FiMenu, FiX, FiBell } from "react-icons/fi";
import { usePathname } from "next/navigation";
import ProfilePopout from "../profile/page"; // Import komponen profile

const ownerNav = [
  { label: "Dashboard", href: "/owner/dashboard" },
  { label: "Menu", href: "/owner/menu" },
  { label: "Products", href: "/owner/products" },
  { label: "Staff Manager", href: "/owner/staff-manager" },
  { label: "Table Manager", href: "/owner/table-manager" },
  { label: "Customers", href: "/owner/customers" },
];

const staffNav = [
  { label: "Dashboard", href: "/staff/dashboard" },   
  { label: "Pesanan", href: "/staff/orders" },
  { label: "Shift", href: "/staff/shift" },
  // Tambahkan menu staff lain jika perlu
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Pilih menu sesuai role berdasarkan pathname
  const isStaff = pathname.startsWith("/staff");
  const navItems = isStaff ? staffNav : ownerNav;
  const selected = navItems.findIndex(item => item.href === pathname);

  return (
    <>
      <nav className="bg-[#fafafa] border-b border-gray-200 px-4 py-3 grid grid-cols-3 items-center relative sticky top-0 z-50">
        {/* Kiri: Logo */}
        <div className="flex items-center col-start-1">
          <img src="/logo/IZALogo2.png" alt="Logo" className="w-12 h-8 object-contain" />
        </div>

        {/* Tengah: Desktop menu */}
        <div className="hidden md:flex justify-self-center gap-8 col-start-2">
          {navItems.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => window.location.href = item.href}
              className={`text-base transition font-medium ${
                selected === idx
                  ? "text-gray-900 font-bold"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Kanan: Icon & Avatar */}
        <div className="hidden md:flex items-center justify-self-end gap-6 col-start-3">
          <FiBell className="w-5 h-5 text-gray-700 cursor-pointer" />
          <button onClick={() => setShowProfile(true)}>
            <img src="/avatar.jpg" alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
          </button>
        </div>

        {/* Hamburger (mobile) */}
        <div className="flex md:hidden justify-end col-start-3">
          <button onClick={() => setOpen(!open)}>
            {open ? <FiX className="w-7 h-7" /> : <FiMenu className="w-7 h-7" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="absolute top-full left-0 w-full bg-white shadow-lg z-50 flex flex-col">
            {navItems.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => {
                  window.location.href = item.href;
                  setOpen(false);
                }}
                className={`py-4 px-6 text-left text-base border-b border-gray-100 ${
                  selected === idx
                    ? "text-gray-900 font-bold"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Popout Profile */}
      {showProfile && (
        <ProfilePopout onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}