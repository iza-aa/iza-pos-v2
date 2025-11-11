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
        <div className="columns-4 gap-4 space-y-4">
        {filteredProducts.map(({ product, baseRecipe, hasRecipe }) => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col break-inside-avoid mb-4">
            {/* Product Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                </div>
                {!viewAsOwner && (
                  <button
                    onClick={() => hasRecipe && baseRecipe ? handleEditRecipe(baseRecipe) : handleSetRecipe(product)}
                    className={`p-1.5 rounded-lg transition ${
                      hasRecipe ? 'hover:bg-gray-100' : 'hover:bg-blue-50'
                    }`}
                    title={hasRecipe ? "Edit Recipe" : "Set Recipe"}
                  >
                    <PlusIcon className={`w-4 h-4 ${hasRecipe ? 'text-gray-600' : 'text-blue-600'}`} />
                  </button>
                )}
              </div>
              
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  hasRecipe 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {hasRecipe ? 'Has Recipe' : 'No Recipe'}
                </span>
                {baseRecipe && (
                  <span className="text-xs text-gray-500">
                    Can make: {calculateCanMake(baseRecipe, inventoryItems)}
                  </span>
                )}
              </div>
            </div>

            {/* Recipe Info */}
            <div className="p-4 flex-1">
              {baseRecipe ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-600 uppercase">Ingredients:</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {baseRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-2 rounded">
                        <span className="text-gray-700 truncate flex-1">{ing.ingredientName}</span>
                        <span className="font-medium text-gray-900 ml-2">{ing.quantityNeeded} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 pt-2 border-t">
                    Updated: {new Date(baseRecipe.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-xs">No recipe set</div>
                  <div className="text-xs mt-1">Click + to add</div>
                </div>
              )}
            </div>
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
