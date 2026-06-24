"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/auth";
import { getStaffHomePath } from "@/lib/utils/staffAccess";

export default function StaffIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    router.replace(
      getStaffHomePath(currentUser?.positions, currentUser?.staffType),
    );
  }, [router]);

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-100 px-6">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
        <p className="mt-3 text-sm font-semibold text-gray-900">
          Opening staff workspace...
        </p>
      </div>
    </main>
  );
}
