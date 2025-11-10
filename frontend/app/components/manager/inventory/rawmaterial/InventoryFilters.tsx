'use client'

import { MagnifyingGlassIcon, FunnelIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface Category {
  id: string
  name: string
  count: number
}

interface InventoryFiltersProps {
  categories: Category[]
  selectedCategory: string
  searchQuery: string
  showStats: boolean
  onCategoryChange: (categoryId: string) => void
  onSearchChange: (query: string) => void
  onToggleStats: () => void
}

export default function InventoryFilters({ 
  categories, 
  selectedCategory, 
  searchQuery,
  showStats,
  onCategoryChange, 
  onSearchChange,
  onToggleStats
}: InventoryFiltersProps) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-200">
      {/* Category Pills */}
      <div className="flex items-center gap-2 flex-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {/* Toggle Stats Button */}
      <button 
        onClick={onToggleStats}
        className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
        title={showStats ? "Hide Statistics" : "Show Statistics"}
      >
        {showStats ? (
          <EyeSlashIcon className="w-5 h-5 text-gray-600" />
        ) : (
          <EyeIcon className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
        <FunnelIcon className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filter</span>
      </button>
    </div>
  )
}
