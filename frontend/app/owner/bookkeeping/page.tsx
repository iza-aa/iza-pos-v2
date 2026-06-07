"use client";

import { Suspense, useEffect } from "react";
import { getCurrentUser } from "@/lib/utils";
import OwnerBookkeeping from "@/app/components/owner/bookkeeping/OwnerBookkeeping";

function OwnerBookkeepingContent() {
  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      window.location.href = "/owner/login";
      return;
    }

    if (currentUser.role === "staff") {
      window.location.href = "/staff/attendance";
      return;
    }

    if (currentUser.role === "manager") {
      window.location.href = "/manager/menu";
    }
  }, []);

  return <OwnerBookkeeping />;
}

export default function OwnerBookkeepingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-100 p-6" />}>
      <OwnerBookkeepingContent />
    </Suspense>
  );
}
