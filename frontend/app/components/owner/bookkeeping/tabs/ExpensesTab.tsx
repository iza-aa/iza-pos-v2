"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EyeIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { StandardModal } from "@/app/components/shared";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { useLanguage } from "@/app/components/shared/i18n";
import type { BookkeepingDashboardData, BookkeepingExpense } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { StandardPanel, formatCurrency } from "../BookkeepingPrimitives";
import SettingsTab from "./SettingsTab";

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

const emptyForm = (date: string): ExpenseForm => ({
  expenseDate: date,
  category: "",
  amount: "",
  paymentMethod: "",
  vendor: "",
  receiptUrl: "",
  note: "",
});

export default function ExpensesTab({
  data,
  loading = false,
  savingExpense = false,
  deletingExpenseId = "",
  onSaveExpense,
  onDeleteExpense,
}: {
  data: BookkeepingDashboardData;
  loading?: boolean;
  savingExpense?: boolean;
  deletingExpenseId?: string;
  onSaveExpense?: (form: ExpenseForm) => void;
  onDeleteExpense?: (expense: BookkeepingExpense) => void;
}) {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(() => emptyForm(data.dateRange.endDate));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const categoryRef = useRef<HTMLInputElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState("");

  const handleUploadReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/owner/bookkeeping/expenses/receipt", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to upload receipt");
      }

      setForm((current) => ({ ...current, receiptUrl: result.receiptUrl }));
      setTouched((current) => ({ ...current, receiptUrl: true }));
    } catch (error) {
      console.error("Receipt upload failed:", error);
      alert(error instanceof Error ? error.message : "Failed to upload receipt");
    } finally {
      setUploadingReceipt(false);
    }
  };

  useEffect(() => {
    if (!modalOpen) setForm(emptyForm(data.dateRange.endDate));
  }, [data.dateRange.endDate, modalOpen]);

  const totalExpense = useMemo(
    () => data.expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [data.expenses],
  );
  const openCreate = () => {
    setForm(emptyForm(data.dateRange.endDate));
    setTouched({});
    setModalOpen(true);
  };

  const openEdit = (expense: BookkeepingExpense) => {
    setForm({
      id: expense.id,
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: String(expense.amount),
      paymentMethod: expense.paymentMethod ?? "",
      vendor: expense.vendor ?? "",
      receiptUrl: expense.receiptUrl ?? "",
      note: expense.note ?? "",
    });
    setTouched({});
    setModalOpen(true);
  };

  const inputClassName = (field: "category" | "amount") => {
    const invalid = touched[field] && !String(form[field]).trim();
    return `w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition ${
      invalid ? "border-red-500" : "border-gray-900"
    }`;
  };

  const submit = () => {
    if (!form.category.trim()) {
      setTouched((current) => ({ ...current, category: true }));
      categoryRef.current?.focus();
      return;
    }
    if (!form.amount.trim() || Number(form.amount) <= 0) {
      setTouched((current) => ({ ...current, amount: true }));
      amountRef.current?.focus();
      return;
    }
    if (!form.receiptUrl.trim()) {
      setTouched((current) => ({ ...current, receiptUrl: true }));
      return;
    }

    onSaveExpense?.(form);
    setModalOpen(false);
  };

  const columns: Array<StandardTableColumn<BookkeepingExpense>> = [
    {
      key: "expenseDate",
      header: t("owner.bookkeeping.date"),
      render: (row) => row.expenseDate,
      sortValue: (row) => row.expenseDate,
    },
    {
      key: "category",
      header: t("owner.bookkeeping.category"),
      render: (row) => <span className="font-semibold text-gray-950">{row.category}</span>,
      sortValue: (row) => row.category,
    },
    {
      key: "amount",
      header: t("owner.bookkeeping.amount"),
      render: (row) => <span className="font-bold text-red-700">{formatCurrency(row.amount)}</span>,
      sortValue: (row) => row.amount,
    },
    {
      key: "paymentMethod",
      header: t("owner.bookkeeping.payment"),
      render: (row) => <span className="capitalize">{row.paymentMethod || "-"}</span>,
    },
    {
      key: "vendor",
      header: t("owner.bookkeeping.vendor"),
      render: (row) => row.vendor || "-",
    },
    {
      key: "note",
      header: t("owner.bookkeeping.note"),
      render: (row) => row.note || "-",
      className: "whitespace-normal",
    },
    {
      key: "actions",
      header: t("owner.bookkeeping.actions"),
      isAction: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.receiptUrl && (
            <button
              type="button"
              onClick={() => {
                setSelectedReceiptUrl(row.receiptUrl!);
                setReceiptModalOpen(true);
              }}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label={`View receipt for ${row.category}`}
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label={`Edit ${row.category}`}
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteExpense?.(row)}
            disabled={!onDeleteExpense || deletingExpenseId === row.id}
            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Delete ${row.category}`}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SettingsTab />

      <StandardPanel
        title={t("owner.bookkeeping.expenses")}
        description={t("owner.bookkeeping.expensesPanelDescription")}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            {t("owner.bookkeeping.addExpense")}
          </button>
        }
      >
      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
        {data.expenses.length
          ? t("owner.bookkeeping.expenseSummary", { count: data.expenses.length, total: formatCurrency(totalExpense) })
          : t("owner.bookkeeping.noManualExpenses")}
      </div>
      <StandardTable
        columns={columns}
        data={data.expenses}
        getRowKey={(row) => row.id}
        loading={loading}
        emptyLabel={t("owner.bookkeeping.noExpenses")}
        minWidthClassName="min-w-[1080px]"
      />

        <StandardModal
        isOpen={modalOpen}
        title={form.id ? t("owner.bookkeeping.editExpense") : t("owner.bookkeeping.addExpense")}
        description={t("owner.bookkeeping.expenseModalDescription")}
        maxWidthClassName="max-w-3xl"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t("owner.bookkeeping.cancel")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!onSaveExpense || savingExpense || uploadingReceipt || !form.receiptUrl.trim()}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {savingExpense ? t("owner.bookkeeping.saving") : t("owner.bookkeeping.saveExpense")}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-800">{t("owner.bookkeeping.expenseDate")}</span>
            <input
              type="date"
              value={form.expenseDate}
              onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
              className="w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-800">
              {t("owner.bookkeeping.category")} <span className="text-red-500">*</span>
            </span>
            <input
              ref={categoryRef}
              value={form.category}
              onBlur={() => setTouched((current) => ({ ...current, category: true }))}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className={inputClassName("category")}
              placeholder="Electricity, rent, cleaning, marketing..."
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-800">
              {t("owner.bookkeeping.amount")} <span className="text-red-500">*</span>
            </span>
            <input
              ref={amountRef}
              type="number"
              min="0"
              value={form.amount}
              onBlur={() => setTouched((current) => ({ ...current, amount: true }))}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              className={inputClassName("amount")}
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-800">{t("owner.bookkeeping.paymentMethod")}</span>
            <input
              value={form.paymentMethod}
              onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              className="w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition"
              placeholder="cash, qris, transfer..."
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-gray-800">{t("owner.bookkeeping.vendor")}</span>
            <input
              value={form.vendor}
              onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
              className="w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition"
              placeholder="Vendor or payee name"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-gray-800">
              Receipt Picture <span className="text-red-500">*</span>
            </span>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUploadReceipt}
                disabled={uploadingReceipt}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold outline-none transition ${touched.receiptUrl && !form.receiptUrl.trim() ? "border-red-500 text-red-500" : "border-gray-900 text-gray-900"}`}
              />
              {uploadingReceipt && <span className="text-sm font-medium text-blue-600">Uploading...</span>}
              {form.receiptUrl && !uploadingReceipt && (
                <a href={form.receiptUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                  View Uploaded Receipt
                </a>
              )}
            </div>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-gray-800">{t("owner.bookkeeping.note")}</span>
            <textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition"
              placeholder="Optional context for audit."
            />
          </label>
        </div>
        </StandardModal>
        
        <StandardModal
          isOpen={receiptModalOpen}
          title="Receipt Detail"
          description="View the attached receipt for this expense."
          maxWidthClassName="max-w-4xl"
          onClose={() => setReceiptModalOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => setReceiptModalOpen(false)}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              Close
            </button>
          }
        >
          <div className="flex justify-center p-4">
            {selectedReceiptUrl && (
              <img src={selectedReceiptUrl} alt="Receipt" className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm border border-gray-200" />
            )}
          </div>
        </StandardModal>
      </StandardPanel>
    </div>
  );
}
