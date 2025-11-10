'use client'

import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { recipes as initialRecipes, products, inventoryItems, calculateCanMake, Recipe } from '@/lib/mockData'
import RecipeModal from './RecipeModal'

interface RecipeDishesTabProps {
  viewAsOwner: boolean
}

export default function RecipeDishesTab({ viewAsOwner }: RecipeDishesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<{ id: string, name: string, hasVariants: boolean, variantGroups: string[] } | null>(null)

  // Group recipes by product (only base recipes)
  const productRecipes = products.map(product => {
    const baseRecipe = recipes.find(r => r.productId === product.id && r.recipeType === 'base')
    
    return {
      product,
      baseRecipe,
      hasRecipe: !!baseRecipe
    }
  })

  const filteredProducts = productRecipes.filter(pr =>
    pr.product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    totalProducts: products.length,
    withRecipe: productRecipes.filter(pr => pr.hasRecipe).length,
    withoutRecipe: productRecipes.filter(pr => !pr.hasRecipe).length,
  }

  const handleSetRecipe = (product: typeof products[0]) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      hasVariants: false, // Force base recipe
      variantGroups: []
    })
    setEditingRecipe(null)
    setShowRecipeModal(true)
  }

  const handleEditRecipe = (recipe: Recipe) => {
    const product = products.find(p => p.id === recipe.productId)
    if (product) {
      setSelectedProduct({
        id: product.id,
        name: product.name,
        hasVariants: false,
        variantGroups: []
      })
      setEditingRecipe(recipe)
      setShowRecipeModal(true)
    }
  }

  const handleSaveRecipe = (newRecipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    const recipeWithId: Recipe = {
      ...newRecipe,
      id: `recipe-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setRecipes([...recipes, recipeWithId])
    setShowRecipeModal(false)
    setSelectedProduct(null)
    setEditingRecipe(null)
  }

  const handleUpdateRecipe = (updatedRecipe: Recipe) => {
    setRecipes(recipes.map(r => r.id === updatedRecipe.id ? { ...updatedRecipe, updatedAt: new Date().toISOString() } : r))
    setShowRecipeModal(false)
    setSelectedProduct(null)
    setEditingRecipe(null)
  }

  const getVariantLabel = (variantCombination?: Record<string, string>) => {
    if (!variantCombination) return ''
    // Convert variant IDs to readable labels (simplified)
    return Object.values(variantCombination).map(v => v.split('-')[1]).join(' + ')
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-300px)]">
      {/* Stats Cards */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Dishes</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">With Recipe</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.withRecipe}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Without Recipe</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{stats.withoutRecipe}</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <input
          type="text"
          placeholder="Search dishes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Products List (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {filteredProducts.map(({ product, baseRecipe, hasRecipe }) => (
          <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Product Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category}</p>
              </div>
              {!hasRecipe ? (
                <button
                  onClick={() => handleSetRecipe(product)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Set Recipe
                </button>
              ) : (
                <button
                  onClick={() => baseRecipe && handleEditRecipe(baseRecipe)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                >
                  Edit Recipe
                </button>
              )}
            </div>

            {/* Base Recipe Display */}
            {baseRecipe && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Base Recipe</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(baseRecipe.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      Can make: {calculateCanMake(baseRecipe, inventoryItems)} servings
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 uppercase">Ingredients:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {baseRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded border border-gray-200">
                        <span className="text-gray-700">{ing.ingredientName}</span>
                        <span className="font-medium text-gray-900">{ing.quantityNeeded} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!hasRecipe && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-sm">No recipe set for this dish</div>
                <div className="text-xs mt-1">Click &quot;Set Recipe&quot; to add ingredients</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recipe Modal */}
      {showRecipeModal && selectedProduct && (
        <RecipeModal
          isOpen={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false)
            setSelectedProduct(null)
            setEditingRecipe(null)
          }}
          onSave={handleSaveRecipe}
          onUpdate={handleUpdateRecipe}
          editRecipe={editingRecipe}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          hasVariants={selectedProduct.hasVariants}
          variantGroupIds={selectedProduct.variantGroups}
        />
      )}
    </div>
  )
}
