'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, ArrowPathIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import InventoryStats from './InventoryStats'
import InventoryFilters from './InventoryFilters'
import InventoryTable from './InventoryTable'
import InventoryModal from './InventoryModal'
import DeleteModal from '../../../ui/DeleteModal'
import { supabase } from '@/lib/supabaseClient'

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

interface RawMaterialsTabProps {
  viewAsOwner: boolean
}

export default function RawMaterialsTab({ viewAsOwner }: RawMaterialsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Items', count: 0 },
    { id: 'ingredients', name: 'Ingredients', count: 0 },
    { id: 'packaging', name: 'Packaging', count: 0 },
  ])
  const [showStats, setShowStats] = useState(true)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventoryItems()
  }, [])

  async function fetchInventoryItems() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name')

      if (error) throw error

      const transformedItems: InventoryItem[] = (data || []).map(item => {
        const status = item.current_stock === 0 ? 'out-of-stock' : 
                      item.current_stock <= item.reorder_level ? 'low-stock' : 'in-stock'
        
        return {
          id: item.id,
          name: item.name,
          category: item.category || 'Ingredients',
          currentStock: item.current_stock,
          reorderLevel: item.reorder_level,
          unit: item.unit,
          supplier: item.supplier || 'Unknown',
          lastRestocked: item.last_restocked || new Date().toISOString(),
          status: status as 'in-stock' | 'low-stock' | 'out-of-stock'
        }
      })

      setItems(transformedItems)

      // Update category counts
      setCategories([
        { id: 'all', name: 'All Items', count: transformedItems.length },
        { id: 'ingredients', name: 'Ingredients', count: transformedItems.filter(i => i.category === 'Ingredients').length },
        { id: 'packaging', name: 'Packaging', count: transformedItems.filter(i => i.category === 'Packaging').length },
      ])
    } catch (error) {
      console.error('Error fetching inventory items:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleSaveNewItem = async (newItem: Omit<InventoryItem, 'id' | 'lastRestocked' | 'status'>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{
          name: newItem.name,
          category: newItem.category,
          current_stock: newItem.currentStock,
          reorder_level: newItem.reorderLevel,
          unit: newItem.unit,
          supplier: newItem.supplier,
          last_restocked: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      await fetchInventoryItems()
      setShowAddItemModal(false)
      console.log('Inventory item added:', data)
    } catch (error) {
      console.error('Error adding inventory item:', error)
      alert('Failed to add inventory item')
    }
  }

  const handleUpdateItem = async (updatedItem: InventoryItem) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: updatedItem.name,
          category: updatedItem.category,
          current_stock: updatedItem.currentStock,
          reorder_level: updatedItem.reorderLevel,
          unit: updatedItem.unit,
          supplier: updatedItem.supplier
        })
        .eq('id', updatedItem.id)

      if (error) throw error

      await fetchInventoryItems()
      setEditingItem(null)
      console.log('Inventory item updated:', updatedItem)
    } catch (error) {
      console.error('Error updating inventory item:', error)
      alert('Failed to update inventory item')
    }
  }

  const handleRestockItem = async (item: InventoryItem) => {
    const quantity = prompt(`Restock ${item.name}. Enter quantity:`)
    if (quantity && !isNaN(Number(quantity))) {
      try {
        const newStock = item.currentStock + Number(quantity)
        
        const { error } = await supabase
          .from('inventory_items')
          .update({
            current_stock: newStock,
            last_restocked: new Date().toISOString()
          })
          .eq('id', item.id)

        if (error) throw error

        await fetchInventoryItems()
        console.log(`Restocked ${item.name} by ${quantity} ${item.unit}`)
      } catch (error) {
        console.error('Error restocking item:', error)
        alert('Failed to restock item')
      }
    }
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    console.log('Editing item:', item)
  }

  const handleDeleteItem = (item: InventoryItem) => {
    setDeletingItem(item)
  }

  const confirmDeleteItem = async () => {
    if (deletingItem) {
      try {
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', deletingItem.id)

        if (error) throw error

        await fetchInventoryItems()
        console.log('Inventory item deleted:', deletingItem)
        setDeletingItem(null)
      } catch (error) {
        console.error('Error deleting inventory item:', error)
        alert('Failed to delete inventory item')
      }
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
