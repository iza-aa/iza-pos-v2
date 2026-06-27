"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { enUS, id } from "date-fns/locale";
import { useLanguage } from "./i18n";
import { getJakartaTodayDate, toUtcDateOnly } from "@/lib/services/bookkeeping/bookkeepingDate";
import { formatDateRangeLabel } from "./DateRangeCalendar";

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

const parseDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shiftMonth = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

export default function CompactDateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const { language, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const [draft, setDraft] = useState<DateRange | undefined>({
    from: parseDateValue(value.startDate),
    to: parseDateValue(value.endDate),
  });

  const [displayMonths, setDisplayMonths] = useState<[Date, Date]>([
    new Date(
      parseDateValue(value.startDate).getFullYear(),
      parseDateValue(value.startDate).getMonth(),
      1,
    ),
    new Date(
      parseDateValue(value.endDate).getFullYear(),
      parseDateValue(value.endDate).getMonth(),
      1,
    ),
  ]);

  // Sync draft and month when popup opens
  useEffect(() => {
    if (!open) {
      setShowCalendar(false);
      return;
    }
    setDraft({
      from: parseDateValue(value.startDate),
      to: parseDateValue(value.endDate),
    });
    setDisplayMonths([
      new Date(
        parseDateValue(value.startDate).getFullYear(),
        parseDateValue(value.startDate).getMonth(),
        1,
      ),
      new Date(
        parseDateValue(value.endDate).getFullYear(),
        parseDateValue(value.endDate).getMonth(),
        1,
      ),
    ]);
  }, [open, value.startDate, value.endDate]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!document.body.contains(target)) {
        return;
      }
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const activePreset = presets.find((preset) => {
    const presetValue = preset.getValue();
    return (
      presetValue.startDate === value.startDate &&
      presetValue.endDate === value.endDate
    );
  });

  const applyCustomRange = () => {
    if (!draft?.from) return;
    const endDate = draft.to ?? draft.from;
    onChange({
      startDate: toDateValue(draft.from),
      endDate: toDateValue(endDate),
    });
    setOpen(false);
  };

  const getActiveLabel = () => {
    if (activePreset) {
      return t(activePreset.labelKey);
    }
    return formatDateRangeLabel(value, language);
  };

  const currentYear = new Date().getFullYear();
  const visibleMonths = displayMonths;
  const monthNames = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
      month: "long",
    }).format(new Date(2020, month, 1))
  );
  const availableYears = Array.from(
    { length: 12 },
    (_, index) => currentYear - 10 + index
  );

  const selectMonth = (displayIndex: 0 | 1, month: number) => {
    const targetMonth = visibleMonths[displayIndex];
    const selectedTarget = new Date(targetMonth.getFullYear(), month, 1);
    setDisplayMonths((current) => {
      const next: [Date, Date] = [...current];
      next[displayIndex] = selectedTarget;
      return next;
    });
    setDraft(() => {
      if (displayIndex === 0) {
        const currentEnd = visibleMonths[1];
        return {
          from: selectedTarget,
          to: currentEnd >= selectedTarget ? currentEnd : selectedTarget,
        };
      }

      const currentStart = visibleMonths[0];
      return {
        from: currentStart <= selectedTarget ? currentStart : selectedTarget,
        to: selectedTarget,
      };
    });
  };

  const selectYear = (displayIndex: 0 | 1, year: number) => {
    const targetMonth = visibleMonths[displayIndex];
    const selectedTarget = new Date(year, targetMonth.getMonth(), 1);
    setDisplayMonths((current) => {
      const next: [Date, Date] = [...current];
      next[displayIndex] = selectedTarget;
      return next;
    });
    setDraft(() => {
      if (displayIndex === 0) {
        const currentEnd = visibleMonths[1];
        return {
          from: selectedTarget,
          to: currentEnd >= selectedTarget ? currentEnd : selectedTarget,
        };
      }

      const currentStart = visibleMonths[0];
      return {
        from: currentStart <= selectedTarget ? currentStart : selectedTarget,
        to: selectedTarget,
      };
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
      >
        <CalendarDays className="h-4.5 w-4.5 text-gray-500" />
        <span>{getActiveLabel()}</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div 
          className={`absolute right-0 z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 origin-top-right transition-all ${
            showCalendar ? "w-[min(44rem,calc(100vw-2rem))]" : "min-w-56"
          }`}
        >
          {!showCalendar ? (
            <div className="flex flex-col gap-1">
              {presets.map((preset) => {
                const presetValue = preset.getValue();
                const isActive =
                  presetValue.startDate === value.startDate &&
                  presetValue.endDate === value.endDate;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onChange(presetValue);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm font-medium rounded-lg transition ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {t(preset.labelKey)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                className={`w-full px-3 py-2 text-left text-sm font-medium rounded-lg transition ${
                  !activePreset ? "bg-gray-100 text-gray-900 font-bold" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {t("dateRange.custom")}...
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header selectors */}
              <div className="relative mb-3 grid grid-cols-1 items-center sm:grid-cols-2 sm:gap-8">
                <button
                  type="button"
                  onClick={() =>
                    setDisplayMonths((current) => [
                      shiftMonth(current[0], -1),
                      current[1],
                    ])
                  }
                  aria-label={t("dateRange.previousMonth")}
                  className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {visibleMonths.map((month, index) => (
                  <div
                    key={`header-${month.getFullYear()}-${month.getMonth()}-${index}`}
                    className={`${index === 1 ? "hidden sm:flex" : "flex"} items-center justify-center gap-1.5 px-10`}
                  >
                    <select
                      value={month.getMonth()}
                      onChange={(event) =>
                        selectMonth(index as 0 | 1, Number(event.target.value))
                      }
                      aria-label={t("dateRange.selectMonth")}
                      className="min-w-0 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-900 outline-none hover:bg-gray-50 focus:border-gray-900"
                    >
                      {monthNames.map((monthName, monthIndex) => (
                        <option key={monthName} value={monthIndex}>
                          {monthName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={month.getFullYear()}
                      onChange={(event) =>
                        selectYear(index as 0 | 1, Number(event.target.value))
                      }
                      aria-label={t("dateRange.selectYear")}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-900 outline-none hover:bg-gray-50 focus:border-gray-900"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setDisplayMonths((current) => [
                      current[0],
                      shiftMonth(current[1], 1),
                    ])
                  }
                  aria-label={t("dateRange.nextMonth")}
                  className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Calendars grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                {visibleMonths.map((month, index) => (
                  <div
                    key={`calendar-${month.getFullYear()}-${month.getMonth()}-${index}`}
                    className={index === 1 ? "hidden sm:block" : "block"}
                  >
                    <DayPicker
                      mode="range"
                      selected={draft}
                      onSelect={setDraft}
                      resetOnSelect
                      month={month}
                      hideNavigation
                      hideWeekdays={false}
                      startMonth={new Date(currentYear - 10, 0)}
                      endMonth={new Date(currentYear + 1, 11)}
                      locale={language === "id" ? id : enUS}
                      classNames={{
                        root: "w-full text-gray-900",
                        months: "w-full",
                        month: "w-full",
                        month_caption: "hidden",
                        month_grid: "w-full table-fixed border-collapse",
                        weekdays: "grid grid-cols-7 mb-1",
                        weekday: "text-center text-[10px] font-semibold text-gray-400 py-1",
                        weeks: "block",
                        week: "grid grid-cols-7",
                        day: "relative flex h-8 items-center justify-center text-xs",
                        day_button: "relative z-10 flex h-7 w-7 items-center justify-center rounded-lg font-medium hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900",
                        today: "font-bold text-blue-700",
                        outside: "text-gray-300",
                        disabled: "cursor-not-allowed text-gray-300 opacity-50",
                        selected: "font-semibold",
                        range_start: "rounded-l-lg bg-gray-200",
                        range_middle: "bg-gray-200",
                        range_end: "rounded-r-lg bg-gray-200",
                      }}
                      modifiersClassNames={{
                        range_start: "[&>button]:bg-gray-900 [&>button]:text-white [&>button]:hover:bg-gray-900",
                        range_middle: "[&>button]:rounded-none [&>button]:bg-gray-100 [&>button]:hover:bg-gray-200",
                        range_end: "[&>button]:bg-gray-900 [&>button]:text-white [&>button]:hover:bg-gray-900",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-150 pt-3 px-1">
                <button
                  type="button"
                  onClick={() => setShowCalendar(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  {language === "id" ? "Kembali" : "Back"}
                </button>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={!draft?.from}
                  className="bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  {t("dateRange.apply")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
