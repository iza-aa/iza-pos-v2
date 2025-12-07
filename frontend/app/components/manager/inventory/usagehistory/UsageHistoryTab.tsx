'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'

interface UsageTransaction {
  id: string
  type: string
  timestamp: string
  product_id?: string
  product_name?: string
  quantity_sold?: number
  notes?: string
  performed_by?: string
  details: {
    inventory_item_id: string
    ingredient_name: string
    quantity_used: number
    unit: string
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
      // Fetch usage transactions
      const { data: transactionsData, error: transError } = await supabase
        .from('usage_transactions')
        .select('*')
        .order('timestamp', { ascending: false })

      if (transError) {
        console.error('Transactions error:', transError)
        throw transError
      }

      console.log('Transactions fetched:', transactionsData)

      // Fetch transaction details
      const { data: detailsData, error: detailsError } = await supabase
        .from('usage_transaction_details')
        .select('*')

      if (detailsError) {
        console.error('Details error:', detailsError)
        throw detailsError
      }

      console.log('Details fetched:', detailsData)

      // Fetch inventory items for names
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, name')

      if (inventoryError) {
        console.error('Inventory error:', inventoryError)
        throw inventoryError
      }

      console.log('Inventory items fetched:', inventoryData)

      // Transform data manually
      const transformedTransactions: UsageTransaction[] = (transactionsData || []).map(trans => {
        const transDetails = (detailsData || [])
          .filter((detail: any) => detail.usage_transaction_id === trans.id)
          .map((detail: any) => {
            const inventoryItem = (inventoryData || []).find((inv: any) => inv.id === detail.inventory_item_id)
            return {
              inventory_item_id: detail.inventory_item_id,
              ingredient_name: inventoryItem?.name || detail.ingredient_name || 'Unknown',
              quantity_used: detail.quantity_used,
              unit: detail.unit
            }
          })

        return {
          id: trans.id,
          type: trans.type,
          timestamp: trans.timestamp,
          product_id: trans.product_id,
          product_name: trans.product_name,
          quantity_sold: trans.quantity_sold,
          notes: trans.notes,
          performed_by: trans.performed_by,
          details: transDetails
        }
      })

      console.log('Transformed transactions:', transformedTransactions)

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-gray-100 text-gray-900'
      case 'restock': return 'text-gray-900'
      case 'adjustment': return 'bg-gray-100 text-gray-900'
      case 'waste': return 'text-gray-900'
      default: return 'bg-gray-100 text-gray-900'
    }
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'restock': return { backgroundColor: '#B2FF5E' }
      case 'waste': return { backgroundColor: '#FF6859' }
      default: return {}
    }
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
                <div key={transaction.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col break-inside-avoid mb-4">
                  {/* Transaction Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(transaction.type)}`}
                        style={getTypeStyle(transaction.type)}>
                        {transaction.type}
                      </span>
                      <p className="text-xs text-gray-500">{formatTime(transaction.timestamp)}</p>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(transaction.timestamp)}</p>
                  </div>

                  {/* Transaction Content */}
                  <div className="p-4 flex-1">
                    {/* Product Info */}
                    {transaction.product_name && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500">Product</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {transaction.product_name}
                        </p>
                        {transaction.quantity_sold && (
                          <p className="text-xs text-gray-600">Qty: {transaction.quantity_sold}</p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {transaction.notes && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500">Notes</p>
                        <p className="text-sm text-gray-700">{transaction.notes}</p>
                      </div>
                    )}

                    {/* Ingredients Detail */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Ingredients:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {transaction.details.map((detail, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-700 truncate flex-1">{detail.ingredient_name}</span>
                              <span className="font-semibold flex-shrink-0 ml-2 text-gray-900">
                                {transaction.type === 'restock' ? '+' : '-'}{detail.quantity_used} {detail.unit}
                              </span>
                            </div>
                          </div>
                        ))}
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
