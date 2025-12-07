'use client'

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CubeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface InventoryStatsProps {
  totalItems: number
  inStock: number
  lowStock: number
  outOfStock: number
}

export default function InventoryStats({ totalItems, inStock, lowStock, outOfStock }: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-6">
      <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm text-gray-500 mb-1">Total Items</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <CubeIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm text-gray-500 mb-1">In Stock</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{inStock}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#B2FF5E' }}>
            <ArrowTrendingUpIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-900" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm text-gray-500 mb-1">Low Stock</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{lowStock}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFE52A' }}>
            <ArrowTrendingDownIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-900" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm text-gray-500 mb-1">Out of Stock</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{outOfStock}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FF6859' }}>
            <ExclamationTriangleIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
