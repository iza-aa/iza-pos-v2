"use client";

import { getJakartaTodayDate, toUtcDateOnly } from "@/lib/services/bookkeeping/bookkeepingDate";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

type DateRangePreset = {
  id: string;
  label: string;
  getValue: () => DateRangeValue;
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const addDaysToDateValue = (dateValue: string, offset: number) => {
  const date = toUtcDateOnly(dateValue);
  date.setUTCDate(date.getUTCDate() + offset);
  return toDateInputValue(date);
};

const addDays = (offset: number) => {
  return addDaysToDateValue(getJakartaTodayDate(), offset);
};

export const getTodayDateRange = (): DateRangeValue => {
  const today = getJakartaTodayDate();
  return { startDate: today, endDate: today };
};

export const getLast7DateRange = (): DateRangeValue => ({
  startDate: addDays(-6),
  endDate: getJakartaTodayDate(),
});

export const getDefaultDateRange = getTodayDateRange;

const presets: DateRangePreset[] = [
  {
    id: "today",
    label: "Today",
    getValue: getTodayDateRange,
  },
  {
    id: "yesterday",
    label: "Yesterday",
    getValue: () => {
      const yesterday = addDays(-1);
      return { startDate: yesterday, endDate: yesterday };
    },
  },
  {
    id: "last7",
    label: "Last 7 Days",
    getValue: getLast7DateRange,
  },
  {
    id: "last30",
    label: "Last 30 Days",
    getValue: () => ({
      startDate: addDays(-29),
      endDate: getJakartaTodayDate(),
    }),
  },
];

export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const setDate = (key: keyof DateRangeValue, nextValue: string) => {
    const nextRange = { ...value, [key]: nextValue };

    if (nextRange.startDate > nextRange.endDate) {
      onChange({ startDate: nextValue, endDate: nextValue });
      return;
    }

    onChange(nextRange);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950">Date Range</p>
          <p className="mt-1 text-sm leading-6 text-gray-500 sm:leading-normal">
            Apply one period to every dated metric and chart in this tab.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {presets.map((preset) => {
              const presetValue = preset.getValue();
              const active =
                presetValue.startDate === value.startDate &&
                presetValue.endDate === value.endDate;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange(presetValue)}
                  className={`h-12 rounded-xl border px-3 text-sm font-semibold transition sm:h-auto sm:py-2 ${
                    active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 sm:flex sm:flex-row sm:items-center">
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => setDate("startDate", event.target.value)}
              className="h-12 min-w-0 rounded-xl border border-gray-200 bg-white px-4 text-base font-semibold text-gray-700 outline-none transition focus:border-gray-900 sm:h-auto sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Start date"
            />
            <span className="hidden text-sm font-semibold text-gray-400 sm:block">
              to
            </span>
            <input
              type="date"
              value={value.endDate}
              onChange={(event) => setDate("endDate", event.target.value)}
              className="h-12 min-w-0 rounded-xl border border-gray-200 bg-white px-4 text-base font-semibold text-gray-700 outline-none transition focus:border-gray-900 sm:h-auto sm:px-3 sm:py-2 sm:text-sm"
              aria-label="End date"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
