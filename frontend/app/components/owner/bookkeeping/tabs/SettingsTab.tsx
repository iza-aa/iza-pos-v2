"use client";

import { useEffect, useState } from "react";
import { StandardModal } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
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
  const { t } = useLanguage();
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
      setError(t("owner.bookkeeping.ownerRequired"));
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
          throw new Error(result.error || t("owner.bookkeeping.settingsLoadError"));
        }

        const nextSettings = {
          ...result.settings,
          pricesIncludeTax: false,
        };

        setSettings(nextSettings);
        setDraftSettings(nextSettings);
      } catch (loadError) {
        console.error("Failed to load bookkeeping settings:", loadError);
        setError(loadError instanceof Error ? loadError.message : t("owner.bookkeeping.settingsLoadError"));
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [t]);

  const openEditModal = () => {
    setDraftSettings(settings);
    setModalOpen(true);
  };

  const saveSettings = async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setError(t("owner.bookkeeping.ownerRequired"));
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
        throw new Error(result.error || t("owner.bookkeeping.settingsSaveError"));
      }

      const nextSettings = {
        ...result.settings,
        pricesIncludeTax: false,
      };

      setSettings(nextSettings);
      setDraftSettings(nextSettings);
      setModalOpen(false);
      showSuccess(t("owner.bookkeeping.settingsSaved"));
    } catch (saveError) {
      console.error("Failed to save bookkeeping settings:", saveError);
      showError(saveError instanceof Error ? saveError.message : t("owner.bookkeeping.settingsSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <StandardPanel
        title={t("owner.bookkeeping.taxSettings")}
        description={t("owner.bookkeeping.taxSettingsDescription")}
        action={
          <button
            type="button"
            onClick={openEditModal}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("owner.bookkeeping.editSettings")}
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
              <p className="text-xs font-bold text-gray-500">{t("owner.bookkeeping.customerTax")}</p>
              <p className="mt-1 text-base font-bold text-gray-950">
                {settings.taxEnabled ? `${settings.taxLabel || "Tax"} ${settings.taxRate}%` : t("owner.bookkeeping.disabled")}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">{t("owner.bookkeeping.taxPayableNote")}</p>
            </div>
            <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
              <p className="text-xs font-bold text-gray-500">{t("owner.bookkeeping.serviceCharge")}</p>
              <p className="mt-1 text-base font-bold text-gray-950">
                {settings.serviceChargeEnabled ? `${settings.serviceChargeRate}%` : t("owner.bookkeeping.disabled")}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">{t("owner.bookkeeping.serviceFeeNote")}</p>
            </div>
            <div className={`rounded-lg border p-3 ${OWNER_SEMANTIC_TONES.neutral.cardClass}`}>
              <p className="text-xs font-bold text-gray-500">{t("owner.bookkeeping.lastUpdated")}</p>
              <p className="mt-1 text-base font-bold text-gray-950">
                {settings.updatedAt ? formatDateTime(settings.updatedAt) : "-"}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">{t("owner.bookkeeping.latestSettingChange")}</p>
            </div>
          </div>
        </div>
      </StandardPanel>

      <StandardModal
        isOpen={modalOpen}
        title={t("owner.bookkeeping.editTaxSettings")}
        description={t("owner.bookkeeping.editTaxSettingsDescription")}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t("owner.bookkeeping.cancel")}
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving || loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("owner.bookkeeping.saving") : t("owner.bookkeeping.saveSettings")}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-950">{t("owner.bookkeeping.customerTax")}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t("owner.bookkeeping.customerTaxDescription")}
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
                {t("owner.bookkeeping.enabled")}
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                {t("owner.bookkeeping.taxLabel")}
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
                {t("owner.bookkeeping.taxRate")}
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
              <p className="font-bold text-gray-950">{t("owner.bookkeeping.preview")}</p>
              <p className="mt-2">
                {t("owner.bookkeeping.taxPreview", {
                  label: draftSettings.taxLabel || "Tax",
                  amount: formatCurrency(taxPreview),
                })}
              </p>
              <p className="mt-1">{t("owner.bookkeeping.netSalesExcludesTax")}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-950">{t("owner.bookkeeping.serviceCharge")}</h3>
                <p className="mt-1 text-sm text-gray-500">{t("owner.bookkeeping.serviceChargeDescription")}</p>
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
                {t("owner.bookkeeping.enabled")}
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              {t("owner.bookkeeping.rate")}
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
