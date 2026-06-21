"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { useLanguage } from "@/app/components/shared/i18n";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { ChartCard } from "../shared/DashboardPrimitives";
import type { RewardRow } from "../shared/dashboardTypes";
import {
  formatCurrency,
  formatNumber,
  toNumber,
} from "../shared/dashboardUtils";
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

  const loadRewards = useCallback(async () => {
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
  }, []);

  const loadBundles = useCallback(async () => {
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
  }, [t]);

  useEffect(() => {
    void loadRewards();
    void loadBundles();
  }, [loadBundles, loadRewards]);

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

export default CustomerDiscountDashboard;

