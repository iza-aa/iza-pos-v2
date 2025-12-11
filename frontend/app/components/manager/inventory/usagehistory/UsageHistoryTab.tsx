'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, EyeIcon, EyeSlashIcon, ShoppingCartIcon, ArrowUpTrayIcon, AdjustmentsHorizontalIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/numberConstants'
import { COLORS } from '@/lib/themeConstants'

interface UsageTransaction {
  id: string
  type: string
  timestamp: string
  order_id?: string
  order_number?: string
  product_id?: string
  product_name?: string
  quantity_sold?: number
  notes?: string
  performed_by?: string
  performed_by_name?: string
  staff_name?: string
  staff_role?: string
  details: {
    inventory_item_id: string
    ingredient_name: string
    quantity_used: number
    unit: string
    previous_stock?: number
    new_stock?: number
  }[]
}

interface UsageHistoryTabProps {
  viewAsOwner: boolean
}

export default function UsageHistoryTab({ viewAsOwner }: UsageHistoryTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'restock' | 'adjustment'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
  const [transactions, setTransactions] = useState<UsageTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageHistory()
  }, [])

  async function fetchUsageHistory() {
    setLoading(true)
    try {
      // Fetch usage transactions first
      const { data: transactionsData, error: transError } = await supabase
        .from('usage_transactions')
        .select('id, transaction_type, type, timestamp, order_id, product_id, product_name, quantity_sold, notes, performed_by, performed_by_name, created_at')
        .order('timestamp', { ascending: false })

      if (transError) {
        console.error('Transactions error:', transError)
        throw transError
      }

      // Fetch orders data if there are order_ids
      const orderIds = transactionsData
        ?.filter((t: any) => t.order_id)
        .map((t: any) => t.order_id) || []
      
      let ordersMap: Record<string, any> = {}
      if (orderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_number')
          .in('id', orderIds)
        
        ordersData?.forEach((order: any) => {
          ordersMap[order.id] = order
        })
      }

      // Fetch staff data if there are performed_by ids
      const staffIds = transactionsData
        ?.filter((t: any) => t.performed_by)
        .map((t: any) => t.performed_by) || []
      
      let staffMap: Record<string, any> = {}
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, name, role')
          .in('id', staffIds)
        
        staffData?.forEach((staff: any) => {
          staffMap[staff.id] = staff
        })
      }

      // Fetch transaction details
      const { data: detailsData, error: detailsError } = await supabase
        .from('usage_transaction_details')
        .select('usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock')

      if (detailsError) {
        console.error('Details error:', detailsError)
        throw detailsError
      }

      // Fetch inventory items for names
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, name')

      if (inventoryError) {
        console.error('Inventory error:', inventoryError)
        throw inventoryError
      }

      // Transform data manually
      const transformedTransactions: UsageTransaction[] = (transactionsData || []).map((trans: any) => {
        const transDetails = (detailsData || [])
          .filter((detail: any) => detail.usage_transaction_id === trans.id)
          .map((detail: any) => {
            const inventoryItem = (inventoryData || []).find((inv: any) => inv.id === detail.inventory_item_id)
            return {
              inventory_item_id: detail.inventory_item_id,
              ingredient_name: inventoryItem?.name || detail.ingredient_name || 'Unknown',
              quantity_used: detail.quantity_used,
              unit: detail.unit,
              previous_stock: detail.previous_stock,
              new_stock: detail.new_stock
            }
          })

        const order = trans.order_id ? ordersMap[trans.order_id] : null
        const staff = trans.performed_by ? staffMap[trans.performed_by] : null

        // Normalize transaction type
        let transactionType = trans.transaction_type || trans.type || 'sale'
        // Map custom types to standard types
        if (transactionType === 'order_usage') {
          transactionType = 'sale'
        }

        return {
          id: trans.id,
          type: transactionType,
          timestamp: trans.timestamp,
          order_id: trans.order_id,
          order_number: order?.order_number,
          product_id: trans.product_id,
          product_name: trans.product_name,
          quantity_sold: trans.quantity_sold,
          notes: trans.notes,
          performed_by: trans.performed_by,
          performed_by_name: trans.performed_by_name,
          staff_name: staff?.name,
          staff_role: staff?.role,
          details: transDetails
        }
      })

      setTransactions(transformedTransactions)
    } catch (error) {
      console.error('Error fetching usage history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions
    .filter(t => filterType === 'all' || t.type === filterType)
    .filter(t => 
      t.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.details.some(d => d.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  const stats = {
    totalTransactions: transactions.length,
    sales: transactions.filter(t => t.type === 'sale').length,
    restocks: transactions.filter(t => t.type === 'restock').length,
    adjustments: transactions.filter(t => t.type === 'adjustment').length
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatNotesWithPrice = (notes: string) => {
    // Format any number after "Rp " with thousand separator
    return notes.replace(/Rp\s*([\d.]+)/g, (match, number) => {
      const cleanNumber = number.replace(/\./g, '')
      return formatCurrency(Number(cleanNumber), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-gray-900 text-white'
      case 'restock': return 'text-gray-900'
      case 'adjustment': return 'bg-yellow-100 text-yellow-900 border border-yellow-300'
      case 'waste': return 'text-white'
      default: return 'bg-gray-100 text-gray-900'
    }
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'restock': return { backgroundColor: COLORS.PRIMARY_LIGHT }
      case 'waste': return { backgroundColor: COLORS.DANGER }
      default: return {}
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ShoppingCartIcon className="w-3.5 h-3.5" />
      case 'restock': return <ArrowUpTrayIcon className="w-3.5 h-3.5" />
      case 'adjustment': return <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
      default: return null
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sale': return 'Order Sale'
      case 'restock': return 'Stock In'
      case 'adjustment': return 'Adjustment'
      case 'waste': return 'Waste'
      default: return type
    }
  }

  const getTransactionTitle = (transaction: UsageTransaction) => {
    if (transaction.type === 'sale') {
      // Use order_number if available, otherwise fallback to order_id slice
      if (transaction.order_number) {
        return `Order ${transaction.order_number}`
      } else if (transaction.order_id) {
        return `Order #${transaction.order_id.slice(-8)}`
      }
      return 'Order Sale'
    } else if (transaction.type === 'restock') {
      return 'Stock Replenishment'
    } else if (transaction.type === 'adjustment') {
      return 'Stock Adjustment'
    }
    return 'Transaction'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + Stats */}
      <section className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Stock Usage History</h2>
            <p className="text-xs md:text-sm text-gray-500">Track all inventory movements and transactions</p>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Toggle Stats Button */}
            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              title={showStats ? "Hide Statistics" : "Show Statistics"}
            >
              {showStats ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Search */}
            <div className="relative flex-1 md:flex-initial">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 pb-4 md:pb-6 gap-3 md:gap-4">
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200">
            <p className="text-xs md:text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200">
            <p className="text-xs md:text-sm text-gray-600 mb-1">Sales</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.sales}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200">
            <p className="text-xs md:text-sm text-gray-600 mb-1">Restocks</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.restocks}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200">
            <p className="text-xs md:text-sm text-gray-600 mb-1">Adjustments</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.adjustments}</p>
          </div>
        </div>
        )}
      </section>

      {/* Timeline (Scrollable) */}
      <section className="flex-1 overflow-hidden px-4 md:px-6 py-4 md:py-6 bg-gray-100 flex flex-col">
        {/* Filter - Fixed at top */}
        <div className="flex items-center gap-2 mb-4 flex-shrink-0 overflow-x-auto">
          {['all', 'sale', 'restock', 'adjustment'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition whitespace-nowrap ${
                filterType === type
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 space-y-4">
              {filteredTransactions.map(transaction => (
                <div key={transaction.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col break-inside-avoid mb-4 hover:shadow-md transition-shadow">
                  {/* Transaction Header with Badge */}
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${getTypeColor(transaction.type)}`}
                        style={getTypeStyle(transaction.type)}>
                        {getTypeIcon(transaction.type)}
                        {getTypeLabel(transaction.type)}
                      </span>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">{formatTime(transaction.timestamp)}</p>
                        <p className="text-[10px] text-gray-500">{formatDate(transaction.timestamp)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Content */}
                  <div className="p-3 flex-1 space-y-3">
                    {/* Main Transaction Info */}
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900 mb-1">
                        {getTransactionTitle(transaction)}
                      </h3>
                      {transaction.product_name && (
                        <p className="text-xs text-gray-600">
                          {transaction.product_name} {transaction.quantity_sold && `(${transaction.quantity_sold}x)`}
                        </p>
                      )}
                    </div>

                    {/* Performed By - Compact */}
                    <div className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
                      <UserCircleIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-500">Performed by:</span>
                      <span className="font-semibold text-gray-900 truncate">
                        {(() => {
                          // Priority: performed_by_name (for owners/managers) > staff_name + role (for staff) > fallback
                          if (transaction.performed_by_name) {
                            return transaction.performed_by_name
                          }
                          if (transaction.staff_name && transaction.staff_role) {
                            const roleLabel = transaction.staff_role.charAt(0).toUpperCase() + transaction.staff_role.slice(1)
                            return `${transaction.staff_name} - ${roleLabel}`
                          }
                          if (transaction.staff_name) {
                            return transaction.staff_name
                          }
                          return 'System Auto-Process'
                        })()}
                      </span>
                    </div>

                    {/* Additional Notes */}
                    {transaction.notes && !transaction.notes.toLowerCase().includes('auto-deduct') && (
                      <div className={`p-2 rounded-lg border ${
                        transaction.notes.toUpperCase().includes('DELETED')
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <p className={`text-[10px] font-medium mb-0.5 ${
                          transaction.notes.toUpperCase().includes('DELETED')
                            ? 'text-red-700'
                            : 'text-yellow-700'
                        }`}>
                          {transaction.notes.toUpperCase().includes('DELETED') ? '🗑️ ITEM DELETED' : 'REMARKS'}
                        </p>
                        <p className={`text-xs ${
                          transaction.notes.toUpperCase().includes('DELETED')
                            ? 'text-red-900 font-semibold'
                            : 'text-yellow-900'
                        }`}>
                          {formatNotesWithPrice(transaction.notes)}
                        </p>
                      </div>
                    )}

                    {/* Ingredients Detail - Improved */}
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Inventory Changes ({transaction.details.length})
                      </h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {transaction.details.map((detail, idx) => {
                          // Determine if stock increased or decreased
                          const isIncrease = detail.new_stock && detail.previous_stock 
                            ? detail.new_stock > detail.previous_stock 
                            : transaction.type === 'restock'
                          
                          return (
                            <div key={idx} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg border border-gray-100">
                              <span className="text-xs text-gray-700 font-medium truncate flex-1">
                                {detail.ingredient_name}
                              </span>
                              <span className={`text-xs font-bold flex-shrink-0 ml-2 px-2 py-0.5 rounded ${
                                isIncrease
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {isIncrease ? '+' : '-'}{detail.quantity_used} {detail.unit}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
