'use client'

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface InventoryStatsProps {
  totalItems: number
  inStock: number
  lowStock: number
  outOfStock: number
}

export default function InventoryStats({ totalItems, inStock, lowStock, outOfStock }: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-6 mt-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Items</p>
            <p className="text-3xl font-bold text-gray-800">{totalItems}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">📦</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">In Stock</p>
            <p className="text-3xl font-bold text-green-600">{inStock}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Low Stock</p>
            <p className="text-3xl font-bold text-yellow-600">{lowStock}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <ArrowTrendingDownIcon className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Out of Stock</p>
            <p className="text-3xl font-bold text-red-600">{outOfStock}</p>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
        </div>
      </div>
    </div>
  )
}
