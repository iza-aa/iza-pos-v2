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
import { useLanguage, type TranslationKey } from "@/app/components/shared/i18n";
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
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof Squares2X2Icon;
  children?: Array<{
    id: CustomerSection;
    labelKey: TranslationKey;
    icon: typeof ChartBarIcon;
  }>;
}> = [
  {
    id: "overview",
    labelKey: "owner.dashboard.overview",
    descriptionKey: "owner.dashboard.overviewDescription",
    icon: Squares2X2Icon,
  },
  {
    id: "sales",
    labelKey: "owner.dashboard.sales",
    descriptionKey: "owner.dashboard.salesDescription",
    icon: ChartBarIcon,
  },
  {
    id: "customer",
    labelKey: "owner.dashboard.customer",
    descriptionKey: "owner.dashboard.customerDescription",
    icon: UserCircleIcon,
    children: [
      { id: "performance", labelKey: "owner.dashboard.customerPerformance", icon: ChartBarIcon },
      { id: "create-discount", labelKey: "owner.dashboard.createDiscount", icon: GiftIcon },
    ],
  },
  {
    id: "inventory",
    labelKey: "owner.dashboard.inventory",
    descriptionKey: "owner.dashboard.inventoryDescription",
    icon: CubeIcon,
  },
  {
    id: "staff",
    labelKey: "owner.dashboard.staff",
    descriptionKey: "owner.dashboard.staffDescription",
    icon: UserGroupIcon,
  },
  {
    id: "operations",
    labelKey: "owner.dashboard.operation",
    descriptionKey: "owner.dashboard.operationDescription",
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
  const { t } = useLanguage();
  const localizedTabs = useMemo(
    () => tabs.map((tab) => ({
      ...tab,
      label: t(tab.labelKey),
      description: t(tab.descriptionKey),
      children: tab.children?.map((child) => ({
        ...child,
        label: t(child.labelKey),
      })),
    })),
    [t],
  );
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
          title={t("owner.dashboard.title")}
          description={t("owner.dashboard.description")}
          items={localizedTabs}
          activeId={activeTab}
          activeChildId={activeCustomerSection}
          onSelect={setActiveTab}
          onChildSelect={(_, section) => setCustomerSection(section)}
          mobileOpenLabel={t("owner.dashboard.mobileOpen")}
          mobileCloseLabel={t("owner.dashboard.mobileClose")}
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
