'use client'

import { useState, useEffect } from "react";
import { FiBell } from "react-icons/fi";
import { usePathname } from "next/navigation";
import ProfilePopout from "../../profile/page";

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
    { label: "POS", href: "/staff/pos" },
    { label: "Order", href: "/staff/order" },
    { label: "Kitchen", href: "/staff/kitchen" },
  ],
};

const roleLabels = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export default function OwnerNavbar() {
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'manager' | 'staff'>('owner');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-sync selectedRole dengan pathname
  useEffect(() => {
    if (mounted) {
      const autoRole: 'owner' | 'manager' | 'staff' = 
        pathname.startsWith("/staff") ? 'staff' :
        pathname.startsWith("/manager") ? 'manager' :
        'owner';
      setSelectedRole(autoRole);
    }
  }, [pathname, mounted]);

  let navItems = roleMenus[selectedRole];

  const selected = navItems.findIndex(item => item.href === pathname);

  const handleRoleSwitch = (role: 'owner' | 'manager' | 'staff') => {
    setSelectedRole(role);
    setShowRoleDropdown(false);
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <nav className="bg-[#fafafa] border-b border-gray-200 px-4 py-3 flex items-center justify-between relative sticky top-0 z-50">
        {/* Left: Logo */}
        <div className="flex items-center">
          <img src="/logo/IZALogo2.png" alt="Logo" className="w-12 h-8 object-contain" />
        </div>

        {/* Center: Nav Items */}
        <div className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
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

        {/* Right: Icon & Avatar */}
        <div className="hidden md:flex items-center gap-6">
          <FiBell className="w-5 h-5 text-gray-700 cursor-pointer" />
          <button onClick={() => setShowProfile(true)}>
            <img src="/avatar.jpg" alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
          </button>
        </div>

        {/* Chevron Button - Role Selector Toggle */}
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

        {/* Role Dropdown */}
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
      </nav>

      {/* Profile Popout */}
      {showProfile && (
        <ProfilePopout onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}
