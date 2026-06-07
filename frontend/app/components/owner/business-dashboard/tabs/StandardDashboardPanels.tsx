"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { ExportButton, StandardModal } from "@/app/components/shared";
import { getDomainLabel, useLanguage } from "@/app/components/shared/i18n";
import {
  OWNER_CHART_COLORS,
  OWNER_CHART_SERIES,
  OWNER_SEMANTIC_TONES,
} from "@/lib/constants/theme";
import { getStockStatus } from "@/lib/constants";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { downloadXlsxWorkbook } from "@/lib/utils/exportExcel";
import GenerateRecommendationPanel from "../ai/GenerateRecommendationPanel";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "./DateRangeFilter";
import {
  ChartCard,
  EmptyState,
  MetricCard,
  StandardTooltip,
} from "./shared/DashboardPrimitives";
import type { DashboardData, OrderRow, RewardRow } from "./shared/dashboardTypes";
import {
  formatCurrency,
  formatNumber,
  getBusinessDateFromTimestamp,
  getBusinessHourFromTimestamp,
  getDatesBetween,
  getOrderBusinessDate,
  getOrderBusinessHour,
  getRangeLengthDays,
  groupBy,
  isValidSalesOrder,
  toNumber,
} from "./shared/dashboardUtils";
import useOwnerDashboardData from "./shared/useOwnerDashboardData";

type BundleProductOption = {
  id: string;
  name: string;
  price: number;
  available: boolean;
};

type MenuBundleRow = {
  id: string;
  name: string | null;
  description: string | null;
  bundle_price: number | string | null;
  is_active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number | string | null;
};

type MenuBundleItemRow = {
  id: string;
  bundle_id: string | null;
  product_id: string | null;
  quantity: number | string | null;
  sort_order: number | string | null;
};

function CustomerDiscountDashboard() {
  const { t } = useLanguage();
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [products, setProducts] = useState<BundleProductOption[]>([]);
  const [bundles, setBundles] = useState<MenuBundleRow[]>([]);
  const [bundleItems, setBundleItems] = useState<MenuBundleItemRow[]>([]);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBundles, setLoadingBundles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBundle, setSavingBundle] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [bundleFeedback, setBundleFeedback] = useState("");
  const [attemptedDiscountSubmit, setAttemptedDiscountSubmit] = useState(false);
  const [attemptedBundleSubmit, setAttemptedBundleSubmit] = useState(false);
  const discountNameRef = useRef<HTMLInputElement | null>(null);
  const discountValueRef = useRef<HTMLInputElement | null>(null);
  const bundleNameRef = useRef<HTMLInputElement | null>(null);
  const bundlePriceRef = useRef<HTMLInputElement | null>(null);
  const bundleItemsRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "10",
    maxDiscountAmount: "",
    pointsRequired: "0",
    minimumOrderAmount: "0",
    validDays: "7",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  });
  const [bundleForm, setBundleForm] = useState({
    name: "",
    description: "",
    bundlePrice: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
    displayOrder: "0",
    productIds: [] as string[],
    quantities: {} as Record<string, string>,
  });
  const defaultForm = {
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "10",
    maxDiscountAmount: "",
    pointsRequired: "0",
    minimumOrderAmount: "0",
    validDays: "7",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  };
  const defaultBundleForm = {
    name: "",
    description: "",
    bundlePrice: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
    displayOrder: "0",
    productIds: [] as string[],
    quantities: {} as Record<string, string>,
  };
  const requiredInputClass = "border-gray-900";
  const invalidRequiredClass = "border-red-400 bg-red-50";
  const discountValueNumber = toNumber(form.discountValue);
  const bundlePriceNumber = toNumber(bundleForm.bundlePrice);
  const discountNameInvalid = !form.name.trim();
  const discountValueInvalid =
    discountValueNumber <= 0 || (form.discountType === "percentage" && discountValueNumber > 100);
  const bundleNameInvalid = !bundleForm.name.trim();
  const bundlePriceInvalid = bundlePriceNumber <= 0;
  const bundleItemsInvalid = bundleForm.productIds.length < 2;
  const discountInvalidClass = (invalid: boolean) =>
    attemptedDiscountSubmit && invalid ? invalidRequiredClass : requiredInputClass;
  const bundleInvalidClass = (invalid: boolean) =>
    attemptedBundleSubmit && invalid ? invalidRequiredClass : requiredInputClass;

  const loadRewards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rewards")
      .select("id,name,description,discount_type,discount_value,max_discount_amount,points_required,minimum_order_amount,valid_days,usage_limit,used_count,is_active,starts_at,ends_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      setFeedback(error.message);
    } else {
      setRewards((data ?? []) as RewardRow[]);
    }

    setLoading(false);
  };

  const loadBundles = async () => {
    setLoadingBundles(true);
    setBundleFeedback("");

    const [productResult, bundleResult, itemResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,price,available")
        .order("name", { ascending: true }),
      supabase
        .from("menu_bundles")
        .select("id,name,description,bundle_price,is_active,starts_at,ends_at,display_order")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_bundle_items")
        .select("id,bundle_id,product_id,quantity,sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (productResult.error) {
      setBundleFeedback(productResult.error.message);
    } else {
      setProducts(
        (productResult.data ?? []).map((product) => ({
          id: product.id,
          name: product.name ?? "Menu item",
          price: toNumber(product.price),
          available: product.available === true,
        })),
      );
    }

    const bundleError = bundleResult.error || itemResult.error;
    if (bundleError) {
      const message = bundleError.message.toLowerCase();
      setBundleFeedback(
        message.includes("menu_bundles") || message.includes("menu_bundle_items") || message.includes("schema cache")
          ? t("owner.bundle.tablesMissing")
          : bundleError.message,
      );
      setBundles([]);
      setBundleItems([]);
    } else {
      setBundles((bundleResult.data ?? []) as MenuBundleRow[]);
      setBundleItems((itemResult.data ?? []) as MenuBundleItemRow[]);
    }

    setLoadingBundles(false);
  };

  useEffect(() => {
    void loadRewards();
    void loadBundles();
  }, []);

  const updateForm = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingRewardId(null);
    setAttemptedDiscountSubmit(false);
    setForm(defaultForm);
  };

  const resetBundleForm = () => {
    setEditingBundleId(null);
    setAttemptedBundleSubmit(false);
    setBundleForm(defaultBundleForm);
  };

  const updateBundleForm = (
    key: keyof typeof bundleForm,
    value: string | boolean | string[] | Record<string, string>,
  ) => {
    setBundleForm((current) => ({ ...current, [key]: value }));
  };

  const toggleBundleProduct = (productId: string) => {
    setBundleForm((current) => {
      const selected = current.productIds.includes(productId);
      const productIds = selected
        ? current.productIds.filter((id) => id !== productId)
        : [...current.productIds, productId];
      const quantities = { ...current.quantities };

      if (selected) {
        delete quantities[productId];
      } else if (!quantities[productId]) {
        quantities[productId] = "1";
      }

      return { ...current, productIds, quantities };
    });
  };

  const updateBundleQuantity = (productId: string, value: string) => {
    setBundleForm((current) => ({
      ...current,
      quantities: {
        ...current.quantities,
        [productId]: value,
      },
    }));
  };

  const startEdit = (reward: RewardRow) => {
    setEditingRewardId(reward.id);
    setFeedback("");
    setAttemptedDiscountSubmit(false);
    setForm({
      name: reward.name ?? "",
      description: reward.description ?? "",
      discountType: reward.discount_type ?? "percentage",
      discountValue: String(toNumber(reward.discount_value) || 10),
      maxDiscountAmount: reward.max_discount_amount
        ? String(toNumber(reward.max_discount_amount))
        : "",
      pointsRequired: String(toNumber(reward.points_required)),
      minimumOrderAmount: String(toNumber(reward.minimum_order_amount)),
      validDays: reward.valid_days ? String(toNumber(reward.valid_days)) : "7",
      usageLimit: reward.usage_limit ? String(toNumber(reward.usage_limit)) : "",
      startsAt: reward.starts_at ? String(reward.starts_at).slice(0, 10) : "",
      endsAt: reward.ends_at ? String(reward.ends_at).slice(0, 10) : "",
      isActive: Boolean(reward.is_active),
    });
  };

  const getBundleItems = (bundleId: string) =>
    bundleItems
      .filter((item) => item.bundle_id === bundleId)
      .sort((left, right) => toNumber(left.sort_order) - toNumber(right.sort_order));

  const getBundleNormalPrice = (bundleId: string) =>
    getBundleItems(bundleId).reduce((sum, item) => {
      const product = products.find((productOption) => productOption.id === item.product_id);
      return sum + (product?.price ?? 0) * toNumber(item.quantity || 1);
    }, 0);

  const startEditBundle = (bundle: MenuBundleRow) => {
    const items = getBundleItems(bundle.id);
    setEditingBundleId(bundle.id);
    setBundleFeedback("");
    setAttemptedBundleSubmit(false);
    setBundleForm({
      name: bundle.name ?? "",
      description: bundle.description ?? "",
      bundlePrice: String(toNumber(bundle.bundle_price)),
      startsAt: bundle.starts_at ? String(bundle.starts_at).slice(0, 10) : "",
      endsAt: bundle.ends_at ? String(bundle.ends_at).slice(0, 10) : "",
      isActive: Boolean(bundle.is_active),
      displayOrder: String(toNumber(bundle.display_order)),
      productIds: items.map((item) => item.product_id).filter((id): id is string => Boolean(id)),
      quantities: items.reduce<Record<string, string>>((map, item) => {
        if (item.product_id) {
          map[item.product_id] = String(toNumber(item.quantity || 1));
        }
        return map;
      }, {}),
    });
  };

  const deleteDiscount = async (reward: RewardRow) => {
    const confirmed = window.confirm(t("owner.discount.deleteConfirm", { name: reward.name ?? "this discount" }));
    if (!confirmed) return;

    setSaving(true);
    setFeedback("");

    const { error } = await supabase.from("rewards").delete().eq("id", reward.id);

    if (error) {
      setFeedback(error.message);
      showError(error.message);
    } else {
      setFeedback(t("owner.discount.deleted"));
      showSuccess(t("owner.discount.deleted"));
      if (editingRewardId === reward.id) {
        resetForm();
      }
      await loadRewards();
    }

    setSaving(false);
  };

  const deleteBundle = async (bundle: MenuBundleRow) => {
    const confirmed = window.confirm(t("owner.bundle.deleteConfirm", { name: bundle.name ?? "this bundle" }));
    if (!confirmed) return;

    setSavingBundle(true);
    setBundleFeedback("");

    const { error } = await supabase.from("menu_bundles").delete().eq("id", bundle.id);

    if (error) {
      setBundleFeedback(error.message);
      showError(error.message);
    } else {
      setBundleFeedback(t("owner.bundle.deleted"));
      showSuccess(t("owner.bundle.deleted"));
      if (editingBundleId === bundle.id) {
        resetBundleForm();
      }
      await loadBundles();
    }

    setSavingBundle(false);
  };

  const saveDiscount = async () => {
    setSaving(true);
    setFeedback("");
    setAttemptedDiscountSubmit(true);

    const discountValue = toNumber(form.discountValue);
    const pointsRequired = toNumber(form.pointsRequired);
    const minimumOrderAmount = toNumber(form.minimumOrderAmount);
    const maxDiscountAmount = form.maxDiscountAmount
      ? toNumber(form.maxDiscountAmount)
      : null;
    const usageLimit = form.usageLimit ? toNumber(form.usageLimit) : null;
    const validDays = form.validDays ? toNumber(form.validDays) : null;

    if (!form.name.trim()) {
      setFeedback(t("owner.discount.nameRequired"));
      showError(t("owner.discount.nameRequired"));
      discountNameRef.current?.focus();
      setSaving(false);
      return;
    }

    if (discountValue <= 0) {
      setFeedback(t("owner.discount.valueRequired"));
      showError(t("owner.discount.valueRequired"));
      discountValueRef.current?.focus();
      setSaving(false);
      return;
    }

    if (form.discountType === "percentage" && discountValue > 100) {
      setFeedback(t("owner.discount.percentageTooHigh"));
      showError(t("owner.discount.percentageTooHigh"));
      discountValueRef.current?.focus();
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      reward_type: "discount",
      discount_type: form.discountType,
      discount_value: discountValue,
      max_discount_amount: maxDiscountAmount,
      points_required: pointsRequired,
      minimum_order_amount: minimumOrderAmount,
      valid_days: validDays,
      usage_limit: usageLimit,
      is_active: form.isActive,
      starts_at: form.startsAt || null,
      ends_at: form.endsAt || null,
    };
    const { error } = editingRewardId
      ? await supabase.from("rewards").update(payload).eq("id", editingRewardId)
      : await supabase.from("rewards").insert({ ...payload, used_count: 0 });

    if (error) {
      setFeedback(error.message);
      showError(error.message);
    } else {
      setFeedback(editingRewardId ? t("owner.discount.updated") : t("owner.discount.created"));
      showSuccess(editingRewardId ? t("owner.discount.updated") : t("owner.discount.created"));
      resetForm();
      await loadRewards();
    }

    setSaving(false);
  };

  const saveBundle = async () => {
    setSavingBundle(true);
    setBundleFeedback("");
    setAttemptedBundleSubmit(true);

    const selectedProductIds = bundleForm.productIds;
    const bundlePrice = toNumber(bundleForm.bundlePrice);

    if (!bundleForm.name.trim()) {
      setBundleFeedback(t("owner.bundle.nameRequired"));
      showError(t("owner.bundle.nameRequired"));
      bundleNameRef.current?.focus();
      setSavingBundle(false);
      return;
    }

    if (selectedProductIds.length < 2) {
      setBundleFeedback(t("owner.bundle.itemsRequired"));
      showError(t("owner.bundle.itemsRequired"));
      bundleItemsRef.current?.focus();
      setSavingBundle(false);
      return;
    }

    if (bundlePrice <= 0) {
      setBundleFeedback(t("owner.bundle.priceRequired"));
      showError(t("owner.bundle.priceRequired"));
      bundlePriceRef.current?.focus();
      setSavingBundle(false);
      return;
    }

    const normalizedItems = selectedProductIds.map((productId, index) => ({
      product_id: productId,
      quantity: Math.max(1, Math.floor(toNumber(bundleForm.quantities[productId] || 1))),
      sort_order: index,
    }));

    const payload = {
      name: bundleForm.name.trim(),
      description: bundleForm.description.trim() || null,
      bundle_price: bundlePrice,
      is_active: bundleForm.isActive,
      starts_at: bundleForm.startsAt || null,
      ends_at: bundleForm.endsAt || null,
      display_order: Math.floor(toNumber(bundleForm.displayOrder)),
    };

    const bundleResult = editingBundleId
      ? await supabase.from("menu_bundles").update(payload).eq("id", editingBundleId).select("id").single()
      : await supabase.from("menu_bundles").insert(payload).select("id").single();

    if (bundleResult.error || !bundleResult.data?.id) {
      setBundleFeedback(bundleResult.error?.message || t("owner.bundle.saveError"));
      showError(bundleResult.error?.message || t("owner.bundle.saveError"));
      setSavingBundle(false);
      return;
    }

    const bundleId = bundleResult.data.id as string;
    const deleteItems = await supabase.from("menu_bundle_items").delete().eq("bundle_id", bundleId);

    if (deleteItems.error) {
      setBundleFeedback(deleteItems.error.message);
      showError(deleteItems.error.message);
      setSavingBundle(false);
      return;
    }

    const insertItems = await supabase.from("menu_bundle_items").insert(
      normalizedItems.map((item) => ({
        bundle_id: bundleId,
        ...item,
      })),
    );

    if (insertItems.error) {
      setBundleFeedback(insertItems.error.message);
      showError(insertItems.error.message);
    } else {
      setBundleFeedback(editingBundleId ? t("owner.bundle.updated") : t("owner.bundle.created"));
      showSuccess(editingBundleId ? t("owner.bundle.updated") : t("owner.bundle.created"));
      resetBundleForm();
      await loadBundles();
    }

    setSavingBundle(false);
  };

  return (
    <div className="space-y-4">
      <ChartCard
        title={editingRewardId ? t("owner.discount.edit") : t("owner.discount.create")}
        subtitle={t("owner.discount.subtitle")}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.name")} <span className="text-red-500">*</span></span>
                <input
                  ref={discountNameRef}
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-gray-900 ${discountInvalidClass(discountNameInvalid)}`}
                  placeholder="Member Weekend Discount"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.type")}</span>
                <select
                  value={form.discountType}
                  onChange={(event) => updateForm("discountType", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-gray-700">{t("owner.discount.description")}</span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                placeholder="Short explanation shown to customers."
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.value")} <span className="text-red-500">*</span></span>
                <input
                  ref={discountValueRef}
                  type="number"
                  min="0"
                  value={form.discountValue}
                  onChange={(event) => updateForm("discountValue", event.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-gray-900 ${discountInvalidClass(discountValueInvalid)}`}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.maxDiscount")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.maxDiscountAmount}
                  onChange={(event) => updateForm("maxDiscountAmount", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.pointsRequired")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.pointsRequired}
                  onChange={(event) => updateForm("pointsRequired", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.minOrder")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.minimumOrderAmount}
                  onChange={(event) => updateForm("minimumOrderAmount", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.validDays")}</span>
                <input
                  type="number"
                  min="1"
                  value={form.validDays}
                  onChange={(event) => updateForm("validDays", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.usageLimit")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={(event) => updateForm("usageLimit", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.startDate")}</span>
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(event) => updateForm("startsAt", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.endDate")}</span>
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(event) => updateForm("endsAt", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700">
                Activate this discount immediately
              </span>
            </label>

            {feedback ? (
              <div className={`rounded-xl border p-3 text-sm font-semibold ${OWNER_SEMANTIC_TONES.waiting.badgeClass}`}>
                {feedback}
              </div>
            ) : null}

            <button
              type="button"
              onClick={saveDiscount}
              disabled={saving}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? editingRewardId
                  ? t("owner.discount.updating")
                  : t("owner.discount.creating")
                : editingRewardId
                  ? t("owner.discount.update")
                  : t("owner.discount.create")}
            </button>
            {editingRewardId ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="ml-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("owner.discount.cancelEdit")}
              </button>
            ) : null}
          </div>

          <aside className="self-start rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-950">{t("owner.discount.recent")}</p>
            <div className="mt-3 space-y-3">
              {loading ? (
                <p className="text-sm text-gray-500">{t("owner.discount.loading")}</p>
              ) : rewards.length ? (
                rewards.map((reward) => (
                  <div key={reward.id} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{reward.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {reward.discount_type === "percentage"
                            ? `${toNumber(reward.discount_value)}% off`
                            : `${formatCurrency(toNumber(reward.discount_value))} off`}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          reward.is_active
                            ? OWNER_SEMANTIC_TONES.success.badgeClass
                            : OWNER_SEMANTIC_TONES.neutral.badgeClass
                        }`}
                      >
                {reward.is_active ? t("owner.discount.active") : t("owner.discount.inactive")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Used {formatNumber(toNumber(reward.used_count))} times
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(reward)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        {t("owner.discount.editAction")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDiscount(reward)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        {t("owner.discount.deleteAction")}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No discounts created yet.</p>
              )}
            </div>
          </aside>
        </div>
      </ChartCard>
      <ChartCard
        title={editingBundleId ? t("owner.bundle.edit") : t("owner.bundle.create")}
        subtitle={t("owner.bundle.subtitle")}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.bundle.name")} <span className="text-red-500">*</span></span>
                <input
                  ref={bundleNameRef}
                  value={bundleForm.name}
                  onChange={(event) => updateBundleForm("name", event.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-gray-900 ${bundleInvalidClass(bundleNameInvalid)}`}
                  placeholder="Morning Coffee Set"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.bundle.price")} <span className="text-red-500">*</span></span>
                <input
                  ref={bundlePriceRef}
                  type="number"
                  min="0"
                  value={bundleForm.bundlePrice}
                  onChange={(event) => updateBundleForm("bundlePrice", event.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-gray-900 ${bundleInvalidClass(bundlePriceInvalid)}`}
                  placeholder="45000"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-gray-700">{t("owner.discount.description")}</span>
              <textarea
                value={bundleForm.description}
                onChange={(event) => updateBundleForm("description", event.target.value)}
                className="min-h-20 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                placeholder="Short customer-facing bundle description."
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.startDate")}</span>
                <input
                  type="date"
                  value={bundleForm.startsAt}
                  onChange={(event) => updateBundleForm("startsAt", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.discount.endDate")}</span>
                <input
                  type="date"
                  value={bundleForm.endsAt}
                  onChange={(event) => updateBundleForm("endsAt", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">{t("owner.bundle.menuPosition")}</span>
                <input
                  type="number"
                  value={bundleForm.displayOrder}
                  onChange={(event) => updateBundleForm("displayOrder", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">{t("owner.bundle.positionHelper")}</p>
              </label>
            </div>

            <div
              ref={bundleItemsRef}
              tabIndex={-1}
              className={`rounded-xl border bg-gray-50 p-3 outline-none ${bundleInvalidClass(bundleItemsInvalid)}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-950">{t("owner.bundle.items")}</p>
                <p className="text-xs font-semibold text-gray-500">
                  {t("owner.bundle.selected", { count: bundleForm.productIds.length })}
                </p>
              </div>
              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {products.map((product) => {
                  const selected = bundleForm.productIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`rounded-xl border bg-white p-3 transition ${
                        selected ? "border-gray-900" : "border-gray-200"
                      }`}
                    >
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleBundleProduct(product.id)}
                          className="mt-1 h-4 w-4"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {product.name}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {formatCurrency(product.price)}
                            {product.available ? "" : " / unavailable"}
                          </span>
                        </span>
                      </label>
                      {selected ? (
                        <label className="mt-2 block">
                          <span className="text-xs font-semibold text-gray-500">Qty</span>
                          <input
                            type="number"
                            min="1"
                            value={bundleForm.quantities[product.id] ?? "1"}
                            onChange={(event) => updateBundleQuantity(product.id, event.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gray-900"
                          />
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <input
                type="checkbox"
                checked={bundleForm.isActive}
                onChange={(event) => updateBundleForm("isActive", event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700">
                {t("owner.bundle.showInMenu")}
              </span>
            </label>

            {bundleFeedback ? (
              <div className={`rounded-xl border p-3 text-sm font-semibold ${OWNER_SEMANTIC_TONES.waiting.badgeClass}`}>
                {bundleFeedback}
              </div>
            ) : null}

            <button
              type="button"
              onClick={saveBundle}
              disabled={savingBundle}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingBundle
                ? editingBundleId
                  ? t("owner.bundle.updating")
                  : t("owner.bundle.creating")
                : editingBundleId
                  ? t("owner.bundle.update")
                  : t("owner.bundle.create")}
            </button>
            {editingBundleId ? (
              <button
                type="button"
                onClick={resetBundleForm}
                disabled={savingBundle}
                className="ml-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("owner.discount.cancelEdit")}
              </button>
            ) : null}
          </div>

          <aside className="self-start rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-950">{t("owner.bundle.active")}</p>
            <div className="mt-3 space-y-3">
              {loadingBundles ? (
                <p className="text-sm text-gray-500">{t("owner.bundle.loading")}</p>
              ) : bundles.length ? (
                bundles.map((bundle) => {
                  const items = getBundleItems(bundle.id);
                  const normalPrice = getBundleNormalPrice(bundle.id);
                  const bundlePrice = toNumber(bundle.bundle_price);
                  return (
                    <div key={bundle.id} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{bundle.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {items
                              .map((item) => {
                                const product = products.find((option) => option.id === item.product_id);
                                return `${toNumber(item.quantity || 1)}x ${product?.name ?? "Menu item"}`;
                              })
                              .join(", ")}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            bundle.is_active
                              ? OWNER_SEMANTIC_TONES.success.badgeClass
                              : OWNER_SEMANTIC_TONES.neutral.badgeClass
                          }`}
                        >
                          {bundle.is_active ? t("owner.discount.active") : t("owner.discount.inactive")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-gray-950">
                        {formatCurrency(bundlePrice)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Normal {formatCurrency(normalPrice)}
                        {normalPrice > bundlePrice
                          ? ` / Save ${formatCurrency(normalPrice - bundlePrice)}`
                          : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditBundle(bundle)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          {t("owner.discount.editAction")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteBundle(bundle)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          {t("owner.discount.deleteAction")}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No menu bundles created yet.</p>
              )}
            </div>
          </aside>
        </div>
      </ChartCard>
    </div>
  );
}

const normalizeInventoryTransactionType = (type?: string | null) => {
  const raw = String(type || "sale").toLowerCase();
  if (raw === "order_usage") return "sale";
  if (raw === "stock_in") return "restock";
  return raw;
};

const getInventoryTransactionTimestamp = (createdAt?: string | null, timestamp?: string | null) => {
  return createdAt || timestamp || null;
};

const getInventorySnapshotRange = (data: DashboardData): DateRangeValue => {
  const today = getDefaultDateRange().endDate;
  const activityDates = [
    ...data.usageTransactions.map((transaction) =>
      getBusinessDateFromTimestamp(
        getInventoryTransactionTimestamp(transaction.created_at, transaction.timestamp),
      ),
    ),
    ...data.inventoryBatches.map((batch) => getBusinessDateFromTimestamp(batch.received_at)),
  ].filter((date): date is string => Boolean(date));

  return {
    startDate: activityDates.length ? activityDates.sort()[0] : today,
    endDate: today,
  };
};

const getCurrentStockReportMonthRange = (): DateRangeValue => {
  const today = getDefaultDateRange().endDate;
  return {
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today,
  };
};

function getUsageTransactionsInRange(data: DashboardData, range: DateRangeValue) {
  return data.usageTransactions.filter((transaction) => {
    const businessDate = getBusinessDateFromTimestamp(
      getInventoryTransactionTimestamp(transaction.created_at, transaction.timestamp),
    );
    return businessDate >= range.startDate && businessDate <= range.endDate;
  });
}

function getInventoryUnitCost(item?: { cost_per_unit?: number | string | null; price_per_unit?: number | string | null }) {
  return toNumber(item?.cost_per_unit ?? item?.price_per_unit);
}

function buildInventoryMovementTrend(
  data: DashboardData,
  range: DateRangeValue,
  selectedInventoryItemId: string,
) {
  const transactions = getUsageTransactionsInRange(data, range);
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const transactionById = new Map(data.usageTransactions.map((transaction) => [transaction.id, transaction]));
  const inventoryById = new Map(data.inventoryItems.map((item) => [item.id, item]));
  const details = data.usageTransactionDetails.filter((detail) => {
    if (!detail.usage_transaction_id || !transactionIds.has(detail.usage_transaction_id)) {
      return false;
    }

    if (selectedInventoryItemId === "all") return true;

    return detail.inventory_item_id === selectedInventoryItemId;
  });
  const hourly = range.startDate === range.endDate;
  const dateBuckets = hourly
    ? Array.from({ length: 24 }, (_, hour) => {
        const label = `${String(hour).padStart(2, "0")}:00`;
        return { key: `${range.startDate} ${label}`, label };
      })
    : getDatesBetween(range.startDate, range.endDate).map((date) => ({
        key: date,
        label: date.slice(5),
      }));

  return dateBuckets.map((bucket) => {
    const rows = details.filter((detail) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const timestamp = getInventoryTransactionTimestamp(
        transaction?.created_at,
        transaction?.timestamp,
      );
      const date = getBusinessDateFromTimestamp(timestamp);
      const hour = getBusinessHourFromTimestamp(timestamp);
      const key = hourly ? `${date} ${hour}:00` : date;
      return key === bucket.key;
    });
    const getValue = (type: string) =>
      rows
        .filter((detail) => {
          const transaction = transactionById.get(detail.usage_transaction_id ?? "");
          return normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type) === type;
        })
        .reduce((sum, detail) => {
          const quantity = toNumber(detail.quantity_used);
          if (selectedInventoryItemId !== "all") return sum + quantity;

          const inventory = inventoryById.get(detail.inventory_item_id ?? "");
          return sum + quantity * getInventoryUnitCost(inventory);
        }, 0);

    return {
      date: bucket.label,
      stockIn: getValue("restock"),
      stockOut: getValue("sale"),
      adjustments: getValue("adjustment"),
    };
  });
}

function buildStockMovementRows(data: DashboardData, range: DateRangeValue, limit = 7) {
  const transactionById = new Map(data.usageTransactions.map((row) => [row.id, row]));
  const inventoryNameById = new Map(
    data.inventoryItems.map((item) => [item.id, item.name ?? "Inventory item"]),
  );
  const transactionsInRange = new Set(getUsageTransactionsInRange(data, range).map((row) => row.id));

  const rows = data.usageTransactionDetails
    .filter((detail) => detail.usage_transaction_id && transactionsInRange.has(detail.usage_transaction_id))
    .map((detail, index) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const type = normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type);
      const previous = toNumber(detail.previous_stock);
      const next = toNumber(detail.new_stock);

      return {
        id: `${detail.usage_transaction_id}-${detail.inventory_item_id}-${detail.ingredient_name}-${index}`,
        itemName:
          detail.ingredient_name ||
          inventoryNameById.get(detail.inventory_item_id ?? "") ||
          "Inventory item",
        type,
        quantity: toNumber(detail.quantity_used),
        unit: detail.unit ?? "",
        previous,
        next,
        timestamp: getInventoryTransactionTimestamp(transaction?.created_at, transaction?.timestamp),
        actor: transaction?.performed_by_name ?? "System",
        notes: transaction?.notes ?? "",
      };
    })
    .sort((a, b) => String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? "")));

  return limit > 0 ? rows.slice(0, limit) : rows;
}

function buildInventoryHealthSummary(data: DashboardData, range: DateRangeValue) {
  const inventoryById = new Map(data.inventoryItems.map((item) => [item.id, item]));
  const rows = data.inventoryItems.map((item) => {
    const current = toNumber(item.current_stock);
    const minimum = toNumber(item.reorder_level);
    const unitCost = getInventoryUnitCost(item);
    return {
      id: item.id,
      name: item.name ?? "Inventory item",
      current,
      minimum,
      unitCost,
      suggestedRestock: Math.max(0, minimum * 2 - current),
      hasDataIssue: current < 0 || minimum <= 0 || !item.unit,
    };
  });
  const transactions = getUsageTransactionsInRange(data, range);
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const transactionById = new Map(data.usageTransactions.map((transaction) => [transaction.id, transaction]));
  const stockOutByItem = new Map<string, { name: string; value: number; quantity: number }>();

  data.usageTransactionDetails
    .filter((detail) => detail.usage_transaction_id && transactionIds.has(detail.usage_transaction_id))
    .forEach((detail) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const type = normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type);
      if (type !== "sale") return;

      const inventory = inventoryById.get(detail.inventory_item_id ?? "");
      const quantity = toNumber(detail.quantity_used);
      const value = quantity * getInventoryUnitCost(inventory);
      const itemId = detail.inventory_item_id ?? detail.ingredient_name ?? "unknown";
      const current = stockOutByItem.get(itemId) ?? {
        name: detail.ingredient_name || inventory?.name || "Inventory item",
        value: 0,
        quantity: 0,
      };

      stockOutByItem.set(itemId, {
        ...current,
        value: current.value + value,
        quantity: current.quantity + quantity,
      });
    });

  const mostUsed = Array.from(stockOutByItem.values()).sort(
    (a, b) => b.value - a.value || b.quantity - a.quantity,
  )[0];

  return {
    totalItems: rows.length,
    criticalItems: rows.filter((item) => getStockStatus(item.current, item.minimum) === "critical").length,
    estimatedRestockCost: rows.reduce(
      (sum, item) => sum + item.suggestedRestock * item.unitCost,
      0,
    ),
    dataIssues: rows.filter((item) => item.hasDataIssue).length,
    mostUsedName: mostUsed?.name ?? "-",
  };
}

function InventoryDashboard() {
  const { language, t } = useLanguage();
  const data = useOwnerDashboardData();
  const dateRange = getInventorySnapshotRange(data);
  const stockReportRange = getCurrentStockReportMonthRange();
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("all");
  const inventoryRowsBase = data.inventoryItems
    .map((item) => {
      const current = toNumber(item.current_stock);
      const minimum = toNumber(item.reorder_level);
      const stockPercent = minimum > 0 ? Math.min(100, (current / minimum) * 100) : 100;
      return {
        id: item.id,
        name: item.name ?? t("owner.inventory.inventoryItem"),
        category: item.category ?? t("owner.inventory.general"),
        current,
        minimum,
        unitCost: getInventoryUnitCost(item),
        unit: item.unit ?? "",
        stockPercent,
        suggestedRestock: Math.max(0, minimum * 2 - current),
      };
    })
    .sort((a, b) => a.stockPercent - b.stockPercent);
  const inventoryById = new Map(inventoryRowsBase.map((item) => [item.id, item]));
  const batchRows = data.inventoryBatches
    .map((batch) => {
      const item = batch.inventory_item_id ? inventoryById.get(batch.inventory_item_id) : undefined;
      const remaining = toNumber(batch.quantity_remaining);
      const received = toNumber(batch.quantity_received);
      const unitCost = toNumber(batch.unit_cost) || item?.unitCost || 0;
      const expiryDate = batch.expiry_date || "";
      const jakartaToday = getBusinessDateFromTimestamp(new Date().toISOString());
      const daysUntilExpiry = expiryDate
        ? Math.ceil(
            (new Date(`${expiryDate}T00:00:00`).getTime() -
              new Date(`${jakartaToday}T00:00:00`).getTime()) /
              86400000,
          )
        : null;

      return {
        id: batch.id,
        inventoryItemId: batch.inventory_item_id ?? "",
        itemName: item?.name || t("owner.inventory.inventoryItem"),
        category: item?.category || t("owner.inventory.general"),
        batchNumber: batch.batch_number || "-",
        supplier: batch.supplier || "-",
        receivedAt: batch.received_at || "",
        expiryDate,
        daysUntilExpiry,
        itemCurrentStock: item?.current ?? 0,
        received,
        remaining,
        unit: batch.unit || item?.unit || "",
        unitCost,
        value: remaining * unitCost,
        invoiceReference: batch.invoice_reference || "",
        receiptUrl: batch.receipt_url || "",
      };
    })
    .sort((a, b) => {
      if (a.daysUntilExpiry === null && b.daysUntilExpiry !== null) return 1;
      if (a.daysUntilExpiry !== null && b.daysUntilExpiry === null) return -1;
      return (a.daysUntilExpiry ?? 99999) - (b.daysUntilExpiry ?? 99999);
    });
  const usageTransactionsInRange = getUsageTransactionsInRange(data, dateRange);
  const usageTransactionById = new Map(usageTransactionsInRange.map((row) => [row.id, row]));
  const usageDays = Math.max(1, getRangeLengthDays(dateRange));
  const usageByItemId = data.usageTransactionDetails.reduce<Map<string, number>>((map, detail) => {
    if (!detail.inventory_item_id || !detail.usage_transaction_id) return map;
    const transaction = usageTransactionById.get(detail.usage_transaction_id);
    if (!transaction) return map;
    if (normalizeInventoryTransactionType(transaction.transaction_type ?? transaction.type) !== "sale") {
      return map;
    }

    map.set(
      detail.inventory_item_id,
      (map.get(detail.inventory_item_id) ?? 0) + toNumber(detail.quantity_used),
    );
    return map;
  }, new Map<string, number>());
  const inventoryRows = inventoryRowsBase.map((item) => {
    const usedInRange = usageByItemId.get(item.id) ?? 0;
    const averageDailyUsage = usedInRange / usageDays;
    const activeBatches = batchRows.filter(
      (batch) => batch.inventoryItemId === item.id && batch.remaining > 0,
    );
    const activeExpiringBatches = activeBatches.filter((batch) => batch.daysUntilExpiry !== null);
    const activeBatchRemaining = activeBatches.reduce((sum, batch) => sum + batch.remaining, 0);
    const expiringBatchRemaining = activeExpiringBatches.reduce((sum, batch) => sum + batch.remaining, 0);
    const nearestBatchExpiryDays = activeExpiringBatches
      .map((batch) => batch.daysUntilExpiry)
      .filter((days): days is number => days !== null)
      .sort((a, b) => a - b)[0] ?? null;
    const stockCoverageDays = item.current > 0 && averageDailyUsage > 0
      ? Math.ceil(item.current / averageDailyUsage)
      : null;
    return {
      ...item,
      usedInRange,
      averageDailyUsage,
      daysRemaining: stockCoverageDays,
      activeBatchRemaining,
      expiringBatchRemaining,
      nearestBatchExpiryDays,
    };
  });
  const getAlertSortValues = (item: (typeof inventoryRows)[number]) => {
    const status = getStockStatus(item.current, item.minimum);
    const statusRank = status === "critical" ? 0 : status === "low" ? 1 : 2;
    const stockRatio = item.minimum > 0 ? item.current / item.minimum : Number.POSITIVE_INFINITY;
    const expiryRank = item.nearestBatchExpiryDays ?? Number.POSITIVE_INFINITY;

    return {
      statusRank,
      stockRatio,
      expiryRank,
    };
  };
  const sortByInventoryAlert = (left: (typeof inventoryRows)[number], right: (typeof inventoryRows)[number]) => {
    const leftSort = getAlertSortValues(left);
    const rightSort = getAlertSortValues(right);

    return (
      leftSort.statusRank - rightSort.statusRank ||
      leftSort.stockRatio - rightSort.stockRatio ||
      leftSort.expiryRank - rightSort.expiryRank ||
      right.suggestedRestock - left.suggestedRestock ||
      left.name.localeCompare(right.name)
    );
  };
  const lowStockCandidates = inventoryRows
    .filter((item) => getStockStatus(item.current, item.minimum) !== "good")
    .sort(sortByInventoryAlert);
  const lowStockRows = [
    ...lowStockCandidates,
    ...inventoryRows.filter(
      (item) => !lowStockCandidates.some((candidate) => candidate.id === item.id),
    ).sort(sortByInventoryAlert),
  ].slice(0, 7);
  const movementTrend = buildInventoryMovementTrend(data, dateRange, selectedInventoryItemId);
  const movementRows = buildStockMovementRows(data, dateRange);
  const healthSummary = buildInventoryHealthSummary(data, dateRange);
  const criticalItemCount = inventoryRows.filter(
    (item) => getStockStatus(item.current, item.minimum) === "critical",
  ).length;
  const lowStockItemCount = inventoryRows.filter(
    (item) => getStockStatus(item.current, item.minimum) === "low",
  ).length;
  const inStockItemCount = inventoryRows.filter(
    (item) => getStockStatus(item.current, item.minimum) === "good",
  ).length;
  const stockStatusData = [
    {
      name: t("owner.inventory.inStock"),
      value: inStockItemCount,
      color: "#D8F999",
    },
    {
      name: t("owner.inventory.lowStock"),
      value: lowStockItemCount,
      color: "#FFE02E",
    },
    {
      name: t("owner.inventory.critical"),
      value: criticalItemCount,
      color: "#FFE1E1",
    },
  ];
  const stockStatusChartData = stockStatusData.filter((item) => item.value > 0);
  const activeExpiryTrackedBatchRows = batchRows.filter(
    (batch) => batch.expiryDate && batch.remaining > 0 && batch.itemCurrentStock > 0,
  );
  const batchRiskData = [
    {
      name: t("owner.inventory.expired"),
      value: activeExpiryTrackedBatchRows.filter((batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry < 0).length,
      color: "#FEE2E2",
    },
    {
      name: t("owner.inventory.nearExpiry"),
      value: activeExpiryTrackedBatchRows.filter((batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry >= 0 && batch.daysUntilExpiry <= 7).length,
      color: "#FEF3C7",
    },
    {
      name: t("owner.inventory.trackedActive"),
      value: activeExpiryTrackedBatchRows.filter((batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry > 7).length,
      color: "#D8F999",
    },
  ];
  const batchValueByCategory = Array.from(
    groupBy(batchRows.filter((batch) => batch.value > 0), (batch) => batch.category).entries(),
  )
    .map(([name, rows]) => ({
      name,
      value: rows.reduce((sum, batch) => sum + batch.value, 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const reportsInRange = data.stockReports.filter((report) => {
    const createdAt = getBusinessDateFromTimestamp(report.created_at);
    return Boolean(
      createdAt &&
        createdAt >= stockReportRange.startDate &&
        createdAt <= stockReportRange.endDate,
    );
  });
  const pendingStockReports = reportsInRange.filter(
    (report) => report.status === "pending",
  );
  const resolvedStockReports = reportsInRange.filter(
    (report) => report.status === "resolved",
  );
  const rejectedStockReports = reportsInRange.filter(
    (report) => report.status === "rejected",
  );
  const repeatedStockIssue = Array.from(
    pendingStockReports.reduce((map, report) => {
      const key = report.material_name || t("owner.inventory.unknownMaterial");
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];
  const mostReportedStockIssue = Array.from(
    reportsInRange.reduce((map, report) => {
      const key = report.material_name || t("owner.inventory.unknownMaterial");
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];
  const latestStockReport = [...reportsInRange].sort((left, right) => {
    const leftTime = new Date(left.created_at ?? "").getTime();
    const rightTime = new Date(right.created_at ?? "").getTime();
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  })[0];
  const selectedInventoryItem = data.inventoryItems.find((item) => item.id === selectedInventoryItemId);
  const usageAxisIsCurrency = selectedInventoryItemId === "all";
  const selectedUsageUnit = selectedInventoryItem?.unit ?? "";
  const formatUsageAxis = (value: number) =>
    usageAxisIsCurrency
      ? value >= 1_000_000
        ? `Rp ${(value / 1_000_000).toFixed(1)}m`
        : value >= 1_000
          ? `Rp ${(value / 1_000).toFixed(0)}k`
          : `Rp ${value}`
      : `${formatNumber(value)}${selectedUsageUnit ? ` ${selectedUsageUnit}` : ""}`;
  const formatStockReportType = (value: string | null | undefined) => {
    return getDomainLabel("reportType", value, language);
  };
  const formatStockReportStatus = (value: string | null | undefined) => {
    if (value === "pending") return t("owner.inventory.status.pending");
    if (value === "resolved") return t("owner.inventory.status.resolved");
    if (value === "rejected") return t("owner.inventory.status.rejected");
    return "-";
  };
  type LowStockRow = (typeof lowStockRows)[number];
  type MovementRow = (typeof movementRows)[number];
  const [selectedMovementRow, setSelectedMovementRow] = useState<MovementRow | null>(null);
  const lowStockColumns: Array<StandardTableColumn<LowStockRow>> = [
    {
      key: "name",
      header: t("owner.inventory.item"),
      render: (item) => <span className="font-semibold text-gray-900">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      key: "current",
      header: t("owner.inventory.currentStock"),
      render: (item) => `${formatNumber(item.current)} ${item.unit}`,
      sortValue: (item) => item.current,
    },
    {
      key: "minimum",
      header: t("owner.inventory.minimumStock"),
      render: (item) => `${formatNumber(item.minimum)} ${item.unit}`,
      sortValue: (item) => item.minimum,
    },
    {
      key: "expiringStock",
      header: t("owner.inventory.expiringStock"),
      render: (item) => {
        if (item.expiringBatchRemaining <= 0 || item.nearestBatchExpiryDays === null) return "-";
        if (item.nearestBatchExpiryDays < 0) {
          return `${formatNumber(item.expiringBatchRemaining)} ${item.unit} ${t("owner.inventory.expiredSuffix")}`;
        }
        if (item.nearestBatchExpiryDays === 0) {
          return `${formatNumber(item.expiringBatchRemaining)} ${item.unit} ${t("owner.inventory.expiresToday")}`;
        }
        return `${formatNumber(item.expiringBatchRemaining)} ${item.unit} / ${t("owner.inventory.days", { count: item.nearestBatchExpiryDays })}`;
      },
      sortValue: (item) => item.nearestBatchExpiryDays ?? 99999,
    },
    {
      key: "suggestedRestock",
      header: t("owner.inventory.suggestedRestock"),
      render: (item) => `${formatNumber(item.suggestedRestock)} ${item.unit}`,
      sortValue: (item) => item.suggestedRestock,
    },
  ];
  const movementColumns: Array<StandardTableColumn<MovementRow>> = [
    {
      key: "itemName",
      header: t("owner.inventory.item"),
      render: (row) => <span className="font-semibold text-gray-900">{row.itemName}</span>,
      sortValue: (row) => row.itemName,
    },
    {
      key: "type",
      header: t("owner.inventory.type"),
      render: (row) => <span className="capitalize">{row.type}</span>,
      sortValue: (row) => row.type,
    },
    {
      key: "quantity",
      header: t("owner.inventory.qty"),
      render: (row) => `${formatNumber(row.quantity)} ${row.unit}`,
      sortValue: (row) => row.quantity,
    },
    {
      key: "previous",
      header: t("owner.inventory.before"),
      render: (row) => `${formatNumber(row.previous)} ${row.unit}`,
      sortValue: (row) => row.previous,
    },
    {
      key: "next",
      header: t("owner.inventory.after"),
      render: (row) => `${formatNumber(row.next)} ${row.unit}`,
      sortValue: (row) => row.next,
    },
    {
      key: "actor",
      header: t("owner.inventory.actor"),
      render: (row) => row.actor,
      sortValue: (row) => row.actor,
    },
    {
      key: "notes",
      header: t("owner.inventory.detail"),
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedMovementRow(row)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
          aria-label={t("owner.inventory.viewStockMovementDetail", { item: row.itemName })}
        >
          <EyeIcon className="h-5 w-5" />
        </button>
      ),
      sortValue: (row) => row.notes,
    },
  ];
  const exportInventoryWorkbook = async () => {
    try {
      const auditRows = buildStockMovementRows(data, dateRange, 0);
      const lowStockPlanRows = inventoryRows
        .filter((item) => getStockStatus(item.current, item.minimum) !== "good")
        .sort(sortByInventoryAlert);

      await downloadXlsxWorkbook(
        `owner-inventory-report-all-time-to-${dateRange.endDate}.xlsx`,
        [
          {
            name: t("owner.inventory.sheet.inventoryValuation"),
            rows: [
              [
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.category"),
                t("owner.inventory.currentStock"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.reorderLevel"),
                t("owner.inventory.sheet.unitCost"),
                t("owner.inventory.sheet.totalStockValue"),
                t("owner.inventory.suggestedRestock"),
                t("owner.inventory.sheet.estimatedRestockCost"),
              ],
              ...inventoryRows.map((item) => [
                item.name,
                item.category,
                item.current,
                item.unit,
                item.minimum,
                item.unitCost,
                item.current * item.unitCost,
                item.suggestedRestock,
                item.suggestedRestock * item.unitCost,
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.batchValuation"),
            rows: [
              [
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.category"),
                t("owner.inventory.sheet.batchNumber"),
                t("owner.inventory.sheet.supplier"),
                t("owner.inventory.sheet.receivedDate"),
                t("owner.inventory.sheet.expiryDate"),
                t("owner.inventory.sheet.daysUntilExpiry"),
                t("owner.inventory.sheet.qtyReceived"),
                t("owner.inventory.sheet.qtyRemaining"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.sheet.unitCostHpp"),
                t("owner.inventory.sheet.batchStockValue"),
                t("owner.inventory.sheet.receiptUrl"),
              ],
              ...batchRows.map((batch) => [
                batch.itemName,
                batch.category,
                batch.batchNumber,
                batch.supplier,
                batch.receivedAt ? batch.receivedAt.slice(0, 10) : "",
                batch.expiryDate,
                batch.daysUntilExpiry ?? "",
                batch.received,
                batch.remaining,
                batch.unit,
                batch.unitCost,
                batch.value,
                batch.receiptUrl,
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.movementAudit"),
            rows: [
              [
                t("owner.inventory.sheet.timestamp"),
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.type"),
                t("owner.inventory.quantity"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.before"),
                t("owner.inventory.after"),
                t("owner.inventory.actor"),
                t("owner.inventory.notes"),
              ],
              ...auditRows.map((row) => [
                row.timestamp,
                row.itemName,
                row.type,
                row.quantity,
                row.unit,
                row.previous,
                row.next,
                row.actor,
                row.notes,
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.lowStockPlan"),
            rows: [
              [
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.category"),
                t("owner.inventory.currentStock"),
                t("owner.inventory.reorderLevel"),
                t("owner.inventory.expiringStock"),
                t("owner.inventory.suggestedRestock"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.sheet.unitCost"),
                t("owner.inventory.sheet.estimatedRestockCost"),
              ],
              ...lowStockPlanRows.map((item) => [
                item.name,
                item.category,
                item.current,
                item.minimum,
                item.expiringBatchRemaining > 0 && item.nearestBatchExpiryDays !== null
                  ? `${item.expiringBatchRemaining} ${item.unit} / ${item.nearestBatchExpiryDays} day(s)`
                  : "",
                item.suggestedRestock,
                item.unit,
                item.unitCost,
                item.suggestedRestock * item.unitCost,
              ]),
            ],
          },
          {
            name: t("owner.inventory.staffStockReports"),
            rows: [
              [
                t("owner.inventory.sheet.createdAt"),
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.sheet.reportType"),
                t("owner.inventory.sheet.status"),
                t("owner.inventory.sheet.reportedRole"),
              ],
              ...reportsInRange.map((report) => [
                report.created_at ?? "",
                report.material_name ?? "",
                formatStockReportType(report.report_type),
                formatStockReportStatus(report.status),
                report.reported_by_role ?? "",
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.stockStatus"),
            rows: [
              [t("owner.inventory.sheet.status"), t("owner.inventory.sheet.itemCount")],
              ...stockStatusData.map((item) => [item.name, item.value]),
              [t("owner.inventory.dataIssues"), healthSummary.dataIssues],
            ],
          },
          {
            name: t("owner.inventory.sheet.batchRisk"),
            rows: [
              [t("owner.inventory.sheet.risk"), t("owner.inventory.sheet.batchCount")],
              ...batchRiskData.map((item) => [item.name, item.value]),
            ],
          },
        ],
      );
      showSuccess(t("owner.inventory.exportSuccess"));
    } catch (error) {
      console.error("Owner inventory report export error:", error);
      showError(t("owner.inventory.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="inventory" period={dateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.inventory.export")}
          items={[
            {
              id: "inventory-workbook",
              label: t("owner.inventory.downloadExcel"),
              onClick: () => void exportInventoryWorkbook(),
            },
          ]}
        />
      </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={t("owner.inventory.totalSkus")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(healthSummary.totalItems)} helper={t("owner.inventory.totalSkusHelper")} tone="info" />
          <MetricCard label={t("owner.inventory.criticalItems")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(criticalItemCount)} helper={t("owner.inventory.criticalItemsHelper")} tone={criticalItemCount > 0 ? "danger" : "success"} />
          <MetricCard label={t("owner.inventory.restockCost")} value={data.loading ? t("owner.dashboard.loading") : formatCurrency(healthSummary.estimatedRestockCost)} helper={t("owner.inventory.restockCostHelper")} tone="waiting" />
          <MetricCard label={t("owner.inventory.dataIssues")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(healthSummary.dataIssues)} helper={t("owner.inventory.dataIssuesHelper")} tone={healthSummary.dataIssues > 0 ? "danger" : "success"} />
          <MetricCard label={t("owner.inventory.pendingReports")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(pendingStockReports.length)} helper={t("owner.inventory.pendingReportsHelper")} tone={pendingStockReports.length > 0 ? "warning" : "success"} />
          <MetricCard label={t("owner.inventory.highestUsage")} value={data.loading ? t("owner.dashboard.loading") : healthSummary.mostUsedName} helper={t("owner.inventory.highestUsageHelper")} tone="premium" />
        </div>

      {pendingStockReports.length ? (
        <div className={`rounded-xl border p-4 text-sm ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
          <p className="font-bold text-gray-900">{t("owner.inventory.followUpTitle")}</p>
          <p className="mt-1 leading-6">
            {t("owner.inventory.pendingReportCount", { count: pendingStockReports.length })}
            {repeatedStockIssue
              ? t("owner.inventory.mostRepeatedIssue", { item: repeatedStockIssue[0], count: repeatedStockIssue[1] })
              : ""}
          </p>
        </div>
      ) : null}


      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <ChartCard title={t("owner.inventory.batchRisk")} subtitle={t("owner.inventory.batchRiskSubtitle")}>
          {batchRiskData.some((item) => item.value > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchRiskData} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="value" name={t("owner.inventory.batches")} radius={[8, 8, 0, 0]}>
                    {batchRiskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.inventory.noBatchRisk")} />
          )}
        </ChartCard>

        <ChartCard title={t("owner.inventory.batchValueByCategory")} subtitle={t("owner.inventory.batchValueByCategorySubtitle")}>
          {batchValueByCategory.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchValueByCategory} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value))} />
                  <YAxis dataKey="name" type="category" width={92} tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="value" name={t("owner.inventory.batchValue")} fill={OWNER_CHART_COLORS.SOFT_SKY_BLUE} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.inventory.noBatchValuation")} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title={t("owner.inventory.lowStockAlert")}
        subtitle={t("owner.inventory.lowStockAlertSubtitle")}
      >
          <StandardTable
            columns={lowStockColumns}
            data={lowStockRows}
            getRowKey={(item) => item.id}
            emptyLabel={t("owner.inventory.noInventoryItem")}
            loading={data.loading}
            minWidthClassName="min-w-170"
            preserveDataOrder
          />
        </ChartCard>

        <ChartCard title={t("owner.inventory.usageTrend")} subtitle={t("owner.inventory.usageTrendSubtitle")}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {usageAxisIsCurrency
                ? t("owner.inventory.usageCurrencyNote")
                : t("owner.inventory.usageQuantityNote", {
                    unit: selectedUsageUnit ? t("owner.inventory.inUnit", { unit: selectedUsageUnit }) : "",
                  })}
            </p>
            <select
              value={selectedInventoryItemId}
              onChange={(event) => setSelectedInventoryItemId(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
              aria-label={t("owner.inventory.selectUsageItem")}
            >
              <option value="all">{t("owner.inventory.allItemsRupiah")}</option>
              {data.inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name ?? t("owner.inventory.inventoryItem")}
                </option>
              ))}
            </select>
          </div>
          {movementTrend.some((item) => item.stockIn || item.stockOut || item.adjustments) ? (
            <div className="h-80 xl:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatUsageAxis(Number(value))}
                    width={usageAxisIsCurrency ? 72 : 56}
                  />
                  <Tooltip content={<StandardTooltip />} />
                  <Legend />
                  <Bar dataKey="stockIn" name={t("owner.inventory.stockIn")} fill={OWNER_CHART_COLORS.SOFT_GREEN} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="stockOut" name={t("owner.inventory.stockOut")} fill={OWNER_CHART_COLORS.SOFT_ROSE} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="adjustments" name={t("owner.inventory.adjustments")} fill={OWNER_CHART_COLORS.SOFT_YELLOW} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.inventory.noStockMovementEvents")} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <ChartCard
          title={t("owner.inventory.stockMovement")}
          subtitle={t("owner.inventory.stockMovementSubtitle")}
        >
            <StandardTable
              columns={movementColumns}
              data={movementRows}
              getRowKey={(row) => row.id}
              emptyLabel={t("owner.inventory.noStockMovementRecords")}
              loading={data.loading}
            />
        </ChartCard>

        <div className="space-y-4">
          <ChartCard
            title={t("owner.inventory.staffStockReports")}
            subtitle={t("owner.inventory.staffStockReportsSubtitle")}
          >
            {reportsInRange.length ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className={`rounded-xl border p-3 ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
                    <p className="text-xs font-semibold text-gray-600">{t("owner.inventory.pending")}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950">{formatNumber(pendingStockReports.length)}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${OWNER_SEMANTIC_TONES.success.badgeClass}`}>
                    <p className="text-xs font-semibold text-gray-600">{t("owner.inventory.resolved")}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950">{formatNumber(resolvedStockReports.length)}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
                    <p className="text-xs font-semibold text-gray-600">{t("owner.inventory.rejected")}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950">{formatNumber(rejectedStockReports.length)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.mostReportedItem")}</p>
                  <p className="mt-2 font-bold text-gray-950">
                    {mostReportedStockIssue ? mostReportedStockIssue[0] : "-"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {mostReportedStockIssue
                      ? t("owner.inventory.reportCountThisMonth", { count: mostReportedStockIssue[1] })
                      : t("owner.inventory.noRepeatedPattern")}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.latestReport")}</p>
                  {latestStockReport ? (
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-950">{latestStockReport.material_name || t("owner.inventory.unknownMaterial")}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatStockReportType(latestStockReport.report_type)}
                          {latestStockReport.reported_by_role ? t("owner.inventory.reportedBy", { role: latestStockReport.reported_by_role }) : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {formatStockReportStatus(latestStockReport.status)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">{t("owner.inventory.noLatestReport")}</p>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState label={t("owner.inventory.noStaffStockReports")} />
            )}
          </ChartCard>

          <ChartCard title={t("owner.inventory.stockStatus")} subtitle={t("owner.inventory.stockStatusSubtitle")}>
            {stockStatusChartData.length ? (
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockStatusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {stockStatusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<StandardTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {stockStatusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate text-sm font-semibold text-gray-700">{entry.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-950">{formatNumber(entry.value)}</span>
                    </div>
                  ))}
                  {healthSummary.dataIssues > 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.dataIssues")}</span>
                        <span className="text-sm font-bold text-gray-950">{formatNumber(healthSummary.dataIssues)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState label={t("owner.inventory.noStockStatus")} />
            )}
          </ChartCard>
        </div>
      </div>

      {selectedMovementRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-950">{t("owner.inventory.stockMovementDetail")}</h2>
                <p className="mt-1 text-sm text-gray-500">{selectedMovementRow.itemName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovementRow(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
                aria-label={t("owner.inventory.closeStockMovementDetail")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.type")}</p>
                  <p className="mt-1 font-semibold capitalize text-gray-900">{selectedMovementRow.type}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.quantity")}</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(selectedMovementRow.quantity)} {selectedMovementRow.unit}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.before")}</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(selectedMovementRow.previous)} {selectedMovementRow.unit}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.after")}</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(selectedMovementRow.next)} {selectedMovementRow.unit}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.actor")}</p>
                <p className="mt-1 font-semibold text-gray-900">{selectedMovementRow.actor}</p>
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.notes")}</p>
                <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-gray-700">
                  {selectedMovementRow.notes || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const getMinutesBetween = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const minutes = (endDate.getTime() - startDate.getTime()) / 60_000;
  return minutes >= 0 ? minutes : null;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getOrderDateCandidates = (order: OrderRow) => {
  return Array.from(
    new Set(
      [
        getOrderBusinessDate(order),
        order.order_date ?? "",
        getBusinessDateFromTimestamp(order.created_at),
      ].filter(Boolean),
    ),
  );
};

function StaffDashboard() {
  const { t } = useLanguage();
  const data = useOwnerDashboardData();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [radarDetailOpen, setRadarDetailOpen] = useState(false);
  const datesInRange = getDatesBetween(dateRange.startDate, dateRange.endDate);
  const rangeDays = getRangeLengthDays(dateRange);
  const singleDayRange = dateRange.startDate === dateRange.endDate;
  const activeStaff = data.staff.filter(
    (row) => row.status === "active" && String(row.role ?? "").toLowerCase() !== "owner",
  );
  const activeStaffIds = new Set(activeStaff.map((staff) => staff.id));
  const attendanceInRange = data.attendance.filter(
    (row) =>
      row.attendance_date &&
      row.attendance_date >= dateRange.startDate &&
      row.attendance_date <= dateRange.endDate &&
      row.staff_id &&
      activeStaffIds.has(row.staff_id),
  );
  const ordersInRange = data.orders.filter(
    (order) =>
      getOrderBusinessDate(order) >= dateRange.startDate &&
      getOrderBusinessDate(order) <= dateRange.endDate &&
      isValidSalesOrder(order),
  );
  const orderById = new Map(ordersInRange.map((order) => [order.id, order]));
  const orderItemsInRange = data.orderItems.filter(
    (item) => item.order_id && orderById.has(item.order_id),
  );

  const staffRows = activeStaff.map((staff) => {
    const records = attendanceInRange.filter((row) => row.staff_id === staff.id);
    const late = records.filter((row) => row.check_in_status === "late").length;
    const overtime = records.filter((row) => row.check_out_status === "overtime").length;
    const earlyLeave = records.filter((row) => row.check_out_status === "early_leave").length;
    const clockedIn = records.filter((row) => row.clock_in_at).length;
    const expectedAttendance = rangeDays;
    const attendanceRate = expectedAttendance
      ? clampScore((clockedIn / expectedAttendance) * 100)
      : 0;
    const createdOrderIds = ordersInRange
      .filter((order) => order.created_by === staff.id)
      .map((order) => order.id);
    const servedOrderIds = orderItemsInRange
      .filter((item) => item.served_by === staff.id && item.order_id)
      .map((item) => item.order_id as string);
    const handledOrderIds = new Set([...createdOrderIds, ...servedOrderIds]);
    const serviceMinutes = orderItemsInRange
      .filter((item) => item.served_by === staff.id)
      .map((item) => getMinutesBetween(item.ready_at, item.served_at))
      .filter((minutes): minutes is number => minutes !== null);
    const averageServiceMinutes = serviceMinutes.length
      ? serviceMinutes.reduce((sum, minutes) => sum + minutes, 0) / serviceMinutes.length
      : null;
    const speedScore =
      averageServiceMinutes === null ? null : clampScore(100 - (averageServiceMinutes / 30) * 100);
    const performanceScore = clampScore(
      attendanceRate - late * 5 - earlyLeave * 4 + overtime * 2 + (speedScore ?? 0) * 0.15,
    );

    return {
      id: staff.id,
      name: staff.name ?? t("owner.staff.staff"),
      role: staff.role ?? t("owner.staff.staff"),
      ordersHandled: handledOrderIds.size,
      averageServiceMinutes,
      late,
      overtime,
      attendanceRate,
      performanceScore,
    };
  });

  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const maxOrdersHandled = Math.max(0, ...staffRows.map((row) => row.ordersHandled));
  const attendanceRecordCount = attendanceInRange.length;
  const overtimeRecordCount = attendanceInRange.filter(
    (row) => row.check_out_status === "overtime",
  ).length;
  const lateRecordCount = attendanceInRange.filter((row) => row.check_in_status === "late").length;
  const earlyLeaveRecordCount = attendanceInRange.filter(
    (row) => row.check_out_status === "early_leave",
  ).length;
  const overtimeControlScore = attendanceRecordCount
    ? clampScore(100 - (overtimeRecordCount / attendanceRecordCount) * 100)
    : 0;
  const reliabilityScore = attendanceRecordCount
    ? clampScore(100 - ((lateRecordCount + earlyLeaveRecordCount) / attendanceRecordCount) * 100)
    : 0;
  const averageSpeed = average(
    staffRows
      .map((row) =>
        row.averageServiceMinutes === null
          ? null
          : clampScore(100 - (row.averageServiceMinutes / 30) * 100),
      )
      .filter((value): value is number => value !== null),
  );
  const radarData = [
    { metric: t("owner.staff.attendance"), value: average(staffRows.map((row) => row.attendanceRate)) },
    {
      metric: t("owner.staff.ordersHandled"),
      value: maxOrdersHandled
        ? clampScore((average(staffRows.map((row) => row.ordersHandled)) / maxOrdersHandled) * 100)
        : 0,
    },
    { metric: t("owner.staff.speed"), value: averageSpeed },
    { metric: t("owner.staff.consistency"), value: average(staffRows.map((row) => row.performanceScore)) },
    {
      metric: t("owner.staff.overtimeControl"),
      value: overtimeControlScore,
    },
    {
      metric: t("owner.staff.reliability"),
      value: reliabilityScore,
    },
  ];
  const radarDetailRows = [
    {
      metric: t("owner.staff.attendance"),
      score: radarData.find((row) => row.metric === t("owner.staff.attendance"))?.value ?? 0,
      basis: t("owner.staff.attendanceBasis", {
        clockedIn: attendanceInRange.filter((row) => row.clock_in_at).length,
        days: rangeDays,
      }),
      formula: t("owner.staff.attendanceFormula"),
    },
    {
      metric: t("owner.staff.ordersHandled"),
      score: radarData.find((row) => row.metric === t("owner.staff.ordersHandled"))?.value ?? 0,
      basis: t("owner.staff.ordersBasis", { orders: ordersInRange.length, max: maxOrdersHandled }),
      formula: t("owner.staff.ordersFormula"),
    },
    {
      metric: t("owner.staff.speed"),
      score: averageSpeed,
      basis: staffRows.some((row) => row.averageServiceMinutes !== null)
        ? t("owner.staff.speedBasisReady")
        : t("owner.staff.speedBasisEmpty"),
      formula: t("owner.staff.speedFormula"),
    },
    {
      metric: t("owner.staff.consistency"),
      score: radarData.find((row) => row.metric === t("owner.staff.consistency"))?.value ?? 0,
      basis: t("owner.staff.consistencyBasis", { count: staffRows.length }),
      formula: t("owner.staff.consistencyFormula"),
    },
    {
      metric: t("owner.staff.overtimeControl"),
      score: overtimeControlScore,
      basis: attendanceRecordCount
        ? t("owner.staff.overtimeBasis", { overtime: overtimeRecordCount, attendance: attendanceRecordCount })
        : t("owner.staff.noAttendanceBasis"),
      formula: t("owner.staff.overtimeFormula"),
    },
    {
      metric: t("owner.staff.reliability"),
      score: reliabilityScore,
      basis: attendanceRecordCount
        ? t("owner.staff.reliabilityBasis", {
            late: lateRecordCount,
            earlyLeave: earlyLeaveRecordCount,
            attendance: attendanceRecordCount,
          })
        : t("owner.staff.noAttendanceBasis"),
      formula: t("owner.staff.reliabilityFormula"),
    },
  ];
  const trendData = singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourLabel = `${String(hour).padStart(2, "0")}:00`;
        return {
          date: hourLabel,
          attendance: attendanceInRange.filter(
            (row) => getBusinessHourFromTimestamp(row.clock_in_at) === String(hour).padStart(2, "0"),
          ).length,
          late: attendanceInRange.filter(
            (row) =>
              row.check_in_status === "late" &&
              getBusinessHourFromTimestamp(row.clock_in_at) === String(hour).padStart(2, "0"),
          ).length,
        };
      })
    : datesInRange.map((date) => ({
        date: date.slice(5),
        attendance: attendanceInRange.filter((row) => row.attendance_date === date && row.clock_in_at).length,
        late: attendanceInRange.filter((row) => row.attendance_date === date && row.check_in_status === "late").length,
      }));
  type StaffPerformanceRow = (typeof staffRows)[number];
  const staffColumns: Array<StandardTableColumn<StaffPerformanceRow>> = [
    {
      key: "name",
      header: t("owner.staff.staffName"),
      render: (row) => <span className="font-semibold text-gray-900">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    { key: "role", header: t("owner.staff.role"), render: (row) => row.role, sortValue: (row) => row.role },
    {
      key: "ordersHandled",
      header: t("owner.staff.ordersHandled"),
      render: (row) => formatNumber(row.ordersHandled),
      sortValue: (row) => row.ordersHandled,
    },
    {
      key: "averageServiceMinutes",
      header: t("owner.staff.averageServiceTime"),
      render: (row) =>
        row.averageServiceMinutes === null
          ? t("owner.staff.timestampDataNeeded")
          : t("owner.staff.minutesShort", { value: row.averageServiceMinutes.toFixed(1) }),
      sortValue: (row) => row.averageServiceMinutes ?? -1,
    },
    { key: "late", header: t("owner.staff.lateCount"), render: (row) => formatNumber(row.late), sortValue: (row) => row.late },
    {
      key: "overtime",
      header: t("owner.staff.overtimeCount"),
      render: (row) => formatNumber(row.overtime),
      sortValue: (row) => row.overtime,
    },
    {
      key: "attendanceRate",
      header: t("owner.staff.attendanceRate"),
      render: (row) => `${row.attendanceRate}%`,
      sortValue: (row) => row.attendanceRate,
    },
    {
      key: "score",
      header: t("owner.staff.score"),
      render: (row) => formatNumber(row.performanceScore),
      sortValue: (row) => row.performanceScore,
    },
  ];
  const exportStaffWorkbook = async () => {
    try {
      await downloadXlsxWorkbook(`owner-staff-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`, [
        {
          name: t("owner.staff.sheet.summary"),
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.staff.activeStaff"), activeStaff.length],
            [t("owner.staff.sheet.clockedInRecords"), attendanceInRange.filter((row) => row.clock_in_at).length],
            [t("owner.staff.lateCount"), attendanceInRange.filter((row) => row.check_in_status === "late").length],
            [t("owner.staff.overtimeCount"), attendanceInRange.filter((row) => row.check_out_status === "overtime").length],
          ],
        },
        {
          name: t("owner.staff.sheet.performance"),
          rows: [
            [
              t("owner.staff.staff"),
              t("owner.staff.role"),
              t("owner.staff.ordersHandled"),
              t("owner.staff.sheet.averageServiceMinutes"),
              t("owner.staff.sheet.late"),
              t("owner.staff.sheet.overtime"),
              t("owner.staff.attendanceRate"),
              t("owner.staff.score"),
            ],
            ...staffRows.map((row) => [
              row.name,
              row.role,
              row.ordersHandled,
              row.averageServiceMinutes ?? "",
              row.late,
              row.overtime,
              row.attendanceRate,
              row.performanceScore,
            ]),
          ],
        },
        {
          name: t("owner.staff.sheet.attendanceTrend"),
          rows: [
            [t("owner.staff.sheet.period"), t("owner.staff.clockedIn"), t("owner.staff.sheet.late")],
            ...trendData.map((row) => [row.date, row.attendance, row.late]),
          ],
        },
      ]);
      showSuccess(t("owner.staff.exportSuccess"));
    } catch (error) {
      console.error("Failed to export staff report:", error);
      showError(t("owner.staff.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="staff" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.staff.export")}
          disabled={data.loading}
          items={[
            {
              id: "excel",
              label: t("owner.staff.downloadExcel"),
              onClick: () => void exportStaffWorkbook(),
              disabled: data.loading,
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("owner.staff.activeStaff")} value={formatNumber(activeStaff.length)} helper={t("owner.staff.activeStaffHelper")} tone="coffee" />
        <MetricCard label={t("owner.staff.clockedIn")} value={formatNumber(attendanceInRange.filter((row) => row.clock_in_at).length)} helper={t("owner.staff.clockedInHelper")} tone="success" />
        <MetricCard label={t("owner.staff.lateCount")} value={formatNumber(attendanceInRange.filter((row) => row.check_in_status === "late").length)} helper={t("owner.staff.needsAttention")} tone="danger" />
        <MetricCard label={t("owner.staff.overtimeCount")} value={formatNumber(attendanceInRange.filter((row) => row.check_out_status === "overtime").length)} helper={t("owner.staff.overtimeHelper")} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={t("owner.staff.performanceRadar")} subtitle={t("owner.staff.performanceRadarSubtitle")}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setRadarDetailOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setRadarDetailOpen(true);
              }
            }}
            className="h-80 cursor-pointer rounded-lg outline-none transition hover:bg-gray-50 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            aria-label={t("owner.staff.viewRadarDetails")}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={OWNER_CHART_COLORS.INDIGO_BLUE} fill={OWNER_CHART_COLORS.INDIGO_BLUE} fillOpacity={0.25} />
                <Tooltip content={<StandardTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-500">
            {t("owner.staff.clickRadar")}
          </p>
        </ChartCard>

        <ChartCard title={t("owner.staff.productivity")} subtitle={t("owner.staff.productivitySubtitle")}>
          {staffRows.some((row) => row.ordersHandled > 0) ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffRows} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="ordersHandled" name={t("owner.staff.ordersHandled")} fill={OWNER_CHART_COLORS.SOFT_SKY_BLUE} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.staff.noOrderAttribution")} />
          )}
        </ChartCard>
      </div>

      <ChartCard title={t("owner.staff.attendanceTrend")} subtitle={singleDayRange ? t("owner.staff.hourlyAttendanceSubtitle") : t("owner.staff.dailyAttendanceSubtitle")}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ left: -8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<StandardTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="attendance" name={t("owner.staff.clockedIn")} stroke={OWNER_CHART_COLORS.SOFT_GREEN} strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="late" name={t("owner.staff.sheet.late")} stroke={OWNER_CHART_COLORS.SOFT_ROSE} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title={t("owner.staff.performanceTable")} subtitle={t("owner.staff.performanceTableSubtitle")}>
        <StandardTable
          columns={staffColumns}
          data={staffRows}
          getRowKey={(row) => row.id}
          emptyLabel={t("owner.staff.noPerformanceData")}
          loading={data.loading}
        />
      </ChartCard>

      <StandardModal
        isOpen={radarDetailOpen}
        title={t("owner.staff.radarDetails")}
        description={t("owner.staff.radarDetailsDescription")}
        maxWidthClassName="max-w-5xl"
        onClose={() => setRadarDetailOpen(false)}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-normal text-gray-500">
                {t("owner.staff.attendanceRecords")}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-950">
                {formatNumber(attendanceRecordCount)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-normal text-gray-500">
                {t("owner.staff.overtimeRecords")}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-950">
                {formatNumber(overtimeRecordCount)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-normal text-gray-500">
                {t("owner.staff.lateEarlyLeave")}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-950">
                {formatNumber(lateRecordCount + earlyLeaveRecordCount)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full min-w-190 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-normal text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t("owner.staff.metric")}</th>
                  <th className="px-4 py-3">{t("owner.staff.score")}</th>
                  <th className="px-4 py-3">{t("owner.staff.basis")}</th>
                  <th className="px-4 py-3">{t("owner.staff.formula")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {radarDetailRows.map((row) => (
                  <tr key={row.metric}>
                    <td className="px-4 py-3 font-bold text-gray-950">{row.metric}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {formatNumber(row.score)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.basis}</td>
                    <td className="px-4 py-3 text-gray-600">{row.formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}

function OperationDashboard() {
  const { t } = useLanguage();
  const data = useOwnerDashboardData();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const singleDayRange = dateRange.startDate === dateRange.endDate;
  const isCancelledOperationOrder = (status: string | null | undefined) =>
    ["cancelled", "canceled", "void", "refunded"].includes(
      String(status ?? "").toLowerCase(),
    );
  const ordersInRange = data.orders.filter((order) => {
    return getOrderDateCandidates(order).some(
      (date) => date >= dateRange.startDate && date <= dateRange.endDate,
    );
  });
  const normalizeOperationStatus = (status: string | null) => {
    const normalized = String(status ?? "").toLowerCase();
    if (isCancelledOperationOrder(normalized)) return "cancelled";
    if (normalized === "preparing" || normalized === "on-process" || normalized === "on process") {
      return "on-process";
    }
    if (normalized === "partially-served" || normalized === "partially served") {
      return "partially-served";
    }
    if (normalized === "served" || normalized === "completed") return "completed";
    return normalized === "new" ? "new" : "new";
  };
  const statusFlow = [
    { status: "new", label: t("owner.operation.newOrder") },
    { status: "on-process", label: t("owner.operation.onProcess") },
    { status: "partially-served", label: t("owner.operation.partiallyServed") },
    { status: "completed", label: t("owner.operation.completed") },
    { status: "cancelled", label: t("owner.operation.cancelled") },
  ];
  const flow = statusFlow.map((stage) => ({
    ...stage,
    count: ordersInRange.filter((order) => normalizeOperationStatus(order.status) === stage.status).length,
  }));
  const activeOrders = ordersInRange.filter((order) =>
    ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
  );
  const completedOrders = ordersInRange.filter(
    (order) => normalizeOperationStatus(order.status) === "completed",
  );
  const cancelledOrders = ordersInRange.filter(
    (order) => normalizeOperationStatus(order.status) === "cancelled",
  );
  const orderById = new Map(ordersInRange.map((order) => [order.id, order]));
  const serviceEvents = [
    ...completedOrders
      .map((order) => {
        const finishedAt = order.completed_at ?? order.served_at ?? order.ready_at;
        const minutes = getMinutesBetween(order.created_at, finishedAt);
        if (minutes === null || !finishedAt) return null;
        return {
          completedAt: finishedAt,
          orderDateCandidates: getOrderDateCandidates(order),
          orderHour: getOrderBusinessHour(order),
          minutes,
        };
      })
      .filter((event): event is {
        completedAt: string;
        orderDateCandidates: string[];
        orderHour: string;
        minutes: number;
      } => event !== null),
    ...data.orderItems
      .filter((item) => item.order_id && orderById.has(item.order_id) && item.served_at)
      .map((item) => {
        const order = item.order_id ? orderById.get(item.order_id) : undefined;
        if (!order || !item.served_at) return null;
        const startedAt = item.ready_at ?? order.created_at;
        const minutes = getMinutesBetween(startedAt, item.served_at);
        if (minutes === null) return null;
        return {
          completedAt: item.served_at,
          orderDateCandidates: getOrderDateCandidates(order),
          orderHour: getOrderBusinessHour(order),
          minutes,
        };
      })
      .filter((event): event is {
        completedAt: string;
        orderDateCandidates: string[];
        orderHour: string;
        minutes: number;
      } => event !== null),
  ];
  const operationSlots = Array.from(
    { length: 12 },
    (_, index) => `${String(index + 9).padStart(2, "0")}:00`,
  );
  const heatmap = operationSlots.map((slot) => {
    const [slotHour] = slot.split(":");
    return {
      slot,
      count: ordersInRange.filter((order) => {
        const hour = getOrderBusinessHour(order);
        return hour === slotHour;
      }).length,
    };
  });
  const serviceTimeRows = serviceEvents.map((event) => event.minutes);
  const averageServiceTime = serviceTimeRows.length
    ? serviceTimeRows.reduce((sum, minutes) => sum + minutes, 0) / serviceTimeRows.length
    : null;
  const serviceTrend = (singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourLabel = `${String(hour).padStart(2, "0")}:00`;
        const rows = serviceEvents
          .filter(
            (event) =>
              getBusinessHourFromTimestamp(event.completedAt) === String(hour).padStart(2, "0") ||
              event.orderHour === String(hour).padStart(2, "0"),
          )
          .map((event) => event.minutes);
        return {
          period: hourLabel,
          averageMinutes: rows.length
            ? Number((rows.reduce((sum, minutes) => sum + minutes, 0) / rows.length).toFixed(1))
            : 0,
        };
      })
    : getDatesBetween(dateRange.startDate, dateRange.endDate).map((date) => {
        const rows = serviceEvents
          .filter(
            (event) =>
              getBusinessDateFromTimestamp(event.completedAt) === date ||
              event.orderDateCandidates.includes(date),
          )
          .map((event) => event.minutes);
        return {
          period: date.slice(5),
          averageMinutes: rows.length
            ? Number((rows.reduce((sum, minutes) => sum + minutes, 0) / rows.length).toFixed(1))
            : 0,
        };
      }));
  const outcomeTrend = (singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourKey = String(hour).padStart(2, "0");
        const rows = ordersInRange.filter((order) => getOrderBusinessHour(order) === hourKey);
        return {
          period: `${hourKey}:00`,
          created: rows.length,
          activeBacklog: rows.filter((order) =>
            ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
          ).length,
          completed: rows.filter((order) => normalizeOperationStatus(order.status) === "completed").length,
          cancelled: rows.filter((order) => normalizeOperationStatus(order.status) === "cancelled").length,
        };
      })
    : getDatesBetween(dateRange.startDate, dateRange.endDate).map((date) => {
        const rows = ordersInRange.filter((order) => getOrderDateCandidates(order).includes(date));
        return {
          period: date.slice(5),
          created: rows.length,
          activeBacklog: rows.filter((order) =>
            ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
          ).length,
          completed: rows.filter((order) => normalizeOperationStatus(order.status) === "completed").length,
          cancelled: rows.filter((order) => normalizeOperationStatus(order.status) === "cancelled").length,
        };
      }));
  const maxHeatmapCount = Math.max(1, ...heatmap.map((cell) => cell.count));
  const getHeatmapStyle = (count: number) => {
    if (count <= 0) {
      return {
        backgroundColor: "#F8F8F8",
        borderColor: "#E5E7EB",
        color: "#6B7280",
      };
    }

    const intensity = count / maxHeatmapCount;
    const alpha = 0.35 + intensity * 0.55;
    return {
      backgroundColor: `rgba(76, 70, 218, ${alpha})`,
      borderColor: `rgba(76, 70, 218, ${Math.min(1, alpha + 0.12)})`,
      color: alpha > 0.62 ? "#FFFFFF" : "#111827",
    };
  };
  const exportOperationWorkbook = async () => {
    try {
      await downloadXlsxWorkbook(`owner-operations-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`, [
        {
          name: t("owner.operation.sheet.summary"),
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.operation.totalOrders"), ordersInRange.length],
            [t("owner.operation.activeOrders"), activeOrders.length],
            [t("owner.operation.completedOrders"), completedOrders.length],
            [t("owner.operation.cancelledOrders"), cancelledOrders.length],
            [t("owner.operation.completionRate"), ordersInRange.length ? Math.round((completedOrders.length / ordersInRange.length) * 100) : 0],
            [t("owner.operation.cancellationRate"), ordersInRange.length ? Math.round((cancelledOrders.length / ordersInRange.length) * 100) : 0],
            [t("owner.staff.sheet.averageServiceMinutes"), averageServiceTime ?? ""],
          ],
        },
        {
          name: t("owner.operation.sheet.orderFlow"),
          rows: [[t("owner.inventory.sheet.status"), t("owner.inventory.sheet.itemCount")], ...flow.map((row) => [row.label, row.count])],
        },
        {
          name: t("owner.operation.sheet.orderDensity"),
          rows: [[t("owner.operation.sheet.slot"), t("owner.operation.sheet.orderCount")], ...heatmap.map((row) => [row.slot, row.count])],
        },
        {
          name: t("owner.operation.sheet.serviceTrend"),
          rows: [[t("owner.staff.sheet.period"), t("owner.operation.sheet.averageMinutes")], ...serviceTrend.map((row) => [row.period, row.averageMinutes])],
        },
        {
          name: t("owner.operation.sheet.outcomeTrend"),
          rows: [
            [
              t("owner.staff.sheet.period"),
              t("owner.operation.created"),
              t("owner.operation.completed"),
              t("owner.operation.cancelled"),
              t("owner.operation.activeBacklog"),
            ],
            ...outcomeTrend.map((row) => [row.period, row.created, row.completed, row.cancelled, row.activeBacklog]),
          ],
        },
      ]);
      showSuccess(t("owner.operation.exportSuccess"));
    } catch (error) {
      console.error("Failed to export operation report:", error);
      showError(t("owner.operation.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="operations" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.operation.export")}
          disabled={data.loading}
          items={[
            {
              id: "excel",
              label: t("owner.operation.downloadExcel"),
              onClick: () => void exportOperationWorkbook(),
              disabled: data.loading,
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("owner.operation.totalOrders")} value={formatNumber(ordersInRange.length)} helper={t("owner.operation.totalOrdersHelper")} tone="info" />
        <MetricCard label={t("owner.operation.activeOrders")} value={formatNumber(activeOrders.length)} helper={t("owner.operation.activeOrdersHelper")} tone="progress" />
        <MetricCard label={t("owner.operation.completionRate")} value={`${ordersInRange.length ? Math.round((completedOrders.length / ordersInRange.length) * 100) : 0}%`} helper={t("owner.operation.completionRateHelper")} tone="success" />
        <MetricCard label={t("owner.operation.cancelledOrders")} value={formatNumber(cancelledOrders.length)} helper={t("owner.operation.cancelledOrdersHelper")} tone={cancelledOrders.length > 0 ? "danger" : "success"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={t("owner.operation.orderDensity")} subtitle={t("owner.operation.orderDensitySubtitle")}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {heatmap.map((item) => {
              const style = getHeatmapStyle(item.count);
              return (
                <div
                  key={item.slot}
                  className="rounded-xl border p-3 transition"
                  style={style}
                >
                  <p className="text-xs font-semibold">{item.slot}</p>
                  <p className="mt-2 text-xl font-bold">{item.count}</p>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title={t("owner.operation.orderFlow")} subtitle={t("owner.operation.orderFlowSubtitle")}>
          <div className="space-y-3">
            {flow.map((item, index) => {
              const max = Math.max(1, ...flow.map((stage) => stage.count));
              return (
                <div key={item.status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-gray-900">{item.label}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (item.count / max) * 100)}%`,
                        backgroundColor:
                          OWNER_CHART_SERIES[index % OWNER_CHART_SERIES.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={t("owner.operation.averageServiceTime")} subtitle={t("owner.operation.averageServiceTimeSubtitle")}>
          {serviceTrend.some((item) => item.averageMinutes > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serviceTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Line type="monotone" dataKey="averageMinutes" name={t("owner.operation.avgMinutes")} stroke={OWNER_CHART_COLORS.INDIGO_BLUE} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.operation.noTimestampData")} />
          )}
        </ChartCard>

        <ChartCard title={t("owner.operation.orderOutcomeTrend")} subtitle={t("owner.operation.orderOutcomeTrendSubtitle")}>
          {outcomeTrend.some((item) => item.created || item.completed || item.cancelled || item.activeBacklog) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomeTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Legend />
                  <Bar dataKey="created" name={t("owner.operation.created")} fill={OWNER_CHART_COLORS.SOFT_SKY_BLUE} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completed" name={t("owner.operation.completed")} fill={OWNER_CHART_COLORS.SOFT_GREEN} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="cancelled" name={t("owner.operation.cancelled")} fill={OWNER_CHART_COLORS.SOFT_ROSE} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="activeBacklog" name={t("owner.operation.activeBacklog")} fill={OWNER_CHART_COLORS.SOFT_YELLOW} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.operation.noOperationFlow")} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export {
  CustomerDiscountDashboard,
  InventoryDashboard,
  OperationDashboard,
  StaffDashboard,
};
