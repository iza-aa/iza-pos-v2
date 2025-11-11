'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { usageTransactions } from '@/lib/mockData'

interface UsageHistoryTabProps {
  viewAsOwner: boolean
}

export default function UsageHistoryTab({ viewAsOwner }: UsageHistoryTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'restock' | 'adjustment'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)

  const filteredTransactions = usageTransactions
    .filter(t => filterType === 'all' || t.type === filterType)
    .filter(t => 
      t.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ingredients.some(ing => ing.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  const stats = {
    totalTransactions: usageTransactions.length,
    sales: usageTransactions.filter(t => t.type === 'sale').length,
    restocks: usageTransactions.filter(t => t.type === 'restock').length,
    adjustments: usageTransactions.filter(t => t.type === 'adjustment').length
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
      case 'sale': return 'bg-blue-100 text-blue-800'
      case 'restock': return 'bg-green-100 text-green-800'
      case 'adjustment': return 'bg-orange-100 text-orange-800'
      case 'waste': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + Stats */}
      <section className="flex-shrink-0 px-6 pt-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-800">Stock Usage History</h2>
            <p className="text-sm text-gray-500">Track all inventory movements and transactions</p>
          </div>

          <div className="flex items-center gap-4">
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
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-4 pb-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Sales</p>
            <p className="text-2xl font-bold text-blue-600">{stats.sales}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Restocks</p>
            <p className="text-2xl font-bold text-green-600">{stats.restocks}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Adjustments</p>
            <p className="text-2xl font-bold text-orange-600">{stats.adjustments}</p>
          </div>
        </div>
        )}
      </section>

      {/* Timeline (Scrollable) */}
      <section className="flex-1 overflow-hidden px-6 py-6 bg-gray-100 flex flex-col">
        {/* Filter - Fixed at top */}
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          {['all', 'sale', 'restock', 'adjustment'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filterType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="columns-4 gap-4 space-y-4">
          {filteredTransactions.map(transaction => (
            <div key={transaction.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col break-inside-avoid mb-4">
              {/* Transaction Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(transaction.type)}`}>
                    {transaction.type}
                  </span>
                  <p className="text-xs text-gray-500">{formatTime(transaction.timestamp)}</p>
                </div>
                <p className="text-xs text-gray-500">{formatDate(transaction.timestamp)}</p>
              </div>

              {/* Transaction Content */}
              <div className="p-4 flex-1">
                {/* Product Info */}
                {transaction.productName && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {transaction.quantitySold} × {transaction.productName}
                    </p>
                  </div>
                )}

                {/* Ingredients Detail */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Ingredients:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {transaction.ingredients.map((ing, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-700 truncate flex-1">{ing.ingredientName}</span>
                          <span className={`font-semibold flex-shrink-0 ml-2 ${ing.quantityUsed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ing.quantityUsed > 0 ? '+' : ''}{ing.quantityUsed} {ing.unit}
                          </span>
                        </div>
                        <div className="text-gray-400 text-xs">
                          {ing.previousStock} → {ing.newStock} {ing.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {transaction.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">💬 {transaction.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
