"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/utils";
import type { BookkeepingFinancialSettings } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { StandardPanel, formatCurrency, formatDateTime } from "../BookkeepingPrimitives";

const emptySettings: BookkeepingFinancialSettings = {
  taxEnabled: false,
  taxLabel: "PPN",
  taxRate: 0,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  pricesIncludeTax: false,
  updatedAt: null,
  updatedBy: null,
};

export default function SettingsTab() {
  const [settings, setSettings] = useState<BookkeepingFinancialSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const taxPreviewBase = 100000;
  const taxPreview = settings.taxEnabled
    ? taxPreviewBase * Math.max(Number(settings.taxRate) || 0, 0) / 100
    : 0;

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/owner/bookkeeping/settings", {
          headers: {
            "x-user-id": currentUser.id,
            "x-user-name": currentUser.name,
            "x-user-role": currentUser.role,
          },
        });
        const result = (await response.json().catch(() => ({}))) as {
          settings?: BookkeepingFinancialSettings;
          error?: string;
        };

        if (!response.ok || !result.settings) {
          throw new Error(result.error || "Settings could not be loaded.");
        }

        setSettings({
          ...result.settings,
          pricesIncludeTax: false,
        });
      } catch (loadError) {
        console.error("Failed to load bookkeeping settings:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Settings could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const saveSettings = async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/owner/bookkeeping/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          ...settings,
          pricesIncludeTax: false,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        settings?: BookkeepingFinancialSettings;
        error?: string;
      };

      if (!response.ok || !result.success || !result.settings) {
        throw new Error(result.error || "Settings could not be saved.");
      }

      setSettings({
        ...result.settings,
        pricesIncludeTax: false,
      });
      setNotice("Financial settings saved.");
    } catch (saveError) {
      console.error("Failed to save bookkeeping settings:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandardPanel
      title="Tax & Charge Settings"
      description="Rules used by POS orders and bookkeeping reports. Tax is tracked separately from sales and expenses."
      action={
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving || loading}
          className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      }
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-[#F6C99F] bg-[#FFF1E6] p-4 text-sm font-semibold text-[#B45309]">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-[#BFE5CC] bg-[#EAF7EF] p-4 text-sm font-semibold text-[#2F7D50]">
            {notice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Customer Tax</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Collected from customers and reported as tax payable, not operating expense.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.taxEnabled}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    taxEnabled: event.target.checked,
                  }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Enabled
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                Tax Label
                <input
                  type="text"
                  value={settings.taxLabel}
                  disabled={!settings.taxEnabled}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    taxLabel: event.target.value,
                  }))}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Tax Rate
                <div className="mt-2 flex h-11 overflow-hidden rounded-xl border border-gray-200 focus-within:border-gray-900">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.taxRate}
                    disabled={!settings.taxEnabled}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      taxRate: Number(event.target.value),
                    }))}
                    className="min-w-0 flex-1 px-4 text-sm font-semibold text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="flex items-center border-l border-gray-200 px-3 text-sm font-bold text-gray-500">%</span>
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-bold text-gray-950">Preview</p>
              <p className="mt-2">
                On Rp 100.000 sales, {settings.taxLabel || "Tax"} collected is{" "}
                <span className="font-bold text-gray-950">{formatCurrency(taxPreview)}</span>.
              </p>
              <p className="mt-1">
                Report net sales excludes this tax so owner profit is not overstated.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Service Charge</h3>
                <p className="mt-1 text-sm text-gray-500">Optional service fee for dine-in or store policy.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.serviceChargeEnabled}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    serviceChargeEnabled: event.target.checked,
                  }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Enabled
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Rate
              <div className="mt-2 flex h-11 max-w-xs overflow-hidden rounded-xl border border-gray-200 focus-within:border-gray-900">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.serviceChargeRate}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    serviceChargeRate: Number(event.target.value),
                  }))}
                  className="min-w-0 flex-1 px-4 text-sm font-semibold text-gray-900 outline-none"
                />
                <span className="flex items-center border-l border-gray-200 px-3 text-sm font-bold text-gray-500">%</span>
              </div>
            </label>

            <div className="border-t border-gray-100 pt-4 text-sm text-gray-500">
              Last updated: {settings.updatedAt ? formatDateTime(settings.updatedAt) : "-"}
            </div>
          </div>
        </div>
      </div>
    </StandardPanel>
  );
}
