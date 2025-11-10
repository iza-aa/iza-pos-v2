'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { inventoryItems, Recipe, RecipeIngredient, variantGroups } from '@/lib/mockData'

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdate?: (recipe: Recipe) => void
  editRecipe?: Recipe | null
  productId: string
  productName: string
  hasVariants: boolean
  variantGroupIds?: string[]
  preSelectedVariants?: Record<string, string>
}

interface IngredientInput {
  inventoryItemId: string
  ingredientName: string
  quantityNeeded: number
  unit: string
}

export default function RecipeModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editRecipe,
  productId,
  productName,
  hasVariants,
  variantGroupIds = [],
  preSelectedVariants
}: RecipeModalProps) {
  const [recipeType, setRecipeType] = useState<'base' | 'variant-specific'>('base')
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [ingredients, setIngredients] = useState<IngredientInput[]>([])

  useEffect(() => {
    if (isOpen) {
      if (editRecipe) {
        // Edit mode
        setRecipeType(editRecipe.recipeType)
        setSelectedVariants(editRecipe.variantCombination || {})
        setIngredients(editRecipe.ingredients)
      } else {
        // Add mode - reset
        setRecipeType(preSelectedVariants ? 'variant-specific' : 'base')
        setSelectedVariants(preSelectedVariants || {})
        setIngredients([])
      }
    }
  }, [isOpen, editRecipe, preSelectedVariants])

  const availableRawMaterials = inventoryItems.filter(item => 
    item.category === 'Ingredients' || item.category === 'Packaging'
  )

  const productVariantGroups = variantGroupIds
    .map(id => variantGroups.find(vg => vg.id === id))
    .filter(Boolean)

  const handleAddIngredient = () => {
    setIngredients([...ingredients, {
      inventoryItemId: '',
      ingredientName: '',
      quantityNeeded: 0,
      unit: ''
    }])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index: number, field: keyof IngredientInput, value: any) => {
    const newIngredients = [...ingredients]
    
    if (field === 'inventoryItemId') {
      const selectedItem = availableRawMaterials.find(item => item.id === value)
      if (selectedItem) {
        newIngredients[index] = {
          inventoryItemId: selectedItem.id,
          ingredientName: selectedItem.name,
          quantityNeeded: newIngredients[index].quantityNeeded || 0,
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

  const handleVariantChange = (groupId: string, optionId: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [groupId]: optionId
    }))
  }

  const handleSubmit = () => {
    // Validation
    if (ingredients.length === 0) {
      alert('Please add at least one ingredient')
      return
    }

    const hasInvalidIngredient = ingredients.some(ing => 
      !ing.inventoryItemId || ing.quantityNeeded <= 0
    )

    if (hasInvalidIngredient) {
      alert('Please complete all ingredient details')
      return
    }

    if (recipeType === 'variant-specific' && Object.keys(selectedVariants).length === 0) {
      alert('Please select variant combination')
      return
    }

    const recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
      productId,
      productName: recipeType === 'variant-specific' 
        ? `${productName} (${getVariantLabel()})`
        : productName,
      recipeType,
      variantCombination: recipeType === 'variant-specific' ? selectedVariants : undefined,
      ingredients: ingredients.map(ing => ({
        inventoryItemId: ing.inventoryItemId,
        ingredientName: ing.ingredientName,
        quantityNeeded: ing.quantityNeeded,
        unit: ing.unit
      }))
    }

    if (editRecipe && onUpdate) {
      onUpdate({
        ...recipeData,
        id: editRecipe.id,
        createdAt: editRecipe.createdAt,
        updatedAt: new Date().toISOString()
      })
    } else {
      onSave(recipeData)
    }

    onClose()
  }

  const getVariantLabel = () => {
    return Object.entries(selectedVariants)
      .map(([groupId, optionId]) => {
        const group = variantGroups.find(vg => vg.id === groupId)
        const option = group?.options.find(opt => opt.id === optionId)
        return option?.name || ''
      })
      .filter(Boolean)
      .join(' + ')
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
          {/* Recipe Type Selection */}
          {hasVariants && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="base"
                    checked={recipeType === 'base'}
                    onChange={(e) => setRecipeType(e.target.value as 'base')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Base Recipe (applies to all variants)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="variant-specific"
                    checked={recipeType === 'variant-specific'}
                    onChange={(e) => setRecipeType(e.target.value as 'variant-specific')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Variant-Specific Recipe</span>
                </label>
              </div>
            </div>
          )}

          {/* Variant Selection */}
          {recipeType === 'variant-specific' && hasVariants && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <label className="block text-sm font-semibold text-blue-900 mb-3">Select Variant Combination</label>
              <div className="space-y-3">
                {productVariantGroups.map((group: any) => (
                  <div key={group.id}>
                    <p className="text-sm font-medium text-gray-700 mb-2">{group.name}:</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option: any) => (
                        <button
                          key={option.id}
                          onClick={() => handleVariantChange(group.id, option.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            selectedVariants[group.id] === option.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {Object.keys(selectedVariants).length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Selected:</strong> {getVariantLabel()}
                  </p>
                </div>
              )}
            </div>
          )}

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
                          value={ingredient.inventoryItemId}
                          onChange={(e) => handleIngredientChange(index, 'inventoryItemId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select ingredient...</option>
                          {availableRawMaterials.map(item => (
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
                          value={ingredient.quantityNeeded || ''}
                          onChange={(e) => handleIngredientChange(index, 'quantityNeeded', Number(e.target.value))}
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
