'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, ArrowPathIcon, FunnelIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

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

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-700'
      case 'low-stock': return 'bg-yellow-100 text-yellow-700'
      case 'out-of-stock': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in-stock': return 'In Stock'
      case 'low-stock': return 'Low Stock'
      case 'out-of-stock': return 'Out of Stock'
      default: return status
    }
  }

  const stats = {
    totalItems: items.length,
    lowStock: items.filter(i => i.status === 'low-stock').length,
    outOfStock: items.filter(i => i.status === 'out-of-stock').length,
    inStock: items.filter(i => i.status === 'in-stock').length,
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
            {viewAsOwner && (
              <span className="inline-block mt-2 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
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
                <button className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-xl hover:bg-teal-600 transition font-medium">
                  <PlusIcon className="w-5 h-5" />
                  Add New Item
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Items</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalItems}</p>
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
                <p className="text-3xl font-bold text-green-600">{stats.inStock}</p>
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
                <p className="text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
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
                <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-200">
          {/* Category Pills */}
          <div className="flex items-center gap-2 flex-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-teal-500 text-white'
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 w-64"
            />
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
            <FunnelIcon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Item Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Reorder Level</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Last Restocked</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              {!viewAsOwner && (
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{item.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-semibold ${
                    item.currentStock <= item.reorderLevel ? 'text-red-600' : 'text-gray-800'
                  }`}>
                    {item.currentStock} {item.unit}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{item.reorderLevel} {item.unit}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{item.supplier}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">
                    {new Date(item.lastRestocked).toLocaleDateString('id-ID', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </td>
                {!viewAsOwner && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-teal-600 hover:text-teal-800 font-medium">
                        Restock
                      </button>
                      <span className="text-gray-300">|</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Edit
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
