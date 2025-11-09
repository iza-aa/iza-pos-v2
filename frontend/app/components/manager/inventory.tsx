'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { PlusIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import InventoryStats from './inventory/InventoryStats'
import InventoryFilters from './inventory/InventoryFilters'
import InventoryTable from './inventory/InventoryTable'
import InventoryModal from './InventoryModal'
import { inventoryItems as mockInventoryItems } from '@/app/lib/mockData'

interface InventoryItem {
  id: string
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
  { id: 'all', name: 'All Items', count: mockInventoryItems.length },
  { id: 'ingredients', name: 'Ingredients', count: mockInventoryItems.filter(i => i.category === 'Ingredients').length },
  { id: 'packaging', name: 'Packaging', count: mockInventoryItems.filter(i => i.category === 'Packaging').length },
  { id: 'cleaning', name: 'Cleaning', count: mockInventoryItems.filter(i => i.category === 'Cleaning').length },
]

export default function InventoryManager() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showStats, setShowStats] = useState(true)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  useEffect(() => {
    // Use data from mockData
    setItems(mockInventoryItems)
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

  const handleToggleStats = () => {
    setShowStats(!showStats)
  }

  const handleRestock = () => {
    setShowRestockModal(true)
    console.log('Opening Restock modal')
  }

  const handleAddNewItem = () => {
    setShowAddItemModal(true)
    setEditingItem(null)
    console.log('Opening Add New Item modal')
  }

  const handleSaveNewItem = (newItem: Omit<InventoryItem, 'id' | 'lastRestocked' | 'status'>) => {
    const status = newItem.currentStock === 0 ? 'out-of-stock' : 
                  newItem.currentStock <= newItem.reorderLevel ? 'low-stock' : 'in-stock'
    const item: InventoryItem = {
      ...newItem,
      id: `inv-${Date.now()}`,
      lastRestocked: new Date().toISOString(),
      status: status as 'in-stock' | 'low-stock' | 'out-of-stock',
    }
    setItems(prev => [...prev, item])
    setShowAddItemModal(false)
    console.log('Inventory item added:', item)
  }

  const handleUpdateItem = (updatedItem: InventoryItem) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i))
    setEditingItem(null)
    console.log('Inventory item updated:', updatedItem)
  }

  const handleRestockItem = (item: InventoryItem) => {
    const quantity = prompt(`Restock ${item.name}. Enter quantity:`)
    if (quantity && !isNaN(Number(quantity))) {
      setItems(prev => prev.map(i => {
        if (i.id === item.id) {
          const newStock = i.currentStock + Number(quantity)
          const newStatus = newStock <= i.reorderLevel ? 'low-stock' : 
                           newStock === 0 ? 'out-of-stock' : 'in-stock'
          return {
            ...i,
            currentStock: newStock,
            status: newStatus as 'in-stock' | 'low-stock' | 'out-of-stock',
            lastRestocked: new Date().toISOString()
          }
        }
        return i
      }))
      console.log(`Restocked ${item.name} with ${quantity} units`)
    }
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    console.log('Editing item:', item)
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
                <button 
                  onClick={handleRestock}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  <ArrowPathIcon className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Restock</span>
                </button>
                <button 
                  onClick={handleAddNewItem}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition font-medium"
                >
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
          onToggleStats={handleToggleStats}
        />
      </section>

      {/* Section 2: Table List (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-8 pb-8">
        <InventoryTable 
          items={filteredItems} 
          viewAsOwner={viewAsOwner}
          onRestock={handleRestockItem}
          onEdit={handleEditItem}
        />
      </section>

      {/* Inventory Modal */}
      <InventoryModal
        isOpen={showAddItemModal || editingItem !== null}
        onClose={() => {
          setShowAddItemModal(false)
          setEditingItem(null)
        }}
        onSave={handleSaveNewItem}
        onUpdate={handleUpdateItem}
        editItem={editingItem}
      />
    </div>
  )
}
