"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArchiveBoxIcon,
  Bars3Icon,
  ChartBarIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  Squares2X2Icon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { OwnerInsightCategory } from "@/lib/services/owner-insights/insightSchema";
import OverviewTab from "./tabs/OverviewTab";
import SalesTab from "./tabs/SalesTab";
import RewardsTab from "./tabs/RewardsTab";
import InventoryTab from "./tabs/InventoryTab";
import StaffTab from "./tabs/StaffTab";
import OperationsTab from "./tabs/OperationsTab";
import type { RewardsSubTab } from "./tabs/rewards/RewardsSubTabs";

type DashboardTab = OwnerInsightCategory;

const tabs: Array<{
  id: DashboardTab;
  label: string;
  description: string;
  icon: typeof Squares2X2Icon;
}> = [
  {
    id: "overview",
    label: "Overview",
    description: "Executive view",
    icon: Squares2X2Icon,
  },
  {
    id: "sales",
    label: "Sales",
    description: "Revenue signals",
    icon: ChartBarIcon,
  },
  {
    id: "rewards",
    label: "Rewards",
    description: "Loyalty decisions",
    icon: ArchiveBoxIcon,
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock risk",
    icon: CubeIcon,
  },
  {
    id: "staff",
    label: "Staff",
    description: "Shift health",
    icon: UserGroupIcon,
  },
  {
    id: "operations",
    label: "Operations",
    description: "Order flow",
    icon: ClipboardDocumentListIcon,
  },
];

const isDashboardTab = (value: string | null): value is DashboardTab => {
  return tabs.some((tab) => tab.id === value);
};

const isRewardsSubTab = (value: string | null): value is RewardsSubTab => {
  return value === "performance" || value === "strategy";
};

const rewardsSubTabs: Array<{
  id: RewardsSubTab;
  label: string;
  icon: typeof ChartBarIcon;
}> = [
  { id: "performance", label: "Performance", icon: ChartBarIcon },
  { id: "strategy", label: "Strategy", icon: AdjustmentsHorizontalIcon },
];

export default function OwnerBusinessDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSidebar, setShowSidebar] = useState(false);

  const activeTab = useMemo<DashboardTab>(() => {
    const tab = searchParams.get("tab");
    return isDashboardTab(tab) ? tab : "overview";
  }, [searchParams]);

  const activeRewardsSubTab = useMemo<RewardsSubTab>(() => {
    const section = searchParams.get("section");
    return isRewardsSubTab(section) ? section : "performance";
  }, [searchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && !isDashboardTab(tab)) {
      router.replace("/owner/dashboard?tab=overview");
    }
  }, [router, searchParams]);

  const setActiveTab = (tab: DashboardTab) => {
    const suffix = tab === "rewards" ? "&section=performance" : "";
    router.push(`/owner/dashboard?tab=${tab}${suffix}`);
    setShowSidebar(false);
  };

  const setActiveRewardsSubTab = (section: RewardsSubTab) => {
    router.push(`/owner/dashboard?tab=rewards&section=${section}`);
    setShowSidebar(false);
  };

  const renderTab = () => {
    if (activeTab === "sales") return <SalesTab />;
    if (activeTab === "rewards") return <RewardsTab section={activeRewardsSubTab} />;
    if (activeTab === "inventory") return <InventoryTab />;
    if (activeTab === "staff") return <StaffTab />;
    if (activeTab === "operations") return <OperationsTab />;
    return <OverviewTab />;
  };

  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setShowSidebar(true)}
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:scale-105 lg:hidden"
        aria-label="Open owner dashboard menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {showSidebar ? (
        <button
          type="button"
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          aria-label="Close owner dashboard menu overlay"
        />
      ) : null}

      <div className="flex h-full min-h-0">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-gray-200 bg-white p-4 transition-transform lg:static lg:z-auto lg:flex lg:w-64 lg:translate-x-0 lg:flex-col ${
            showSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Business Command</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Analytics, decisions, and AI insights.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Close owner dashboard menu"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <div key={tab.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full rounded-lg px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`} />
                        <div>
                          <p className="text-sm font-semibold">{tab.label}</p>
                          <p className={`mt-0.5 text-xs ${isActive ? "text-gray-200" : "text-gray-400"}`}>
                            {tab.description}
                          </p>
                        </div>
                      </div>
                      {tab.id === "rewards" && isActive ? (
                        <ChevronDownIcon className="h-4 w-4 shrink-0 text-white" />
                      ) : null}
                    </div>
                  </button>

                  {tab.id === "rewards" && isActive ? (
                    <div className="ml-6 space-y-1 border-l border-gray-200 py-1 pl-3">
                      {rewardsSubTabs.map((subTab) => {
                        const SubIcon = subTab.icon;
                        const isSubActive = activeRewardsSubTab === subTab.id;

                        return (
                          <button
                            key={subTab.id}
                            type="button"
                            onClick={() => setActiveRewardsSubTab(subTab.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                              isSubActive
                                ? "bg-gray-100 font-bold text-gray-900"
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          >
                            <SubIcon className={`h-3.5 w-3.5 ${isSubActive ? "text-gray-900" : "text-gray-400"}`} />
                            {subTab.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            {renderTab()}
          </div>
        </section>
      </div>
    </main>
  );
}
