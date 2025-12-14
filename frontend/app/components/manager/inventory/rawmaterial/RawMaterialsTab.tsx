'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, ArrowPathIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { getCurrentUser } from '@/lib/utils'
import { showSuccess, showError, confirmDelete } from '@/lib/services/errorHandling'
import { validateInventoryItem, validateStockAdjustment } from '@/lib/utils'
import { getStockStatus } from '@/lib/constants'
import { logActivity } from '@/lib/services/activity/activityLogger'
import InventoryStats from './InventoryStats'
import InventoryFilters from './InventoryFilters'
import InventoryTable from './InventoryTable'
import InventoryModal from './InventoryModal'
import RestockModal from './RestockModal'
import AdjustmentModal from './AdjustmentModal'
import { DeleteModal } from '@/app/components/ui'
import { supabase } from '@/lib/config/supabaseClient'

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

export default function RawMaterialsTab() {
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
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null)
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
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
        const status = getStockStatus(item.current_stock, item.reorder_level)
        
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
      // Error fetching inventory items
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

  const handleAddNewItem = () => {
    setShowAddItemModal(true)
    setEditingItem(null)
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
      showSuccess('Item inventory berhasil ditambahkan')
      
      // Log activity
      await logActivity({
        action: 'CREATE',
        category: 'INVENTORY',
        description: `Created new inventory item: ${newItem.name}`,
        resourceType: 'Inventory Item',
        resourceId: data.id,
        resourceName: newItem.name,
        newValue: {
          name: newItem.name,
          category: newItem.category,
          current_stock: newItem.currentStock,
          unit: newItem.unit
        },
        severity: 'info',
        tags: ['inventory', 'create']
      })
    } catch (error) {
      showError('Gagal menambahkan item inventory')
    }
  }

  const handleUpdateItem = async (updatedItem: InventoryItem) => {
    try {
      // Update inventory item (stock is disabled in edit mode, so no adjustment needed)
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: updatedItem.name,
          category: updatedItem.category,
          reorder_level: updatedItem.reorderLevel,
          unit: updatedItem.unit,
          supplier: updatedItem.supplier
        })
        .eq('id', updatedItem.id)

      if (error) throw error

      await fetchInventoryItems()
      setEditingItem(null)
      showSuccess('Item inventory berhasil diupdate')
    } catch (error) {
      showError('Gagal mengupdate item inventory')
    }
  }

  const handleRestockItem = (item: InventoryItem) => {
    setRestockingItem(item)
  }

  const confirmRestock = async (itemId: string, quantity: number, notes: string, cost?: number) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    try {
      const previousStock = item.currentStock
      const newStock = previousStock + quantity
      
      // Get user information from auth helper
      const currentUser = getCurrentUser()
      if (!currentUser) return
      
      const userName = currentUser.name
      const userRole = currentUser.role
      
      const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1)
      const fullUserName = `${userName} - ${roleLabel}`
      
      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          last_restocked: new Date().toISOString()
        })
        .eq('id', itemId)

      if (updateError) {
        console.error('Update inventory error:', updateError)
        throw updateError
      }

      // Create usage transaction for restock
      const costNote = cost ? ` (Cost: Rp ${(cost * quantity).toFixed(2)})` : ''
      const fullNotes = notes || `Restocked ${item.name}`
      
      const { data: transaction, error: transactionError } = await supabase
        .from('usage_transactions')
        .insert({
          transaction_type: 'restock',
          notes: fullNotes + costNote,
          performed_by: null, // Null for non-staff users
          performed_by_name: fullUserName, // Store name directly
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Create transaction detail
      const { error: detailError } = await supabase
        .from('usage_transaction_details')
        .insert({
          usage_transaction_id: transaction.id,
          inventory_item_id: itemId,
          ingredient_name: item.name,
          quantity_used: quantity,
          unit: item.unit,
          previous_stock: previousStock,
          new_stock: newStock
        })

      if (detailError) throw detailError

      await fetchInventoryItems()
      showSuccess(`Berhasil restock ${item.name}`)
      
      // Log activity
      await logActivity({
        action: 'ADJUST',
        category: 'INVENTORY',
        description: `Restocked ${item.name}: +${quantity} ${item.unit}`,
        resourceType: 'Inventory Item',
        resourceId: itemId,
        resourceName: item.name,
        previousValue: { stock: previousStock },
        newValue: { stock: newStock },
        changesSummary: [
          `Stock: ${previousStock}${item.unit} → ${newStock}${item.unit} (+${quantity}${item.unit})`
        ],
        severity: 'info',
        tags: ['inventory', 'restock'],
        notes: notes || undefined
      })
    } catch (error) {
      showError('Gagal melakukan restock')
      throw error
    }
  }

  const handleAdjustItem = (item: InventoryItem) => {
    setAdjustingItem(item)
  }

  const confirmAdjustment = async (itemId: string, newStock: number, reason: string, notes: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    try {
      const previousStock = item.currentStock
      const difference = newStock - previousStock
      
      // Get user from Supabase Auth metadata (fallback to localStorage)
      // Get user information from auth helper
      const currentUser = getCurrentUser()
      if (!currentUser) return
      
      const userName = currentUser.name
      const userRole = currentUser.role
      
      const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1)
      const fullUserName = `${userName} - ${roleLabel}`
      
      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock
        })
        .eq('id', itemId)

      if (updateError) {
        throw updateError
      }

      // Create usage transaction for adjustment
      
      const transactionData = {
        transaction_type: 'adjustment',
        notes: reason,
        performed_by: null, // Null for non-staff users
        performed_by_name: fullUserName, // Store name directly
        created_at: new Date().toISOString()
      }
      
      const { data: transaction, error: transactionError } = await supabase
        .from('usage_transactions')
        .insert(transactionData)
        .select()
        .single()

      if (transactionError) {
        throw transactionError
      }

      // Create transaction detail
      const { error: detailError } = await supabase
        .from('usage_transaction_details')
        .insert({
          usage_transaction_id: transaction.id,
          inventory_item_id: itemId,
          ingredient_name: item.name,
          quantity_used: Math.abs(difference),
          unit: item.unit,
          previous_stock: previousStock,
          new_stock: newStock
        })

      if (detailError) {
        throw detailError
      }

      await fetchInventoryItems()
      showSuccess(`Stok ${item.name} berhasil disesuaikan: ${previousStock} → ${newStock}`)
      
      // Log activity
      const adjustmentType = difference > 0 ? 'increase' : 'decrease'
      await logActivity({
        action: 'ADJUST',
        category: 'INVENTORY',
        description: `Adjusted ${item.name} stock: ${previousStock} → ${newStock}`,
        resourceType: 'Inventory Item',
        resourceId: itemId,
        resourceName: item.name,
        previousValue: { stock: previousStock },
        newValue: { stock: newStock },
        changesSummary: [
          `Stock: ${previousStock}${item.unit} → ${newStock}${item.unit} (${difference > 0 ? '+' : ''}${difference}${item.unit})`
        ],
        severity: 'warning',
        tags: ['inventory', 'adjustment', adjustmentType],
        notes: reason
      })
    } catch (error) {
      showError('Gagal melakukan adjustment stok')
      throw error
    }
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
  }

  const handleDeleteItem = (item: InventoryItem) => {
    setDeletingItem(item)
  }

  const confirmDeleteItem = async () => {
    if (deletingItem) {
      try {
        // Get user information from auth helper
        const currentUser = getCurrentUser()
        if (!currentUser) return
        
        const userName = currentUser.name
        const userRole = currentUser.role
        
        const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1)
        const fullUserName = `${userName} - ${roleLabel}`
        
        // Always create adjustment transaction when deleting
        const stockNote = deletingItem.currentStock > 0 
          ? ` (had ${deletingItem.currentStock} ${deletingItem.unit} in stock)`
          : ' (stock was 0)'
        
        // Create usage transaction
        const { data: transaction, error: transactionError } = await supabase
          .from('usage_transactions')
          .insert({
            transaction_type: 'adjustment',
            notes: `DELETED: ${deletingItem.name}${stockNote}`,
            performed_by: null, // Null for non-staff users
            performed_by_name: fullUserName, // Store name directly
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (transactionError) throw transactionError

        // Create transaction detail
        const { error: detailError } = await supabase
          .from('usage_transaction_details')
          .insert({
            usage_transaction_id: transaction.id,
            inventory_item_id: deletingItem.id,
            ingredient_name: deletingItem.name,
            quantity_used: deletingItem.currentStock,
            unit: deletingItem.unit,
            previous_stock: deletingItem.currentStock,
            new_stock: 0
          })

        if (detailError) throw detailError
        
        // Delete the inventory item
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', deletingItem.id)

        if (error) {
          showError(`Gagal menghapus ${deletingItem.name}: ${error.message}`)
          setDeletingItem(null)
          return
        }

        await fetchInventoryItems()
        showSuccess(`Item ${deletingItem.name} berhasil dihapus`)
        
        // Log activity
        await logActivity({
          action: 'DELETE',
          category: 'INVENTORY',
          description: `Deleted inventory item: ${deletingItem.name}`,
          resourceType: 'Inventory Item',
          resourceId: deletingItem.id,
          resourceName: deletingItem.name,
          previousValue: {
            name: deletingItem.name,
            category: deletingItem.category,
            current_stock: deletingItem.currentStock,
            unit: deletingItem.unit
          },
          severity: 'critical',
          tags: ['inventory', 'delete'],
          isReversible: false,
          notes: deletingItem.currentStock > 0 ? `Had ${deletingItem.currentStock} ${deletingItem.unit} in stock` : 'Stock was 0'
        })
        
        setDeletingItem(null)
      } catch (error) {
        showError('Gagal menghapus item inventory. Mungkin masih digunakan di recipe atau transaksi.')
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + Stats + Filters (Fixed) */}
      <section className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        {/* Header dengan Action Buttons */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Raw Materials & Ingredients</h2>
            <p className="text-xs md:text-sm text-gray-500">Manage your inventory stock and supplies</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 lg:flex-none">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full lg:w-64 text-sm"
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

            <button 
              onClick={handleAddNewItem}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition font-medium text-sm"
            >
              <PlusIcon className="w-4 h-4 md:w-5 md:h-5" />
              Add New Item
            </button>
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
      <section className="flex-1 overflow-hidden px-4 md:px-6 py-4 md:py-6 bg-gray-50 flex flex-col">
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

            onRestock={handleRestockItem}
            onAdjust={handleAdjustItem}
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

      {/* Restock Modal */}
      <RestockModal
        isOpen={restockingItem !== null}
        onClose={() => setRestockingItem(null)}
        onRestock={confirmRestock}
        item={restockingItem}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={adjustingItem !== null}
        onClose={() => setAdjustingItem(null)}
        onAdjust={(itemId, newStock, reason) => confirmAdjustment(itemId, newStock, reason, '')}
        item={adjustingItem}
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
