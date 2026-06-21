"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import CustomerDiscountDashboard from "./customer/CustomerDiscountDashboard";
import CustomerPerformanceDashboard from "./customer/CustomerPerformanceDashboard";

type CustomerSection = "performance" | "create-discount";

const isCustomerSection = (value: string | null): value is CustomerSection => {
  return value === "performance" || value === "create-discount";
};

export default function CustomerTab() {
  const searchParams = useSearchParams();

  const activeSection = useMemo<CustomerSection>(() => {
    const section = searchParams.get("section");
    return isCustomerSection(section) ? section : "performance";
  }, [searchParams]);

  return activeSection === "create-discount" ? (
    <CustomerDiscountDashboard />
  ) : (
    <CustomerPerformanceDashboard />
  );
}
