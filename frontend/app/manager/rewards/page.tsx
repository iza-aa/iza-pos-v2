"use client";

import { useEffect } from "react";
import { getCurrentUser } from "@/lib/utils";

export default function ManagerRewardsRedirectPage() {
  useEffect(() => {
    const user = getCurrentUser();

    if (user?.role === "owner") {
      window.location.replace("/owner/dashboard?tab=customer");
      return;
    }

    if (user?.role === "staff") {
      window.location.replace("/staff/dashboard");
      return;
    }

    window.location.replace("/manager/dashboard");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
        <p className="text-sm font-semibold text-gray-900">Redirecting...</p>
      </div>
    </main>
  );
}
