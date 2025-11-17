'use client'

import { useState, useEffect } from "react";
import { FiMenu, FiX, FiBell } from "react-icons/fi";
import { usePathname, useSearchParams } from "next/navigation";
import ProfilePopout from "../profile/page";

// Menu untuk setiap role (tanpa query parameter)
const roleMenus = {
  owner: [
    { label: "Dashboard", href: "/owner/dashboard" },
    { label: "Staff Manager", href: "/owner/staff-manager" },

    { label: "Activity Log", href: "/owner/activitylog" },
        { label: "Settings", href: "/owner/settings" },
  ],
  manager: [

    { label: "Menu", href: "/manager/menu" },
    { label: "Variants", href: "/manager/variants" },
    { label: "Inventory", href: "/manager/inventory" },
    { label: "Table Manager", href: "/manager/table-manager" },
    { label: "Order", href: "/manager/order" },
  ],
  staff: [
    { label: "Dashboard", href: "/staff/dashboard" },
    { label: "POS", href: "/staff/pos" },
    { label: "Order", href: "/staff/order" },

  ],
};

const roleLabels = {
  owner: "Owner",
  manager: "Manager", 
  staff: "Staff",
};

// Helper function untuk menambahkan query parameter jika diperlukan
const getMenuItemHref = (href: string, shouldAddViewAsOwner: boolean) => {
  if (shouldAddViewAsOwner && !href.startsWith("/owner")) {
    return `${href}?viewAs=owner`;
  }
  return href;
};

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'manager' | 'staff'>('owner');
  const [mounted, setMounted] = useState(false);

  const isOwnerRoute = pathname.startsWith("/owner");
  const viewAsOwner = searchParams.get('viewAs') === 'owner';
  
  // Set mounted state untuk menghindari hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-sync selectedRole dengan pathname setelah component mounted
  useEffect(() => {
    if (mounted) {
      const autoRole: 'owner' | 'manager' | 'staff' = 
        pathname.startsWith("/staff") ? 'staff' :
        pathname.startsWith("/manager") ? 'manager' :
        'owner';
      setSelectedRole(autoRole);
    }
  }, [pathname, mounted]);

  // Jika bukan owner dan tidak viewAs=owner, tampilkan navbar sederhana (tanpa role tabs)
  const isStaffRoute = pathname.startsWith("/staff");
  const isManagerRoute = pathname.startsWith("/manager");
  const showRoleTabs = isOwnerRoute || viewAsOwner;

  // Navbar sederhana untuk staff/manager tanpa role tabs
  if (!showRoleTabs && (isStaffRoute || isManagerRoute)) {
    const simpleNavItems = isStaffRoute ? roleMenus.staff : roleMenus.manager;
    const selected = simpleNavItems.findIndex(item => {
      return item.href === pathname;
    });

    return (
      <>
        <nav className="bg-[#fafafa] border-b border-gray-200 px-4 py-3 flex items-center justify-between relative sticky top-0 z-50">
          {/* Kiri: Logo */}
          <div className="flex items-center">
            <img src="/logo/IZALogo2.png" alt="Logo" className="w-12 h-8 object-contain" />
          </div>

          {/* Tengah: Nav Items */}
          <div className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            {simpleNavItems.map((item, idx) => (
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
          <div className="hidden md:flex items-center gap-6">
            <FiBell className="w-5 h-5 text-gray-700 cursor-pointer" />
            <button onClick={() => setShowProfile(true)}>
              <img src="/avatar.jpg" alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            </button>
          </div>

          {/* Hamburger (mobile) */}
          <div className="flex md:hidden ml-auto">
            <button onClick={() => setOpen(!open)}>
              {open ? <FiX className="w-7 h-7" /> : <FiMenu className="w-7 h-7" />}
            </button>
          </div>

          {/* Mobile menu */}
          {open && (
            <div className="absolute top-full left-0 w-full bg-white shadow-lg z-50 flex flex-col md:hidden">
              {simpleNavItems.map((item, idx) => (
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

  // Owner navbar dengan role tabs
  const navItems = roleMenus[selectedRole];
  
  // Cek active state dengan mempertimbangkan query parameter
  const selected = navItems.findIndex(item => {
    return item.href === pathname;
  });

  // Handler untuk switch role
  const handleRoleSwitch = (role: 'owner' | 'manager' | 'staff') => {
    setSelectedRole(role);
    setShowRoleDropdown(false);
    // Tidak navigate, hanya ganti navbar tabs
  };

  // Render loading state jika belum mounted untuk avoid hydration mismatch
  if (!mounted) {
    return (
      <>
        <nav className="bg-[#fafafa] border-b border-gray-200 px-4 py-3 flex items-center justify-between relative sticky top-0 z-50">
          <div className="flex items-center">
            <img src="/logo/IZALogo2.png" alt="Logo" className="w-12 h-8 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="w-5 h-5 bg-gray-100 rounded-full animate-pulse" />
            <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      <nav className="bg-[#fafafa] border-b border-gray-200 px-4 py-3 flex items-center justify-between relative sticky top-0 z-50">
        {/* Kiri: Logo */}
        <div className="flex items-center">
          <img src="/logo/IZALogo2.png" alt="Logo" className="w-12 h-8 object-contain" />
        </div>

        {/* Tengah: Nav Items (tanpa role tabs) */}
        <div className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => {
                // Jika selectedRole bukan owner, tambahkan ?viewAs=owner
                const targetHref = selectedRole !== 'owner' 
                  ? `${item.href}?viewAs=owner`
                  : item.href;
                window.location.href = targetHref;
              }}
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
        <div className="hidden md:flex items-center gap-6">
          <FiBell className="w-5 h-5 text-gray-700 cursor-pointer" />
          <button onClick={() => setShowProfile(true)}>
            <img src="/avatar.jpg" alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
          </button>
        </div>

        {/* Hamburger (mobile) */}
        <div className="flex md:hidden ml-auto">
          <button onClick={() => setOpen(!open)}>
            {open ? <FiX className="w-7 h-7" /> : <FiMenu className="w-7 h-7" />}
          </button>
        </div>

        {/* Chevron Button - Absolute di bawah tengah navbar (hanya untuk Owner) */}
        <button
          onClick={() => setShowRoleDropdown(!showRoleDropdown)}
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 -bottom-[8px] w-8 h-6 bg-white border border-gray-300 rounded-xl items-center justify-center hover:bg-gray-50 transition z-[60]"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className={`w-4 h-4 text-gray-600 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Role Dropdown - 3 Cards Horizontal */}
        {showRoleDropdown && (
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full z-[55]">
            <div className="bg-white border border-gray-300 rounded-b-xl p-3 px-6 flex gap-3">
              {(Object.keys(roleMenus) as Array<keyof typeof roleMenus>).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSwitch(role)}
                  className={`py-[7.6px] rounded-lg text-sm font-medium transition min-w-[101px] ${
                    selectedRole === role
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {roleLabels[role]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {open && (
          <div className="absolute top-full left-0 w-full bg-white shadow-lg z-50 flex flex-col md:hidden">
            {/* Role tabs mobile */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex gap-2">
                {(Object.keys(roleMenus) as Array<keyof typeof roleMenus>).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      selectedRole === role
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            </div>

            {navItems.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => {
                  // Jika selectedRole bukan owner, tambahkan ?viewAs=owner
                  const targetHref = selectedRole !== 'owner' 
                    ? `${item.href}?viewAs=owner`
                    : item.href;
                  window.location.href = targetHref;
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