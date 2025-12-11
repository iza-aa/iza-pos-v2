'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, PlusCircleIcon, PencilIcon } from '@heroicons/react/24/outline'

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

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Omit<InventoryItem, 'id' | 'lastRestocked' | 'status'>) => void
  onUpdate?: (item: InventoryItem) => void
  editItem?: InventoryItem | null
}

const categories = ['Ingredients', 'Packaging', 'Cleaning', 'Supplies']
const units = ['kg', 'g', 'L', 'mL', 'pcs', 'box', 'pack']

export default function InventoryModal({ isOpen, onClose, onSave, onUpdate, editItem }: InventoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Ingredients',
    currentStock: 0,
    reorderLevel: 0,
    unit: 'kg',
    supplier: '',
  })

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        category: editItem.category,
        currentStock: editItem.currentStock,
        reorderLevel: editItem.reorderLevel,
        unit: editItem.unit,
        supplier: editItem.supplier,
      })
    } else {
      setFormData({
        name: '',
        category: 'Ingredients',
        currentStock: 0,
        reorderLevel: 0,
        unit: 'kg',
        supplier: '',
      })
    }
  }, [editItem, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editItem && onUpdate) {
      const status = formData.currentStock === 0 ? 'out-of-stock' : 
                    formData.currentStock <= formData.reorderLevel ? 'low-stock' : 'in-stock'
      onUpdate({ 
        ...editItem,
        ...formData,
        status: status as 'in-stock' | 'low-stock' | 'out-of-stock',
        lastRestocked: new Date().toISOString()
      })
    } else {
      onSave(formData)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              {editItem ? (
                <PencilIcon className="w-6 h-6 text-gray-700" />
              ) : (
                <PlusCircleIcon className="w-6 h-6 text-gray-700" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editItem ? 'Edit Item Details' : 'Add New Item'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {editItem ? 'Update item information' : 'Create a new inventory item'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Enter item name"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Current Stock & Unit - Only shown when adding new item */}
            {!editItem && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Unit only - shown when editing */}
            {editItem && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reorder Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Level
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Minimum stock before reorder"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              <input
                type="text"
                required
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Enter supplier name"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-medium"
            >
              {editItem ? 'Update Details' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
