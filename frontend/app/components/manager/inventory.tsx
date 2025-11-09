'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { PlusIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import InventoryStats from './inventory/InventoryStats'
import InventoryFilters from './inventory/InventoryFilters'
import InventoryTable from './inventory/InventoryTable'

interface InventoryItem {
  id: number
  name: string
  category: string
  currentStock: number
  reorderLevel: number
  unit: string
  supplier: string
  lastRestocked: string
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
}

const categories = [
  { id: 'all', name: 'All Items', count: 156 },
  { id: 'ingredients', name: 'Ingredients', count: 45 },
  { id: 'beverages', name: 'Beverages', count: 32 },
  { id: 'packaging', name: 'Packaging', count: 28 },
  { id: 'cleaning', name: 'Cleaning Supplies', count: 15 },
  { id: 'equipment', name: 'Equipment', count: 36 },
]

export default function InventoryManager() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showStats, setShowStats] = useState(true)

  useEffect(() => {
    // Mock inventory data
    setItems([
      { id: 1, name: 'Coffee Beans (Arabica)', category: 'Ingredients', currentStock: 25, reorderLevel: 10, unit: 'kg', supplier: 'PT Kopi Nusantara', lastRestocked: '2025-11-05', status: 'in-stock' },
      { id: 2, name: 'Fresh Milk', category: 'Ingredients', currentStock: 8, reorderLevel: 15, unit: 'liters', supplier: 'Dairy Farm Ltd', lastRestocked: '2025-11-07', status: 'low-stock' },
      { id: 3, name: 'Sugar', category: 'Ingredients', currentStock: 50, reorderLevel: 20, unit: 'kg', supplier: 'Sweet Supply Co', lastRestocked: '2025-11-01', status: 'in-stock' },
      { id: 4, name: 'Paper Cups (12oz)', category: 'Packaging', currentStock: 500, reorderLevel: 200, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-11-06', status: 'in-stock' },
      { id: 5, name: 'Plastic Lids', category: 'Packaging', currentStock: 150, reorderLevel: 300, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-10-28', status: 'low-stock' },
      { id: 6, name: 'Espresso Machine Cleaner', category: 'Cleaning Supplies', currentStock: 0, reorderLevel: 5, unit: 'bottles', supplier: 'Clean Tech', lastRestocked: '2025-10-15', status: 'out-of-stock' },
      { id: 7, name: 'Chocolate Syrup', category: 'Ingredients', currentStock: 12, reorderLevel: 8, unit: 'bottles', supplier: 'Sweet Supply Co', lastRestocked: '2025-11-04', status: 'in-stock' },
      { id: 8, name: 'Whipped Cream', category: 'Ingredients', currentStock: 6, reorderLevel: 10, unit: 'cans', supplier: 'Dairy Farm Ltd', lastRestocked: '2025-11-07', status: 'low-stock' },
      { id: 9, name: 'Vanilla Extract', category: 'Ingredients', currentStock: 3, reorderLevel: 5, unit: 'bottles', supplier: 'Flavor World', lastRestocked: '2025-11-02', status: 'low-stock' },
      { id: 10, name: 'Paper Napkins', category: 'Packaging', currentStock: 1000, reorderLevel: 500, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-11-05', status: 'in-stock' },
    ])
  }, [])

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase()
    return matchesSearch && matchesCategory
  })

  const stats = {
    totalItems: items.length,
    lowStock: items.filter(i => i.status === 'low-stock').length,
    outOfStock: items.filter(i => i.status === 'out-of-stock').length,
    inStock: items.filter(i => i.status === 'in-stock').length,
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex flex-col overflow-hidden">
      {/* Section 1: Header + Stats + Filters (Fixed) */}
      <section className="flex-shrink-0 p-8 pb-4 overflow-hidden">
        {/* Header dengan Title dan Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
            {viewAsOwner && (
              <span className="inline-block text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                👁️ Viewing as Owner
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!viewAsOwner && (
              <>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                  <ArrowPathIcon className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Restock</span>
                </button>
                <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition font-medium">
                  <PlusIcon className="w-5 h-5" />
                  Add New Item
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div className="mb-6">
            <InventoryStats
              totalItems={stats.totalItems}
              inStock={stats.inStock}
              lowStock={stats.lowStock}
              outOfStock={stats.outOfStock}
            />
          </div>
        )}

        {/* Filters */}
        <InventoryFilters
          categories={categories}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          showStats={showStats}
          onCategoryChange={setSelectedCategory}
          onSearchChange={setSearchQuery}
          onToggleStats={() => setShowStats(!showStats)}
        />
      </section>

      {/* Section 2: Table List (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-8 pb-8">
        <InventoryTable items={filteredItems} viewAsOwner={viewAsOwner} />
      </section>
    </div>
  )
}
