"use client";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

type DateRangePreset = {
  id: string;
  label: string;
  getValue: () => DateRangeValue;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
};

export const getDefaultDateRange = (): DateRangeValue => ({
  startDate: toDateInputValue(addDays(-6)),
  endDate: toDateInputValue(new Date()),
});

const presets: DateRangePreset[] = [
  {
    id: "today",
    label: "Today",
    getValue: () => {
      const today = toDateInputValue(new Date());
      return { startDate: today, endDate: today };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    getValue: () => {
      const yesterday = toDateInputValue(addDays(-1));
      return { startDate: yesterday, endDate: yesterday };
    },
  },
  {
    id: "last7",
    label: "Last 7 Days",
    getValue: getDefaultDateRange,
  },
  {
    id: "last30",
    label: "Last 30 Days",
    getValue: () => ({
      startDate: toDateInputValue(addDays(-29)),
      endDate: toDateInputValue(new Date()),
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
      onChange(
        key === "startDate"
          ? { startDate: nextValue, endDate: nextValue }
          : { startDate: nextValue, endDate: nextValue },
      );
      return;
    }

    onChange(nextRange);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950">Date Range</p>
          <p className="mt-1 text-sm text-gray-500">
            Apply one period to every dated metric and chart in this tab.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => setDate("startDate", event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
              aria-label="Start date"
            />
            <span className="hidden text-sm font-semibold text-gray-400 sm:block">to</span>
            <input
              type="date"
              value={value.endDate}
              onChange={(event) => setDate("endDate", event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
              aria-label="End date"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
