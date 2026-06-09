"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess, showWarning } from "@/lib/services/errorHandling";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ActivityLog,
  ActivityLogFilters as Filters,
  ActivityAction,
  ActivityCategory,
  SeverityLevel,
  UserRole,
} from "@/lib/types";
import {
  ActivityLogStats,
  ActivityLogFilters,
  ActivityLogTable,
  ActivityLogDetail,
  ActivityLogEmpty,
} from "@/app/components/owner/activitylog";
import GenerateRecommendationPanel from "@/app/components/owner/business-dashboard/ai/GenerateRecommendationPanel";
import { SearchBar } from "@/app/components/ui";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "@/app/components/shared/DateRangeFilter";
import { ExportButton } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";

type ActivityLogDbRow = {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_email: string | null;
  action: string;
  action_category: string;
  action_description: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  previous_value: ActivityLog["previousValue"];
  new_value: ActivityLog["newValue"];
  changes_summary: ActivityLog["changesSummary"] | null;
  ip_address: string | null;
  device_info: string | null;
  session_id: string | null;
  location: ActivityLog["location"];
  severity: string;
  tags: string[] | null;
  notes: string | null;
  is_reversible: boolean;
  related_log_ids: ActivityLog["relatedLogIds"];
};

type StaffUserRow = {
  id: string;
  name: string;
  role: string;
};

type ActivityLogQuery = ReturnType<ReturnType<typeof supabase.from>["select"]>;

type UsageTransactionSummaryRow = {
  id: string;
  order_id: string | null;
};

type UsageDetailSummaryRow = {
  usage_transaction_id: string;
  ingredient_name: string | null;
  quantity_used: number | string | null;
  unit: string | null;
  previous_stock: number | string | null;
  new_stock: number | string | null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
};

const normalizeRole = (role: string): UserRole => {
  if (role === "owner" || role === "manager" || role === "staff") {
    return role as UserRole;
  }

  return "staff" as UserRole;
};

// Transform database log (snake_case) to TypeScript interface (camelCase)
function transformLog(dbLog: ActivityLogDbRow): ActivityLog {
  return {
    id: dbLog.id,
    timestamp: dbLog.timestamp,
    userId: dbLog.user_id,
    userName: dbLog.user_name,
    userRole: normalizeRole(dbLog.user_role),
    userEmail: dbLog.user_email ?? undefined,
    action: dbLog.action as ActivityAction,
    actionCategory: dbLog.action_category as ActivityCategory,
    actionDescription: dbLog.action_description,
    resourceType: dbLog.resource_type,
    resourceId: dbLog.resource_id,
    resourceName: dbLog.resource_name,
    previousValue: dbLog.previous_value,
    newValue: dbLog.new_value,
    changesSummary: dbLog.changes_summary || [],
    ipAddress: dbLog.ip_address || "",
    deviceInfo: dbLog.device_info || "",
    sessionId: dbLog.session_id || "",
    location: dbLog.location,
    severity: dbLog.severity as SeverityLevel,
    tags: dbLog.tags || [],
    notes: dbLog.notes ?? undefined,
    isReversible: dbLog.is_reversible,
    relatedLogIds: dbLog.related_log_ids,
  };
}

const formatUsageChange = (detail: UsageDetailSummaryRow) => {
  const quantity = Number(detail.quantity_used || 0);
  const unit = detail.unit ? ` ${detail.unit}` : "";
  const name = detail.ingredient_name || "Inventory item";
  const previous = detail.previous_stock === null || detail.previous_stock === undefined ? null : Number(detail.previous_stock);
  const next = detail.new_stock === null || detail.new_stock === undefined ? null : Number(detail.new_stock);
  const stockText = previous === null || next === null ? "" : ` (${previous} -> ${next}${unit})`;

  return `${name} reduced by ${quantity}${unit}${stockText}`;
};

async function enrichOrderInventoryChanges(logs: ActivityLog[]) {
  const orderIds = Array.from(
    new Set(
      logs
        .filter(
          (log) =>
            log.action === "CREATE" &&
            log.actionCategory === "SALES" &&
            log.resourceType.toLowerCase() === "order" &&
            log.resourceId &&
            !(log.changesSummary || []).length,
        )
        .map((log) => log.resourceId as string),
    ),
  );

  if (!orderIds.length) return logs;

  const { data: transactions, error: transactionError } = await supabase
    .from("usage_transactions")
    .select("id, order_id")
    .in("order_id", orderIds);

  if (transactionError) return logs;

  const transactionRows = (transactions || []) as UsageTransactionSummaryRow[];
  const transactionIds = transactionRows.map((transaction) => transaction.id);
  if (!transactionIds.length) return logs;

  const { data: details, error: detailError } = await supabase
    .from("usage_transaction_details")
    .select("usage_transaction_id, ingredient_name, quantity_used, unit, previous_stock, new_stock")
    .in("usage_transaction_id", transactionIds);

  if (detailError) return logs;

  const orderIdByTransactionId = new Map(
    transactionRows.map((transaction) => [transaction.id, transaction.order_id]),
  );
  const summariesByOrderId = new Map<string, string[]>();

  ((details || []) as UsageDetailSummaryRow[]).forEach((detail) => {
    const orderId = orderIdByTransactionId.get(detail.usage_transaction_id);
    if (!orderId) return;
    summariesByOrderId.set(orderId, [...(summariesByOrderId.get(orderId) || []), formatUsageChange(detail)]);
  });

  return logs.map((log) => {
    if ((log.changesSummary || []).length || !log.resourceId) return log;
    const changesSummary = summariesByOrderId.get(log.resourceId);
    return changesSummary?.length ? { ...log, changesSummary } : log;
  });
}

// Pagination constants
const LOGS_PER_PAGE = 500;
const ACTIVITY_LOG_FETCH_BATCH_SIZE = 1000;

const getDateRangeBounds = (dateRange: DateRangeValue) => {
  const start = new Date(`${dateRange.startDate}T00:00:00`);
  const end = new Date(`${dateRange.endDate}T23:59:59.999`);

  return { start: start.toISOString(), end: end.toISOString() };
};

const normalizeSearchValue = (value: string) => {
  return value.replace(/[,%]/g, "").trim();
};

const applyActivityLogFilters = (
  query: ActivityLogQuery,
  searchQuery: string,
  filters: Filters,
  dateRange: DateRangeValue,
): ActivityLogQuery => {
  let filteredQuery = query;
  const range = getDateRangeBounds(dateRange);

  if (range.start) filteredQuery = filteredQuery.gte("timestamp", range.start);
  if (range.end) filteredQuery = filteredQuery.lte("timestamp", range.end);

  if (filters.severity)
    filteredQuery = filteredQuery.eq("severity", filters.severity);
  if (filters.category)
    filteredQuery = filteredQuery.eq("action_category", filters.category);
  if (filters.userRole)
    filteredQuery = filteredQuery.eq("user_role", filters.userRole);
  if (filters.action)
    filteredQuery = filteredQuery.eq("action", filters.action);
  if (filters.userId)
    filteredQuery = filteredQuery.eq("user_id", filters.userId);

  const normalizedSearch = normalizeSearchValue(searchQuery);
  if (normalizedSearch) {
    const search = `%${normalizedSearch}%`;
    filteredQuery = filteredQuery.or(
      `user_name.ilike.${search},action_description.ilike.${search},resource_name.ilike.${search},resource_type.ilike.${search},notes.ilike.${search}`,
    );
  }

  return filteredQuery;
};

const fetchAllFilteredActivityLogs = async (
  searchQuery: string,
  filters: Filters,
  dateRange: DateRangeValue,
  totalCount: number,
) => {
  const rows: ActivityLogDbRow[] = [];

  for (let from = 0; from < totalCount; from += ACTIVITY_LOG_FETCH_BATCH_SIZE) {
    const to = Math.min(
      from + ACTIVITY_LOG_FETCH_BATCH_SIZE - 1,
      totalCount - 1,
    );

    const query = applyActivityLogFilters(
      supabase.from("activity_logs").select("*"),
      searchQuery,
      filters,
      dateRange,
    )
      .order("timestamp", { ascending: false })
      .range(from, to);

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data || []) as ActivityLogDbRow[];
    rows.push(...batch);

    if (batch.length < ACTIVITY_LOG_FETCH_BATCH_SIZE) break;
  }

  return rows;
};

export default function ActivityLogPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [insightLogs, setInsightLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    getDefaultDateRange(),
  );
  const [staffUsers, setStaffUsers] = useState<
    Array<{ id: string; name: string; role: UserRole }>
  >([]);

  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    severity: undefined,
    category: undefined,
    userRole: undefined,
    action: undefined,
    userId: undefined,
  });

  // Fetch staff users from database
  const fetchStaffUsers = useCallback(async () => {
    try {
      const { data, error: staffError } = await supabase
        .from("staff")
        .select("id, name, role")
        .order("name");

      if (staffError) throw staffError;

      const users = ((data || []) as StaffUserRow[]).map((staff) => ({
        id: staff.id,
        name: staff.name,
        role: normalizeRole(staff.role),
      }));

      setStaffUsers(users);
    } catch (err) {
      console.error("Error fetching staff users:", err);
    }
  }, []);

  // Fetch activity logs from Supabase using the active filters on the database side.
  // This keeps pagination, count, export data, and visible rows consistent.
  const fetchActivityLogs = useCallback(
    async (reset = true) => {
      try {
        if (reset) {
          setLoading(true);
        }
        setError(null);

        const from = 0;
        const to = from + LOGS_PER_PAGE - 1;

        const countQuery = applyActivityLogFilters(
          supabase
            .from("activity_logs")
            .select("id", { count: "exact", head: true }),
          searchQuery,
          filters,
          dateRange,
        );
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        const nextTotalCount = count || 0;
        setTotalCount(nextTotalCount);

        const dataQuery = applyActivityLogFilters(
          supabase.from("activity_logs").select("*"),
          searchQuery,
          filters,
          dateRange,
        )
          .order("timestamp", { ascending: false })
          .range(from, to);

        const { data, error: fetchError } = await dataQuery;

        if (fetchError) throw fetchError;

        const transformedLogs = ((data || []) as ActivityLogDbRow[]).map(
          transformLog,
        );
        const enrichedLogs = await enrichOrderInventoryChanges(transformedLogs);

        setLogs(enrichedLogs);

        const insightRows = await fetchAllFilteredActivityLogs(
          searchQuery,
          filters,
          dateRange,
          nextTotalCount,
        );
        const transformedInsightLogs = insightRows.map(transformLog);
        const enrichedInsightLogs = await enrichOrderInventoryChanges(
          transformedInsightLogs,
        );
        setInsightLogs(enrichedInsightLogs);
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(
          err,
          t("owner.activity.failedLoad"),
        );
        setError(errorMessage);
        showError(errorMessage);
        console.error("Error fetching activity logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      dateRange,
      filters,
      searchQuery,
      t,
    ],
  );

  const escapeExcelValue = (value: unknown) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  const buildExcelWorksheet = (rows: Array<Array<string | number>>) => {
    return rows
      .map((row) => {
        const cells = row
          .map(
            (cell) =>
              `<Cell><Data ss:Type="String">${escapeExcelValue(cell)}</Data></Cell>`,
          )
          .join("");

        return `<Row>${cells}</Row>`;
      })
      .join("");
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const rows: Array<Array<string | number>> = [
        [
          "Timestamp",
          t("owner.activity.user"),
          "Role",
          t("owner.activity.actionType"),
          t("owner.activity.category"),
          t("owner.activity.description"),
          t("owner.activity.resource"),
          t("owner.activity.severity"),
          t("owner.activity.notes"),
        ],
        ...filteredLogs.map((log) => [
          new Date(log.timestamp).toLocaleString("id-ID"),
          log.userName,
          log.userRole,
          log.action,
          log.actionCategory,
          log.actionDescription,
          log.resourceName || log.resourceType || "-",
          log.severity,
          log.notes || "-",
        ]),
      ];

      const excelContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" />
      <Interior ss:Color="#E5E7EB" ss:Pattern="Solid" />
    </Style>
  </Styles>
  <Worksheet ss:Name="${t('owner.activity.table')}">
    <Table>
      ${buildExcelWorksheet(rows)}
    </Table>
  </Worksheet>
</Workbook>`;

      const blob = new Blob([excelContent], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `activity-logs-${new Date().toISOString().split("T")[0]}.xls`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess(t("owner.activity.exportExcelSuccess"));
    } catch (err) {
      showError(t("owner.activity.exportExcelError"));
      console.error("Excel export error:", err);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text(t("owner.activity.reportTitle"), 14, 15);

      // Add generation date
      doc.setFontSize(10);
      doc.text(t("owner.activity.generated", { value: new Date().toLocaleString("id-ID") }), 14, 22);
      doc.text(`Total Records: ${filteredLogs.length}`, 14, 28);

      // Prepare table data
      const tableData = filteredLogs.map((log) => [
        new Date(log.timestamp).toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        log.userName,
        log.userRole,
        log.action,
        log.actionCategory,
        log.actionDescription.length > 40
          ? log.actionDescription.substring(0, 37) + "..."
          : log.actionDescription,
        log.severity,
      ]);

      // Generate table
      autoTable(doc, {
        head: [
          [
            "Timestamp",
            t("owner.activity.user"),
            "Role",
            t("owner.activity.actionType"),
            t("owner.activity.category"),
            t("owner.activity.description"),
            t("owner.activity.severity"),
          ],
        ],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
      });

      // Save PDF
      const filename = `activity-logs-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
      showSuccess(t("owner.activity.exportPdfSuccess"));
    } catch (err) {
      showError(t("owner.activity.exportPdfError"));
      console.error("PDF export error:", err);
    }
  };

  // Fetch staff users on mount
  useEffect(() => {
    void fetchStaffUsers();
  }, [fetchStaffUsers]);

  // Fetch logs whenever server-side filters change. Search is lightly debounced.
  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void fetchActivityLogs(true);
      },
      searchQuery ? 300 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [
    searchQuery,
    filters,
    dateRange,
    fetchActivityLogs,
  ]);

  // Real-time subscription for activity logs
  useEffect(() => {
    const channel = supabase
      .channel("activity_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        (payload) => {
          const newLog = transformLog(payload.new as ActivityLogDbRow);

          // Keep the visible list and pagination count consistent with active filters.
          void fetchActivityLogs(true);

          // Show toast notification for critical events
          if (newLog.severity === "critical") {
            showWarning(
              t("owner.activity.criticalWarning", { user: newLog.userName, action: newLog.actionDescription }),
              5000,
            );
          }
        },
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchActivityLogs, t]);

  // Calculate stats
  const stats = useMemo(() => {
    const sourceLogs = insightLogs;
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const todayLogs = sourceLogs.filter(
      (log) => new Date(log.timestamp) >= todayStart,
    );
    const criticalLogs = sourceLogs.filter((log) => log.severity === "critical");

    // Count unique users
    const uniqueUsers = new Set(sourceLogs.map((log) => log.userId)).size;

    // Top user by activity count
    const userCounts = sourceLogs.reduce(
      (acc, log) => {
        acc[log.userName] = (acc[log.userName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];

    // Top action
    const actionCounts = sourceLogs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topAction = Object.entries(actionCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];

    return {
      totalLogs: totalCount,
      todayLogs: todayLogs.length,
      criticalActions: criticalLogs.length,
      uniqueUsers,
      topUser: topUser
        ? { name: topUser[0], count: topUser[1] }
        : { name: "N/A", count: 0 },
      topAction: topAction
        ? { name: topAction[0], count: topAction[1] }
        : { name: "N/A", count: 0 },
    };
  }, [insightLogs, totalCount]);

  // Logs are filtered on the database side, so the loaded rows are already the visible rows.
  const filteredLogs = useMemo(() => logs, [logs]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setDateRange(getDefaultDateRange());
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    filters.severity ||
    filters.category ||
    filters.userRole ||
    filters.action ||
    filters.userId,
  );

  return (
    <div className="min-h-[calc(100vh-55px)] bg-gray-100">
      <section className="space-y-4 p-4">
        <GenerateRecommendationPanel
          category="activity_log"
          period={dateRange}
        />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* Stats Cards */}
        <ActivityLogStats stats={stats} />
      </section>

      {/* Activity Logs List (Scrollable) */}
      <section className="space-y-4 px-4 pb-4">
        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("owner.activity.failedLoad")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => void fetchActivityLogs(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
              >
                {t("owner.activity.tryAgain")}
              </button>
            </div>
          </div>
        )}

        {/* Data Loaded - Table View */}
        {!error && (loading || filteredLogs.length > 0) && (
          <>
            <ActivityLogTable
              logs={filteredLogs}
              onLogClick={setSelectedLog}
              loading={loading}
              actions={
                <>

                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
                      showFilters
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    
                    <FunnelIcon className="h-5 w-5" />
                    
                    <span>{t("owner.activity.filters")}</span>
                    {hasActiveFilters ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-gray-900">
                        {
                          [
                            filters.severity,
                            filters.category,
                            filters.userRole,
                            filters.action,
                            filters.userId,
                            searchQuery,
                          ].filter(Boolean).length
                        }
                      </span>
                    ) : null}
                  </button>
                  <ExportButton
                    items={[
                      { id: "excel", label: t("owner.activity.exportExcel"), onClick: exportToExcel },
                      { id: "pdf", label: t("owner.activity.exportPdf"), onClick: exportToPDF },
                    ]}
                  />
                                    <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t("owner.activity.search")}
                    width="w-full sm:w-72"
                  />
                </>
              }
              filterPanel={
                showFilters ? (
                  <ActivityLogFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    onClearFilters={clearFilters}
                    hasActiveFilters={!!hasActiveFilters}
                    uniqueUsers={staffUsers}
                  />
                ) : null
              }
            />
          </>
        )}

        {/* Empty State */}
        {!loading && !error && filteredLogs.length === 0 && (
          <>
            <ActivityLogEmpty
              hasFilters={!!hasActiveFilters}
              onClearFilters={clearFilters}
            />
          </>
        )}
      </section>

      {/* Detail Modal */}
      <ActivityLogDetail
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
