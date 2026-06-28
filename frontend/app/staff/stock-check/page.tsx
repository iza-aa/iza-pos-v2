"use client";

/* cspell:ignore Pagi Malam */

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArchiveBoxIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { SidebarTabset, DateRangeFilter, getDefaultDateRange, type DateRangeValue } from "@/app/components/shared";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import {
  getStaffHomePath,
  hasStaffPosition,
  normalizeStaffType,
} from "@/lib/utils/staffAccess";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { convertQuantity } from "@/lib/utils/unitConversion";

type StockCheckTab = "stock-check" | "kitchen-station" | "my-reports";
import StockCheckTabUI from "./components/StockCheckTab";
import KitchenStationTab from "./components/KitchenStationTab";
import MyReportsTab from "./components/MyReportsTab";
import type { StockCheckTab as StockCheckTabType, BulkOpenedMovement, InventoryBatch, InventoryItem, KitchenActionTarget, KitchenAuditTarget, KitchenMoveForm, KitchenReportCondition, KitchenReportLevel, ProductItem, RecipeIngredient, RecipeRow, ReportStatus, ReportType, StationBatch, StationScope, StockReport, TestingForm, TestingMode, TestingPurpose, TestingRecipeLine } from "./types";
import { kitchenReportConditionOptions, kitchenReportLevelOptions, kitchenShiftOptions, reportOptions, stockCheckTabs, testingPurposeOptions } from "./constants";
import { formatDate, getDateAfterDays, getDefaultKitchenShiftName, getErrorMessage, getInventoryStatusMeta, getKitchenReportConditionLabel, getKitchenReportLevelLabel, getKitchenReportSignal, getStockTextClassName, getTestingPurposeLabel, normalizeInventoryStatus, omitStationScope, reportTypeLabel, stationScopeLabel, stationStatusLabel, statusClassName, statusLabel, toNumber, trackingModeLabel } from "./utils";

import { useStockCheckData } from "./hooks/useStockCheckData";

export default function StaffStockCheckPage() {
  const {
    currentUser,
    staffType,
    hasBaristaPosition,
    hasKitchenPosition,
    isOwner,
    canUseStockCheck,
    canUseKitchenStation,
    effectiveStationScope,
    visibleStockCheckTabs,
    visibleInventoryScopes,
    initialKitchenShift,
    activeTab,
    setActiveTab,
    items,
    setItems,
    reports,
    setReports,
    stationBatches,
    setStationBatches,
    bulkOpenedMovements,
    setBulkOpenedMovements,
    masterBatches,
    setMasterBatches,
    products,
    setProducts,
    recipes,
    setRecipes,
    recipeIngredients,
    setRecipeIngredients,
    loading,
    setLoading,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    selectedItem,
    setSelectedItem,
    selectedReport,
    setSelectedReport,
    selectedReportType,
    setSelectedReportType,
    quantityNote,
    setQuantityNote,
    description,
    setDescription,
    closingDate,
    setClosingDate,
    closingItemId,
    setClosingItemId,
    closingShift,
    setClosingShift,
    openingQty,
    setOpeningQty,
    transferInQty,
    setTransferInQty,
    posUsageQty,
    setPosUsageQty,
    wasteQty,
    setWasteQty,
    physicalClosingQty,
    setPhysicalClosingQty,
    closingNotes,
    setClosingNotes,
    kitchenReportCondition,
    setKitchenReportCondition,
    kitchenReportLevel,
    setKitchenReportLevel,
    closingTouchedSubmit,
    setClosingTouchedSubmit,
    kitchenAuditTarget,
    setKitchenAuditTarget,
    kitchenShiftFilter,
    kitchenMoveOpen,
    setKitchenMoveOpen,
    kitchenMoveTouched,
    setKitchenMoveTouched,
    kitchenMoveForm,
    setKitchenMoveForm,
    testingModalOpen,
    setTestingModalOpen,
    testingTouched,
    setTestingTouched,
    testingForm,
    setTestingForm,
    stockReportsAvailable,
    setStockReportsAvailable,
    stationScopeAvailable,
    setStationScopeAvailable,
    kitchenStationAvailable,
    setKitchenStationAvailable,
    openStockActionMenu,
    setOpenStockActionMenu,
    openKitchenActionMenu,
    setOpenKitchenActionMenu,
    loadItems,
    loadReports,
    loadStationBatches,

    loadMasterBatches,


    submitReport,
    submitTestingUsage,
    openKitchenMoveModal,
    closeKitchenMoveModal,
    submitKitchenMove,
    closeTestingModal,
    renderStockActionMenu,
    renderKitchenActionMenu,
    filteredItems,
    filteredStationBatches,
    filteredBulkOpenedMovements,
    stockColumns,
    stationBatchColumns,
    bulkOpenedColumns,
    reportColumns,
    closeReportModal,
    selectedKitchenMoveItem,
    selectedKitchenMoveMasterStock,
    selectedKitchenMoveMax,
    selectedKitchenMoveSuggestedQty,
    kitchenTransferItems,
    bulkUsageItems,
    selectedTestProduct,
    selectedTestRecipe,
    testingRecipeLines
  ,
    selectedTestItem,
    getTestingLineSourceLabel,
    getTestingDeductionSource,
    closeKitchenAuditModal,
    closingExpected,
    closingVariance,
    submitKitchenClosingCount,
    sourceBatchesForItem} = useStockCheckData();



  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-white">
      <div className="flex h-full min-h-0">
        <SidebarTabset
          title="Stock Check"
          description="Report material issues without editing inventory."
          items={visibleStockCheckTabs}
          activeId={activeTab}
          onSelect={setActiveTab}
        />


        <section className="min-w-0 flex-1 overflow-hidden bg-gray-50 p-4 md:p-5">
          {activeTab === "stock-check" ? (
            <StockCheckTabUI
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setTestingModalOpen={setTestingModalOpen}
              stationScopeAvailable={stationScopeAvailable}
              filteredItems={filteredItems}
              loading={loading}
              setOpenStockActionMenu={setOpenStockActionMenu}
            />
          ) : activeTab === "kitchen-station" ? (
            <KitchenStationTab
              openKitchenMoveModal={openKitchenMoveModal}
              setTestingModalOpen={setTestingModalOpen}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              kitchenStationAvailable={kitchenStationAvailable}
              loading={loading}
              stationBatches={stationBatches}
              filteredStationBatches={filteredStationBatches}
              filteredBulkOpenedMovements={filteredBulkOpenedMovements}
              stationBatchColumns={stationBatchColumns}
              bulkOpenedColumns={bulkOpenedColumns}
            />
          ) : (
            <MyReportsTab
              dateRange={dateRange}
              setDateRange={setDateRange}
              stockReportsAvailable={stockReportsAvailable}
              loading={loading}
              reports={reports}
              reportColumns={reportColumns}
            />
          )}
        </section>
      </div>

      {renderStockActionMenu()}
      {renderKitchenActionMenu()}

      {testingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full  flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {effectiveStationScope === "barista" ? "Barista" : effectiveStationScope === "kitchen" ? "Kitchen" : "Staff"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-950">Test Menu</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Record calibration, tasting, training, or menu trial usage without creating a customer order.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTestingModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
                aria-label="Close testing modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_360px]">
              <div className="space-y-5 p-6">
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {([
                    { value: "ingredient" as const, label: "Test Ingredient" },
                    { value: "menu" as const, label: "Test Menu" },
                  ]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTestingForm((current) => ({ ...current, mode: option.value }))}
                      className={`h-11 rounded-md text-sm font-semibold transition ${
                        testingForm.mode === option.value
                          ? "bg-gray-900 text-white shadow-sm"
                          : "text-gray-600 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Purpose <span className="text-red-500">*</span>
                    <select
                      value={testingForm.purpose}
                      onChange={(event) => setTestingForm((current) => ({
                        ...current,
                        purpose: event.target.value as TestingPurpose,
                      }))}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                    >
                      {testingPurposeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Shift <span className="text-red-500">*</span>
                    <select
                      value={testingForm.shiftName}
                      onChange={(event) => setTestingForm((current) => ({ ...current, shiftName: event.target.value }))}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                    >
                      {kitchenShiftOptions.map((shift) => (
                        <option key={shift} value={shift}>{shift}</option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Menu scope</p>
                    <p className="mt-2 text-lg font-bold text-gray-950">
                      {effectiveStationScope === "barista" ? "Drinks" : effectiveStationScope === "kitchen" ? "Food" : "All"}
                    </p>
                  </div>
                </div>

                {testingForm.mode === "ingredient" ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-base font-bold text-gray-950">Ingredient Usage</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Use this for grinder calibration, tasting a sauce, staff training, or checking one material.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                      <label className="block text-sm font-semibold text-gray-700">
                        Ingredient <span className="text-red-500">*</span>
                        <select
                          value={testingForm.itemId}
                          onChange={(event) => setTestingForm((current) => ({ ...current, itemId: event.target.value }))}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                        >
                          <option value="">Select ingredient</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit || "-"})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold text-gray-700">
                        Quantity <span className="text-red-500">*</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={testingForm.quantity}
                          onChange={(event) => setTestingForm((current) => ({ ...current, quantity: event.target.value }))}
                          placeholder={selectedTestItem?.unit || "Qty"}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-base font-bold text-gray-950">Menu Trial</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select one menu and the system will deduct recipe ingredients from the correct source.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                      <label className="block text-sm font-semibold text-gray-700">
                        Menu <span className="text-red-500">*</span>
                        <select
                          value={testingForm.productId}
                          onChange={(event) => setTestingForm((current) => ({ ...current, productId: event.target.value }))}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                        >
                          <option value="">Select menu</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold text-gray-700">
                        Portions <span className="text-red-500">*</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={testingForm.portions}
                          onChange={(event) => setTestingForm((current) => ({ ...current, portions: event.target.value }))}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                        />
                      </label>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
                      <div className="grid grid-cols-[1.3fr_0.7fr_1fr] bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                        <span>Ingredient</span>
                        <span>Usage</span>
                        <span>Source</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {testingRecipeLines.length ? testingRecipeLines.map((line, index) => (
                          <div key={`${line.ingredient.inventory_item_id || index}-${index}`} className="grid grid-cols-[1.3fr_0.7fr_1fr] gap-3 px-4 py-3 text-sm">
                            <div>
                              <p className="font-semibold text-gray-900">{line.item?.name || line.ingredient.ingredient_name || "Ingredient"}</p>
                              <p className="mt-1 text-xs text-gray-500">{line.costingMode || "deduct_from_pos"}</p>
                            </div>
                            <p className="font-semibold text-gray-800">
                              {line.requiredQuantity > 0 ? `${line.requiredQuantity} ${line.stockUnit}` : "-"}
                            </p>
                            <p className="text-gray-600">{line.note}</p>
                          </div>
                        )) : (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">
                            {selectedTestProduct ? "No base recipe ingredients found." : "Select a menu to preview recipe usage."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <label className="block text-sm font-semibold text-gray-700">
                  Notes
                  <textarea
                    value={testingForm.notes}
                    onChange={(event) => setTestingForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Calibration, taste test, training, quality check, or menu trial notes..."
                    className="mt-2 h-28 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-gray-900"
                  />
                </label>
              </div>

              <aside className="border-t border-gray-200 bg-gray-50 p-6 lg:border-l lg:border-t-0">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Preview</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Mode</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">
                        {testingForm.mode === "menu" ? "Menu Trial" : "Ingredient"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Purpose</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">{getTestingPurposeLabel(testingForm.purpose)}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-gray-900 p-4 text-white">
                    <p className="text-sm text-gray-300">Cost source</p>
                    <p className="mt-2 text-base font-bold">
                      {testingForm.mode === "menu"
                        ? `${testingRecipeLines.filter((line) => line.deductionSource !== "none").length} ingredient deduction(s)`
                        : selectedTestItem
                          ? getTestingLineSourceLabel({
                              item: selectedTestItem,
                              requiredQuantity: Number(testingForm.quantity || 0),
                              stockUnit: selectedTestItem.unit || "",
                              deductionSource: getTestingDeductionSource(
                                selectedTestItem,
                                "deduct_from_pos",
                                Number(testingForm.quantity || 0),
                              ),
                              note: "Manual testing ingredient",
                            } as TestingRecipeLine)
                          : "-"}
                    </p>
                  </div>
                  {testingTouched && testingForm.mode === "menu" && selectedTestProduct && !selectedTestRecipe ? (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      Selected menu does not have a base recipe.
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeTestingModal}
                className="h-11 rounded-lg border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:border-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitTestingUsage()}
                className="h-11 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Save Testing Usage
              </button>
            </div>
          </div>
        </div>
      )}

      {kitchenAuditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Kitchen</p>
                <h2 className="mt-2 text-2xl font-bold text-gray-950">Kitchen Report</h2>
                <p className="mt-2 text-sm text-gray-500">
                  {kitchenAuditTarget.itemName} • {kitchenAuditTarget.sourceLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={closeKitchenAuditModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
                aria-label="Close report modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_340px]">
              <div className="space-y-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-950">
                      {kitchenAuditTarget.kind === "bulk" ? "Ingredient Report" : "Station Report"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {kitchenAuditTarget.kind === "bulk" ? "Use kitchen-friendly status instead of weighing everything." : "Adjust the live station count when the physical count is different."}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                    {closingShift}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Date <span className="text-red-500">*</span>
                    <input
                      type="date"
                      value={closingDate}
                      onChange={(event) => setClosingDate(event.target.value)}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Report type <span className="text-red-500">*</span>
                    <select
                      value={kitchenReportCondition}
                      onChange={(event) => setKitchenReportCondition(event.target.value as KitchenReportCondition)}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                    >
                      {kitchenReportConditionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {kitchenAuditTarget.kind === "bulk" ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-sm font-semibold text-gray-700">
                      Informal level
                      <select
                        value={kitchenReportLevel}
                        onChange={(event) => setKitchenReportLevel(event.target.value as KitchenReportLevel)}
                        className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                      >
                        {kitchenReportLevelOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600">
                      {["Full", "Half", "Low"].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setKitchenReportLevel(level === "Full" ? "full" : level === "Half" ? "half" : "low")}
                          className="h-9 rounded-lg border border-gray-200 bg-white transition hover:border-gray-900"
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Waste
                    <input
                      value={wasteQty}
                      onChange={(event) => setWasteQty(event.target.value)}
                      placeholder={`0 ${kitchenAuditTarget.unit}`}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    {kitchenAuditTarget.kind === "bulk" ? "Estimated remaining" : "Actual count"}
                    {kitchenAuditTarget.kind === "station" ? <span className="text-red-500"> *</span> : null}
                    <input
                      value={physicalClosingQty}
                      onChange={(event) => setPhysicalClosingQty(event.target.value)}
                      placeholder={kitchenAuditTarget.kind === "bulk" ? "Optional" : `Remaining ${kitchenAuditTarget.unit}`}
                      className={`mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900 ${
                        closingTouchedSubmit && kitchenAuditTarget.kind === "station" && physicalClosingQty.trim() === "" ? "border-red-400 bg-red-50" : ""
                      }`}
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-gray-700">
                  Notes
                  <textarea
                    value={closingNotes}
                    onChange={(event) => setClosingNotes(event.target.value)}
                    rows={5}
                    placeholder="Handover note, waste reason, or prep context..."
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-gray-900"
                  />
                </label>
              </div>

              <aside className="border-t border-gray-200 bg-gray-50 p-6 lg:border-l lg:border-t-0">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <ArchiveBoxIcon className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Item</p>
                      <p className="font-bold text-gray-950">{kitchenAuditTarget.itemName}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">System</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">{kitchenAuditTarget.expectedQuantity} {kitchenAuditTarget.unit}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Mode</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">{kitchenAuditTarget.kind === "bulk" ? "Note" : "Count"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-gray-950">Preview</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">{kitchenAuditTarget.kind === "bulk" ? "Estimate after waste" : "Expected after waste"}</span>
                      <span className="font-bold text-gray-950">{closingExpected} {kitchenAuditTarget.unit}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">{kitchenAuditTarget.kind === "bulk" ? "Staff note" : "Physical"}</span>
                      <span className="font-bold text-gray-950">
                        {kitchenAuditTarget.kind === "bulk"
                          ? getKitchenReportLevelLabel(kitchenReportLevel) || getKitchenReportConditionLabel(kitchenReportCondition) || "-"
                          : `${physicalClosingQty || "-"} ${physicalClosingQty ? kitchenAuditTarget.unit : ""}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-900 p-3 text-white">
                      <span>{kitchenAuditTarget.kind === "bulk" ? "Manager signal" : "Variance"}</span>
                      <span className="font-bold">
                        {kitchenAuditTarget.kind === "bulk"
                          ? getKitchenReportSignal(kitchenReportCondition, kitchenReportLevel)
                          : closingVariance === null ? "-" : `${closingVariance} ${kitchenAuditTarget.unit}`}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeKitchenAuditModal}
                className="h-12 rounded-lg border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:border-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitKitchenClosingCount()}
                className="h-12 rounded-lg bg-gray-900 px-6 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {kitchenMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kitchen</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">Move to Kitchen</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pull stock from Inventory Master as station stock or as an opened ingredient for kitchen use.
                </p>
              </div>

              <button
                type="button"
                onClick={closeKitchenMoveModal}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                aria-label="Close move to kitchen modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_340px]">
              <div className="min-h-0 space-y-5 overflow-y-auto p-5">
                <div className="border-b border-gray-100 pb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Kitchen Movement</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Choose how this stock should be tracked once it enters the kitchen.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setKitchenMoveOpen("transfer");
                      setKitchenMoveForm((current) => ({
                        ...current,
                        itemId: "",
                        sourceBatchId: "",
                        quantity: "",
                        expiryDate: getDateAfterDays(3),
                      }));
                    }}
                    className={`rounded-lg border p-4 text-left transition ${
                      kitchenMoveOpen === "transfer"
                        ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">Station Stock</span>
                    <span className={`mt-1 block text-xs ${kitchenMoveOpen === "transfer" ? "text-gray-200" : "text-gray-500"}`}>
                      For POS-deduct items such as chicken.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKitchenMoveOpen("bulk");
                      setKitchenMoveForm((current) => ({
                        ...current,
                        itemId: "",
                        sourceBatchId: "",
                        quantity: "",
                        expiryDate: "",
                      }));
                    }}
                    className={`rounded-lg border p-4 text-left transition ${
                      kitchenMoveOpen === "bulk"
                        ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">Opened Ingredient</span>
                    <span className={`mt-1 block text-xs ${kitchenMoveOpen === "bulk" ? "text-gray-200" : "text-gray-500"}`}>
                      For kitchen-use ingredients tracked by notes.
                    </span>
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Item <span className="text-red-500">*</span>
                      <select
                        value={kitchenMoveForm.itemId}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, itemId: event.target.value, sourceBatchId: "" }))}
                        className={`mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${
                          kitchenMoveTouched && !kitchenMoveForm.itemId ? "border-red-400 bg-red-50" : ""
                        }`}
                      >
                        <option value="">Select item</option>
                        {(kitchenMoveOpen === "transfer" ? kitchenTransferItems : bulkUsageItems).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Source batch
                      <select
                        value={kitchenMoveForm.sourceBatchId}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, sourceBatchId: event.target.value }))}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">No specific batch</option>
                        {sourceBatchesForItem(kitchenMoveForm.itemId).map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batch_number || "Batch"} - {toNumber(batch.quantity_remaining)} {batch.unit || ""} - {batch.supplier || "-"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Quantity <span className="text-red-500">*</span>
                      <input
                        value={kitchenMoveForm.quantity}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, quantity: event.target.value }))}
                        className={`mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${
                          kitchenMoveTouched && (!Number(kitchenMoveForm.quantity) || Number(kitchenMoveForm.quantity) <= 0)
                            ? "border-red-400 bg-red-50"
                            : ""
                        }`}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                      Shift <span className="text-red-500">*</span>
                      <select
                        value={kitchenMoveForm.shiftName}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, shiftName: event.target.value }))}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      >
                        {kitchenShiftOptions.map((shift) => (
                          <option key={shift}>{shift}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {kitchenMoveOpen === "transfer" ? (
                    <label className="mt-4 block text-sm font-semibold text-gray-700">
                      Chiller consume-by <span className="text-red-500">*</span>
                      <input
                        type="date"
                        value={kitchenMoveForm.expiryDate}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, expiryDate: event.target.value }))}
                        className={`mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${
                          kitchenMoveTouched && !kitchenMoveForm.expiryDate ? "border-red-400 bg-red-50" : ""
                        }`}
                      />
                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        Separate from source expiry. Default is 3 days after moving to kitchen.
                      </span>
                    </label>
                  ) : null}
                </div>

                <label className="block text-sm font-semibold text-gray-700">
                  Notes
                  <textarea
                    value={kitchenMoveForm.notes}
                    onChange={(event) => setKitchenMoveForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                    placeholder="Prep note, handover context, or source detail..."
                  />
                </label>
              </div>

              <aside className="flex min-h-0 flex-col border-t border-gray-200 bg-gray-50 p-5 lg:border-l lg:border-t-0">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                      <ArchiveBoxIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Mode</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {kitchenMoveOpen === "transfer" ? "Station Stock" : "Opened Ingredient"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-100 p-3">
                      <p className="text-xs text-gray-500">Master</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedKitchenMoveItem ? `${selectedKitchenMoveMasterStock} ${selectedKitchenMoveItem.unit || ""}` : "-"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-3">
                      <p className="text-xs text-gray-500">Available</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedKitchenMoveItem ? `${selectedKitchenMoveMax} ${selectedKitchenMoveItem.unit || ""}` : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Movement Preview</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Item</span>
                      <span className="font-semibold text-gray-950">{selectedKitchenMoveItem?.name || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-semibold text-gray-950">
                        {kitchenMoveForm.quantity || "-"} {selectedKitchenMoveItem?.unit || ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Shift</span>
                      <span className="font-semibold text-gray-950">{kitchenMoveForm.shiftName}</span>
                    </div>
                    {kitchenMoveOpen === "transfer" ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                        <span className="text-gray-500">Consume-by</span>
                        <span className="font-semibold text-gray-950">{kitchenMoveForm.expiryDate || "-"}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedKitchenMoveItem && kitchenMoveOpen === "transfer" ? (
                  <button
                    type="button"
                    onClick={() => setKitchenMoveForm((current) => ({
                      ...current,
                      quantity: String(selectedKitchenMoveSuggestedQty),
                    }))}
                    className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    Use suggested {selectedKitchenMoveSuggestedQty} {selectedKitchenMoveItem.unit || ""}
                  </button>
                ) : null}
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeKitchenMoveModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitKitchenMove()}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                {kitchenMoveOpen === "transfer" ? "Move Stock" : "Open Ingredient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(selectedItem || selectedReport) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-950">
              {selectedReport ? "Edit Stock Report" : selectedItem?.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Report stock issue for manager review.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Report type
                <select
                  value={selectedReportType}
                  onChange={(event) => setSelectedReportType(event.target.value as ReportType)}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  {reportOptions.map((option) => (
                    <option key={option.type} value={option.type}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Quantity note
                <input
                  value={quantityNote}
                  onChange={(event) => setQuantityNote(event.target.value)}
                  placeholder="Example: left around 500 mL"
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Add short context for manager..."
                  className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                {selectedReport ? "Update Report" : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
