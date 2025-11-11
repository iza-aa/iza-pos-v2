'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, ArrowPathIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import InventoryStats from './InventoryStats'
import InventoryFilters from './InventoryFilters'
import InventoryTable from './InventoryTable'
import InventoryModal from './InventoryModal'
import DeleteModal from '../../../ui/DeleteModal'
import { inventoryItems as mockInventoryItems } from '@/lib/mockData'

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
]

interface RawMaterialsTabProps {
  viewAsOwner: boolean
}

export default function RawMaterialsTab({ viewAsOwner }: RawMaterialsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showStats, setShowStats] = useState(true)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null)

  useEffect(() => {
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

  const handleDeleteItem = (item: InventoryItem) => {
    setDeletingItem(item)
  }

  const confirmDeleteItem = () => {
    if (deletingItem) {
      setItems(prev => prev.filter(i => i.id !== deletingItem.id))
      console.log('Inventory item deleted:', deletingItem)
      setDeletingItem(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + Stats + Filters (Fixed) */}
      <section className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        {/* Header dengan Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-800">Raw Materials & Ingredients</h2>
            <p className="text-sm text-gray-500">Manage your inventory stock and supplies</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Toggle Stats Button */}
            <button 
              onClick={handleToggleStats}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              title={showStats ? "Hide Statistics" : "Show Statistics"}
            >
              {showStats ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {!viewAsOwner && (
              <>

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
          <div >
            <InventoryStats
              totalItems={stats.totalItems}
              inStock={stats.inStock}
              lowStock={stats.lowStock}
              outOfStock={stats.outOfStock}
            />
          </div>
        )}
      </section>

      {/* Table List (Scrollable) */}
      <section className="flex-1 overflow-hidden px-6 py-6 bg-gray-100 flex flex-col">
        {/* Filters */}
        <div className="mb-4 flex-shrink-0">
          <InventoryFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <InventoryTable 
            items={filteredItems} 
            viewAsOwner={viewAsOwner}
            onRestock={handleRestockItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
          />
        </div>
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

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deletingItem !== null}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDeleteItem}
        title="Delete Inventory Item"
        itemName={deletingItem?.name || ''}
        description="This item will be permanently removed from your inventory."
      />
    </div>
  )
}
