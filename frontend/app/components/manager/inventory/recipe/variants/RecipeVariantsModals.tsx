'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { SelectedOptionForAdd, EditingIngredient } from './types'

interface AddIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  selectedOption: SelectedOptionForAdd | null
  inventoryItems: any[]
  onAdd: (inventoryItemId: string, quantity: number) => Promise<void>
}

export function AddIngredientModal({
  isOpen,
  onClose,
  selectedOption,
  inventoryItems,
  onAdd
}: AddIngredientModalProps) {
  const [inventoryItemId, setInventoryItemId] = useState('')
  const [quantity, setQuantity] = useState(0)

  if (!isOpen || !selectedOption) return null

  const rawMaterials = inventoryItems.filter(item => item.category === 'raw-material')

  const handleSubmit = async () => {
    if (!inventoryItemId || quantity <= 0) return
    await onAdd(inventoryItemId, quantity)
    setInventoryItemId('')
    setQuantity(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">
            Add Ingredient for {selectedOption.optionName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Ingredient
            </label>
            <select
              value={inventoryItemId}
              onChange={(e) => setInventoryItemId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Choose ingredient...</option>
              {rawMaterials.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity Needed
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            disabled={!inventoryItemId || quantity <= 0}
          >
            Add Ingredient
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  editingIngredient: EditingIngredient | null
  inventoryItems: any[]
  onUpdate: (inventoryItemId: string, quantity: number) => Promise<void>
}

export function EditIngredientModal({
  isOpen,
  onClose,
  editingIngredient,
  inventoryItems,
  onUpdate
}: EditIngredientModalProps) {
  const [inventoryItemId, setInventoryItemId] = useState('')
  const [quantity, setQuantity] = useState(0)

  if (!isOpen || !editingIngredient) return null

  const rawMaterials = inventoryItems.filter(item => item.category === 'raw-material')

  const handleSubmit = async () => {
    if (!inventoryItemId || quantity <= 0) return
    await onUpdate(inventoryItemId, quantity)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Edit Ingredient</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Ingredient
            </label>
            <select
              value={inventoryItemId || editingIngredient.ingredient.inventory_item_id}
              onChange={(e) => setInventoryItemId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {rawMaterials.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity Needed
            </label>
            <input
              type="number"
              value={quantity || editingIngredient.ingredient.quantity_needed}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Update Ingredient
          </button>
        </div>
      </div>
    </div>
  )
}
