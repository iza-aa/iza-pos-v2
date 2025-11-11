'use client'

import { useState } from 'react'
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { recipes as initialRecipes, variantGroups, Recipe, inventoryItems, calculateCanMake } from '@/lib/mockData'

// Simplified Recipe Variants Tab
interface RecipeVariantsTabProps {
  viewAsOwner: boolean
}

interface IngredientInput {
  inventoryItemId: string
  ingredientName: string
  quantityNeeded: number
  unit: string
}

interface VariantRecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (ingredients: IngredientInput[]) => void
  variantGroupName: string
  optionName: string
  existingRecipe?: Recipe | null
}

function VariantRecipeModal({ isOpen, onClose, onSave, variantGroupName, optionName, existingRecipe }: VariantRecipeModalProps) {
  const [ingredients, setIngredients] = useState<IngredientInput[]>(() => {
    if (existingRecipe) {
      return existingRecipe.ingredients
    }
    return []
  })

  const rawMaterials = inventoryItems.filter(item => 
    item.category === 'Ingredients' || item.category === 'Packaging'
  )

  const handleAddIngredient = () => {
    if (rawMaterials.length > 0) {
      const firstItem = rawMaterials[0]
      setIngredients([...ingredients, {
        inventoryItemId: firstItem.id,
        ingredientName: firstItem.name,
        quantityNeeded: 0,
        unit: firstItem.unit
      }])
    }
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index: number, itemId: string) => {
    const item = rawMaterials.find(i => i.id === itemId)
    if (item) {
      const newIngredients = [...ingredients]
      newIngredients[index] = {
        inventoryItemId: item.id,
        ingredientName: item.name,
        quantityNeeded: newIngredients[index].quantityNeeded,
        unit: item.unit
      }
      setIngredients(newIngredients)
    }
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    const newIngredients = [...ingredients]
    newIngredients[index].quantityNeeded = quantity
    setIngredients(newIngredients)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validIngredients = ingredients.filter(ing => ing.quantityNeeded > 0)
    onSave(validIngredients)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {existingRecipe ? 'Edit' : 'Set'} Recipe: {variantGroupName} - {optionName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Ingredients</h3>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Ingredient
              </button>
            </div>

            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start">
                  {/* Ingredient Dropdown */}
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ingredient
                    </label>
                    <select
                      value={ingredient.inventoryItemId}
                      onChange={(e) => handleIngredientChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {rawMaterials.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Input */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ingredient.quantityNeeded || ''}
                      onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Unit Display */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={ingredient.unit}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-1 flex items-end pb-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}

              {ingredients.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No ingredients added yet</p>
                  <p className="text-xs mt-1">Click &quot;Add Ingredient&quot; to start</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {existingRecipe ? 'Update Recipe' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RecipeVariantsTab({ viewAsOwner }: RecipeVariantsTabProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<{
    groupId: string
    groupName: string
    optionId: string
    optionName: string
  } | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const stats = {
    totalVariantGroups: variantGroups.length,
    totalVariantOptions: variantGroups.reduce((sum, vg) => sum + vg.options.length, 0),
    totalVariantRecipes: recipes.filter(r => r.recipeType === 'variant-specific').length
  }

  const handleSetRecipe = (groupId: string, groupName: string, optionId: string, optionName: string) => {
    // Check if recipe exists for this variant option
    const existing = recipes.find(r => 
      r.recipeType === 'variant-specific' &&
      r.variantCombination &&
      Object.values(r.variantCombination).includes(optionId)
    )
    
    setSelectedVariant({ groupId, groupName, optionId, optionName })
    setEditingRecipe(existing || null)
    setShowModal(true)
  }

  const handleSaveRecipe = (ingredients: IngredientInput[]) => {
    if (!selectedVariant) return

    if (editingRecipe) {
      // Update existing recipe
      const updated = {
        ...editingRecipe,
        ingredients,
        updatedAt: new Date().toISOString()
      }
      setRecipes(recipes.map(r => r.id === editingRecipe.id ? updated : r))
    } else {
      // Create new recipe
      const newRecipe: Recipe = {
        id: `recipe-variant-${Date.now()}`,
        productId: 'variant-only',
        productName: `${selectedVariant.groupName} - ${selectedVariant.optionName}`,
        recipeType: 'variant-specific',
        variantCombination: { [selectedVariant.groupId]: selectedVariant.optionId },
        ingredients,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setRecipes([...recipes, newRecipe])
    }

    setShowModal(false)
    setSelectedVariant(null)
    setEditingRecipe(null)
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const getRecipeForOption = (optionId: string) => {
    return recipes.find(r => 
      r.recipeType === 'variant-specific' &&
      r.variantCombination &&
      Object.values(r.variantCombination).includes(optionId)
    )
  }

  const filteredGroups = variantGroups.filter(vg =>
    vg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vg.options.some(opt => opt.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex flex-col h-full">
      {/* Section 1: Header + Stats */}
      <section className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-800">Variants (Variant-Specific Recipes)</h2>
            <p className="text-sm text-gray-500">Manage recipes for variant options</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle Stats Button */}
            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              title={showStats ? "Hide Statistics" : "Show Statistics"}
            >
              {showStats ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search variant groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-4 gap-4 pt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Variant Groups</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalVariantGroups}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Total Options</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalVariantOptions}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Variant Recipes</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalVariantRecipes}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Coverage</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalVariantOptions > 0 ? Math.round((stats.totalVariantRecipes / stats.totalVariantOptions) * 100) : 0}%
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Variant Groups (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-6 py-6 bg-gray-100">
        <div className="space-y-4">
        {filteredGroups.map(vg => {
          const isExpanded = expandedGroups.includes(vg.id)
          const groupRecipeCount = vg.options.filter(opt => getRecipeForOption(opt.id)).length

          return (
            <div key={vg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Group Header */}
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleGroup(vg.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{vg.name}</h3>
                    <p className="text-sm text-gray-500">
                      {vg.options.length} options • {groupRecipeCount} with recipe
                    </p>
                  </div>
                  <svg 
                    className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Options List */}
              {isExpanded && (
                <div className="divide-y divide-gray-200">
                  {vg.options.map(option => {
                    const recipe = getRecipeForOption(option.id)
                    const hasRecipe = !!recipe

                    return (
                      <div key={option.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-gray-900">{option.name}</h4>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                option.priceModifier >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {option.priceModifier >= 0 ? '+' : ''}{option.priceModifier.toFixed(2)}
                              </span>
                            </div>
                            {hasRecipe && recipe && (
                              <div className="mt-2 space-y-1">
                                <div className="text-sm text-green-600 font-medium">
                                  ✓ Recipe set • Can make: {calculateCanMake(recipe, inventoryItems)} servings
                                </div>
                                <div className="text-xs text-gray-500">
                                  {recipe.ingredients.length} ingredients: {recipe.ingredients.slice(0, 2).map(i => i.ingredientName).join(', ')}
                                  {recipe.ingredients.length > 2 && ` +${recipe.ingredients.length - 2} more`}
                                </div>
                              </div>
                            )}
                            {!hasRecipe && (
                              <div className="mt-1 text-sm text-gray-400">
                                No recipe set
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleSetRecipe(vg.id, vg.name, option.id, option.name)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
                              hasRecipe
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <PencilIcon className="h-4 w-4" />
                            {hasRecipe ? 'Edit' : 'Set Recipe'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        </div>
      </section>

      {/* Variant Recipe Modal */}
      {selectedVariant && (
        <VariantRecipeModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setSelectedVariant(null)
            setEditingRecipe(null)
          }}
          onSave={handleSaveRecipe}
          variantGroupName={selectedVariant.groupName}
          optionName={selectedVariant.optionName}
          existingRecipe={editingRecipe}
        />
      )}
    </div>
  ) 
}
