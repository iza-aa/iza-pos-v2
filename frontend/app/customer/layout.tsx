"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ClockIcon,
  Cog6ToothIcon,
  GiftIcon,
  HomeIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import {
  ClockIcon as ClockIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  GiftIcon as GiftIconSolid,
  HomeIcon as HomeIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
} from "@heroicons/react/24/solid";
import RewardPromptTab from "@/app/components/customer/reward/RewardPromptTab";
import {
  type CustomerAccountSession,
  getStoredCustomerAccount,
} from "@/lib/customer/customerAccount";
import {
  type CustomerTableSession,
  validateStoredCustomerTableSession,
} from "@/lib/customer/customerSession";

interface NavItem {
  name: string;
  href: string;
  icon: typeof HomeIcon;
  iconSolid: typeof HomeIconSolid;
  memberOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    name: "Home",
    href: "/customer",
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    name: "Menu",
    href: "/customer/menu",
    icon: ShoppingBagIcon,
    iconSolid: ShoppingBagIconSolid,
  },
  {
    name: "Track",
    href: "/customer/track",
    icon: ClockIcon,
    iconSolid: ClockIconSolid,
  },
  {
    name: "Rewards",
    href: "/customer/rewards",
    icon: GiftIcon,
    iconSolid: GiftIconSolid,
    memberOnly: true,
  },
  {
    name: "Settings",
    href: "/customer/settings",
    icon: Cog6ToothIcon,
    iconSolid: Cog6ToothIconSolid,
  },
];

function shouldHideCustomerNavigation(pathname: string): boolean {
  return (
    pathname.startsWith("/customer/table/") ||
    pathname === "/customer/login" ||
    pathname === "/customer/register" ||
    pathname === "/customer/menu/checkout"
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/customer") {
    return pathname === "/customer";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [tableSession, setTableSession] = useState<CustomerTableSession | null>(null);
  const [customerAccount, setCustomerAccount] =
    useState<CustomerAccountSession | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    let isMounted = true;

    const validateSession = async () => {
      const validSession = await validateStoredCustomerTableSession();

      if (isMounted) {
        setTableSession(validSession);
        setCustomerAccount(getStoredCustomerAccount());
      }
    };

    void validateSession();

    return () => {
      isMounted = false;
    };
  }, [isClient, pathname]);

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => !item.memberOnly || customerAccount);
  }, [customerAccount]);

  if (!isClient || shouldHideCustomerNavigation(pathname)) {
    return <>{children}</>;
  }

  const sessionLabel = tableSession
    ? `${tableSession.table_number}${tableSession.floor_name ? ` • ${tableSession.floor_name}` : ""}`
    : "Take Away";

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0 lg:pt-16">
      <header className="fixed left-0 right-0 top-0 z-50 hidden border-b border-gray-200 bg-white lg:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <button
            type="button"
            onClick={() => router.push("/customer")}
            className="flex items-center gap-3"
          >
            <img
              src="/logo/IZALogo2.png"
              alt="IZA Coffee"
              className="h-9 w-auto object-contain"
            />

            <div className="text-left">
              <p className="text-xs font-medium text-gray-500">{sessionLabel}</p>
            </div>
          </button>

          <nav className="flex h-full items-center gap-6">
            {visibleNavItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const Icon = isActive ? item.iconSolid : item.icon;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`flex h-full items-center gap-2 border-b-2 px-1 text-sm transition ${
                    isActive
                      ? "border-gray-900 font-bold text-gray-900"
                      : "border-transparent font-medium text-gray-500 hover:font-semibold hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="min-w-[120px] text-right">
            {customerAccount ? (
              <p className="text-xs font-semibold text-gray-900">
                {customerAccount.name}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/customer/login")}
                className="text-xs font-semibold text-gray-500 transition hover:text-gray-900"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {tableSession ? (
        <div className="border-b border-gray-800 bg-gray-900 px-4 py-2 text-center text-white lg:hidden">
          <p className="text-xs">
            <span className="font-semibold">{tableSession.table_number}</span>
            {tableSession.floor_name ? (
              <span className="ml-2 text-gray-400">• {tableSession.floor_name}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      <main>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white lg:hidden">
        <div className="mx-auto max-w-lg px-4">
          <div className="flex justify-around">
            {visibleNavItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const Icon = isActive ? item.iconSolid : item.icon;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`flex flex-col items-center px-3 py-3 transition-colors ${
                    isActive ? "font-bold text-gray-900" : "font-medium text-gray-400"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="mt-1 text-xs">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {!customerAccount ? <RewardPromptTab /> : null}
    </div>
  );
}