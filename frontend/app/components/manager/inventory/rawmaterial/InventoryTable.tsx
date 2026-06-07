"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AdjustmentsHorizontalIcon,
  ArrowUpTrayIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stationScope: "barista" | "kitchen" | "shared";
  trackingMode: "direct_auto_deduct" | "kitchen_station_auto_deduct" | "bulk_usage_expense";
  parLevel: number;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  supplier: string;
  lastRestocked: string;
  status: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onRestock: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  activeSuppliersByItemId?: Record<string, string>;
  tableActions?: ReactNode;
  loading?: boolean;
}

const normalizeStatus = (item: InventoryItem) => {
  const normalized = String(item.status || "").toLowerCase().trim();

  if (normalized === "in-stock" || normalized === "good") return "in-stock";
  if (normalized === "low-stock" || normalized === "low") return "low-stock";
  if (normalized === "out-of-stock" || normalized === "critical") return "out-of-stock";

  if (item.currentStock <= 0) return "out-of-stock";
  if (item.currentStock <= item.reorderLevel) return "low-stock";

  return "in-stock";
};

const getStatusMeta = (status: "in-stock" | "low-stock" | "out-of-stock") => {
  switch (status) {
    case "in-stock":
      return {
        label: "In Stock",
        className: "bg-[#D8F999] text-gray-900 border border-[#C3EE78]",
      };
    case "low-stock":
      return {
        label: "Low Stock",
        className: "bg-[#FFE02E] text-gray-900 border border-[#F4CF12]",
      };
    case "out-of-stock":
      return {
        label: "Critical",
        className: "bg-[#FFE1E1] text-[#C00000] border border-[#FFC7C7]",
      };
    default:
      return {
        label: "Unknown",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      };
  }
};

const getStockTextClassName = (status: "in-stock" | "low-stock" | "out-of-stock") => {
  if (status === "out-of-stock") return "text-[#C00000]";
  if (status === "low-stock") return "text-[#D8A800]";
  return "text-gray-900";
};

const formatRestockedDate = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStationScope = (value: InventoryItem["stationScope"]) => {
  if (value === "barista") return "Barista";
  if (value === "kitchen") return "Kitchen";
  return "Shared";
};

const getTrackingModeMeta = (value: InventoryItem["trackingMode"]) => {
  if (value === "kitchen_station_auto_deduct") {
    return {
      label: "Kitchen Station",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (value === "bulk_usage_expense") {
    return {
      label: "Bulk Usage",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Direct Auto",
    className: "border-gray-200 bg-white text-gray-700",
  };
};

const renderStatusBadge = (item: InventoryItem) => {
  const normalizedStatus = normalizeStatus(item);
  const statusMeta = getStatusMeta(normalizedStatus);

  return (
    <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
      {statusMeta.label}
    </span>
  );
};

export default function InventoryTable({
  items,
  onRestock,
  onAdjust,
  onEdit,
  onDelete,
  activeSuppliersByItemId = {},
  tableActions,
  loading = false,
}: InventoryTableProps) {
  const [openDropdown, setOpenDropdown] = useState<{
    item: InventoryItem;
    anchor: DOMRect;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!openDropdown) return;

    const closeDropdown = () => setOpenDropdown(null);

    window.addEventListener("resize", closeDropdown);
    window.addEventListener("scroll", closeDropdown, true);

    return () => {
      window.removeEventListener("resize", closeDropdown);
      window.removeEventListener("scroll", closeDropdown, true);
    };
  }, [openDropdown]);

  const openActionMenu = useCallback((
    item: InventoryItem,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    const anchor = event.currentTarget.getBoundingClientRect();

    setOpenDropdown((current) =>
      current?.item.id === item.id ? null : { item, anchor },
    );
  }, []);

  const dropdownStyle = useMemo(() => {
    if (!openDropdown || typeof window === "undefined") return undefined;

    const menuWidth = 288;
    const menuHeight = 316;
    const margin = 16;
    const gap = 8;
    const anchor = openDropdown.anchor;
    const left = Math.min(
      Math.max(margin, anchor.right - menuWidth),
      window.innerWidth - menuWidth - margin,
    );
    const hasRoomBelow = anchor.bottom + gap + menuHeight <= window.innerHeight;
    const top = hasRoomBelow
      ? anchor.bottom + gap
      : Math.max(margin, anchor.top - menuHeight - gap);

    return {
      left,
      top,
      width: menuWidth,
    };
  }, [openDropdown]);

  const renderActionMenu = () => {
    if (!mounted || !openDropdown || !dropdownStyle) return null;

    const item = openDropdown.item;

    return createPortal(
      <>
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
        <div
          className="fixed z-50 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
          style={dropdownStyle}
        >
          <button
            type="button"
            onClick={() => {
              onRestock(item);
              setOpenDropdown(null);
            }}
            className="flex w-full items-center gap-4 px-5 py-3 text-left text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowUpTrayIcon className="h-6 w-6 shrink-0 text-gray-600" />
            <div>
              <div className="text-base font-semibold text-gray-700">Restock</div>
              <div className="text-sm text-gray-500">Add from supplier</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onAdjust(item);
              setOpenDropdown(null);
            }}
            className="flex w-full items-center gap-4 px-5 py-3 text-left text-gray-700 transition hover:bg-gray-50"
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6 shrink-0 text-gray-600" />
            <div>
              <div className="text-base font-semibold text-gray-700">Adjust Stock</div>
              <div className="text-sm text-gray-500">Correction/damaged</div>
            </div>
          </button>

          <div className="my-2 border-t border-gray-200" />

          <button
            type="button"
            onClick={() => {
              onEdit(item);
              setOpenDropdown(null);
            }}
            className="flex w-full items-center gap-4 px-5 py-3 text-left text-gray-700 transition hover:bg-gray-50"
          >
            <PencilIcon className="h-6 w-6 shrink-0 text-gray-600" />
            <div>
              <div className="text-base font-semibold text-gray-700">Edit Details</div>
              <div className="text-sm text-gray-500">Name, category, etc</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onDelete(item);
              setOpenDropdown(null);
            }}
            className="flex w-full items-center gap-4 px-5 py-3 text-left text-red-600 transition hover:bg-red-50"
          >
            <TrashIcon className="h-6 w-6 shrink-0 text-red-600" />
            <div>
              <div className="text-base font-semibold">Delete</div>
              <div className="text-sm text-red-500">Remove item</div>
            </div>
          </button>
        </div>
      </>,
      document.body,
    );
  };

  const columns = useMemo<Array<StandardTableColumn<InventoryItem>>>(
    () => [
      {
        key: "name",
        header: "Item Name",
        render: (item) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{item.name}</p>
            <p className="mt-1 text-xs text-gray-500">{item.category}</p>
          </div>
        ),
        sortValue: (item) => item.name,
        className: "align-top",
      },
      {
        key: "stock",
        header: "Stock",
        render: (item) => {
          const normalizedStatus = normalizeStatus(item);

          return (
            <span className={`font-semibold ${getStockTextClassName(normalizedStatus)}`}>
              {item.currentStock} {item.unit}
            </span>
          );
        },
        sortValue: (item) => item.currentStock,
        className: "align-top",
      },
      {
        key: "reorder",
        header: "Reorder",
        render: (item) => `${item.reorderLevel} ${item.unit}`,
        sortValue: (item) => item.reorderLevel,
        className: "align-top",
      },
      {
        key: "parLevel",
        header: "Par",
        render: (item) => `${item.parLevel || 0} ${item.unit}`,
        sortValue: (item) => item.parLevel || 0,
        className: "align-top",
      },
      {
        key: "supplier",
        header: "Active Supplier",
        render: (item) => (activeSuppliersByItemId[item.id] ?? item.supplier) || "-",
        sortValue: (item) => activeSuppliersByItemId[item.id] ?? item.supplier,
        className: "align-top",
      },
      {
        key: "stationScope",
        header: "Station",
        render: (item) => (
          <span className="inline-flex rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
            {formatStationScope(item.stationScope)}
          </span>
        ),
        sortValue: (item) => item.stationScope,
        className: "align-top",
      },
      {
        key: "trackingMode",
        header: "Tracking",
        render: (item) => {
          const meta = getTrackingModeMeta(item.trackingMode);
          return (
            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
              {meta.label}
            </span>
          );
        },
        sortValue: (item) => item.trackingMode,
        className: "align-top",
      },
      {
        key: "lastRestocked",
        header: "Restocked",
        render: (item) => formatRestockedDate(item.lastRestocked),
        sortValue: (item) => item.lastRestocked,
        className: "align-top",
      },
      {
        key: "status",
        header: "Status",
        render: renderStatusBadge,
        sortValue: (item) => normalizeStatus(item),
        className: "align-top",
      },
      {
        key: "actions",
        header: "Actions",
        isAction: true,
        render: (item) => (
          <div>
            <button
              type="button"
              onClick={(event) => openActionMenu(item, event)}
              className="rounded-lg p-2 transition hover:bg-gray-100"
              aria-label={`Open actions for ${item.name}`}
            >
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        ),
        className: "align-top",
      },
    ],
    [activeSuppliersByItemId, openActionMenu],
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-950">Inventory Master Table</h2>
          <p className="mt-1 text-sm text-gray-500">
            Current stock, reorder levels, suppliers, and inventory actions.
          </p>
        </div>
        {tableActions ? <div className="shrink-0">{tableActions}</div> : null}
      </div>
      <StandardTable
        columns={columns}
        data={items}
        getRowKey={(item) => item.id}
        emptyLabel="No inventory master items match the current filters."
        loading={loading}
        minWidthClassName="min-w-[1240px]"
      />
      {renderActionMenu()}
    </section>
  );
}
