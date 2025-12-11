'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { showError } from '@/lib/errorHandling'
import { isPositiveNumber } from '@/lib/validation'

interface RecipeIngredient {
  inventory_item_id: string
  ingredient_name?: string
  quantity_needed: number
  unit: string
}

interface Recipe {
  id: string
  product_id: string
  product_name?: string
  ingredients: RecipeIngredient[]
}

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recipe: { product_id: string, ingredients: { inventory_item_id: string, quantity_needed: number, unit: string, ingredient_name: string }[] }) => void
  onUpdate?: (recipe: { id: string, product_id: string, ingredients: { inventory_item_id: string, quantity_needed: number, unit: string, ingredient_name: string }[] }) => void
  editRecipe?: Recipe | null
  productId: string
  productName: string
}

interface IngredientInput {
  inventory_item_id: string
  ingredient_name: string
  quantity_needed: number
  unit: string
}

interface InventoryItem {
  id: string
  name: string
  unit: string
}

export default function RecipeModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editRecipe,
  productId,
  productName
}: RecipeModalProps) {
  const [ingredients, setIngredients] = useState<IngredientInput[]>([])
  const [availableIngredients, setAvailableIngredients] = useState<InventoryItem[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchAvailableIngredients()
      
      if (editRecipe) {
        // Edit mode - load existing ingredients
        setIngredients(editRecipe.ingredients.map(ing => ({
          inventory_item_id: ing.inventory_item_id,
          ingredient_name: ing.ingredient_name || '',
          quantity_needed: ing.quantity_needed,
          unit: ing.unit
        })))
      } else {
        // Add mode - reset
        setIngredients([])
      }
    }
  }, [isOpen, editRecipe])

  async function fetchAvailableIngredients() {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, unit')
        .order('name')

      if (error) throw error
      setAvailableIngredients(data || [])
    } catch (error) {
      console.error('Error fetching ingredients:', error)
    }
  }

  const handleAddIngredient = () => {
    setIngredients([...ingredients, {
      inventory_item_id: '',
      ingredient_name: '',
      quantity_needed: 0,
      unit: ''
    }])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index: number, field: keyof IngredientInput, value: string | number) => {
    const newIngredients = [...ingredients]
    
    if (field === 'inventory_item_id') {
      const selectedItem = availableIngredients.find(item => item.id === value)
      if (selectedItem) {
        newIngredients[index] = {
          inventory_item_id: selectedItem.id,
          ingredient_name: selectedItem.name,
          quantity_needed: newIngredients[index].quantity_needed || 0,
          unit: selectedItem.unit
        }
      }
    } else {
      newIngredients[index] = {
        ...newIngredients[index],
        [field]: value
      }
    }
    
    setIngredients(newIngredients)
  }

  const handleSubmit = () => {
    // Validation
    if (ingredients.length === 0) {
      showError('Tambahkan minimal satu ingredient')
      return
    }

    const hasInvalidIngredient = ingredients.some(ing => 
      !ing.inventory_item_id || ing.quantity_needed <= 0
    )

    if (hasInvalidIngredient) {
      showError('Lengkapi semua detail ingredient dengan benar')
      return
    }

    const recipeData = {
      product_id: productId,
      ingredients: ingredients.map(ing => ({
        inventory_item_id: ing.inventory_item_id,
        ingredient_name: ing.ingredient_name,
        quantity_needed: ing.quantity_needed,
        unit: ing.unit
      }))
    }

    console.log('recipeData to submit:', recipeData)

    if (editRecipe && onUpdate) {
      console.log('Calling onUpdate with:', {
        id: editRecipe.id,
        ...recipeData
      })
      onUpdate({
        id: editRecipe.id,
        ...recipeData
      })
    } else {
      console.log('Calling onSave with:', recipeData)
      onSave(recipeData)
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {editRecipe ? 'Edit Recipe' : 'Set Recipe'}: {productName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Ingredients</label>
              <button
                onClick={handleAddIngredient}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                Add Ingredient
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-sm text-gray-500">No ingredients added yet</p>
                <button
                  onClick={handleAddIngredient}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Click to add first ingredient
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      {/* Ingredient Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ingredient</label>
                        <select
                          value={ingredient.inventory_item_id}
                          onChange={(e) => handleIngredientChange(index, 'inventory_item_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select ingredient...</option>
                          {availableIngredients.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={ingredient.quantity_needed || ''}
                          onChange={(e) => handleIngredientChange(index, 'quantity_needed', Number(e.target.value))}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Unit (auto-filled) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                        <input
                          type="text"
                          value={ingredient.unit}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600"
                        />
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveIngredient(index)}
                      className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove ingredient"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            {editRecipe ? 'Update Recipe' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
