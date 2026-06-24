"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/constants";

type CashPaymentInputProps = {
  totalAmount: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const roundUpToDenomination = (amount: number, denomination: number) =>
  Math.ceil(amount / denomination) * denomination;

export default function CashPaymentInput({
  totalAmount,
  value,
  onChange,
  disabled = false,
}: CashPaymentInputProps) {
  const received = Number(value) || 0;
  const shortage = Math.max(totalAmount - received, 0);
  const change = Math.max(received - totalAmount, 0);

  const quickAmounts = useMemo(() => {
    const candidates = [
      totalAmount,
      roundUpToDenomination(totalAmount, 5_000),
      roundUpToDenomination(totalAmount, 10_000),
      roundUpToDenomination(totalAmount, 20_000),
      roundUpToDenomination(totalAmount, 50_000),
      roundUpToDenomination(totalAmount, 100_000),
    ];

    return [...new Set(candidates)]
      .filter((amount) => amount >= totalAmount)
      .sort((left, right) => left - right)
      .slice(0, 5);
  }, [totalAmount]);

  return (
    <section>
      <label
        htmlFor="cash-received"
        className="mb-2 block text-sm font-semibold text-gray-800"
      >
        Cash Received <span className="text-red-500">*</span>
      </label>

      <input
        id="cash-received"
        type="number"
        inputMode="numeric"
        required
        min={totalAmount}
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        placeholder={`Minimum ${formatCurrency(totalAmount)}`}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            onClick={() => onChange(String(amount))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {amount === totalAmount ? "Exact" : formatCurrency(amount)}
          </button>
        ))}
      </div>

      {value ? (
        <div
          className={`mt-3 rounded-xl border px-4 py-3 ${
            shortage > 0
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="flex items-center justify-between text-sm">
            <span className={shortage > 0 ? "text-amber-800" : "text-emerald-800"}>
              {shortage > 0 ? "Shortage" : "Change"}
            </span>
            <span
              className={`font-bold ${
                shortage > 0 ? "text-amber-900" : "text-emerald-900"
              }`}
            >
              {formatCurrency(shortage > 0 ? shortage : change)}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

