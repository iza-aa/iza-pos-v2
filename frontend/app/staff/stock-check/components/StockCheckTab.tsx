import { MagnifyingGlassIcon, PlusIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { InventoryItem } from "../types";
import {
  normalizeInventoryStatus,
  getStockTextClassName,
  stationScopeLabel,
  trackingModeLabel,
  getInventoryStatusMeta,
} from "../utils";
import type { MouseEvent } from "react";

export type StockCheckTabProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setTestingModalOpen: (open: boolean) => void;
  stationScopeAvailable: boolean;
  filteredItems: InventoryItem[];
  loading: boolean;
  setOpenStockActionMenu: (menu: { item: InventoryItem; anchor: DOMRect }) => void;
};

export default function StockCheckTab({
  searchQuery,
  setSearchQuery,
  setTestingModalOpen,
  stationScopeAvailable,
  filteredItems,
  loading,
  setOpenStockActionMenu,
}: StockCheckTabProps) {
  const stockColumns: Array<StandardTableColumn<InventoryItem>> = [
    {
      key: "name",
      header: "Item Name",
      render: (item) => (
        <div>
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="mt-1 text-xs text-gray-500">{item.category ?? "-"}</p>
        </div>
      ),
      sortValue: (item) => item.name,
    },
    {
      key: "stock",
      header: "Stock",
      render: (item) => {
        const normalizedStatus = normalizeInventoryStatus(item);

        return (
          <span className={`font-semibold ${getStockTextClassName(normalizedStatus)}`}>
            {item.current_stock ?? 0} {item.unit ?? ""}
          </span>
        );
      },
      sortValue: (item) => item.current_stock ?? 0,
    },
    {
      key: "reorder",
      header: "Reorder",
      render: (item) => `${item.reorder_level ?? 0} ${item.unit ?? ""}`,
      sortValue: (item) => item.reorder_level ?? 0,
    },
    {
      key: "scope",
      header: "Scope",
      render: (item) => (
        <span className="inline-flex rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {stationScopeLabel(item.station_scope)}
        </span>
      ),
      sortValue: (item) => item.station_scope ?? "shared",
    },
    {
      key: "tracking",
      header: "Tracking",
      render: (item) => (
        <span className="inline-flex rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {trackingModeLabel(item.tracking_mode)}
        </span>
      ),
      sortValue: (item) => item.tracking_mode ?? "direct_auto_deduct",
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const normalizedStatus = normalizeInventoryStatus(item);
        const meta = getInventoryStatusMeta(normalizedStatus);
        return (
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${meta.className}`}
          >
            {meta.label}
          </span>
        );
      },
      sortValue: (item) => normalizeInventoryStatus(item),
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <button
          type="button"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            setOpenStockActionMenu({
              item,
              anchor: e.currentTarget.getBoundingClientRect(),
            });
          }}
          className="inline-flex rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="shrink-0">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-950">Stock Check Table</h2>
            <p className="mt-1 text-sm text-gray-500">
              View inventory master items for your station and report stock issues to manager.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <button
              type="button"
              onClick={() => setTestingModalOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white"
            >
              <PlusIcon className="h-4 w-4" />
              Test Menu
            </button>
            <div className="relative w-full max-w-md lg:w-72">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search materials..."
                className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm outline-none transition focus:border-gray-900"
              />
            </div>
          </div>
        </div>
        {!stationScopeAvailable ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            Station scope is not available yet. Showing all inventory master items until the inventory station SQL is applied.
          </div>
        ) : null}
      </div>
      <div className="h-fit max-h-[calc(100vh-184px)] overflow-y-auto">
        <StandardTable
          columns={stockColumns}
          data={filteredItems}
          getRowKey={(item) => item.id}
          emptyLabel={loading ? "Loading stock data..." : "No materials found."}
          loading={loading}
          minWidthClassName="min-w-[880px]"
          horizontalScroll={false}
        />
      </div>
    </div>
  );
}
