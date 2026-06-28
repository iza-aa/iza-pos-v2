"use client";

import { useCallback, useEffect, useState } from "react";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { useLanguage } from "@/app/components/shared/i18n";
import { ChartCard } from "../shared/DashboardPrimitives";
import type { LoyaltySettings } from "@/app/api/owner/loyalty-settings/route";

type FormState = {
  pointsPerAmount: string;
  amountPerPoints: string;
  minimumOrderAmount: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = {
  pointsPerAmount: "1",
  amountPerPoints: "10000",
  minimumOrderAmount: "0",
  isActive: true,
};

function formatRp(value: string | number): string {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export default function LoyaltySettingsCard() {
  const { t } = useLanguage();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/loyalty-settings");
      if (!res.ok) throw new Error(t("owner.loyalty.loadError"));
      const json = (await res.json()) as { settings: LoyaltySettings };
      const s = json.settings;
      setForm({
        pointsPerAmount: String(s.pointsPerAmount),
        amountPerPoints: String(s.amountPerPoints),
        minimumOrderAmount: String(s.minimumOrderAmount),
        isActive: s.isActive,
      });
      setLastUpdated(s.updatedAt);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : t("owner.loyalty.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateField = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/owner/loyalty-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointsPerAmount: parseInt(form.pointsPerAmount, 10) || 1,
          amountPerPoints: parseInt(form.amountPerPoints, 10) || 10000,
          minimumOrderAmount: parseInt(form.minimumOrderAmount, 10) || 0,
          isActive: form.isActive,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        settings?: LoyaltySettings;
      };
      if (!res.ok) throw new Error(json.error ?? t("owner.loyalty.saveError"));
      setLastUpdated(json.settings?.updatedAt ?? null);
      showSuccess(t("owner.loyalty.saved"));
    } catch (error) {
      showError(
        error instanceof Error ? error.message : t("owner.loyalty.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const pointsNum = parseInt(form.pointsPerAmount, 10);
  const amountNum = parseInt(form.amountPerPoints, 10);
  const minOrderNum = parseInt(form.minimumOrderAmount, 10);

  const previewValid =
    Number.isFinite(pointsNum) &&
    pointsNum > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0;

  const previewText = previewValid
    ? t("owner.loyalty.previewText", {
        amount: formatRp(amountNum),
        points: String(pointsNum),
      }) +
      (Number.isFinite(minOrderNum) && minOrderNum > 0
        ? t("owner.loyalty.previewMinOrder", {
            minOrder: formatRp(minOrderNum),
          })
        : "")
    : t("owner.loyalty.previewEmpty");

  return (
    <ChartCard
      title={t("owner.loyalty.title")}
      subtitle={t("owner.loyalty.subtitle")}
    >
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-gray-400">{t("owner.loyalty.loading")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Toggle aktif */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-gray-900"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t("owner.loyalty.active")}
              </p>
              <p className="text-xs text-gray-500">
                {t("owner.loyalty.activeDescription")}
              </p>
            </div>
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${
                form.isActive
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-gray-200 bg-white text-gray-500"
              }`}
            >
              {form.isActive
                ? t("owner.loyalty.activeStatus")
                : t("owner.loyalty.inactiveStatus")}
            </span>
          </label>

          {/* Grid input utama */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">
                {t("owner.loyalty.pointsPerAmount")}{" "}
                <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                min="1"
                max="1000"
                value={form.pointsPerAmount}
                onChange={(e) => updateField("pointsPerAmount", e.target.value)}
                disabled={!form.isActive}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
              />
              <p className="text-xs text-gray-400">
                {t("owner.loyalty.pointsPerAmountHelper")}
              </p>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">
                {t("owner.loyalty.amountPerPoints")}{" "}
                <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                min="1000"
                step="1000"
                value={form.amountPerPoints}
                onChange={(e) => updateField("amountPerPoints", e.target.value)}
                disabled={!form.isActive}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
              />
              <p className="text-xs text-gray-400">
                {t("owner.loyalty.amountPerPointsHelper")}
              </p>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">
                {t("owner.loyalty.minimumOrder")}
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.minimumOrderAmount}
                onChange={(e) =>
                  updateField("minimumOrderAmount", e.target.value)
                }
                disabled={!form.isActive}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="0"
              />
              <p className="text-xs text-gray-400">
                {t("owner.loyalty.minimumOrderHelper")}
              </p>
            </label>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {t("owner.loyalty.preview")}
            </p>
            <p className="mt-1 text-sm font-medium text-blue-900">
              {previewText}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3">
            {lastUpdated ? (
              <p className="text-xs text-gray-400">
                {t("owner.loyalty.lastUpdated")}{" "}
                {new Date(lastUpdated).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl border border-gray-900 bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t("owner.loyalty.saving") : t("owner.loyalty.save")}
            </button>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
