"use client";

import { getJakartaTodayDate, toUtcDateOnly } from "@/lib/services/bookkeeping/bookkeepingDate";

type BusinessDateFilterProps = {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  description?: string;
  todayLabel?: string;
  yesterdayLabel?: string;
  ariaLabel?: string;
};

const toDateValue = (date: Date) => date.toISOString().slice(0, 10);

const getYesterdayDate = () => {
  const date = toUtcDateOnly(getJakartaTodayDate());
  date.setUTCDate(date.getUTCDate() - 1);
  return toDateValue(date);
};

export default function BusinessDateFilter({
  value,
  onChange,
  title = "Business Date",
  description = "Select the operational date to review.",
  todayLabel = "Today",
  yesterdayLabel = "Yesterday",
  ariaLabel = "Business Date",
}: BusinessDateFilterProps) {
  const today = getJakartaTodayDate();
  const yesterday = getYesterdayDate();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-4 p-2 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950">{title}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "today", label: todayLabel, value: today },
              { id: "yesterday", label: yesterdayLabel, value: yesterday },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.value)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  value === preset.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
            aria-label={ariaLabel}
          />
        </div>
      </div>
    </section>
  );
}
