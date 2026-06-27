"use client";

import { getJakartaTodayDate, toUtcDateOnly } from "@/lib/services/bookkeeping/bookkeepingDate";
import { useLanguage } from "./i18n";
import DateRangeCalendar, { formatDateRangeLabel } from "./DateRangeCalendar";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

type DateRangePreset = {
  id: string;
  labelKey: string;
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
    labelKey: "dateRange.today",
    getValue: getTodayDateRange,
  },
  {
    id: "yesterday",
    labelKey: "dateRange.yesterday",
    getValue: () => {
      const yesterday = addDays(-1);
      return { startDate: yesterday, endDate: yesterday };
    },
  },
  {
    id: "last7",
    labelKey: "dateRange.last7",
    getValue: getLast7DateRange,
  },
  {
    id: "last30",
    labelKey: "dateRange.last30",
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
  const { language, t } = useLanguage();
  const activePreset = presets.find((preset) => {
    const presetValue = preset.getValue();
    return (
      presetValue.startDate === value.startDate &&
      presetValue.endDate === value.endDate
    );
  });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-2 px-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950">{t("dateRange.title")}</p>
          <p className="mt-1 text-sm leading-6 text-gray-500 sm:leading-normal">
            <span className="font-semibold text-gray-700">
              {formatDateRangeLabel(value, language)}
            </span>
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
                  className={`flex min-h-10 flex-col items-center justify-center rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <span>{t(preset.labelKey)}</span>
                </button>
              );
            })}
          </div>

          <DateRangeCalendar
            value={value}
            onChange={onChange}
            active={!activePreset}
          />
        </div>
      </div>
    </section>
  );
}
