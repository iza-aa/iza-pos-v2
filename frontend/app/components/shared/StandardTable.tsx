"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

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

type StandardTableProps<T> = {
  columns: Array<StandardTableColumn<T>>;
  data: T[];
  getRowKey: (row: T, index: number) => string;
  emptyLabel: string;
  minWidthClassName?: string;
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

export default function StandardTable<T>({
  columns,
  data,
  getRowKey,
  emptyLabel,
  minWidthClassName = "min-w-190",
}: StandardTableProps<T>) {
  const firstSortableColumn = columns.find((column) => !column.isAction);
  const [sortKey, setSortKey] = useState(firstSortableColumn?.key ?? "");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedData = useMemo(() => {
    const activeColumn = columns.find((column) => column.key === sortKey);
    if (!activeColumn || activeColumn.isAction) return data;

    const getValue = activeColumn.sortValue ?? activeColumn.render;

    return [...data].sort((left, right) => {
      const result = compareValues(getValue(left) as SortValue, getValue(right) as SortValue);
      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, data, sortDirection, sortKey]);

  const toggleSort = (column: StandardTableColumn<T>) => {
    if (column.isAction) return;

    if (sortKey === column.key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(column.key);
    setSortDirection("asc");
  };

  return (
    <div className="overflow-x-auto">
      <table className={`w-full table-fixed text-left text-sm ${minWidthClassName}`}>
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
          {sortedData.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
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
          {!sortedData.length ? (
            <tr>
              <td className="bg-white px-3 py-6 text-center text-gray-500" colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
