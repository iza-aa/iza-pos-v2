"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";

type SortDirection = "asc" | "desc";
type SortValue = string | number | boolean | Date | null | undefined;

export type StandardTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => SortValue;
  className?: string;
  headerClassName?: string;
  isAction?: boolean;
};

type StandardTableMobileCard<T> = {
  eyebrow?: (row: T, index: number) => ReactNode;
  title?: (row: T, index: number) => ReactNode;
  subtitle?: (row: T, index: number) => ReactNode;
  status?: (row: T, index: number) => ReactNode;
  rows?: Array<{
    key: string;
    label: string;
    render: (row: T, index: number) => ReactNode;
    initiallyVisible?: boolean;
  }>;
  actions?: (row: T, index: number) => ReactNode;
  initiallyVisibleRows?: number;
};

type StandardTableProps<T> = {
  columns: Array<StandardTableColumn<T>>;
  data: T[];
  getRowKey: (row: T, index: number) => string;
  emptyLabel: string;
  loading?: boolean;
  skeletonRows?: number;
  minWidthClassName?: string;
  pagination?: boolean;
  horizontalScroll?: boolean;
  preserveDataOrder?: boolean;
  mobileCard?: StandardTableMobileCard<T>;
};

const normalizeSortValue = (value: SortValue) => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "boolean") return value ? 1 : 0;
  return value ?? "";
};

function compareValues(left: SortValue, right: SortValue) {
  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);

  if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
    return normalizedLeft - normalizedRight;
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

const ROWS_PER_PAGE_OPTIONS = ["10", "25", "50", "100"];
const RECENT_SORT_KEYS = ["createdAt", "created_at", "timestamp", "time", "date"];

export default function StandardTable<T>({
  columns,
  data,
  getRowKey,
  emptyLabel,
  loading = false,
  skeletonRows = 5,
  minWidthClassName = "min-w-190",
  pagination = true,
  horizontalScroll = true,
  preserveDataOrder = false,
  mobileCard,
}: StandardTableProps<T>) {
  const inferredLoading = loading || emptyLabel.trim().toLowerCase().startsWith("loading");
  const defaultSortColumn =
    preserveDataOrder
      ? undefined
      : columns.find(
          (column) =>
            !column.isAction &&
            RECENT_SORT_KEYS.some((key) => column.key.toLowerCase().includes(key.toLowerCase())),
        ) ?? columns.find((column) => !column.isAction);
  const [sortKey, setSortKey] = useState(defaultSortColumn?.key ?? "");
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    defaultSortColumn ? "desc" : "asc",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPageInput, setRowsPerPageInput] = useState("10");
  const [rowsPerPageOpen, setRowsPerPageOpen] = useState(false);
  const [expandedMobileRows, setExpandedMobileRows] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  const sortedData = useMemo(() => {
    const activeColumn = columns.find((column) => column.key === sortKey);
    if (!activeColumn || activeColumn.isAction) return data;

    const getValue = activeColumn.sortValue ?? activeColumn.render;

    return [...data].sort((left, right) => {
      const result = compareValues(getValue(left) as SortValue, getValue(right) as SortValue);
      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, data, sortDirection, sortKey]);

  const totalRows = inferredLoading ? 0 : sortedData.length;
  const mobileRowsPerPage = 5;
  const desktopRowsPerPage = Math.max(
    1,
    Math.min(totalRows || 10, Number(rowsPerPageInput) || 10),
  );
  const rowsPerPage = isMobile ? mobileRowsPerPage : desktopRowsPerPage;
  const showPagination = pagination && totalRows > rowsPerPage;
  const totalPages = showPagination
    ? Math.max(1, Math.ceil(totalRows / rowsPerPage))
    : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = showPagination
    ? sortedData.slice(
        (safeCurrentPage - 1) * rowsPerPage,
        safeCurrentPage * rowsPerPage,
      )
    : sortedData;
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4));

    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [safeCurrentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [isMobile, rowsPerPageInput, sortDirection, sortKey, totalRows]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateMobileState = () => setIsMobile(mediaQuery.matches);

    updateMobileState();
    mediaQuery.addEventListener("change", updateMobileState);

    return () => mediaQuery.removeEventListener("change", updateMobileState);
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setExpandedMobileRows({});
  }, [sortDirection, sortKey, totalRows]);

  const toggleSort = (column: StandardTableColumn<T>) => {
    if (column.isAction) return;

    if (sortKey === column.key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(column.key);
    setSortDirection("asc");
  };

  const handleRowsPerPageModeChange = (value: string) => {
    setRowsPerPageInput(value);
    setRowsPerPageOpen(false);
  };

  const dataColumns = columns.filter((column) => !column.isAction);
  const actionColumn = columns.find((column) => column.isAction);

  const renderMobileCard = (row: T, rowIndex: number) => {
    const rowKey = getRowKey(
      row,
      showPagination ? (safeCurrentPage - 1) * rowsPerPage + rowIndex : rowIndex,
    );
    const expanded = Boolean(expandedMobileRows[rowKey]);
    const titleColumn = dataColumns[0];
    const subtitleColumn = dataColumns[1];
    const autoRows = dataColumns.slice(1).map((column) => ({
      key: column.key,
      label: column.header,
      render: (record: T) => column.render(record),
      initiallyVisible: false,
    }));
    const configuredRows = mobileCard?.rows ?? autoRows;
    const visibleLimit = mobileCard?.initiallyVisibleRows ?? 4;
    const visibleRows = expanded
      ? configuredRows
      : configuredRows.filter((item) => item.initiallyVisible).length > 0
        ? configuredRows.filter((item) => item.initiallyVisible)
        : configuredRows.slice(0, visibleLimit);
    const hiddenRowsCount = Math.max(configuredRows.length - visibleRows.length, 0);
    const actions = mobileCard?.actions?.(row, rowIndex) ?? actionColumn?.render(row);

    return (
      <article key={rowKey} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            {mobileCard?.eyebrow ? (
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {mobileCard.eyebrow(row, rowIndex)}
              </div>
            ) : null}
            <div className="text-sm font-bold text-gray-950">
              {mobileCard?.title?.(row, rowIndex) ?? titleColumn?.render(row)}
            </div>
            {mobileCard?.subtitle || subtitleColumn ? (
              <div className="mt-1 text-xs text-gray-500">
                {mobileCard?.subtitle?.(row, rowIndex) ?? subtitleColumn?.render(row)}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {mobileCard?.status ? mobileCard.status(row, rowIndex) : null}
            {actions ? (
              <div className="flex min-h-8 items-center justify-center">
                {actions}
              </div>
            ) : (
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-300" />
            )}
          </div>
        </div>

        {visibleRows.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {visibleRows.map((item) => (
              <div key={item.key} className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-3 px-4 py-2.5 text-sm">
                <span className="text-xs font-medium text-gray-500">{item.label}</span>
                <div className="min-w-0 text-right font-medium text-gray-800">{item.render(row, rowIndex)}</div>
              </div>
            ))}
          </div>
        ) : null}

        {hiddenRowsCount > 0 || expanded ? (
          <button
            type="button"
            onClick={() => setExpandedMobileRows((current) => ({ ...current, [rowKey]: !expanded }))}
            className="h-11 w-full border-t border-gray-100 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
          >
            {expanded ? "View less" : "View more"}
          </button>
        ) : null}
      </article>
    );
  };

  return (
    <div
      className={horizontalScroll ? "overflow-x-auto md:overflow-x-auto" : "overflow-visible"}
      aria-busy={inferredLoading}
    >
      <div className="space-y-3 md:hidden">
        {inferredLoading
          ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
              <div
                key={`standard-table-mobile-skeleton-${rowIndex}`}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))
          : paginatedData.map((row, index) => renderMobileCard(row, index))}
        {!inferredLoading && !sortedData.length ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            {emptyLabel}
          </div>
        ) : null}
      </div>

      <table className={`hidden w-full table-fixed text-left text-sm md:table ${minWidthClassName}`}>
        <thead className="bg-[#F8F8F8] text-sm tracking-normal text-gray-500">
          <tr>
            {columns.map((column) => {
              const active = sortKey === column.key;
              const SortIcon = sortDirection === "asc" ? ChevronUpIcon : ChevronDownIcon;

              return (
                <th
                  key={column.key}
                  className={`border-b border-gray-200 px-4 py-4 font-bold ${column.headerClassName ?? ""}`}
                >
                  {column.isAction ? (
                    <span>{column.header}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="flex w-full items-center gap-1 text-left transition hover:text-gray-900"
                    >
                      <span>{column.header}</span>
                      <SortIcon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          active ? "text-gray-900" : "text-gray-300"
                        }`}
                      />
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {inferredLoading
            ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr
                  key={`standard-table-skeleton-${rowIndex}`}
                  className="odd:bg-white even:bg-[#F8F8F8]"
                >
                  {columns.map((column, columnIndex) => (
                    <td
                      key={`${column.key}-${rowIndex}`}
                      className={`px-4 py-4 ${column.className ?? ""}`}
                    >
                      <div
                        className={`h-4 animate-pulse rounded bg-gray-200 ${
                          column.isAction
                            ? "ml-auto w-8"
                            : columnIndex === 0
                              ? "w-3/4"
                              : columnIndex % 3 === 0
                                ? "w-1/2"
                                : "w-2/3"
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : paginatedData.map((row, index) => (
            <tr
              key={getRowKey(
                row,
                showPagination ? (safeCurrentPage - 1) * rowsPerPage + index : index,
              )}
              className="odd:bg-white even:bg-[#F8F8F8] transition hover:bg-gray-100"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-5 text-gray-700 transition hover:bg-gray-200/60 hover:text-gray-950 ${column.className ?? ""}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {!inferredLoading && !sortedData.length ? (
            <tr>
              <td className="bg-white px-3 py-6 text-center text-gray-500" colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {showPagination ? (
        <div className="border-t border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
          <div className="space-y-3 md:hidden">
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition ${
                    page === safeCurrentPage
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-900"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {(safeCurrentPage - 1) * rowsPerPage + 1}-{Math.min(safeCurrentPage * rowsPerPage, totalRows)}
              </span>{" "}
              of <span className="font-semibold text-gray-900">{totalRows}</span>
            </p>
          </div>

          <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span>Showing</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRowsPerPageOpen((open) => !open)}
                  onBlur={() => window.setTimeout(() => setRowsPerPageOpen(false), 120)}
                  className="flex h-8 min-w-15 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-900 outline-none transition hover:border-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <span>{rowsPerPageInput}</span>
                  <ChevronDownIcon className="h-3.5 w-3.5 text-gray-500" />
                </button>
                {rowsPerPageOpen ? (
                  <div className="absolute bottom-full left-0 z-20 mb-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    {ROWS_PER_PAGE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleRowsPerPageModeChange(option)}
                        className={`block h-8 w-full px-2.5 text-left text-sm font-semibold transition ${
                          option === rowsPerPageInput
                            ? "bg-gray-900 text-white"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <span>
                of <span className="font-semibold text-gray-900">{totalRows}</span> data
              </span>
            </div>

            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>

              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-semibold transition ${
                    page === safeCurrentPage
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-900"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
