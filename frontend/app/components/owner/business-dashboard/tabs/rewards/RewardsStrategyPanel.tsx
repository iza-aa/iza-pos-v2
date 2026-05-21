"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  Square2StackIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import { logActivity } from "@/lib/services/activity/activityLogger";
import {
  EMPTY_REWARD_FORM,
  formatCurrency,
  getRewardStatusClass,
  getRewardStatusLabel,
  getRewardValueLabel,
  normalizeReward,
  rewardToForm,
  toNullableNumber,
  type DiscountType,
  type Reward,
  type RewardFormState,
  type RewardRow,
} from "./rewardUtils";

type RewardSettingsState = {
  amountPerPoint: string;
  minimumOrderAmount: string;
  pointsRounding: "floor" | "round" | "ceil";
  isActive: boolean;
  notes: string;
};

const DEFAULT_SETTINGS: RewardSettingsState = {
  amountPerPoint: "10000",
  minimumOrderAmount: "10000",
  pointsRounding: "floor",
  isActive: true,
  notes: "",
};

const validateRewardForm = (form: RewardFormState) => {
  if (!form.name.trim()) return "Reward name is required.";
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
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return "Discount value must be greater than 0.";
  }
  if (form.discountType === "percentage" && discountValue > 100) {
    return "Percentage discount cannot exceed 100%.";
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

export default function RewardsStrategyPanel() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [settings, setSettings] = useState<RewardSettingsState>(DEFAULT_SETTINGS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<RewardFormState>(EMPTY_REWARD_FORM);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rewardsResult, settingsResult] = await Promise.all([
      supabase.from("rewards").select("*").order("created_at", { ascending: false }),
      supabase.from("reward_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    setRewards(((rewardsResult.data ?? []) as RewardRow[]).map(normalizeReward));
    const row = settingsResult.data as
      | {
          amount_per_point?: number | string | null;
          minimum_order_amount?: number | string | null;
          points_rounding?: string | null;
          is_active?: boolean | null;
          notes?: string | null;
        }
      | null;

    if (row) {
      setSettings({
        amountPerPoint: String(row.amount_per_point ?? "10000"),
        minimumOrderAmount: String(row.minimum_order_amount ?? "10000"),
        pointsRounding:
          row.points_rounding === "round" || row.points_rounding === "ceil"
            ? row.points_rounding
            : "floor",
        isActive: row.is_active !== false,
        notes: row.notes ?? "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRewards = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return rewards.filter((reward) => {
      const status = getRewardStatusLabel(reward).toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesQuery =
        !keyword ||
        reward.name.toLowerCase().includes(keyword) ||
        reward.description.toLowerCase().includes(keyword);

      return matchesStatus && matchesQuery;
    });
  }, [query, rewards, statusFilter]);

  const openCreate = () => {
    setEditingReward(null);
    setForm(EMPTY_REWARD_FORM);
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const openEdit = (reward: Reward) => {
    setEditingReward(reward);
    setForm(rewardToForm(reward));
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const openDuplicate = (reward: Reward) => {
    setEditingReward(null);
    setForm({
      ...rewardToForm(reward),
      name: `${reward.name} Copy`,
      isActive: false,
    });
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const saveReward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateRewardForm(form);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      reward_type: form.rewardType,
      discount_type: form.rewardType === "discount" ? form.discountType : null,
      discount_value: Number(form.discountValue),
      max_discount_amount:
        form.discountType === "percentage" ? toNullableNumber(form.maxDiscountAmount) : null,
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
        setMessage("Reward updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("rewards")
          .insert([payload])
          .select("id")
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
        setMessage("Reward created successfully.");
      }

      setShowForm(false);
      setEditingReward(null);
      setForm(EMPTY_REWARD_FORM);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save reward.");
    } finally {
      setSaving(false);
    }
  };

  const toggleReward = async (reward: Reward) => {
    setError("");
    const { error: updateError } = await supabase
      .from("rewards")
      .update({ is_active: !reward.isActive })
      .eq("id", reward.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

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
    await loadData();
  };

  const saveSettings = async () => {
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

    setSaving(true);
    const { error: upsertError } = await supabase.from("reward_settings").upsert(
      {
        id: 1,
        amount_per_point: amountPerPoint,
        minimum_order_amount: minimumOrderAmount,
        points_rounding: settings.pointsRounding,
        is_active: settings.isActive,
        notes: settings.notes.trim() || null,
      },
      { onConflict: "id" },
    );
    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

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
    setShowSettings(false);
    setMessage("Reward settings saved successfully.");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Reward Strategy</h2>
            <p className="mt-1 text-sm text-gray-500">
              Kelola reward aktif, aturan poin, dan perubahan strategi loyalty.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Reward Settings
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <PlusIcon className="h-4 w-4" />
              Create Reward
            </button>
          </div>
        </div>
      </section>

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div> : null}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rewards..."
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="scheduled">Scheduled</option>
            <option value="ended">Ended</option>
            <option value="limit reached">Limit reached</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Min Order</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-sm text-gray-500">Loading rewards...</td></tr>
              ) : filteredRewards.length > 0 ? (
                filteredRewards.map((reward) => (
                  <tr key={reward.id} className="border-t border-gray-100">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{reward.name}</p>
                      {reward.description ? <p className="mt-1 line-clamp-1 text-xs text-gray-500">{reward.description}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">{getRewardValueLabel(reward)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">{reward.pointsRequired}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{formatCurrency(reward.minimumOrderAmount)}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{reward.validDays} days</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{reward.usedCount} / {reward.usageLimit ?? "∞"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRewardStatusClass(reward)}`}>
                        {getRewardStatusLabel(reward)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(reward)} title="Edit reward" className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openDuplicate(reward)} title="Duplicate reward" className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50">
                          <Square2StackIcon className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => void toggleReward(reward)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          {reward.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No rewards found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm ? (
        <RewardFormModal
          form={form}
          setForm={setForm}
          title={editingReward ? "Edit Reward" : "Create Reward"}
          saving={saving}
          onClose={() => setShowForm(false)}
          onSubmit={saveReward}
        />
      ) : null}

      {showSettings ? (
        <SettingsModal
          settings={settings}
          setSettings={setSettings}
          saving={saving}
          onClose={() => setShowSettings(false)}
          onSave={saveSettings}
        />
      ) : null}
    </div>
  );
}

function RewardFormModal({
  form,
  setForm,
  title,
  saving,
  onClose,
  onSubmit,
}: {
  form: RewardFormState;
  setForm: React.Dispatch<React.SetStateAction<RewardFormState>>;
  title: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <form onSubmit={onSubmit} className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <Field label="Reward Name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
          <Field label="Points Required" type="number" value={form.pointsRequired} onChange={(value) => setForm((prev) => ({ ...prev, pointsRequired: value }))} />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Discount Type</span>
            <select value={form.discountType} onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value as DiscountType }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10">
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </label>
          <Field label="Discount Value" type="number" value={form.discountValue} onChange={(value) => setForm((prev) => ({ ...prev, discountValue: value }))} />
          {form.discountType === "percentage" ? (
            <Field label="Max Discount Amount" type="number" value={form.maxDiscountAmount} onChange={(value) => setForm((prev) => ({ ...prev, maxDiscountAmount: value }))} />
          ) : null}
          <Field label="Minimum Order Amount" type="number" value={form.minimumOrderAmount} onChange={(value) => setForm((prev) => ({ ...prev, minimumOrderAmount: value }))} />
          <Field label="Valid Days" type="number" value={form.validDays} onChange={(value) => setForm((prev) => ({ ...prev, validDays: value }))} />
          <Field label="Usage Limit" type="number" value={form.usageLimit} placeholder="Optional" onChange={(value) => setForm((prev) => ({ ...prev, usageLimit: value }))} />
          <Field label="Start At" type="datetime-local" value={form.startsAt} onChange={(value) => setForm((prev) => ({ ...prev, startsAt: value }))} />
          <Field label="End At" type="datetime-local" value={form.endsAt} onChange={(value) => setForm((prev) => ({ ...prev, endsAt: value }))} />
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Description</span>
            <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
            <span>
              <span className="block text-sm font-semibold text-gray-900">Active</span>
              <span className="block text-xs text-gray-500">Active rewards can be redeemed by customers.</span>
            </span>
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Reward"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
    </label>
  );
}

function SettingsModal({
  settings,
  setSettings,
  saving,
  onClose,
  onSave,
}: {
  settings: RewardSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<RewardSettingsState>>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">Reward Settings</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <Field label="Amount per Point" type="number" value={settings.amountPerPoint} onChange={(value) => setSettings((prev) => ({ ...prev, amountPerPoint: value }))} />
          <Field label="Minimum Order to Earn" type="number" value={settings.minimumOrderAmount} onChange={(value) => setSettings((prev) => ({ ...prev, minimumOrderAmount: value }))} />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Points Rounding</span>
            <select value={settings.pointsRounding} onChange={(event) => setSettings((prev) => ({ ...prev, pointsRounding: event.target.value as RewardSettingsState["pointsRounding"] }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10">
              <option value="floor">Floor</option>
              <option value="round">Round</option>
              <option value="ceil">Ceil</option>
            </select>
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Earning Active</span>
            <input type="checkbox" checked={settings.isActive} onChange={(event) => setSettings((prev) => ({ ...prev, isActive: event.target.checked }))} className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Notes</span>
            <textarea value={settings.notes} onChange={(event) => setSettings((prev) => ({ ...prev, notes: event.target.value }))} rows={4} className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="button" disabled={saving} onClick={onSave} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Settings"}</button>
        </div>
      </div>
    </div>
  );
}
