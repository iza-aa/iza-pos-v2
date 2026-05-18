'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { formatCurrency } from '@/lib/constants'

type UsageFilter = 'all' | 'sale' | 'restock' | 'adjustment'

type UsageTransactionDetail = {
  inventory_item_id: string
  ingredient_name: string
  quantity_used: number
  unit: string
  previous_stock?: number | null
  new_stock?: number | null
}

type UsageTransaction = {
  id: string
  type: string
  timestamp: string
  order_id?: string | null
  order_number?: string
  product_id?: string | null
  product_name?: string | null
  quantity_sold?: number | null
  notes?: string | null
  performed_by?: string | null
  performed_by_name?: string | null
  staff_name?: string
  staff_role?: string
  details: UsageTransactionDetail[]
}

type UsageTransactionRow = {
  id: string
  transaction_type?: string | null
  type?: string | null
  timestamp?: string | null
  created_at?: string | null
  order_id?: string | null
  product_id?: string | null
  product_name?: string | null
  quantity_sold?: number | null
  notes?: string | null
  performed_by?: string | null
  performed_by_name?: string | null
}

type UsageDetailRow = {
  usage_transaction_id: string
  inventory_item_id: string
  ingredient_name?: string | null
  quantity_used: number
  unit: string
  previous_stock?: number | null
  new_stock?: number | null
}

type OrderRow = {
  id: string
  order_number: string
}

type StaffRow = {
  id: string
  name: string
  role: string
}

type InventoryItemRow = {
  id: string
  name: string
}

const FILTERS: { key: UsageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sale', label: 'Sales' },
  { key: 'restock', label: 'Restocks' },
  { key: 'adjustment', label: 'Adjustments' },
]

const normalizeType = (type?: string | null) => {
  const raw = (type || 'sale').toLowerCase()
  if (raw === 'order_usage') return 'sale'
  if (raw === 'stock_in') return 'restock'
  return raw
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Unable to load usage history.'
}

const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const parseRupiahText = (value: string) => {
  const normalized = value.trim()
  const hasCommaDecimal = /,\d{1,2}$/.test(normalized)
  const withoutCurrencySeparators = normalized.replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(withoutCurrencySeparators)

  if (!Number.isFinite(parsed)) return null

  // Some older restock notes were saved 100x too large because the value was
  // formatted as cents before being written to the notes field. Keep the UI sane
  // for those legacy notes without changing the database row.
  if (hasCommaDecimal && parsed >= 1000000 && parsed % 100 === 0) {
    return parsed / 100
  }

  return parsed
}

const formatNotesWithPrice = (notes: string) => {
  return notes.replace(/Rp\s*([\d.]+(?:,\d{1,2})?)/g, (_match, number: string) => {
    const parsed = parseRupiahText(number)

    if (parsed === null) return `Rp ${number}`

    return formatCurrency(parsed, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  })
}

const getTypeMeta = (type: string) => {
  switch (type) {
    case 'sale':
      return {
        label: 'Order Sale',
        icon: ShoppingCartIcon,
        badge: 'bg-slate-50 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      }
    case 'restock':
      return {
        label: 'Restock',
        icon: ArrowUpTrayIcon,
        badge: 'bg-green-50 text-green-700 border-green-200',
        dot: 'bg-green-500',
      }
    case 'adjustment':
      return {
        label: 'Adjustment',
        icon: AdjustmentsHorizontalIcon,
        badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        dot: 'bg-yellow-500',
      }
    default:
      return {
        label: type || 'Transaction',
        icon: ArrowPathIcon,
        badge: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
      }
  }
}

const getPerformedBy = (transaction: UsageTransaction) => {
  if (transaction.performed_by_name) return transaction.performed_by_name
  if (transaction.staff_name && transaction.staff_role) {
    const roleLabel = transaction.staff_role.charAt(0).toUpperCase() + transaction.staff_role.slice(1)
    return `${transaction.staff_name} · ${roleLabel}`
  }
  if (transaction.staff_name) return transaction.staff_name
  return 'System Auto-Process'
}

const getTransactionTitle = (transaction: UsageTransaction) => {
  if (transaction.type === 'sale') {
    if (transaction.order_number) return `Order ${transaction.order_number}`
    if (transaction.order_id) return `Order #${transaction.order_id.slice(-8)}`
    return 'Order Sale'
  }
  if (transaction.type === 'restock') return 'Stock Replenishment'
  if (transaction.type === 'adjustment') return 'Stock Adjustment'
  return 'Inventory Transaction'
}

const getTotalQuantityUsed = (transaction: UsageTransaction) => {
  return transaction.details.reduce((total, detail) => total + Math.abs(Number(detail.quantity_used || 0)), 0)
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export default function UsageHistoryTab() {
  const [filterType, setFilterType] = useState<UsageFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [transactions, setTransactions] = useState<UsageTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    void fetchUsageHistory()
  }, [])

  async function fetchUsageHistory() {
    setLoading(true)
    setError('')

    try {
      const { data: transactionsData, error: transError } = await supabase
        .from('usage_transactions')
        .select(
          'id, transaction_type, type, timestamp, order_id, product_id, product_name, quantity_sold, notes, performed_by, performed_by_name, created_at',
        )
        .order('timestamp', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })

      if (transError) throw transError

      const transactionRows = (transactionsData || []) as UsageTransactionRow[]
      const orderIds = Array.from(new Set(transactionRows.map((item) => item.order_id).filter(Boolean))) as string[]
      const staffIds = Array.from(new Set(transactionRows.map((item) => item.performed_by).filter(Boolean))) as string[]

      const [ordersResult, staffResult, detailsResult, inventoryResult] = await Promise.all([
        orderIds.length > 0
          ? supabase.from('orders').select('id, order_number').in('id', orderIds)
          : Promise.resolve({ data: [] as OrderRow[], error: null }),
        staffIds.length > 0
          ? supabase.from('staff').select('id, name, role').in('id', staffIds)
          : Promise.resolve({ data: [] as StaffRow[], error: null }),
        supabase
          .from('usage_transaction_details')
          .select('usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock'),
        supabase.from('inventory_items').select('id, name'),
      ])

      if (ordersResult.error) throw ordersResult.error
      if (staffResult.error) throw staffResult.error
      if (detailsResult.error) throw detailsResult.error
      if (inventoryResult.error) throw inventoryResult.error

      const ordersMap = new Map<string, OrderRow>()
      ;((ordersResult.data || []) as OrderRow[]).forEach((order) => ordersMap.set(order.id, order))

      const staffMap = new Map<string, StaffRow>()
      ;((staffResult.data || []) as StaffRow[]).forEach((staff) => staffMap.set(staff.id, staff))

      const inventoryMap = new Map<string, InventoryItemRow>()
      ;((inventoryResult.data || []) as InventoryItemRow[]).forEach((item) => inventoryMap.set(item.id, item))

      const detailsByTransaction = new Map<string, UsageTransactionDetail[]>()
      ;((detailsResult.data || []) as UsageDetailRow[]).forEach((detail) => {
        const inventoryItem = inventoryMap.get(detail.inventory_item_id)
        const normalizedDetail: UsageTransactionDetail = {
          inventory_item_id: detail.inventory_item_id,
          ingredient_name: inventoryItem?.name || detail.ingredient_name || 'Unknown Item',
          quantity_used: Number(detail.quantity_used || 0),
          unit: detail.unit,
          previous_stock: detail.previous_stock,
          new_stock: detail.new_stock,
        }

        const currentDetails = detailsByTransaction.get(detail.usage_transaction_id) || []
        currentDetails.push(normalizedDetail)
        detailsByTransaction.set(detail.usage_transaction_id, currentDetails)
      })

      const transformedTransactions = transactionRows.map((transaction) => {
        const order = transaction.order_id ? ordersMap.get(transaction.order_id) : undefined
        const staff = transaction.performed_by ? staffMap.get(transaction.performed_by) : undefined
        const type = normalizeType(transaction.transaction_type || transaction.type)

        return {
          id: transaction.id,
          type,
          timestamp: transaction.timestamp || transaction.created_at || new Date().toISOString(),
          order_id: transaction.order_id,
          order_number: order?.order_number,
          product_id: transaction.product_id,
          product_name: transaction.product_name,
          quantity_sold: transaction.quantity_sold,
          notes: transaction.notes,
          performed_by: transaction.performed_by,
          performed_by_name: transaction.performed_by_name,
          staff_name: staff?.name,
          staff_role: staff?.role,
          details: detailsByTransaction.get(transaction.id) || [],
        }
      })

      setTransactions(transformedTransactions)
    } catch (fetchError) {
      console.error('Error fetching usage history:', fetchError)
      setError(getErrorMessage(fetchError))
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return transactions
      .filter((transaction) => filterType === 'all' || transaction.type === filterType)
      .filter((transaction) => {
        if (!query) return true

        return (
          getTransactionTitle(transaction).toLowerCase().includes(query) ||
          transaction.product_name?.toLowerCase().includes(query) ||
          transaction.notes?.toLowerCase().includes(query) ||
          transaction.order_number?.toLowerCase().includes(query) ||
          getPerformedBy(transaction).toLowerCase().includes(query) ||
          transaction.details.some((detail) => detail.ingredient_name.toLowerCase().includes(query))
        )
      })
  }, [filterType, searchQuery, transactions])

  const stats = useMemo(
    () => ({
      totalTransactions: transactions.length,
      sales: transactions.filter((transaction) => transaction.type === 'sale').length,
      restocks: transactions.filter((transaction) => transaction.type === 'restock').length,
      adjustments: transactions.filter((transaction) => transaction.type === 'adjustment').length,
    }),
    [transactions],
  )

  const toggleExpanded = (transactionId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <section className="flex-shrink-0 border-b border-gray-200 bg-white px-4 pb-4 pt-4 md:px-6 md:pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Stock Usage History</h2>
            <p className="mt-1 text-sm text-gray-500">
              Track inventory usage from order sales, restocks, and stock adjustments.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void fetchUsageHistory()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="relative min-w-0 sm:w-80">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Total Transactions" value={stats.totalTransactions} />
          <SummaryCard label="Order Sales" value={stats.sales} />
          <SummaryCard label="Restocks" value={stats.restocks} />
          <SummaryCard label="Adjustments" value={stats.adjustments} />
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col px-4 py-4 md:px-6">
        <div className="mb-3 flex flex-shrink-0 items-center gap-2 overflow-x-auto">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilterType(filter.key)}
              className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
                filterType === filter.key
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="flex h-full min-h-64 items-center justify-center text-sm text-gray-500">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-semibold text-gray-900">Unable to load usage history</p>
              <p className="max-w-md text-sm text-gray-500">{error}</p>
              <button
                type="button"
                onClick={() => void fetchUsageHistory()}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-semibold text-gray-900">No transactions found</p>
              <p className="mt-1 text-sm text-gray-500">Try changing the filter or search keyword.</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="hidden grid-cols-[140px_150px_1.4fr_1fr_110px_56px] border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 lg:grid">
                <span>Date</span>
                <span>Type</span>
                <span>Reference</span>
                <span>Performed By</span>
                <span className="text-right">Items</span>
                <span />
              </div>

              <div className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const meta = getTypeMeta(transaction.type)
                  const Icon = meta.icon
                  const dateTime = formatDateTime(transaction.timestamp)
                  const isExpanded = expandedIds.has(transaction.id)
                  const totalQuantity = getTotalQuantityUsed(transaction)

                  return (
                    <div key={transaction.id} className="bg-white">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(transaction.id)}
                        className="grid w-full grid-cols-1 gap-3 px-4 py-4 text-left transition hover:bg-gray-50 lg:grid-cols-[140px_150px_1.4fr_1fr_110px_56px] lg:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{dateTime.time}</p>
                          <p className="text-xs text-gray-500">{dateTime.date}</p>
                        </div>

                        <div>
                          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${meta.badge}`}>
                            <Icon className="h-4 w-4" />
                            {meta.label}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">{getTransactionTitle(transaction)}</p>
                          {transaction.product_name ? (
                            <p className="truncate text-xs text-gray-500">
                              {transaction.product_name}
                              {transaction.quantity_sold ? ` · ${transaction.quantity_sold}x` : ''}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
                          <UserCircleIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{getPerformedBy(transaction)}</span>
                        </div>

                        <div className="text-left lg:text-right">
                          <p className="text-sm font-semibold text-gray-900">{transaction.details.length} items</p>
                          <p className="text-xs text-gray-500">{formatNumber(totalQuantity)} total</p>
                        </div>

                        <div className="flex justify-end">
                          {isExpanded ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Transaction Notes</p>
                              <p className="mt-2 text-sm text-gray-700">
                                {transaction.notes && !transaction.notes.toLowerCase().includes('auto-deduct')
                                  ? formatNotesWithPrice(transaction.notes)
                                  : 'No manual notes for this transaction.'}
                              </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                  Inventory Changes ({transaction.details.length})
                                </p>
                              </div>

                              {transaction.details.length === 0 ? (
                                <p className="text-sm text-gray-500">No inventory detail recorded.</p>
                              ) : (
                                <div className="space-y-2">
                                  {transaction.details.map((detail, index) => {
                                    const increased =
                                      detail.previous_stock !== null &&
                                      detail.previous_stock !== undefined &&
                                      detail.new_stock !== null &&
                                      detail.new_stock !== undefined
                                        ? Number(detail.new_stock) > Number(detail.previous_stock)
                                        : transaction.type === 'restock'

                                    return (
                                      <div
                                        key={`${transaction.id}-${detail.inventory_item_id}-${index}`}
                                        className="grid gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
                                      >
                                        <span className="font-semibold text-gray-800">{detail.ingredient_name}</span>
                                        <span className="text-xs text-gray-500">
                                          {formatNumber(detail.previous_stock)} → {formatNumber(detail.new_stock)} {detail.unit}
                                        </span>
                                        <span
                                          className={`justify-self-start rounded-md px-2 py-1 text-xs font-bold sm:justify-self-end ${
                                            increased ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}
                                        >
                                          {increased ? '+' : '-'}{formatNumber(detail.quantity_used)} {detail.unit}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}