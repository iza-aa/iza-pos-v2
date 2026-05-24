"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  GiftIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { SidebarTabset } from "@/app/components/shared";
import type { OwnerInsightCategory } from "@/lib/services/owner-insights/insightSchema";
import OverviewTab from "./tabs/OverviewTab";
import SalesTab from "./tabs/SalesTab";
import CustomerTab from "./tabs/CustomerTab";
import InventoryTab from "./tabs/InventoryTab";
import StaffTab from "./tabs/StaffTab";
import OperationsTab from "./tabs/OperationsTab";

type DashboardTab = Exclude<OwnerInsightCategory, "rewards"> | "customer";
type CustomerSection = "performance" | "create-discount";

const tabs: Array<{
  id: DashboardTab;
  label: string;
  description: string;
  icon: typeof Squares2X2Icon;
  children?: Array<{
    id: CustomerSection;
    label: string;
    icon: typeof ChartBarIcon;
  }>;
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
    id: "customer",
    label: "Customer",
    description: "Loyalty health",
    icon: UserCircleIcon,
    children: [
      { id: "performance", label: "Performance", icon: ChartBarIcon },
      { id: "create-discount", label: "Create Discount", icon: GiftIcon },
    ],
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
    label: "Operation",
    description: "Bottleneck flow",
    icon: ClipboardDocumentListIcon,
  },
];

const isDashboardTab = (value: string | null): value is DashboardTab => {
  return tabs.some((tab) => tab.id === value);
};

const isCustomerSection = (value: string | null): value is CustomerSection => {
  return value === "performance" || value === "create-discount";
};

export default function OwnerBusinessDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = useMemo<DashboardTab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "rewards") return "customer";
    return isDashboardTab(tab) ? tab : "overview";
  }, [searchParams]);

  const activeCustomerSection = useMemo<CustomerSection>(() => {
    const section = searchParams.get("section");
    return isCustomerSection(section) ? section : "performance";
  }, [searchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "rewards") {
      router.replace("/owner/dashboard?tab=customer");
      return;
    }
    if (tab && !isDashboardTab(tab)) {
      router.replace("/owner/dashboard?tab=overview");
    }
  }, [router, searchParams]);

  const setActiveTab = (tab: DashboardTab) => {
    router.push(
      tab === "customer"
        ? `/owner/dashboard?tab=customer&section=${activeCustomerSection}`
        : `/owner/dashboard?tab=${tab}`,
    );
  };

  const setCustomerSection = (section: CustomerSection) => {
    router.push(`/owner/dashboard?tab=customer&section=${section}`);
  };

  const renderTab = () => {
    if (activeTab === "sales") return <SalesTab />;
    if (activeTab === "customer") return <CustomerTab />;
    if (activeTab === "inventory") return <InventoryTab />;
    if (activeTab === "staff") return <StaffTab />;
    if (activeTab === "operations") return <OperationsTab />;
    return <OverviewTab />;
  };

  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-white">
      <div className="flex h-full min-h-0">
        <SidebarTabset
          title="Business Command"
          description="Analytics, decisions, and AI insights."
          items={tabs}
          activeId={activeTab}
          activeChildId={activeCustomerSection}
          onSelect={setActiveTab}
          onChildSelect={(_, section) => setCustomerSection(section)}
          mobileOpenLabel="Open owner dashboard menu"
          mobileCloseLabel="Close owner dashboard menu"
        />

        <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            {renderTab()}
          </div>
        </section>
      </div>
    </main>
  );
}
