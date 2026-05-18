"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showWarning } from "@/lib/services/errorHandling";
import { shouldShowArchiveReminder } from "@/lib/services/archive/archiveService";
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
  ActivityLogCard,
  ActivityLogTable,
  ActivityLogDetail,
  ActivityLogHeader,
  DateFilterDropdown,
  ActivityLogEmpty,
} from "@/app/components/owner/activitylog";
import { ArchiveBanner } from "@/app/components/owner/archives";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import type { DateFilterType } from "@/app/components/owner/activitylog/DateFilterDropdown";
import type { ViewMode } from "@/app/components/ui/Common/ViewModeToggle";

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

// Pagination constants
const LOGS_PER_PAGE = 50;

const getMasonryColumnCount = () => {
  if (typeof window === "undefined") return 1;

  const width = window.innerWidth;

  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;

  return 1;
};

type DateRange = {
  start?: string;
  end?: string;
};

const getDateRange = (
  dateFilter: DateFilterType,
  customDateRange: { start: string; end: string },
): DateRange => {
  const now = new Date();

  if (dateFilter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (dateFilter === "week") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString() };
  }

  if (dateFilter === "month") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString() };
  }

  if (dateFilter === "custom" && customDateRange.start && customDateRange.end) {
    const start = new Date(customDateRange.start);
    const end = new Date(customDateRange.end);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  return {};
};

const normalizeSearchValue = (value: string) => {
  return value.replace(/[,%]/g, "").trim();
};

const applyActivityLogFilters = (
  query: ActivityLogQuery,
  searchQuery: string,
  filters: Filters,
  dateFilter: DateFilterType,
  customDateRange: { start: string; end: string },
): ActivityLogQuery => {
  let filteredQuery = query;
  const range = getDateRange(dateFilter, customDateRange);

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

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [staffUsers, setStaffUsers] = useState<
    Array<{ id: string; name: string; role: UserRole }>
  >([]);
  const [showArchiveBanner, setShowArchiveBanner] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    severity: undefined,
    category: undefined,
    userRole: undefined,
    action: undefined,
    userId: undefined,
  });

  // Check if archive reminder should be shown
  useEffect(() => {
    setShowArchiveBanner(shouldShowArchiveReminder());
  }, []);

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
          setCurrentPage(0);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const page = reset ? 0 : currentPage + 1;
        const from = page * LOGS_PER_PAGE;
        const to = from + LOGS_PER_PAGE - 1;

        let filteredTotalCount = totalCount;

        if (reset) {
          const countQuery = applyActivityLogFilters(
            supabase
              .from("activity_logs")
              .select("id", { count: "exact", head: true }),
            searchQuery,
            filters,
            dateFilter,
            customDateRange,
          );
          const { count, error: countError } = await countQuery;
          if (countError) throw countError;
          filteredTotalCount = count || 0;
          setTotalCount(filteredTotalCount);
        }

        const dataQuery = applyActivityLogFilters(
          supabase.from("activity_logs").select("*"),
          searchQuery,
          filters,
          dateFilter,
          customDateRange,
        )
          .order("timestamp", { ascending: false })
          .range(from, to);

        const { data, error: fetchError } = await dataQuery;

        if (fetchError) throw fetchError;

        const transformedLogs = ((data || []) as ActivityLogDbRow[]).map(
          transformLog,
        );

        if (reset) {
          setLogs(transformedLogs);
          setCurrentPage(0);
        } else {
          setLogs((prev) => [...prev, ...transformedLogs]);
          setCurrentPage(page);
        }

        setHasMore(
          transformedLogs.length === LOGS_PER_PAGE &&
            from + transformedLogs.length < filteredTotalCount,
        );
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(
          err,
          "Failed to load activity logs",
        );
        setError(errorMessage);
        showError(errorMessage);
        console.error("Error fetching activity logs:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      currentPage,
      customDateRange,
      dateFilter,
      filters,
      searchQuery,
      totalCount,
    ],
  );

  // Load more logs
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      void fetchActivityLogs(false);
    }
  }, [fetchActivityLogs, hasMore, loadingMore]);

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
          "User",
          "Role",
          "Action",
          "Category",
          "Description",
          "Resource",
          "Severity",
          "Notes",
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
  <Worksheet ss:Name="Activity Logs">
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
    } catch (err) {
      showError("Failed to export Excel");
      console.error("Excel export error:", err);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text("Activity Logs Report", 14, 15);

      // Add generation date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 14, 22);
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
            "User",
            "Role",
            "Action",
            "Category",
            "Description",
            "Severity",
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
    } catch (err) {
      showError("Failed to export PDF");
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
    dateFilter,
    customDateRange.start,
    customDateRange.end,
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
              `Critical Activity: ${newLog.userName} - ${newLog.actionDescription}`,
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
  }, [fetchActivityLogs]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const todayLogs = logs.filter(
      (log) => new Date(log.timestamp) >= todayStart,
    );
    const criticalLogs = logs.filter((log) => log.severity === "critical");

    // Count unique users
    const uniqueUsers = new Set(logs.map((log) => log.userId)).size;

    // Top user by activity count
    const userCounts = logs.reduce(
      (acc, log) => {
        acc[log.userName] = (acc[log.userName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];

    // Top action
    const actionCounts = logs.reduce(
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
      totalLogs: logs.length,
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
  }, [logs]);

  // Logs are filtered on the database side, so the loaded rows are already the visible rows.
  const filteredLogs = useMemo(() => logs, [logs]);

  const [masonryColumnCount, setMasonryColumnCount] = useState(1);

  useEffect(() => {
    const updateColumnCount = () => {
      setMasonryColumnCount(getMasonryColumnCount());
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);

    return () => {
      window.removeEventListener("resize", updateColumnCount);
    };
  }, []);

  const masonryColumns = useMemo(() => {
    const columns = Array.from(
      { length: masonryColumnCount },
      () => [] as ActivityLog[],
    );

    filteredLogs.forEach((log, index) => {
      columns[index % masonryColumnCount].push(log);
    });

    return columns;
  }, [filteredLogs, masonryColumnCount]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setDateFilter("all");
    setCustomDateRange({ start: "", end: "" });
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    dateFilter !== "all" ||
    filters.severity ||
    filters.category ||
    filters.userRole ||
    filters.action ||
    filters.userId,
  );

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Header + Stats */}
      <section className="shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <ActivityLogHeader
              title="Activity Logs"
              description="Track all system activities and user actions"
            />

            <div className="flex items-center gap-2 md:gap-3 justify-start lg:justify-end">
              {/* Toggle Stats */}
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center justify-center h-9.5 md:h-10.5 w-9 md:w-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition shrink-0"
                title={showStats ? "Hide Statistics" : "Show Statistics"}
              >
                {showStats ? (
                  <EyeSlashIcon className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                ) : (
                  <EyeIcon className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                )}
              </button>

              {/* Date Filter */}
              <DateFilterDropdown
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
              />

              {/* View Mode Toggle */}
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                showMapView={false}
              />

              {/* Toggle Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 h-9.5 md:h-10.5 px-3 md:px-4 border rounded-xl transition shrink-0 ${
                  showFilters
                    ? "bg-gray-800 border-gray-800 text-white"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <FunnelIcon className="w-4 md:w-5 h-4 md:h-5" />
                <span className="text-xs md:text-sm font-medium hidden sm:inline">
                  Filters
                </span>
                {hasActiveFilters && (
                  <span className="bg-white text-gray-800 text-[10px] md:text-xs rounded-full w-4 md:w-5 h-4 md:h-5 flex items-center justify-center font-semibold">
                    {
                      [
                        filters.severity,
                        filters.category,
                        filters.userRole,
                        filters.action,
                        filters.userId,
                        searchQuery,
                        dateFilter !== "all" ? dateFilter : undefined,
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>

              {/* Export Button with Dropdown */}
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center gap-2 h-9.5 md:h-10.5 px-3 md:px-4 bg-black text-white rounded-xl hover:bg-gray-800 transition shrink-0"
                >
                  <ArrowDownTrayIcon className="w-4 md:w-5 h-4 md:h-5" />
                  <span className="text-xs md:text-sm font-medium hidden sm:inline">
                    Export
                  </span>
                  <ChevronDownIcon className="w-3 md:w-4 h-3 md:h-4" />
                </button>

                {/* Export Dropdown Menu */}
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                    <button
                      onClick={() => {
                        exportToExcel();
                        setShowExportDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 rounded-t-xl transition flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Export as Excel
                    </button>
                    <button
                      onClick={() => {
                        exportToPDF();
                        setShowExportDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 rounded-b-xl transition flex items-center gap-2 border-t border-gray-100"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar - Left aligned on mobile, right aligned on tablet+ */}
          <div className="flex justify-start lg:justify-end lg:hidden">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search activities..."
              width="w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Archive Banner */}
        {showArchiveBanner && (
          <ArchiveBanner onDismiss={() => setShowArchiveBanner(false)} />
        )}

        {/* Stats Cards */}
        {showStats && <ActivityLogStats stats={stats} />}

        {/* Filters Panel */}
        {showFilters && (
          <ActivityLogFilters
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
            hasActiveFilters={!!hasActiveFilters}
            uniqueUsers={staffUsers}
          />
        )}
      </section>

      {/* Activity Logs List (Scrollable) */}
      <section className="flex-1 overflow-y-auto bg-gray-100 px-4 md:px-6 py-4 md:py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-600">Loading activity logs...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Load Activity Logs
              </h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => void fetchActivityLogs(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Data Loaded - Card View */}
        {!loading &&
          !error &&
          viewMode === "card" &&
          filteredLogs.length > 0 && (
            <div className="flex items-start gap-3 md:gap-4">
              {masonryColumns.map((columnLogs, columnIndex) => (
                <div
                  key={`activity-log-column-${columnIndex}`}
                  className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4"
                >
                  {columnLogs.map((log) => (
                    <ActivityLogCard
                      key={log.id}
                      log={log}
                      onClick={setSelectedLog}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

        {/* Data Loaded - Table View */}
        {!loading && !error && viewMode === "table" && (
          <div className="h-full">
            <ActivityLogTable logs={filteredLogs} onLogClick={setSelectedLog} />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredLogs.length === 0 && (
          <ActivityLogEmpty
            hasFilters={!!hasActiveFilters}
            onClearFilters={clearFilters}
          />
        )}

        {/* Pagination Info & Load More */}
        {!loading && !error && logs.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-4 pb-6">
            {/* Pagination Info */}
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold text-gray-900">{logs.length}</span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900">{totalCount}</span>{" "}
              logs
            </div>

            {/* Load More Button */}
            {hasMore && logs.length < totalCount && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                      +{LOGS_PER_PAGE}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* All Loaded Message */}
            {!hasMore && logs.length > 0 && logs.length >= totalCount && (
              <p className="text-sm text-gray-500 italic">All logs loaded</p>
            )}
          </div>
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