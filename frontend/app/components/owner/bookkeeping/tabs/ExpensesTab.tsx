"use client";

import { useState } from "react";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type {
  BookkeepingDashboardData,
  BookkeepingExpense,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import { getCurrentUser } from "@/lib/utils";
import { MetricCard, StandardPanel, formatCurrency } from "../BookkeepingPrimitives";

type ExpenseForm = {
  id?: string;
  expenseDate: string;
  category: string;
  amount: string;
  paymentMethod: string;
  vendor: string;
  receiptUrl: string;
  note: string;
};

const createEmptyForm = (date: string): ExpenseForm => ({
  expenseDate: date,
  category: "",
  amount: "",
  paymentMethod: "cash",
  vendor: "",
  receiptUrl: "",
  note: "",
});

export default function ExpensesTab({
  data,
  saving = false,
  deletingId = "",
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
}: {
  data: BookkeepingDashboardData;
  saving?: boolean;
  deletingId?: string;
  onCreateExpense?: (form: ExpenseForm) => Promise<void>;
  onUpdateExpense?: (form: ExpenseForm) => Promise<void>;
  onDeleteExpense?: (id: string) => void;
}) {
  const [form, setForm] = useState<ExpenseForm>(() => createEmptyForm(data.dateRange.endDate));
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const isEditing = Boolean(form.id);
  const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const columns: Array<StandardTableColumn<BookkeepingExpense>> = [
    {
      key: "expenseDate",
      header: "Date",
      render: (row) => row.expenseDate,
      sortValue: (row) => row.expenseDate,
    },
    {
      key: "category",
      header: "Category",
      render: (row) => <span className="font-semibold text-gray-900">{row.category}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.amount)}</span>,
      sortValue: (row) => row.amount,
    },
    {
      key: "paymentMethod",
      header: "Payment Method",
      render: (row) => row.paymentMethod || "-",
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (row) => row.vendor || "-",
    },
    {
      key: "receipt",
      header: "Receipt",
      render: (row) => row.receiptUrl ? (
        <a
          href={row.receiptUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-blue-600 hover:underline"
        >
          Open
        </a>
      ) : "-",
    },
    {
      key: "note",
      header: "Note",
      render: (row) => row.note || "-",
      className: "whitespace-normal",
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setForm({
              id: row.id,
              expenseDate: row.expenseDate,
              category: row.category,
              amount: String(row.amount),
              paymentMethod: row.paymentMethod || "cash",
              vendor: row.vendor || "",
              receiptUrl: row.receiptUrl || "",
              note: row.note || "",
            })}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDeleteExpense?.(row.id)}
            disabled={!onDeleteExpense || deletingId === row.id}
            className="rounded-xl border border-[#F7B8C3] bg-white px-3 py-2 text-xs font-bold text-[#BE123C] transition hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async () => {
    if (isEditing) {
      if (!onUpdateExpense) return;
      await onUpdateExpense(form);
    } else {
      if (!onCreateExpense) return;
      await onCreateExpense(form);
    }
    setForm(createEmptyForm(data.dateRange.endDate));
  };

  const handleReceiptUpload = async (file: File | null) => {
    if (!file) return;

    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "owner") {
      setUploadError("Owner access required.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingReceipt(true);
    setUploadError("");

    try {
      const response = await fetch("/api/owner/bookkeeping/expenses/receipt", {
        method: "POST",
        headers: {
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: formData,
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        receiptUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.success || !result.receiptUrl) {
        throw new Error(result.error || "Receipt could not be uploaded.");
      }

      setForm((current) => ({ ...current, receiptUrl: result.receiptUrl || "" }));
    } catch (error) {
      console.error("Failed to upload expense receipt:", error);
      setUploadError(error instanceof Error ? error.message : "Receipt could not be uploaded.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Operating Expenses"
          value={formatCurrency(totalExpenses)}
          description="Manual expenses recorded in this period."
          tone={totalExpenses > 0 ? "waiting" : "neutral"}
        />
        <MetricCard
          label="Expense Records"
          value={data.expenses.length}
          description="Number of owner-entered expense records."
          tone="info"
        />
      </div>

      <StandardPanel
        title="Add Expense"
        description="Record operating expenses that are not captured from sales or inventory usage."
        action={
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !form.category.trim() || Number(form.amount) <= 0}
            className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
          {saving ? "Saving Expense..." : isEditing ? "Update Expense" : "Save Expense"}
        </button>
      }
    >
        {isEditing ? (
          <button
            type="button"
            onClick={() => setForm(createEmptyForm(data.dateRange.endDate))}
            className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900"
          >
            Cancel Edit
          </button>
        ) : null}
        {uploadError ? (
          <div className="mb-4 rounded-xl border border-[#F6C99F] bg-[#FFF1E6] p-3 text-sm font-semibold text-[#B45309]">
            {uploadError}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold text-gray-700">
            Date
            <input
              type="date"
              value={form.expenseDate}
              onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Category
            <input
              type="text"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Utilities, payroll, packaging"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Amount
            <input
              type="number"
              min="0"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="0"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Payment Method
            <select
              value={form.paymentMethod}
              onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="e-wallet">E-Wallet</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Vendor
            <input
              type="text"
              value={form.vendor}
              onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Note
            <input
              type="text"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Receipt File
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => void handleReceiptUpload(event.target.files?.[0] ?? null)}
              disabled={uploadingReceipt}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <span className="mt-2 block text-xs font-semibold text-gray-500">
              {uploadingReceipt ? "Uploading receipt..." : "PDF, JPG, PNG, or WEBP. Maximum 5 MB."}
            </span>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Receipt Link
            <input
              type="url"
              value={form.receiptUrl}
              onChange={(event) => setForm((current) => ({ ...current, receiptUrl: event.target.value }))}
              placeholder="Optional receipt or invoice link"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        </div>
      </StandardPanel>

      <StandardPanel
        title="Expense Records"
        description="Operating expense entries for the selected period."
      >
        <StandardTable
          columns={columns}
          data={data.expenses}
          getRowKey={(row) => row.id}
          emptyLabel="No expenses recorded in this period."
          minWidthClassName="min-w-[980px]"
        />
      </StandardPanel>
    </div>
  );
}
