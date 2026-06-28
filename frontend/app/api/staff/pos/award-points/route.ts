import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";
import { defaultLoyaltySettings } from "@/app/api/owner/loyalty-settings/route";

interface AwardPointsRequest {
  orderId: string;
  customerId: string;
  orderTotal: number;
}

type LoyaltyConfigRow = {
  points_per_amount: number | null;
  amount_per_points: number | null;
  minimum_order_amount: number | null;
  is_active: boolean | null;
};

async function fetchLoyaltyConfig(
  supabase: ReturnType<typeof createBookkeepingSupabaseClient>,
) {
  const { data, error } = await supabase
    .from("loyalty_settings")
    .select(
      "points_per_amount, amount_per_points, minimum_order_amount, is_active",
    )
    .eq("id", "global")
    .maybeSingle();

  if (error || !data) return defaultLoyaltySettings;

  const row = data as LoyaltyConfigRow;
  return {
    pointsPerAmount: Number(
      row.points_per_amount ?? defaultLoyaltySettings.pointsPerAmount,
    ),
    amountPerPoints: Number(
      row.amount_per_points ?? defaultLoyaltySettings.amountPerPoints,
    ),
    minimumOrderAmount: Number(
      row.minimum_order_amount ?? defaultLoyaltySettings.minimumOrderAmount,
    ),
    isActive: row.is_active !== false,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Ensure authorized staff
    const sessionToken = request.cookies.get(INTERNAL_SESSION_COOKIE)?.value;
    const session = await verifyInternalSessionToken(sessionToken).catch(
      () => null,
    );

    if (
      !session ||
      !session.sub ||
      !["owner", "manager", "staff"].includes(session.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createBookkeepingSupabaseClient();

    const body = (await request.json()) as AwardPointsRequest;
    if (
      !body.orderId ||
      !body.customerId ||
      typeof body.orderTotal !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Fetch owner-configured loyalty settings (falls back to defaults if not set)
    const loyaltyConfig = await fetchLoyaltyConfig(supabase);

    if (!loyaltyConfig.isActive) {
      return NextResponse.json({ success: true, points_awarded: 0 });
    }

    if (body.orderTotal < loyaltyConfig.minimumOrderAmount) {
      return NextResponse.json({ success: true, points_awarded: 0 });
    }

    // Calculate points: floor((orderTotal / amountPerPoints) * pointsPerAmount)
    const pointsToAward = Math.floor(
      (body.orderTotal / loyaltyConfig.amountPerPoints) *
        loyaltyConfig.pointsPerAmount,
    );

    if (pointsToAward <= 0) {
      return NextResponse.json({ success: true, points_awarded: 0 });
    }

    // Fetch current customer points
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("loyalty_points, total_spent")
      .eq("id", body.customerId)
      .single();

    if (customerError) {
      console.error("Error fetching customer for points:", customerError);
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const currentPoints = customerData.loyalty_points || 0;
    const currentSpent = customerData.total_spent
      ? Number(customerData.total_spent)
      : 0;

    const balanceAfter = currentPoints + pointsToAward;
    const newTotalSpent = currentSpent + body.orderTotal;

    // Insert point transaction
    const { error: txError } = await supabase
      .from("customer_point_transactions")
      .insert({
        customer_id: body.customerId,
        order_id: body.orderId,
        transaction_type: "earned",
        points: pointsToAward,
        balance_before: currentPoints,
        balance_after: balanceAfter,
        description: `Earned ${pointsToAward} point${pointsToAward !== 1 ? "s" : ""} from POS order`,
      });

    if (txError) {
      console.error("Error inserting point transaction:", txError);
      return NextResponse.json(
        { error: "Failed to record transaction" },
        { status: 500 },
      );
    }

    // Update customer points and total spent
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        loyalty_points: balanceAfter,
        total_spent: newTotalSpent,
      })
      .eq("id", body.customerId);

    if (updateError) {
      console.error("Error updating customer points:", updateError);
      return NextResponse.json(
        { error: "Failed to update customer" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, points_awarded: pointsToAward });
  } catch (error) {
    console.error("Award points handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
