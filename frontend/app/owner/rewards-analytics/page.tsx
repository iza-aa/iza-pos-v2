"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/components/shared/i18n";

export default function OwnerRewardsAnalyticsRedirectPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.replace("/owner/dashboard?tab=customer");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
        <p className="text-sm font-semibold text-gray-900">{t("owner.redirect.dashboard")}</p>
      </div>
    </main>
  );
}
