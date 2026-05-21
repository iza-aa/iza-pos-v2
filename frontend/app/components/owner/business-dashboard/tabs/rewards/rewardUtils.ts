export type RewardType = "discount" | "free_product";
export type DiscountType = "fixed" | "percentage";
export type RedemptionStatus = "available" | "used" | "expired" | "cancelled" | string;

export type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  reward_type: RewardType | string;
  discount_type: DiscountType | string | null;
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
  created_at: string;
  updated_at: string;
};

export type Reward = {
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
};

export type RewardFormState = {
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

export const EMPTY_REWARD_FORM: RewardFormState = {
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

export const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const toNullableNumber = (value: string): number | null => {
  const parsed = Number(value.trim());
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDate = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatDateTimeInput = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

export const normalizeReward = (row: RewardRow): Reward => ({
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
});

export const rewardToForm = (reward: Reward): RewardFormState => ({
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
});

export const getRewardValueLabel = (reward: Reward): string => {
  if (reward.rewardType === "free_product") return "Free Product";
  if (reward.discountType === "percentage") {
    return `${reward.discountValue}% off${
      reward.maxDiscountAmount ? `, max ${formatCurrency(reward.maxDiscountAmount)}` : ""
    }`;
  }
  return `${formatCurrency(reward.discountValue)} off`;
};

export const getRewardStatusLabel = (reward: Reward): string => {
  if (!reward.isActive) return "Inactive";
  const now = new Date();
  if (reward.startsAt && now < new Date(reward.startsAt)) return "Scheduled";
  if (reward.endsAt && now > new Date(reward.endsAt)) return "Ended";
  if (reward.usageLimit !== null && reward.usedCount >= reward.usageLimit) {
    return "Limit reached";
  }
  return "Active";
};

export const getRewardStatusClass = (reward: Reward): string => {
  const status = getRewardStatusLabel(reward);
  if (status === "Active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Scheduled") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Ended" || status === "Limit reached") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-gray-200 bg-gray-100 text-gray-700";
};
