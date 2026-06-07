"use client";

import { getCurrentUser } from "@/lib/utils";

export type DashboardOrderCorrectionRow = {
  id: string;
  order_id: string | null;
  status: string | null;
  physical_status: string | null;
  note: string | null;
};

type OrderCorrectionApiRow = {
  id?: string;
  orderId?: string | null;
  status?: string | null;
  physicalStatus?: string | null;
  note?: string | null;
};

export async function loadDashboardOrderCorrections(): Promise<{
  data: DashboardOrderCorrectionRow[];
  error: { message: string } | null;
}> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { data: [], error: { message: "Current user is required to load order corrections." } };
  }

  try {
    const params = new URLSearchParams({
      startDate: "2000-01-01",
      endDate: "2099-12-31",
    });
    const response = await fetch(`/api/orders/corrections?${params.toString()}`, {
      headers: {
        "x-user-id": currentUser.id,
        "x-user-name": currentUser.name,
        "x-user-role": currentUser.role,
      },
    });
    const result = (await response.json().catch(() => ({}))) as {
      data?: OrderCorrectionApiRow[];
      error?: string;
    };

    if (!response.ok) {
      return {
        data: [],
        error: { message: result.error || "Order corrections could not be loaded." },
      };
    }

    return {
      data: (result.data ?? [])
        .filter((row) => row.id && row.orderId)
        .map((row) => ({
          id: row.id as string,
          order_id: row.orderId ?? null,
          status: row.status ?? null,
          physical_status: row.physicalStatus ?? null,
          note: row.note ?? null,
        })),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: {
        message: error instanceof Error ? error.message : "Order corrections could not be loaded.",
      },
    };
  }
}
