"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { enUS, id } from "date-fns/locale";
import { useLanguage } from "./i18n";
import type { DateRangeValue } from "./DateRangeFilter";

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

export function formatDateRangeLabel(
  value: DateRangeValue,
  language: "en" | "id",
) {
  const formatter = new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const start = formatter.format(parseDateValue(value.startDate));
  const end = formatter.format(parseDateValue(value.endDate));
  return value.startDate === value.endDate ? start : `${start} - ${end}`;
}

export default function DateRangeCalendar({
  value,
  onChange,
  active,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  active: boolean;
}) {
  const { language, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;

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
  }, [open, value.endDate, value.startDate]);

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

  const applyRange = () => {
    if (!draft?.from) return;
    const endDate = draft.to ?? draft.from;
    onChange({
      startDate: toDateValue(draft.from),
      endDate: toDateValue(endDate),
    });
    setOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const visibleMonths = displayMonths;
  const monthNames = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
      month: "long",
    }).format(new Date(2020, month, 1)),
  );
  const availableYears = Array.from(
    { length: 12 },
    (_, index) => currentYear - 10 + index,
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left transition sm:w-auto ${
          active
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {t("dateRange.custom")}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("dateRange.custom")}
          className="absolute right-0 z-50 mt-2 w-[min(44rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
        >
          <div className="relative mb-2 grid grid-cols-1 items-center sm:grid-cols-2 sm:gap-8">
            <button
              type="button"
              onClick={() =>
                setDisplayMonths((current) => [
                  shiftMonth(current[0], -1),
                  current[1],
                ])
              }
              aria-label={t("dateRange.previousMonth")}
              className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {visibleMonths.map((month, index) => (
              <div
                key={`header-${month.getFullYear()}-${month.getMonth()}-${index}`}
                className={`${index === 1 ? "hidden sm:flex" : "flex"} items-center justify-center gap-2 px-12`}
              >
                <select
                  value={month.getMonth()}
                  onChange={(event) =>
                    selectMonth(index as 0 | 1, Number(event.target.value))
                  }
                  aria-label={t("dateRange.selectMonth")}
                  className="min-w-0 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:bg-gray-50 focus:border-gray-900"
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
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:bg-gray-50 focus:border-gray-900"
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
              className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
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
                    weekdays: "grid grid-cols-7",
                    weekday:
                      "py-2 text-center text-xs font-semibold text-gray-400",
                    weeks: "block",
                    week: "grid grid-cols-7",
                    day: "relative flex h-10 items-center justify-center text-sm",
                    day_button:
                      "relative z-10 flex h-9 w-9 items-center justify-center rounded-lg font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900",
                    today: "font-bold text-blue-700",
                    outside: "text-gray-300",
                    disabled: "cursor-not-allowed text-gray-300 opacity-50",
                    selected: "font-semibold",
                    range_start: "rounded-l-lg bg-gray-100",
                    range_middle: "bg-gray-100",
                    range_end: "rounded-r-lg bg-gray-100",
                  }}
                  modifiersClassNames={{
                    range_start:
                      "[&>button]:bg-gray-900 [&>button]:text-white [&>button]:hover:bg-gray-900",
                    range_middle:
                      "[&>button]:rounded-none [&>button]:bg-gray-100 [&>button]:hover:bg-gray-200",
                    range_end:
                      "[&>button]:bg-gray-900 [&>button]:text-white [&>button]:hover:bg-gray-900",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <p className="min-w-0 truncate text-xs font-medium text-gray-500">
              {draft?.from
                ? formatDateRangeLabel(
                    {
                      startDate: toDateValue(draft.from),
                      endDate: toDateValue(draft.to ?? draft.from),
                    },
                    language,
                  )
                : t("dateRange.selectDates")}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={applyRange}
                disabled={!draft?.from}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("dateRange.apply")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
