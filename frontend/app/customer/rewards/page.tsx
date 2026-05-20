"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  GiftIcon,
  LockClosedIcon,
  SparklesIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { supabase } from "@/lib/config/supabaseClient";
import {
  type CustomerAccountSession,
  formatMemberSince,
  getStoredCustomerAccount,
  saveCustomerAccount,
} from "@/lib/customer/customerAccount";

interface CustomerProfileRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number | null;
  member_since: string | null;
  total_spent: number | string | null;
  visit_count: number | null;
  status: string;
}

interface RewardRow {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  discount_type: string | null;
  discount_value: number | string | null;
  max_discount_amount: number | string | null;
  points_required: number;
  minimum_order_amount: number | string;
  valid_days: number;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface PointTransactionRow {
  id: string;
  customer_id: string;
  order_id: string | null;
  reward_id: string | null;
  transaction_type: string;
  points: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface RewardRedemptionRow {
  id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  code: string;
  status: string;
  redeemed_at: string;
  expires_at: string;
  used_at: string | null;
  used_order_id: string | null;
  rewards?:
    | {
        name: string | null;
        reward_type: string | null;
        discount_type: string | null;
        discount_value: number | string | null;
      }
    | {
        name: string | null;
        reward_type: string | null;
        discount_type: string | null;
        discount_value: number | string | null;
      }[]
    | null;
}

interface RedeemRewardResult {
  success: boolean;
  message: string;
  redemption_id: string | null;
  redemption_code: string | null;
  customer_id: string | null;
  reward_id: string | null;
  points_spent: number;
  balance_before: number;
  balance_after: number;
  expires_at: string | null;
}

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  member_since: string | null;
  total_spent: number;
  visit_count: number;
  status: string;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  discount_type: string | null;
  discount_value: number;
  max_discount_amount: number | null;
  points_required: number;
  minimum_order_amount: number;
  valid_days: number;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface PointTransaction {
  id: string;
  customer_id: string;
  order_id: string | null;
  reward_id: string | null;
  transaction_type: string;
  points: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface RewardRedemption {
  id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  code: string;
  status: string;
  redeemed_at: string;
  expires_at: string;
  used_at: string | null;
  used_order_id: string | null;
  reward_name: string;
  reward_type: string | null;
  discount_type: string | null;
  discount_value: number;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeCustomer(row: CustomerProfileRow): CustomerProfile {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    loyalty_points: row.loyalty_points ?? 0,
    member_since: row.member_since,
    total_spent: toNumber(row.total_spent),
    visit_count: row.visit_count ?? 0,
    status: row.status,
  };
}

function normalizeReward(row: RewardRow): Reward {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    reward_type: row.reward_type,
    discount_type: row.discount_type,
    discount_value: toNumber(row.discount_value),
    max_discount_amount:
      row.max_discount_amount === null ? null : toNumber(row.max_discount_amount),
    points_required: row.points_required,
    minimum_order_amount: toNumber(row.minimum_order_amount),
    valid_days: row.valid_days,
    usage_limit: row.usage_limit,
    used_count: row.used_count,
    is_active: row.is_active,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  };
}

function normalizePointTransaction(row: PointTransactionRow): PointTransaction {
  return {
    id: row.id,
    customer_id: row.customer_id,
    order_id: row.order_id,
    reward_id: row.reward_id,
    transaction_type: row.transaction_type,
    points: row.points,
    balance_before: row.balance_before,
    balance_after: row.balance_after,
    description: row.description,
    created_at: row.created_at,
  };
}
function getRewardRelation(
  relation: RewardRedemptionRow["rewards"],
): {
  name: string | null;
  reward_type: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
} | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function normalizeRedemption(row: RewardRedemptionRow): RewardRedemption {
  const reward = getRewardRelation(row.rewards);

  return {
    id: row.id,
    customer_id: row.customer_id,
    reward_id: row.reward_id,
    points_spent: row.points_spent,
    code: row.code,
    status: row.status,
    redeemed_at: row.redeemed_at,
    expires_at: row.expires_at,
    used_at: row.used_at,
    used_order_id: row.used_order_id,
    reward_name: reward?.name ?? "Reward",
    reward_type: reward?.reward_type ?? null,
    discount_type: reward?.discount_type ?? null,
    discount_value: toNumber(reward?.discount_value),
  };
}

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRewardValue(reward: Reward): string {
  if (reward.reward_type === "free_product") {
    return "Free Product";
  }

  if (reward.discount_type === "percentage") {
    const suffix = reward.max_discount_amount
      ? ` up to ${formatCurrency(reward.max_discount_amount)}`
      : "";

    return `${reward.discount_value}% off${suffix}`;
  }

  if (reward.discount_type === "fixed") {
    return `${formatCurrency(reward.discount_value)} off`;
  }

  return "Reward";
}

function getRewardAvailabilityLabel(reward: Reward, customerPoints: number): string {
  const remaining = reward.points_required - customerPoints;

  if (remaining <= 0) {
    return "Available to redeem";
  }

  return `${remaining} more points needed`;
}

function getTransactionSign(type: string, points: number): string {
  if (points > 0) {
    return `+${points}`;
  }

  return `${points}`;
}

function getTransactionTone(type: string): string {
  if (type === "earned") {
    return "text-emerald-700 bg-emerald-50 border-emerald-100";
  }

  if (type === "redeemed") {
    return "text-amber-700 bg-amber-50 border-amber-100";
  }

  return "text-gray-700 bg-gray-50 border-gray-100";
}

export default function CustomerRewardsPage() {
  const router = useRouter();

  const [customerAccount, setCustomerAccount] =
    useState<CustomerAccountSession | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadRewardsPage = async () => {
      const account = getStoredCustomerAccount();

      if (!account) {
        if (isMounted) {
          setCustomerAccount(null);
          setCustomerProfile(null);
          setRewards([]);
          setRedemptions([]);
          setTransactions([]);
          setLoading(false);
        }

        return;
      }

      setCustomerAccount(account);

      const [customerResult, rewardsResult, redemptionsResult, transactionsResult] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, name, phone, email, loyalty_points, member_since, total_spent, visit_count, status",
          )
          .eq("id", account.id)
          .maybeSingle(),
        supabase
          .from("rewards")
          .select(
            "id, name, description, reward_type, discount_type, discount_value, max_discount_amount, points_required, minimum_order_amount, valid_days, usage_limit, used_count, is_active, starts_at, ends_at",
          )
          .eq("is_active", true)
          .order("points_required", { ascending: true }),
        supabase
          .from("customer_reward_redemptions")
          .select(
            "id, customer_id, reward_id, points_spent, code, status, redeemed_at, expires_at, used_at, used_order_id, rewards(name, reward_type, discount_type, discount_value)",
          )
          .eq("customer_id", account.id)
          .in("status", ["available", "used"])
          .order("redeemed_at", { ascending: false })
          .limit(10),
        supabase
          .from("customer_point_transactions")
          .select(
            "id, customer_id, order_id, reward_id, transaction_type, points, balance_before, balance_after, description, created_at",
          )
          .eq("customer_id", account.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (!isMounted) {
        return;
      }

      if (customerResult.error) {
        console.error("Failed to load customer profile:", customerResult.error);
      }

      if (rewardsResult.error) {
        console.error("Failed to load rewards:", rewardsResult.error);
      }

      if (redemptionsResult.error) {
        console.error("Failed to load reward redemptions:", redemptionsResult.error);
      }

      if (transactionsResult.error) {
        console.error("Failed to load point transactions:", transactionsResult.error);
      }

      const profile = customerResult.data
        ? normalizeCustomer(customerResult.data as CustomerProfileRow)
        : null;

      if (profile) {
        const updatedSession: CustomerAccountSession = {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          loyalty_points: profile.loyalty_points,
          member_since: profile.member_since,
        };

        setCustomerAccount(updatedSession);
        saveCustomerAccount(updatedSession);
      }

      setCustomerProfile(profile);
      setRewards(((rewardsResult.data ?? []) as RewardRow[]).map(normalizeReward));
      setRedemptions(
        ((redemptionsResult.data ?? []) as RewardRedemptionRow[]).map(
          normalizeRedemption,
        ),
      );
      setTransactions(
        ((transactionsResult.data ?? []) as PointTransactionRow[]).map(
          normalizePointTransaction,
        ),
      );
      setLoading(false);
    };

    void loadRewardsPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const customerPoints = customerProfile?.loyalty_points ?? customerAccount?.loyalty_points ?? 0;

  const redeemableCount = useMemo(() => {
    return rewards.filter((reward) => customerPoints >= reward.points_required).length;
  }, [customerPoints, rewards]);

  const handleRedeemReward = async (reward: Reward) => {
    if (!customerAccount || !customerProfile) {
      setFeedback("Please login to redeem rewards.");
      return;
    }

    if (customerPoints < reward.points_required) {
      setFeedback("You do not have enough points for this reward.");
      return;
    }

    const confirmed = window.confirm(
      `Redeem ${reward.points_required} points for ${reward.name}?`,
    );

    if (!confirmed) {
      return;
    }

    setFeedback("");
    setRedeemingRewardId(reward.id);

    try {
      const { data, error } = await supabase.rpc("redeem_customer_reward", {
        p_customer_id: customerAccount.id,
        p_reward_id: reward.id,
      });

      if (error) {
        throw error;
      }

      const redeemResult = Array.isArray(data)
        ? (data[0] as RedeemRewardResult | undefined)
        : (data as RedeemRewardResult | undefined);

      if (!redeemResult?.success) {
        setFeedback(redeemResult?.message || "Failed to redeem reward.");
        return;
      }

      const nextPoints = redeemResult.balance_after;
      const updatedSession: CustomerAccountSession = {
        ...customerAccount,
        loyalty_points: nextPoints,
      };

      setCustomerAccount(updatedSession);
      saveCustomerAccount(updatedSession);
      setCustomerProfile({
        ...customerProfile,
        loyalty_points: nextPoints,
      });

      setFeedback(
        redeemResult.redemption_code
          ? `Reward redeemed. Your voucher code is ${redeemResult.redemption_code}.`
          : "Reward redeemed successfully.",
      );

      window.location.reload();
    } catch (redeemError) {
      console.error("Redeem reward error:", redeemError);
      setFeedback(
        redeemError instanceof Error
          ? redeemError.message
          : "Failed to redeem reward.",
      );
    } finally {
      setRedeemingRewardId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <div className="h-36 animate-pulse rounded-3xl bg-gray-200" />
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-200" />
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!customerAccount) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/customer")}
              className="rounded-lg p-2 text-gray-600 transition hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rewards</h1>
              <p className="mt-1 text-sm text-gray-500">Member feature</p>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-lg px-4 py-5">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
              <LockClosedIcon className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900">
              Rewards are locked
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Login or create an account to collect points, save order history, and unlock member discounts.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/customer/login?redirect=/customer/rewards")}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => router.push("/customer/register?redirect=/customer/rewards")}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Register
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold text-gray-900">Rewards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Points, benefits, and reward history.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-500">Current Points</p>
              <p className="mt-2 text-5xl font-bold tracking-tight text-gray-900">
                {customerPoints}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Member since {formatMemberSince(customerProfile?.member_since ?? customerAccount.member_since)}
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <GiftIcon className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Spent
              </p>
              <p className="mt-2 text-lg font-bold text-gray-900">
                {formatCurrency(customerProfile?.total_spent ?? 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Visits
              </p>
              <p className="mt-2 text-lg font-bold text-gray-900">
                {customerProfile?.visit_count ?? 0}
              </p>
            </div>
          </div>
        </section>

        {feedback ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-800">{feedback}</p>
          </div>
        ) : null}

        {redemptions.length > 0 ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-gray-900" />
              <h2 className="text-sm font-bold text-gray-900">My Vouchers</h2>
            </div>

            <div className="space-y-3">
              {redemptions.map((redemption) => (
                <article
                  key={redemption.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {redemption.reward_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Expires {formatDate(redemption.expires_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        redemption.status === "available"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {redemption.status}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Voucher Code
                    </p>
                    <p className="mt-1 text-lg font-bold tracking-wider text-gray-900">
                      {redemption.code}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-gray-900" />
              <h2 className="text-sm font-bold text-gray-900">Available Rewards</h2>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {redeemableCount} redeemable
            </span>
          </div>

          {rewards.length > 0 ? (
            <div className="space-y-3">
              {rewards.map((reward) => {
                const canRedeem = customerPoints >= reward.points_required;

                return (
                  <article
                    key={reward.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">
                          {reward.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-700">
                          {formatRewardValue(reward)}
                        </p>

                        {reward.description ? (
                          <p className="mt-2 text-xs leading-5 text-gray-500">
                            {reward.description}
                          </p>
                        ) : null}
                      </div>

                      <div
                        className={`shrink-0 rounded-xl px-3 py-2 text-center ${
                          canRedeem ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <p className="text-lg font-bold">{reward.points_required}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide">
                          points
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Minimum Order
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {formatCurrency(reward.minimum_order_amount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Valid For
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {reward.valid_days} days
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p
                        className={`text-xs font-semibold ${
                          canRedeem ? "text-emerald-700" : "text-gray-500"
                        }`}
                      >
                        {getRewardAvailabilityLabel(reward, customerPoints)}
                      </p>

                      <button
                        type="button"
                        disabled={!canRedeem || redeemingRewardId === reward.id}
                        onClick={() => void handleRedeemReward(reward)}
                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                          canRedeem
                            ? "bg-gray-900 text-white hover:bg-gray-800"
                            : "border border-gray-200 bg-gray-50 text-gray-400"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {redeemingRewardId === reward.id ? "Redeeming..." : canRedeem ? "Redeem" : "Locked"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm font-semibold text-gray-800">
                No active rewards yet
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Please check again later.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-900" />
            <h2 className="text-sm font-bold text-gray-900">Point History</h2>
          </div>

          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getTransactionTone(
                      transaction.transaction_type,
                    )}`}
                  >
                    {transaction.transaction_type === "earned" ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <SparklesIcon className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {transaction.description ||
                            `${transaction.transaction_type} points`}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>

                      <p
                        className={`shrink-0 text-sm font-bold ${
                          transaction.points > 0
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {getTransactionSign(transaction.transaction_type, transaction.points)}
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Balance: {transaction.balance_before} → {transaction.balance_after}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm font-semibold text-gray-800">
                No point history yet
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Paid member orders will appear here.
              </p>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => router.push("/customer/menu")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Order More
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </main>
    </div>
  );
}