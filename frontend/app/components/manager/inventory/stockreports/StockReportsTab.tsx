"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "@/app/components/shared/DateRangeFilter";
import { ExportButton } from "@/app/components/shared";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import { getJakartaDateRangeForQuery } from "@/lib/utils/date";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { downloadXlsxWorkbook } from "@/lib/utils/exportExcel";

type ReportStatus = "pending" | "rejected" | "resolved";
type ReportType = "low_stock" | "out_of_stock" | "waste_damaged" | "restock_request" | "testing_usage";

type StockReport = {
  id: string;
  material_name: string;
  report_type: ReportType;
  quantity_note: string | null;
  description: string | null;
  station_scope?: "barista" | "kitchen" | "shared" | null;
  status: ReportStatus;
  reported_by_name: string | null;
  reported_by_role: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

const reportTypeLabel = (type: ReportType) => {
  if (type === "low_stock") return "Low Stock";
  if (type === "out_of_stock") return "Out of Stock";
  if (type === "waste_damaged") return "Waste/Damaged";
  if (type === "testing_usage") return "Testing Usage";
  return "Restock Request";
};

const stationScopeLabel = (value?: StockReport["station_scope"]) => {
  if (value === "barista") return "Barista";
  if (value === "kitchen") return "Kitchen";
  return "Shared";
};

const getExportDate = () => new Date().toISOString().slice(0, 10);

const statusClassName = (status: ReportStatus) => {
  if (status === "resolved") return "border-green-200 bg-green-50 text-green-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const statusLabel = (status: ReportStatus | "all") => {
  if (status === "all") return "All";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function StockReportsTab() {
  const [reports, setReports] = useState<StockReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [stockReportsAvailable, setStockReportsAvailable] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const queryRange = getJakartaDateRangeForQuery(dateRange.startDate, dateRange.endDate);
      const query = supabase
        .from("stock_reports")
        .select(
          "id,material_name,report_type,quantity_note,description,station_scope,status,reported_by_name,reported_by_role,reviewed_by_name,reviewed_at,review_note,created_at",
        )
        .gte("created_at", queryRange.start)
        .lte("created_at", queryRange.end)
        .order("created_at", { ascending: false });

      let { data, error } = await query;
      if (error && (error.message.toLowerCase().includes("station_scope") || error.message.toLowerCase().includes("schema cache"))) {
        const fallback = await supabase
          .from("stock_reports")
          .select(
            "id,material_name,report_type,quantity_note,description,status,reported_by_name,reported_by_role,reviewed_by_name,reviewed_at,review_note,created_at",
          )
          .gte("created_at", queryRange.start)
          .lte("created_at", queryRange.end)
          .order("created_at", { ascending: false });

        data = (fallback.data ?? []).map((report) => ({
          ...report,
          station_scope: "shared",
        }));
        error = fallback.error;
      }

      if (error) throw error;

      setStockReportsAvailable(true);
      setReports((data ?? []) as StockReport[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load stock reports.";

      if (
        message.toLowerCase().includes("stock_reports") ||
        message.toLowerCase().includes("schema cache")
      ) {
        setStockReportsAvailable(false);
        setReports([]);
      } else {
        showError(message);
      }
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!stockReportsAvailable) return;

    const channel = supabase
      .channel("manager-stock-reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_reports" },
        () => {
          void loadReports();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadReports, stockReportsAvailable]);

  const updateStatus = useCallback(async (report: StockReport, status: ReportStatus) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    setUpdatingId(report.id);

    try {
      const { error } = await supabase
        .from("stock_reports")
        .update({
          status,
          reviewed_by: currentUser.id,
          reviewed_by_name: currentUser.name,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (error) throw error;

      showSuccess(`Report marked as ${status}.`);
      await loadReports();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to update report.");
    } finally {
      setUpdatingId("");
    }
  }, [loadReports]);

  const columns = useMemo<Array<StandardTableColumn<StockReport>>>(
    () => [
      {
        key: "material",
        header: "Item Name",
        render: (report) => (
          <div>
            <p className="font-semibold text-gray-900">{report.material_name}</p>
            <p className="mt-1 whitespace-normal wrap-break-word text-xs text-gray-500">{report.quantity_note || "-"}</p>
          </div>
        ),
        sortValue: (report) => report.material_name,
      },
      {
        key: "type",
        header: "Type",
        render: (report) => reportTypeLabel(report.report_type),
        sortValue: (report) => report.report_type,
      },
      {
        key: "station",
        header: "Station",
        render: (report) => stationScopeLabel(report.station_scope),
        sortValue: (report) => report.station_scope || "shared",
      },
      {
        key: "notes",
        header: "Notes",
        render: (report) => (
          <div className="max-w-xs">
            <p className="whitespace-normal wrap-break-word text-sm text-gray-700">{report.description || "-"}</p>
          </div>
        ),
        sortValue: (report) => report.description || "",
      },
      {
        key: "reportedBy",
        header: "Reported By",
        render: (report) => (
          <div>
            <p className="font-semibold text-gray-900">{report.reported_by_name || "-"}</p>
            <p className="mt-1 text-xs capitalize text-gray-500">{report.reported_by_role || "-"}</p>
          </div>
        ),
        sortValue: (report) => report.reported_by_name || "",
      },
      {
        key: "status",
        header: "Status",
        render: (report) => (
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName(report.status)}`}>
            {statusLabel(report.status)}
          </span>
        ),
        sortValue: (report) => report.status,
      },
      {
        key: "createdAt",
        header: "Created",
        render: (report) => formatDate(report.created_at),
        sortValue: (report) => report.created_at,
      },
      {
        key: "actions",
        header: "Actions",
        isAction: true,
        render: (report) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void updateStatus(report, "rejected")}
              disabled={updatingId === report.id || report.status !== "pending"}
              className="rounded-lg border border-red-200 p-2 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Reject report"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void updateStatus(report, "resolved")}
              disabled={updatingId === report.id || report.status === "resolved"}
              className="rounded-lg border border-emerald-200 p-2 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Resolve report"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [updateStatus, updatingId],
  );

  const exportStockReports = async () => {
    try {
      await downloadXlsxWorkbook(
        `inventory-stock-reports-${dateRange.startDate}-to-${dateRange.endDate}-${getExportDate()}.xlsx`,
        [
          {
            name: "Stock Reports",
            rows: [
              [
                "Created At",
                "Item Name",
                "Report Type",
                "Station",
                "Quantity Note",
                "Description",
                "Status",
                "Reported By",
                "Reported Role",
                "Reviewed By",
                "Reviewed At",
                "Review Note",
              ],
              ...reports.map((report) => [
                report.created_at,
                report.material_name,
                reportTypeLabel(report.report_type),
                stationScopeLabel(report.station_scope),
                report.quantity_note || "",
                report.description || "",
                statusLabel(report.status),
                report.reported_by_name || "",
                report.reported_by_role || "",
                report.reviewed_by_name || "",
                report.reviewed_at || "",
                report.review_note || "",
              ]),
            ],
          },
        ],
      );
      showSuccess("Stock reports exported.");
    } catch (error) {
      console.error("Stock reports export error:", error);
      showError("Failed to export stock reports.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <section className="shrink-0 px-6 pt-6">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-950">Staff Stock Reports Table</h2>
              <p className="mt-1 text-sm text-gray-500">
                Staff-submitted low stock, out of stock, waste, and restock request reports.
              </p>
            </div>
            <ExportButton
              items={[
                {
                  id: "stock-reports",
                  label: "Download Stock Reports Excel",
                  onClick: () => void exportStockReports(),
                },
              ]}
            />
          </div>

          {!stockReportsAvailable ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              Stock reports table is not ready yet. Run the stock reports SQL before reviewing staff reports.
            </div>
          ) : null}
          <StandardTable
            columns={columns}
            data={reports}
            getRowKey={(report) => report.id}
            emptyLabel={loading ? "Loading stock reports..." : "No stock reports found."}
            loading={loading}
            minWidthClassName="min-w-[1080px]"
          />
        </div>
      </section>
    </div>
  );
}
