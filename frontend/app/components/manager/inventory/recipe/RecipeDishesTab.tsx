'use client'

import { useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { recipes as initialRecipes, products, inventoryItems, calculateCanMake, Recipe } from '@/lib/mockData'
import RecipeModal from './RecipeModal'

interface RecipeDishesTabProps {
  viewAsOwner: boolean
}

export default function RecipeDishesTab({ viewAsOwner }: RecipeDishesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
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
    <div className="flex flex-col h-full">
      {/* Section 1: Header + Stats */}
      <section className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-800">Dishes (Base Recipes)</h2>
            <p className="text-sm text-gray-500">Manage base recipes for your menu dishes</p>
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
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-4 gap-4 pt-6 ">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Total Dishes</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">With Recipe</div>
              <div className="text-2xl font-bold text-green-600">{stats.withRecipe}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Without Recipe</div>
              <div className="text-2xl font-bold text-orange-600">{stats.withoutRecipe}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Coverage</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalProducts > 0 ? Math.round((stats.withRecipe / stats.totalProducts) * 100) : 0}%
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Products List (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-6 py-6 bg-gray-100">
        <div className="space-y-4">
        {filteredProducts.map(({ product, baseRecipe, hasRecipe }) => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-6">
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
      </section>

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
