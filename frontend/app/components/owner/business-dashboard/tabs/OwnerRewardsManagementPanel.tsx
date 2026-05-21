"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { logActivity } from "@/lib/services/activity/activityLogger";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TicketIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type RewardType = "discount" | "free_product";
type DiscountType = "fixed" | "percentage";
type PointsRounding = "floor" | "round" | "ceil";
type RewardsTab = "rewards" | "redemptions" | "members";
type RedemptionStatus = "available" | "used" | "expired" | "cancelled" | string;

type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  reward_type: RewardType | string;
  discount_type: DiscountType | string | null;
  discount_value: number | string | null;
  max_discount_amount: number | string | null;
  product_id: string | null;
  points_required: number;
  minimum_order_amount: number | string;
  valid_days: number;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type RewardSettingRow = {
  id: number;
  amount_per_point: number | string;
  minimum_order_amount: number | string;
  points_rounding: PointsRounding | string;
  is_active: boolean;
  notes: string | null;
};

type RewardRedemptionSummaryRow = {
  reward_id: string;
  status: string;
};

type RewardRelation = {
  name: string | null;
  reward_type: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
};

type CustomerRelation = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

type OrderRelation = {
  order_number: string | null;
  subtotal: number | string | null;
  discount: number | string | null;
  total: number | string | null;
};

type RedemptionRow = {
  id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  code: string;
  status: RedemptionStatus;
  redeemed_at: string;
  expires_at: string;
  used_at: string | null;
  used_order_id: string | null;
  rewards?: RewardRelation | RewardRelation[] | null;
  customers?: CustomerRelation | CustomerRelation[] | null;
  orders?: OrderRelation | OrderRelation[] | null;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyalty_points: number | null;
  total_spent: number | string | null;
  visit_count: number | null;
  member_since: string | null;
  last_login_at: string | null;
};

type OrderCustomerRow = {
  id: string;
  customer_id: string | null;
  created_at: string | null;
};

type RedemptionCustomerRow = {
  customer_id: string;
  status: RedemptionStatus;
};

type Reward = {
  id: string;
  name: string;
  description: string;
  rewardType: RewardType;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  pointsRequired: number;
  minimumOrderAmount: number;
  validDays: number;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

type Redemption = {
  id: string;
  customerId: string;
  rewardId: string;
  pointsSpent: number;
  code: string;
  status: RedemptionStatus;
  redeemedAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedOrderId: string | null;
  rewardName: string;
  customerName: string;
  customerContact: string;
  orderNumber: string;
  orderTotal: number;
  orderDiscount: number;
};

type Member = {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  memberSince: string | null;
  lastLoginAt: string | null;
  lastOrderAt: string | null;
  totalRedemptions: number;
  usedRedemptions: number;
};

type RewardFormState = {
  name: string;
  description: string;
  rewardType: RewardType;
  discountType: DiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  pointsRequired: string;
  minimumOrderAmount: string;
  validDays: string;
  usageLimit: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

type RewardSettingsState = {
  amountPerPoint: string;
  minimumOrderAmount: string;
  pointsRounding: PointsRounding;
  isActive: boolean;
  notes: string;
};

const EMPTY_FORM: RewardFormState = {
  name: "",
  description: "",
  rewardType: "discount",
  discountType: "fixed",
  discountValue: "",
  maxDiscountAmount: "",
  pointsRequired: "",
  minimumOrderAmount: "0",
  validDays: "30",
  usageLimit: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
};

const DEFAULT_SETTINGS: RewardSettingsState = {
  amountPerPoint: "10000",
  minimumOrderAmount: "10000",
  pointsRounding: "floor",
  isActive: true,
  notes: "",
};

const REDEMPTION_STATUS_OPTIONS = ["all", "available", "used", "expired", "cancelled"] as const;

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

function toNullableNumber(value: string): number | null {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return null;
  }

  const parsed = Number(cleanValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRelationObject<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function normalizeReward(row: RewardRow): Reward {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    rewardType: row.reward_type === "free_product" ? "free_product" : "discount",
    discountType: row.discount_type === "percentage" ? "percentage" : "fixed",
    discountValue: toNumber(row.discount_value),
    maxDiscountAmount:
      row.max_discount_amount === null ? null : toNumber(row.max_discount_amount),
    pointsRequired: row.points_required,
    minimumOrderAmount: toNumber(row.minimum_order_amount),
    validDays: row.valid_days,
    usageLimit: row.usage_limit,
    usedCount: row.used_count,
    isActive: row.is_active,
    startsAt: row.starts_at ?? "",
    endsAt: row.ends_at ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRedemption(row: RedemptionRow): Redemption {
  const reward = getRelationObject(row.rewards);
  const customer = getRelationObject(row.customers);
  const order = getRelationObject(row.orders);

  return {
    id: row.id,
    customerId: row.customer_id,
    rewardId: row.reward_id,
    pointsSpent: row.points_spent,
    code: row.code,
    status: row.status,
    redeemedAt: row.redeemed_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    usedOrderId: row.used_order_id,
    rewardName: reward?.name ?? "Reward",
    customerName: customer?.name ?? "Unknown Customer",
    customerContact: customer?.phone || customer?.email || "-",
    orderNumber: order?.order_number ?? "-",
    orderTotal: toNumber(order?.total),
    orderDiscount: toNumber(order?.discount),
  };
}

function rewardToForm(reward: Reward): RewardFormState {
  return {
    name: reward.name,
    description: reward.description,
    rewardType: reward.rewardType,
    discountType: reward.discountType,
    discountValue: String(reward.discountValue || ""),
    maxDiscountAmount:
      reward.maxDiscountAmount === null ? "" : String(reward.maxDiscountAmount),
    pointsRequired: String(reward.pointsRequired),
    minimumOrderAmount: String(reward.minimumOrderAmount),
    validDays: String(reward.validDays),
    usageLimit: reward.usageLimit === null ? "" : String(reward.usageLimit),
    isActive: reward.isActive,
    startsAt: formatDateTimeInput(reward.startsAt),
    endsAt: formatDateTimeInput(reward.endsAt),
  };
}

function getRewardValueLabel(reward: Reward): string {
  if (reward.rewardType === "free_product") {
    return "Free Product";
  }

  if (reward.discountType === "percentage") {
    const cap = reward.maxDiscountAmount
      ? ` • Max ${formatCurrency(reward.maxDiscountAmount)}`
      : "";

    return `${reward.discountValue}% discount${cap}`;
  }

  return `${formatCurrency(reward.discountValue)} discount`;
}

function getRewardStatusLabel(reward: Reward): string {
  if (!reward.isActive) {
    return "Inactive";
  }

  const now = new Date();

  if (reward.startsAt && now < new Date(reward.startsAt)) {
    return "Scheduled";
  }

  if (reward.endsAt && now > new Date(reward.endsAt)) {
    return "Ended";
  }

  if (reward.usageLimit !== null && reward.usedCount >= reward.usageLimit) {
    return "Limit reached";
  }

  return "Active";
}

function getRewardStatusClass(reward: Reward): string {
  const status = getRewardStatusLabel(reward);

  if (status === "Active") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "Scheduled") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (status === "Ended" || status === "Limit reached") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

function getRedemptionStatusClass(status: RedemptionStatus): string {
  if (status === "used") {
    return "bg-gray-900 text-white border-gray-900";
  }

  if (status === "available") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "expired") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "cancelled") {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  return "bg-blue-50 text-blue-700 border-blue-200";
}


export default function OwnerRewardsManagementPanel() {
  useSessionValidation();

  const [activeTab, setActiveTab] = useState<RewardsTab>("rewards");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [redemptionSummaries, setRedemptionSummaries] = useState<
    RewardRedemptionSummaryRow[]
  >([]);
  const [settings, setSettings] = useState<RewardSettingsState>(DEFAULT_SETTINGS);
  const [form, setForm] = useState<RewardFormState>(EMPTY_FORM);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [rewardSearchQuery, setRewardSearchQuery] = useState("");
  const [redemptionSearchQuery, setRedemptionSearchQuery] = useState("");
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState("all");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const fetchRewardData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    setError("");

    try {
      const [
        rewardsResult,
        settingsResult,
        redemptionsResult,
        redemptionSummariesResult,
        customersResult,
        ordersResult,
      ] = await Promise.all([
        supabase
          .from("rewards")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("reward_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("customer_reward_redemptions")
          .select(
            `
            id,
            customer_id,
            reward_id,
            points_spent,
            code,
            status,
            redeemed_at,
            expires_at,
            used_at,
            used_order_id,
            rewards(name, reward_type, discount_type, discount_value),
            customers(name, phone, email),
            orders:used_order_id(order_number, subtotal, discount, total)
          `,
          )
          .order("redeemed_at", { ascending: false }),
        supabase
          .from("customer_reward_redemptions")
          .select("reward_id, customer_id, status"),
        supabase
          .from("customers")
          .select(
            "id, name, phone, email, loyalty_points, total_spent, visit_count, member_since, last_login_at",
          )
          .order("total_spent", { ascending: false }),
        supabase
          .from("orders")
          .select("id, customer_id, created_at")
          .not("customer_id", "is", null)
          .order("created_at", { ascending: false }),
      ]);

      if (rewardsResult.error) throw rewardsResult.error;
      if (settingsResult.error) throw settingsResult.error;
      if (redemptionsResult.error) throw redemptionsResult.error;
      if (redemptionSummariesResult.error) throw redemptionSummariesResult.error;
      if (customersResult.error) throw customersResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const normalizedRewards = ((rewardsResult.data ?? []) as RewardRow[]).map(
        normalizeReward,
      );
      const normalizedRedemptions = (
        (redemptionsResult.data ?? []) as RedemptionRow[]
      ).map(normalizeRedemption);
      const redemptionSummaryRows =
        (redemptionSummariesResult.data ?? []) as RewardRedemptionSummaryRow[];

      const latestOrderByCustomer = new Map<string, string>();
      ((ordersResult.data ?? []) as OrderCustomerRow[]).forEach((order) => {
        if (!order.customer_id || !order.created_at) {
          return;
        }

        if (!latestOrderByCustomer.has(order.customer_id)) {
          latestOrderByCustomer.set(order.customer_id, order.created_at);
        }
      });

      const redemptionsByCustomer = new Map<
        string,
        { totalRedemptions: number; usedRedemptions: number }
      >();

      ((redemptionSummariesResult.data ?? []) as RedemptionCustomerRow[]).forEach(
        (redemption) => {
          const current = redemptionsByCustomer.get(redemption.customer_id) ?? {
            totalRedemptions: 0,
            usedRedemptions: 0,
          };

          redemptionsByCustomer.set(redemption.customer_id, {
            totalRedemptions: current.totalRedemptions + 1,
            usedRedemptions:
              current.usedRedemptions + (redemption.status === "used" ? 1 : 0),
          });
        },
      );

      const normalizedMembers = ((customersResult.data ?? []) as CustomerRow[]).map(
        (customer) => {
          const redemptionStats = redemptionsByCustomer.get(customer.id) ?? {
            totalRedemptions: 0,
            usedRedemptions: 0,
          };

          return {
            id: customer.id,
            name: customer.name,
            phone: customer.phone ?? "-",
            email: customer.email ?? "-",
            loyaltyPoints: customer.loyalty_points ?? 0,
            totalSpent: toNumber(customer.total_spent),
            visitCount: customer.visit_count ?? 0,
            memberSince: customer.member_since,
            lastLoginAt: customer.last_login_at,
            lastOrderAt: latestOrderByCustomer.get(customer.id) ?? null,
            totalRedemptions: redemptionStats.totalRedemptions,
            usedRedemptions: redemptionStats.usedRedemptions,
          } satisfies Member;
        },
      );

      setRewards(normalizedRewards);
      setRedemptions(normalizedRedemptions);
      setMembers(normalizedMembers);
      setRedemptionSummaries(redemptionSummaryRows);

      const settingsRow = settingsResult.data as RewardSettingRow | null;

      if (settingsRow) {
        setSettings({
          amountPerPoint: String(toNumber(settingsRow.amount_per_point)),
          minimumOrderAmount: String(toNumber(settingsRow.minimum_order_amount)),
          pointsRounding:
            settingsRow.points_rounding === "round" ||
            settingsRow.points_rounding === "ceil"
              ? settingsRow.points_rounding
              : "floor",
          isActive: Boolean(settingsRow.is_active),
          notes: settingsRow.notes ?? "",
        });
      }
    } catch (fetchError) {
      console.error("Failed to load rewards:", fetchError);
      setError("Failed to load reward data. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchRewardData(false);
  }, [fetchRewardData]);

  const metrics = useMemo(() => {
    const totalRewards = rewards.length;
    const activeRewards = rewards.filter((reward) => getRewardStatusLabel(reward) === "Active");
    const availableRedemptions = redemptionSummaries.filter(
      (item) => item.status === "available",
    );
    const usedRedemptions = redemptionSummaries.filter((item) => item.status === "used");
    const totalDiscountUsed = redemptions
      .filter((redemption) => redemption.status === "used")
      .reduce((total, redemption) => total + redemption.orderDiscount, 0);

    return {
      totalRewards,
      activeRewardCount: activeRewards.length,
      availableRedemptionCount: availableRedemptions.length,
      usedRedemptionCount: usedRedemptions.length,
      totalDiscountUsed,
      memberCount: members.length,
    };
  }, [members, redemptionSummaries, redemptions, rewards]);

  const filteredRewards = useMemo(() => {
    const query = rewardSearchQuery.trim().toLowerCase();

    if (!query) {
      return rewards;
    }

    return rewards.filter((reward) => {
      return (
        reward.name.toLowerCase().includes(query) ||
        reward.description.toLowerCase().includes(query) ||
        getRewardStatusLabel(reward).toLowerCase().includes(query)
      );
    });
  }, [rewardSearchQuery, rewards]);

  const filteredRedemptions = useMemo(() => {
    const query = redemptionSearchQuery.trim().toLowerCase();

    return redemptions.filter((redemption) => {
      const matchesStatus =
        redemptionStatusFilter === "all" || redemption.status === redemptionStatusFilter;
      const matchesQuery =
        !query ||
        redemption.code.toLowerCase().includes(query) ||
        redemption.customerName.toLowerCase().includes(query) ||
        redemption.rewardName.toLowerCase().includes(query) ||
        redemption.orderNumber.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [redemptionSearchQuery, redemptionStatusFilter, redemptions]);

  const filteredMembers = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase();

    if (!query) {
      return members;
    }

    return members.filter((member) => {
      return (
        member.name.toLowerCase().includes(query) ||
        member.phone.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );
    });
  }, [memberSearchQuery, members]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingReward(null);
    setShowForm(false);
    setError("");
  };

  const openCreateForm = () => {
    setEditingReward(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setSuccessMessage("");
    setError("");
    setActiveTab("rewards");
  };

  const openEditForm = (reward: Reward) => {
    setEditingReward(reward);
    setForm(rewardToForm(reward));
    setShowForm(true);
    setSuccessMessage("");
    setError("");
    setActiveTab("rewards");
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) {
      return "Reward name is required.";
    }

    const pointsRequired = Number(form.pointsRequired);
    const discountValue = Number(form.discountValue);
    const minimumOrderAmount = Number(form.minimumOrderAmount);
    const validDays = Number(form.validDays);

    if (!Number.isFinite(pointsRequired) || pointsRequired <= 0) {
      return "Points required must be greater than 0.";
    }

    if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
      return "Minimum order is invalid.";
    }

    if (!Number.isFinite(validDays) || validDays <= 0) {
      return "Valid days must be greater than 0.";
    }

    if (form.rewardType === "discount") {
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return "Discount value must be greater than 0.";
      }

      if (form.discountType === "percentage" && discountValue > 100) {
        return "Percentage discount cannot exceed 100%.";
      }
    }

    const usageLimit = toNullableNumber(form.usageLimit);

    if (form.usageLimit.trim() && (!usageLimit || usageLimit <= 0)) {
      return "Usage limit must be greater than 0.";
    }

    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      return "End date must be after start date.";
    }

    return null;
  };

  const handleSaveReward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingReward(true);
    setError("");
    setSuccessMessage("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      reward_type: form.rewardType,
      discount_type: form.rewardType === "discount" ? form.discountType : null,
      discount_value:
        form.rewardType === "discount" ? Number(form.discountValue) : null,
      max_discount_amount:
        form.rewardType === "discount" && form.discountType === "percentage"
          ? toNullableNumber(form.maxDiscountAmount)
          : null,
      points_required: Number(form.pointsRequired),
      minimum_order_amount: Number(form.minimumOrderAmount),
      valid_days: Number(form.validDays),
      usage_limit: toNullableNumber(form.usageLimit),
      is_active: form.isActive,
      starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };

    try {
      if (editingReward) {
        const { error: updateError } = await supabase
          .from("rewards")
          .update(payload)
          .eq("id", editingReward.id);

        if (updateError) throw updateError;

        await logActivity({
          action: "UPDATE",
          category: "REWARD",
          description: `Updated reward: ${payload.name}`,
          resourceType: "Reward",
          resourceId: editingReward.id,
          resourceName: payload.name,
          previousValue: editingReward,
          newValue: payload,
          severity: "info",
          tags: ["reward", "update"],
        });

        setSuccessMessage("Reward updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("rewards")
          .insert([payload])
          .select("id, name")
          .single();

        if (insertError) throw insertError;

        await logActivity({
          action: "CREATE",
          category: "REWARD",
          description: `Created reward: ${payload.name}`,
          resourceType: "Reward",
          resourceId: data?.id,
          resourceName: payload.name,
          newValue: payload,
          severity: "info",
          tags: ["reward", "create"],
        });

        setSuccessMessage("Reward created successfully.");
      }

      resetForm();
      await fetchRewardData(false);
    } catch (saveError) {
      console.error("Failed to save reward:", saveError);
      setError("Failed to save reward. Check the data and try again.");
    } finally {
      setSavingReward(false);
    }
  };

  const handleToggleReward = async (reward: Reward) => {
    setError("");
    setSuccessMessage("");

    try {
      const { error: updateError } = await supabase
        .from("rewards")
        .update({
          is_active: !reward.isActive,
        })
        .eq("id", reward.id);

      if (updateError) throw updateError;

      await logActivity({
        action: "UPDATE",
        category: "REWARD",
        description: `${reward.isActive ? "Deactivated" : "Activated"} reward: ${reward.name}`,
        resourceType: "Reward",
        resourceId: reward.id,
        resourceName: reward.name,
        previousValue: { is_active: reward.isActive },
        newValue: { is_active: !reward.isActive },
        severity: "info",
        tags: ["reward", reward.isActive ? "deactivate" : "activate"],
      });

      setSuccessMessage(
        reward.isActive ? "Reward deactivated." : "Reward activated.",
      );
      await fetchRewardData(false);
    } catch (toggleError) {
      console.error("Failed to toggle reward:", toggleError);
      setError("Failed to update reward status.");
    }
  };

  const handleSaveSettings = async () => {
    const amountPerPoint = Number(settings.amountPerPoint);
    const minimumOrderAmount = Number(settings.minimumOrderAmount);

    if (!Number.isFinite(amountPerPoint) || amountPerPoint <= 0) {
      setError("Amount per point must be greater than 0.");
      return;
    }

    if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
      setError("Minimum order amount is invalid.");
      return;
    }

    setSavingSettings(true);
    setError("");
    setSuccessMessage("");

    try {
      const { error: updateError } = await supabase
        .from("reward_settings")
        .upsert(
          {
            id: 1,
            amount_per_point: amountPerPoint,
            minimum_order_amount: minimumOrderAmount,
            points_rounding: settings.pointsRounding,
            is_active: settings.isActive,
            notes: settings.notes.trim() || null,
          },
          {
            onConflict: "id",
          },
        );

      if (updateError) throw updateError;

      await logActivity({
        action: "UPDATE",
        category: "REWARD",
        description: "Updated reward earning settings",
        resourceType: "Reward Settings",
        resourceId: "1",
        resourceName: "Reward Settings",
        newValue: settings,
        severity: "info",
        tags: ["reward", "settings"],
      });

      setSuccessMessage("Reward settings saved successfully.");
      setShowSettingsModal(false);
      await fetchRewardData(false);
    } catch (settingsError) {
      console.error("Failed to save reward settings:", settingsError);
      setError("Failed to save reward settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const tabItems: Array<{
    id: RewardsTab;
    label: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }> = [
    {
      id: "rewards",
      label: "Rewards",
      description: "Manage reward rules",
      icon: TicketIcon,
    },
    {
      id: "redemptions",
      label: "Redemptions",
      description: "Track voucher usage",
      icon: ClipboardDocumentListIcon,
    },
    {
      id: "members",
      label: "Members",
      description: "View loyal customers",
      icon: UserGroupIcon,
    },
  ];

  return (
    <>
    <main className="min-h-[680px] overflow-hidden bg-white">
        <div className="flex h-full min-h-0">
          <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 lg:flex lg:flex-col">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Rewards</h2>

            <div className="space-y-2">
              {tabItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full rounded-lg px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`} />
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p
                          className={`mt-0.5 text-xs ${
                            isActive ? "text-gray-200" : "text-gray-400"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
            <div className="flex shrink-0 flex-col gap-4 border-b border-gray-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                  Reward Management
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage rewards, monitor redemptions, and understand loyal members.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl border border-gray-200 bg-white p-1 lg:hidden">
                  {tabItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        activeTab === item.id
                          ? "bg-gray-900 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => fetchRewardData(true)}
                  disabled={refreshing || loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Loading..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                  title="Reward settings"
                  aria-label="Open reward settings"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Reward
                </button>
              </div>
            </div>

            {error ? (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="grid shrink-0 grid-cols-2 gap-3 px-6 py-4 xl:grid-cols-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Total Rewards</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{metrics.totalRewards}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Active Rewards</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{metrics.activeRewardCount}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Available Vouchers</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{metrics.availableRedemptionCount}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Used Vouchers</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{metrics.usedRedemptionCount}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Members</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{metrics.memberCount}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              {activeTab === "rewards" ? (
                <div className="space-y-4">
                  {showForm ? (
                    <section className="rounded-2xl border border-gray-200 bg-white">
                      <form onSubmit={handleSaveReward} className="p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-bold text-gray-900">
                              {editingReward ? "Edit Reward" : "Add Reward"}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                              Set points, discount type, minimum order, and validity period.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Reward Name
                            </label>
                            <input
                              value={form.name}
                              onChange={(event) =>
                                setForm((prev) => ({ ...prev, name: event.target.value }))
                              }
                              placeholder="Rp 10.000 Discount"
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Points Required
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={form.pointsRequired}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  pointsRequired: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Discount Type
                            </label>
                            <select
                              value={form.discountType}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  discountType: event.target.value as DiscountType,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            >
                              <option value="fixed">Fixed Amount</option>
                              <option value="percentage">Percentage</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Discount Value
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={form.discountValue}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  discountValue: event.target.value,
                                }))
                              }
                              placeholder={form.discountType === "percentage" ? "10" : "10000"}
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          {form.discountType === "percentage" ? (
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Max Discount Amount
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={form.maxDiscountAmount}
                                onChange={(event) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    maxDiscountAmount: event.target.value,
                                  }))
                                }
                                placeholder="15000"
                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                              />
                            </div>
                          ) : null}

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Minimum Order Amount
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={form.minimumOrderAmount}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  minimumOrderAmount: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Valid Days
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={form.validDays}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  validDays: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Usage Limit
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={form.usageLimit}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  usageLimit: event.target.value,
                                }))
                              }
                              placeholder="Optional"
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Start At
                            </label>
                            <input
                              type="datetime-local"
                              value={form.startsAt}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  startsAt: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              End At
                            </label>
                            <input
                              type="datetime-local"
                              value={form.endsAt}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  endsAt: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <div className="xl:col-span-3">
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Description
                            </label>
                            <textarea
                              value={form.description}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  description: event.target.value,
                                }))
                              }
                              rows={3}
                              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                          </div>

                          <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 xl:col-span-3">
                            <span>
                              <span className="block text-sm font-semibold text-gray-900">
                                Active
                              </span>
                              <span className="block text-xs text-gray-500">
                                Active rewards can be viewed and redeemed by customers.
                              </span>
                            </span>

                            <input
                              type="checkbox"
                              checked={form.isActive}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  isActive: event.target.checked,
                                }))
                              }
                              className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-950"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={savingReward}
                            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingReward ? "Saving..." : editingReward ? "Save Changes" : "Create Reward"}
                          </button>
                        </div>
                      </form>
                    </section>
                  ) : null}

                  <section className="rounded-2xl border border-gray-200 bg-white">
                    <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-2">
                        <TicketIcon className="h-5 w-5 text-gray-900" />
                        <div>
                          <h2 className="text-base font-bold text-gray-900">Reward List</h2>
                          <p className="text-sm text-gray-500">
                            View all active and inactive rewards in card view.
                          </p>
                        </div>
                      </div>

                      <div className="relative w-full lg:w-80">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          value={rewardSearchQuery}
                          onChange={(event) => setRewardSearchQuery(event.target.value)}
                          placeholder="Search rewards..."
                          className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        />
                      </div>
                    </div>

                    <div className="p-4">
                      {loading ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                          Loading rewards...
                        </div>
                      ) : filteredRewards.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                          {filteredRewards.map((reward) => (
                            <article
                              key={reward.id}
                              className="rounded-2xl border border-gray-200 bg-white p-4"
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRewardStatusClass(
                                        reward,
                                      )}`}
                                    >
                                      {getRewardStatusLabel(reward)}
                                    </span>

                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                      {reward.pointsRequired} pts
                                    </span>
                                  </div>

                                  <h3 className="text-base font-bold text-gray-900">
                                    {reward.name}
                                  </h3>

                                  {reward.description ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                                      {reward.description}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditForm(reward)}
                                    className="rounded-lg border border-gray-300 p-2 text-gray-700 transition hover:border-gray-400 hover:text-gray-950"
                                    title="Edit reward"
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleToggleReward(reward)}
                                    className={`rounded-lg border p-2 transition ${
                                      reward.isActive
                                        ? "border-red-200 text-red-600 hover:border-red-300"
                                        : "border-emerald-200 text-emerald-700 hover:border-emerald-300"
                                    }`}
                                    title={reward.isActive ? "Deactivate reward" : "Activate reward"}
                                  >
                                    <CheckCircleIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-gray-50 p-3">
                                  <p className="text-xs text-gray-500">Discount</p>
                                  <p className="mt-1 text-sm font-bold text-gray-900">
                                    {getRewardValueLabel(reward)}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-gray-50 p-3">
                                  <p className="text-xs text-gray-500">Min Order</p>
                                  <p className="mt-1 text-sm font-bold text-gray-900">
                                    {formatCurrency(reward.minimumOrderAmount)}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-gray-50 p-3">
                                  <p className="text-xs text-gray-500">Valid Days</p>
                                  <p className="mt-1 text-sm font-bold text-gray-900">
                                    {reward.validDays} days
                                  </p>
                                </div>

                                <div className="rounded-xl bg-gray-50 p-3">
                                  <p className="text-xs text-gray-500">Usage</p>
                                  <p className="mt-1 text-sm font-bold text-gray-900">
                                    {reward.usedCount} / {reward.usageLimit ?? "∞"}
                                  </p>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center">
                          <TicketIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-3 text-sm font-semibold text-gray-800">
                            No rewards found
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Create a new reward or adjust your search.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === "redemptions" ? (
                <section className="rounded-2xl border border-gray-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-gray-200 p-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-gray-900" />
                      <div>
                        <h2 className="text-base font-bold text-gray-900">
                          Redemption History
                        </h2>
                        <p className="text-sm text-gray-500">
                          Monitor redeemed vouchers, usage status, and linked orders.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative w-full sm:w-80">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          value={redemptionSearchQuery}
                          onChange={(event) => setRedemptionSearchQuery(event.target.value)}
                          placeholder="Search code, customer, reward..."
                          className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        />
                      </div>

                      <select
                        value={redemptionStatusFilter}
                        onChange={(event) => setRedemptionStatusFilter(event.target.value)}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                      >
                        {REDEMPTION_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status === "all"
                              ? "All Status"
                              : status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-245 text-left">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-3 font-semibold">Voucher</th>
                          <th className="px-4 py-3 font-semibold">Customer</th>
                          <th className="px-4 py-3 font-semibold">Reward</th>
                          <th className="px-4 py-3 font-semibold">Points</th>
                          <th className="px-4 py-3 font-semibold">Redeemed</th>
                          <th className="px-4 py-3 font-semibold">Used Order</th>
                          <th className="px-4 py-3 font-semibold">Discount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-sm text-gray-500">
                              Loading redemptions...
                            </td>
                          </tr>
                        ) : filteredRedemptions.length > 0 ? (
                          filteredRedemptions.map((redemption) => (
                            <tr key={redemption.id} className="border-b border-gray-100">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-gray-900">{redemption.code}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Expires {formatDate(redemption.expiresAt)}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <p className="font-semibold text-gray-900">
                                  {redemption.customerName}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {redemption.customerContact}
                                </p>
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-700">
                                {redemption.rewardName}
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {redemption.pointsSpent}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getRedemptionStatusClass(
                                    redemption.status,
                                  )}`}
                                >
                                  {redemption.status}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-600">
                                {formatDateTime(redemption.redeemedAt)}
                              </td>

                              <td className="px-4 py-4">
                                <p className="text-sm font-semibold text-gray-900">
                                  {redemption.orderNumber}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Used {formatDateTime(redemption.usedAt)}
                                </p>
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {redemption.orderDiscount > 0
                                  ? formatCurrency(redemption.orderDiscount)
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center">
                              <ClipboardDocumentListIcon className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="mt-3 text-sm font-semibold text-gray-800">
                                No redemptions found
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Customer voucher activity will appear here.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {activeTab === "members" ? (
                <section className="rounded-2xl border border-gray-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-gray-900" />
                      <div>
                        <h2 className="text-base font-bold text-gray-900">
                          Member Loyalty
                        </h2>
                        <p className="text-sm text-gray-500">
                          View loyal customers by points, spending, visits, and reward usage.
                        </p>
                      </div>
                    </div>

                    <div className="relative w-full lg:w-80">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={memberSearchQuery}
                        onChange={(event) => setMemberSearchQuery(event.target.value)}
                        placeholder="Search members..."
                        className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-245 text-left">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-3 font-semibold">Member</th>
                          <th className="px-4 py-3 font-semibold">Points</th>
                          <th className="px-4 py-3 font-semibold">Total Spent</th>
                          <th className="px-4 py-3 font-semibold">Visits</th>
                          <th className="px-4 py-3 font-semibold">Redemptions</th>
                          <th className="px-4 py-3 font-semibold">Member Since</th>
                          <th className="px-4 py-3 font-semibold">Last Order</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-sm text-gray-500">
                              Loading members...
                            </td>
                          </tr>
                        ) : filteredMembers.length > 0 ? (
                          filteredMembers.map((member) => (
                            <tr key={member.id} className="border-b border-gray-100">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-gray-900">{member.name}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {member.phone !== "-" ? member.phone : member.email}
                                </p>
                              </td>

                              <td className="px-4 py-4 text-sm font-bold text-gray-900">
                                {member.loyaltyPoints}
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {formatCurrency(member.totalSpent)}
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {member.visitCount}
                              </td>

                              <td className="px-4 py-4">
                                <p className="text-sm font-semibold text-gray-900">
                                  {member.totalRedemptions}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {member.usedRedemptions} used
                                </p>
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-600">
                                {formatDate(member.memberSince)}
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-600">
                                {formatDateTime(member.lastOrderAt)}
                              </td>

                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center">
                              <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="mt-3 text-sm font-semibold text-gray-800">
                                No members found
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Registered customers will appear here.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {showSettingsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Cog6ToothIcon className="h-5 w-5 text-gray-900" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Reward Settings</h2>
                  <p className="text-sm text-gray-500">
                    Configure point earning and basic reward rules.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Amount per Point
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.amountPerPoint}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        amountPerPoint: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Example: 10000 means Rp 10,000 = 1 point.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Minimum Order to Earn
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.minimumOrderAmount}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        minimumOrderAmount: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Points Rounding
                  </label>
                  <select
                    value={settings.pointsRounding}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        pointsRounding: event.target.value as PointsRounding,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  >
                    <option value="floor">Floor</option>
                    <option value="round">Round</option>
                    <option value="ceil">Ceil</option>
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      Reward Earning Active
                    </span>
                    <span className="block text-xs text-gray-500">
                      If off, payments will not earn points.
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    checked={settings.isActive}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                </label>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={settings.notes}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-950"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
