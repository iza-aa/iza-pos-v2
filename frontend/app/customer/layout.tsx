/**
 * Customer Layout with Bottom Navigation
 * Mobile-first PWA layout with bottom nav bar
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  HomeIcon,
  ShoppingBagIcon,
  ClockIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  ClockIcon as ClockIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
  {
    name: 'Home',
    href: '/customer',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    name: 'Order',
    href: '/customer/order',
    icon: ShoppingBagIcon,
    iconSolid: ShoppingBagIconSolid,
  },
  {
    name: 'Track',
    href: '/customer/track',
    icon: ClockIcon,
    iconSolid: ClockIconSolid,
  },
  {
    name: 'Settings',
    href: '/customer/settings',
    icon: Cog6ToothIcon,
    iconSolid: Cog6ToothIconSolid,
  },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Set isClient flag after mount to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Check if user has selected a table (use localStorage, not sessionStorage)
    const storedTable = localStorage.getItem('customer_table');
    
    if (!storedTable && pathname !== '/customer/table') {
      // No table session - just don't show table info, but DON'T redirect
      // Let each page handle their own redirect logic
      setTableInfo(null);
    } else if (storedTable) {
      try {
        setTableInfo(JSON.parse(storedTable));
      } catch (e) {
        console.error('Failed to parse table info:', e);
        setTableInfo(null);
      }
    }

    // Check if we should hide bottom nav
    if (pathname === '/customer/table') {
      setShowBottomNav(false);
    } else if (pathname === '/customer/menu' && !storedTable) {
      // Hide bottom nav on menu page when loading (no localStorage)
      setShowBottomNav(false);
    } else {
      setShowBottomNav(true);
    }
  }, [pathname, isClient]);

  // Don't show bottom nav on table selection page
  if (!showBottomNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Table Info Header */}
      {tableInfo && (
        <div className="bg-gray-900 text-white px-4 py-2 text-center">
          <p className="text-sm">
            <span className="font-medium">{tableInfo.table_number}</span>
            {tableInfo.floor_name && (
              <span className="text-gray-400 ml-2">• {tableInfo.floor_name}</span>
            )}
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-4">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = isActive ? item.iconSolid : item.icon;

              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`flex flex-col items-center py-3 px-4 transition-colors ${
                    isActive ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs mt-1 font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
