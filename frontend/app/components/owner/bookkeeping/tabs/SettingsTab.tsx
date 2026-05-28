"use client";

import { useEffect, useState } from "react";
import { StandardModal } from "@/app/components/shared";
import { getCurrentUser } from "@/lib/utils";
import type { BookkeepingFinancialSettings } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
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
  const [settings, setSettings] =
    useState<BookkeepingFinancialSettings>(emptySettings);
  const [draftSettings, setDraftSettings] =
    useState<BookkeepingFinancialSettings>(emptySettings);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const taxPreviewBase = 100000;
  const taxPreview = draftSettings.taxEnabled
    ? (taxPreviewBase * Math.max(Number(draftSettings.taxRate) || 0, 0)) / 100
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

        const nextSettings = {
          ...result.settings,
          pricesIncludeTax: false,
        };

        setSettings(nextSettings);
        setDraftSettings(nextSettings);
      } catch (loadError) {
        console.error("Failed to load bookkeeping settings:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Settings could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const openEditModal = () => {
    setDraftSettings(settings);
    setModalOpen(true);
  };

  const saveSettings = async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError("Owner access required.");
      return;
    }

    setSaving(true);
    setError("");

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
          ...draftSettings,
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

      const nextSettings = {
        ...result.settings,
        pricesIncludeTax: false,
      };

      setSettings(nextSettings);
      setDraftSettings(nextSettings);
      setModalOpen(false);
      showSuccess("Financial settings saved.");
    } catch (saveError) {
      console.error("Failed to save bookkeeping settings:", saveError);
      showError(saveError instanceof Error ? saveError.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <StandardPanel
        title="Tax & Charge Settings"
        description="Rules used by POS orders and bookkeeping reports. Tax is tracked separately from sales and expenses."
        action={
          <button
            type="button"
            onClick={openEditModal}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit Settings
          </button>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className={`rounded-lg border p-4 text-sm font-semibold ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.info.cardClass}`}>
              <p className="text-xs font-bold text-gray-500">Customer Tax</p>
              <p className="mt-1 text-base font-bold text-gray-950">
                {settings.taxEnabled ? `${settings.taxLabel || "Tax"} ${settings.taxRate}%` : "Disabled"}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">Tax payable, not operating expense.</p>
            </div>
            <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
              <p className="text-xs font-bold text-gray-500">Service Charge</p>
              <p className="mt-1 text-base font-bold text-gray-950">
                {settings.serviceChargeEnabled ? `${settings.serviceChargeRate}%` : "Disabled"}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">Optional store service fee.</p>
            </div>
            <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
              <p className="text-xs font-bold text-gray-500">Last Updated</p>
              <p className="mt-1 text-base font-bold text-gray-950">
                {settings.updatedAt ? formatDateTime(settings.updatedAt) : "-"}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">Latest financial setting change.</p>
            </div>
          </div>
        </div>
      </StandardPanel>

      <StandardModal
        isOpen={modalOpen}
        title="Edit Tax & Charge Settings"
        description="Adjust POS tax and service charge rules used by bookkeeping reports."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving || loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Customer Tax</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Collected from customers and reported as tax payable.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={draftSettings.taxEnabled}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...current,
                      taxEnabled: event.target.checked,
                    }))
                  }
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
                  value={draftSettings.taxLabel}
                  disabled={!draftSettings.taxEnabled}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...current,
                      taxLabel: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </label>

              <label className="text-sm font-semibold text-gray-700">
                Tax Rate
                <div className="mt-2 flex h-11 overflow-hidden rounded-lg border border-gray-300 focus-within:border-gray-900">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draftSettings.taxRate}
                    disabled={!draftSettings.taxEnabled}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        taxRate: Number(event.target.value),
                      }))
                    }
                    className="min-w-0 flex-1 px-4 text-sm font-semibold text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="flex items-center border-l border-gray-200 px-3 text-sm font-bold text-gray-500">%</span>
                </div>
              </label>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-bold text-gray-950">Preview</p>
              <p className="mt-2">
                On Rp 100.000 sales, {draftSettings.taxLabel || "Tax"} collected is{" "}
                <span className="font-bold text-gray-950">{formatCurrency(taxPreview)}</span>.
              </p>
              <p className="mt-1">Report net sales excludes this tax so owner profit is not overstated.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Service Charge</h3>
                <p className="mt-1 text-sm text-gray-500">Applied to dine-in orders only. Takeaway does not receive this charge.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={draftSettings.serviceChargeEnabled}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...current,
                      serviceChargeEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Enabled
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Rate
              <div className="mt-2 flex h-11 max-w-xs overflow-hidden rounded-lg border border-gray-300 focus-within:border-gray-900">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={draftSettings.serviceChargeRate}
                  disabled={!draftSettings.serviceChargeEnabled}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...current,
                      serviceChargeRate: Number(event.target.value),
                    }))
                  }
                  className="min-w-0 flex-1 px-4 text-sm font-semibold text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
                <span className="flex items-center border-l border-gray-200 px-3 text-sm font-bold text-gray-500">%</span>
              </div>
            </label>
          </div>
        </div>
      </StandardModal>
    </>
  );
}
