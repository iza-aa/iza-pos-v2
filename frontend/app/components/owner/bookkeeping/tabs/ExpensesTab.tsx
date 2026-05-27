"use client";

import { useMemo, useState } from "react";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type {
  BookkeepingDashboardData,
  BookkeepingExpense,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
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

export default function ExpensesTab({
  data,
}: {
  data: BookkeepingDashboardData;
  saving?: boolean;
  deletingId?: string;
  onCreateExpense?: (form: ExpenseForm) => Promise<void>;
  onUpdateExpense?: (form: ExpenseForm) => Promise<void>;
  onDeleteExpense?: (id: string) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryOptions = useMemo(() => (
    Array.from(new Set(data.expenses.map((expense) => expense.category).filter(Boolean))).sort()
  ), [data.expenses]);
  const paymentOptions = useMemo(() => (
    Array.from(new Set(data.expenses.map((expense) => expense.paymentMethod || "").filter(Boolean))).sort()
  ), [data.expenses]);
  const filteredExpenses = useMemo(() => {
    const search = searchFilter.trim().toLowerCase();

    return data.expenses.filter((expense) => {
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      const matchesPayment = paymentFilter === "all" || expense.paymentMethod === paymentFilter;
      const matchesSearch = !search || [
        expense.category,
        expense.vendor || "",
        expense.note || "",
      ].some((value) => value.toLowerCase().includes(search));

      return matchesCategory && matchesPayment && matchesSearch;
    });
  }, [categoryFilter, data.expenses, paymentFilter, searchFilter]);

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
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Operating Expenses"
          value={formatCurrency(totalExpenses)}
          description="Expenses recorded by operations in this period."
          tone={totalExpenses > 0 ? "waiting" : "neutral"}
        />
        <MetricCard
          label="Expense Records"
          value={filteredExpenses.length}
          description="Filtered records in the selected period."
          tone="info"
        />
      </div>

      <StandardPanel
        title="Expense Review"
        description="Owner review for operating expenses. New expense entry belongs in manager/admin operations because they hold daily receipts and payment context."
      >
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-gray-700">
            Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Payment
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            >
              <option value="all">All Payment Methods</option>
              {paymentOptions.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Search
            <input
              type="search"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              placeholder="Vendor, category, or note"
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        </div>
        <StandardTable
          columns={columns}
          data={filteredExpenses}
          getRowKey={(row) => row.id}
          emptyLabel="No expenses recorded in this period."
          minWidthClassName="min-w-[920px]"
        />
      </StandardPanel>
    </div>
  );
}
