"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerRewardsAnalyticsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/dashboard?tab=rewards");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
        <p className="text-sm font-semibold text-gray-900">Redirecting to Rewards...</p>
      </div>
    </main>
  );
}
