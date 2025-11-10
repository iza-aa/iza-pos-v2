'use client'

import { useState } from 'react'
import { usageTransactions } from '@/app/lib/mockData'

interface UsageHistoryTabProps {
  viewAsOwner: boolean
}

export default function UsageHistoryTab({ viewAsOwner }: UsageHistoryTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'restock' | 'adjustment'>('all')

  const filteredTransactions = filterType === 'all' 
    ? usageTransactions 
    : usageTransactions.filter(t => t.type === filterType)

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
      <section className="flex-shrink-0 p-8 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Stock Usage History</h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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

        {/* Filter */}
        <div className="flex items-center gap-2">
          {['all', 'sale', 'restock', 'adjustment'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Timeline (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="space-y-4">
          {filteredTransactions.map(transaction => (
            <div key={transaction.id} className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Transaction Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(transaction.type)}`}>
                    {transaction.type}
                  </span>
                  <div>
                    <p className="text-sm text-gray-500">{formatDate(transaction.timestamp)} • {formatTime(transaction.timestamp)}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Info */}
              {transaction.productName && (
                <div className="mb-3">
                  <p className="text-base font-semibold text-gray-900">
                    {transaction.quantitySold} × {transaction.productName}
                  </p>
                </div>
              )}

              {/* Ingredients Detail */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {transaction.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{ing.ingredientName}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${ing.quantityUsed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {ing.quantityUsed > 0 ? '+' : ''}{ing.quantityUsed} {ing.unit}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({ing.previousStock} → {ing.newStock} {ing.unit})
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {transaction.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">💬 {transaction.notes}</p>
                </div>
              )}
            </div>
          ))}

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
