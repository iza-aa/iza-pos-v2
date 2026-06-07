"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EllipsisVerticalIcon,
  QrCodeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";
import { showError } from "@/lib/services/errorHandling";
import QRCodeModal from "./QRCodeModal";

interface Table {
  id: string;
  table_number: string;
  floor_id?: string | null;
  capacity: number;
  shape: string | null;
  status: string | null;
  position_x?: number | null;
  position_y?: number | null;
  qr_code_url?: string | null;
  qr_code_image?: string | null;
  qr_generated_at?: string | null;
  current_order_id?: string | null;
  occupied_at?: string | null;
  occupied_by_customer?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface TableListProps {
  floorId: string;
  onTableEdit: (table: Table) => void;
  refreshKey?: number;
}

export default function TableList({
  floorId,
  onTableEdit,
  refreshKey = 0,
}: TableListProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/manager/tables?floor_id=${encodeURIComponent(floorId)}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch tables.");
      }

      const activeTables = (result.data ?? []).filter(
        (table: Table) => table.is_active !== false,
      );

      setTables(activeTables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [floorId]);

  useEffect(() => {
    if (!floorId) return;
    void fetchTables();
  }, [floorId, refreshKey, fetchTables]);

  useEffect(() => {
    if (!openActionMenuId) return;

    const closeMenu = () => setOpenActionMenuId(null);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [openActionMenuId]);

  const handleShowQR = (table: Table) => {
    setQrTable(table);
    setIsQRModalOpen(true);
  };

  const handleCloseQR = () => {
    setQrTable(null);
    setIsQRModalOpen(false);
  };

  const handleDelete = useCallback(async (table: Table) => {
    if (table.current_order_id) {
      showError(
        `Table ${table.table_number} cannot be deleted because it has an active order.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete Table ${table.table_number}?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/manager/tables/${table.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || "Failed to delete table.");
      }

      setTables((previousTables) =>
        previousTables.filter((item) => item.id !== table.id),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete table.";

      console.error("Error deleting table:", error);
      showError(message);
    }
  }, []);

  const columns = useMemo<Array<StandardTableColumn<Table>>>(
    () => [
      {
        key: "table",
        header: "Table",
        render: (table) => (
          <div className="font-medium text-gray-900">{table.table_number}</div>
        ),
        sortValue: (table) => table.table_number,
      },
      {
        key: "capacity",
        header: "Capacity",
        render: (table) => table.capacity,
        sortValue: (table) => table.capacity,
      },
      {
        key: "shape",
        header: "Shape",
        render: (table) => (
          <span className="capitalize">{table.shape ?? "-"}</span>
        ),
        sortValue: (table) => table.shape ?? "",
      },
      {
        key: "qr",
        header: "QR Code",
        render: (table) => {
          const hasQR = Boolean(table.qr_code_url || table.qr_code_image);

          return hasQR ? (
            <button
              type="button"
              onClick={() => handleShowQR(table)}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <QrCodeIcon className="h-4 w-4" />
              View
            </button>
          ) : (
            <span className="text-sm text-gray-400">Not generated</span>
          );
        },
        sortValue: (table) => Boolean(table.qr_code_url || table.qr_code_image),
      },
      {
        key: "actions",
        header: "Actions",
        isAction: true,
        headerClassName: "text-right",
        className: "text-right",
        render: (table) => {
          const isBusy = Boolean(table.current_order_id);

          return (
            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setOpenActionMenuId((current) =>
                    current === table.id ? null : table.id,
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label={`Open actions for table ${table.table_number}`}
              >
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>

              {openActionMenuId === table.id ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-20 cursor-default"
                    aria-label="Close table action menu"
                    onClick={() => setOpenActionMenuId(null)}
                  />
                  <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-left shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionMenuId(null);
                        onTableEdit(table);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionMenuId(null);
                        handleShowQR(table);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <QrCodeIcon className="h-4 w-4" />
                      QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionMenuId(null);
                        void handleDelete(table);
                      }}
                      disabled={isBusy}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold transition ${
                        isBusy
                          ? "cursor-not-allowed text-gray-400"
                          : "text-red-700 hover:bg-red-50"
                      }`}
                      title={
                        isBusy
                          ? "Cannot delete a table with an active order"
                          : `Delete table ${table.table_number}`
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [handleDelete, onTableEdit, openActionMenuId],
  );

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <StandardTable
          columns={columns}
          data={tables}
          getRowKey={(table) => table.id}
          emptyLabel={
            loading ? "Loading tables..." : "No tables on this floor yet."
          }
          loading={loading}
          minWidthClassName="min-w-180"
        />
      </div>

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={handleCloseQR}
        table={qrTable}
      />
    </>
  );
}
