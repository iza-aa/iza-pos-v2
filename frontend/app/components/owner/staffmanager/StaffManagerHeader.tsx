"use client";

import { ReactNode } from "react";
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../../shared/i18n";

interface StaffManagerHeaderProps {
  onAddStaff?: () => void;
  children?: ReactNode;
  activeTab?: "staff" | "attendance";
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export default function StaffManagerHeader({
  onAddStaff,
  children,
  activeTab = "staff",
  searchQuery = "",
  onSearchChange,
  showSearch = true,
}: StaffManagerHeaderProps) {
  const { t } = useLanguage();
  const shouldShowSearch = activeTab === "staff" && showSearch && onSearchChange;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        {shouldShowSearch && (
          <div className="w-full lg:max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t("owner.staff.search")}
                className="h-10.5 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  title={t("owner.staff.clearSearch")}
                  aria-label={t("owner.staff.clearSearch")}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {onAddStaff && activeTab === "staff" && (
            <button
              type="button"
              onClick={onAddStaff}
              className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-gray-900 text-white transition hover:bg-gray-800 md:h-10.5 md:w-10.5"
              title={t("owner.staff.addStaff")}
              aria-label={t("owner.staff.addStaff")}
            >
              <UserPlusIcon className="h-5 w-5" />
            </button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
