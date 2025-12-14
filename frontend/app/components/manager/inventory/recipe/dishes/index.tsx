'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { showSuccess, showError } from '@/lib/errorHandling'
import { logActivity } from '@/lib/activityLogger'
import RecipeModal from './RecipeModal'

interface RecipeIngredient {
  inventory_item_id: string
  ingredient_name: string
  quantity_needed: number
  unit: string
}

interface Recipe {
  id: string
  product_id: string
  product_name: string
  ingredients: RecipeIngredient[]
  createdAt: string
  updatedAt: string
}

interface Product {
  id: string
  name: string
  category_id: string
}

interface InventoryItem {
  id: string
  name: string
}

export default function RecipeDishesTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category_id')
        .order('name')

      if (productsError) {
        console.error('Products error:', productsError)
        throw productsError
      }

      console.log('Products fetched:', productsData)
      setProducts(productsData || [])

      // Fetch recipes with ingredients - simplified query
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')

      if (recipesError) {
        console.error('Recipes error:', recipesError)
        throw recipesError
      }

      console.log('Recipes fetched:', recipesData)

      // Fetch all recipe ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('*')

      if (ingredientsError) {
        console.error('Recipe ingredients error:', ingredientsError)
        throw ingredientsError
      }

      console.log('Recipe ingredients fetched:', ingredientsData)

      // Fetch inventory items for ingredient names
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, name')

      if (inventoryError) {
        console.error('Inventory error:', inventoryError)
        throw inventoryError
      }

      console.log('Inventory items fetched:', inventoryData)

      // Transform data manually
      const transformedRecipes: Recipe[] = (recipesData || []).map(recipe => {
        const recipeIngredients = (ingredientsData || [])
          .filter((ing) => ing.recipe_id === recipe.id)
          .map((ing) => {
            const inventoryItem = (inventoryData || []).find((inv) => inv.id === ing.inventory_item_id)
            return {
              inventory_item_id: ing.inventory_item_id,
              ingredient_name: inventoryItem?.name || ing.ingredient_name || 'Unknown',
              quantity_needed: ing.quantity_needed,
              unit: ing.unit
            }
          })

        const product = productsData?.find(p => p.id === recipe.product_id)

        return {
          id: recipe.id,
          product_id: recipe.product_id,
          product_name: product?.name || 'Unknown',
          ingredients: recipeIngredients,
          createdAt: recipe.created_at,
          updatedAt: recipe.updated_at
        }
      })

      console.log('Transformed recipes:', transformedRecipes)
      setRecipes(transformedRecipes)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group products with their recipes
  const productRecipes = products.map(product => {
    const recipe = recipes.find(r => r.product_id === product.id)
    
    return {
      product,
      baseRecipe: recipe,
      hasRecipe: !!recipe
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

  const handleSetRecipe = (product: Product) => {
    setSelectedProduct({
      id: product.id,
      name: product.name
    })
    setEditingRecipe(null)
    setShowRecipeModal(true)
  }

  const handleEditRecipe = (recipe: Recipe) => {
    const product = products.find(p => p.id === recipe.product_id)
    if (product) {
      setSelectedProduct({
        id: product.id,
        name: product.name
      })
      setEditingRecipe(recipe)
      setShowRecipeModal(true)
    }
  }

  const handleSaveRecipe = async (newRecipe: { product_id: string, ingredients: { inventory_item_id: string, quantity_needed: number, unit: string, ingredient_name: string }[] }) => {
    try {
      // Create recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert([{
          product_id: newRecipe.product_id,
          product_name: selectedProduct?.name || '',
          recipe_type: 'base'
        }])
        .select()
        .single()

      if (recipeError) throw recipeError

      // Create recipe ingredients
      const ingredients = newRecipe.ingredients.map(ing => ({
        recipe_id: recipeData.id,
        inventory_item_id: ing.inventory_item_id,
        ingredient_name: ing.ingredient_name,
        quantity_needed: ing.quantity_needed,
        unit: ing.unit
      }))

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredients)

      if (ingredientsError) throw ingredientsError

      // Log recipe creation
      await logActivity({
        action: 'CREATE',
        category: 'INVENTORY',
        description: `Created recipe for ${selectedProduct?.name || 'product'}`,
        severity: 'warning',
        resourceType: 'recipe',
        resourceId: recipeData.id,
        resourceName: selectedProduct?.name || '',
        newValue: JSON.stringify({
          product_name: selectedProduct?.name,
          ingredients_count: newRecipe.ingredients.length,
          ingredients: newRecipe.ingredients.map(ing => `${ing.ingredient_name} (${ing.quantity_needed} ${ing.unit})`)
        }),
        notes: `Recipe with ${newRecipe.ingredients.length} ingredients`,
        tags: ['recipe', 'create', 'inventory']
      })

      await fetchData()
      setShowRecipeModal(false)
      setSelectedProduct(null)
      setEditingRecipe(null)
      showSuccess('Recipe berhasil disimpan')
    } catch (error) {
      showError('Gagal menyimpan recipe')
    }
  }

  const handleUpdateRecipe = async (updatedRecipe: { id: string, product_id: string, ingredients: { inventory_item_id: string, quantity_needed: number, unit: string, ingredient_name: string }[] }) => {
    try {
      // Update recipe timestamp
      console.log('Updating recipe timestamp for recipe_id:', updatedRecipe.id)
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', updatedRecipe.id)

      if (updateError) {
        console.error('Update timestamp error:', updateError)
        throw updateError
      }
      console.log('Recipe timestamp updated')

      // Delete old ingredients
      console.log('Deleting old ingredients for recipe_id:', updatedRecipe.id)
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', updatedRecipe.id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw deleteError
      }
      console.log('Old ingredients deleted successfully')

      // Insert new ingredients
      const ingredients = updatedRecipe.ingredients.map(ing => ({
        recipe_id: updatedRecipe.id,
        inventory_item_id: ing.inventory_item_id,
        ingredient_name: ing.ingredient_name,
        quantity_needed: ing.quantity_needed,
        unit: ing.unit
      }))

      console.log('Inserting new ingredients:', ingredients)
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredients)

      if (ingredientsError) {
        console.error('Insert error:', ingredientsError)
        throw ingredientsError
      }

      // Get product name for logging
      const product = products.find(p => p.id === updatedRecipe.product_id)
      
      // Log recipe update
      await logActivity({
        action: 'UPDATE',
        category: 'INVENTORY',
        description: `Updated recipe for ${product?.name || 'product'}`,
        severity: 'warning',
        resourceType: 'recipe',
        resourceId: updatedRecipe.id,
        resourceName: product?.name || '',
        previousValue: editingRecipe ? JSON.stringify({
          ingredients_count: editingRecipe.ingredients.length,
          ingredients: editingRecipe.ingredients.map(ing => `${ing.ingredient_name} (${ing.quantity_needed} ${ing.unit})`)
        }) : undefined,
        newValue: JSON.stringify({
          ingredients_count: updatedRecipe.ingredients.length,
          ingredients: updatedRecipe.ingredients.map(ing => `${ing.ingredient_name} (${ing.quantity_needed} ${ing.unit})`)
        }),
        notes: `Recipe ingredients updated`,
        tags: ['recipe', 'update', 'inventory']
      })

      await fetchData()
      setShowRecipeModal(false)
      setSelectedProduct(null)
      setEditingRecipe(null)
      showSuccess('Recipe berhasil diupdate')
    } catch (error) {
      showError('Gagal mengupdate recipe')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section 1: Header + Stats */}
      <section className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Dishes (Base Recipes)</h2>
            <p className="text-xs md:text-sm text-gray-500">Manage base recipes for your menu dishes</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full lg:w-auto">
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
            <div className="relative flex-1 lg:flex-none">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full lg:w-64 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 pt-4 md:pt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Total Dishes</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">With Recipe</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#B2FF5E' }}>{stats.withRecipe}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Without Recipe</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#FF6859' }}>{stats.withoutRecipe}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Coverage</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {stats.totalProducts > 0 ? Math.round((stats.withRecipe / stats.totalProducts) * 100) : 0}%
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Products List (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 bg-gray-50">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4">
        {filteredProducts.map(({ product, baseRecipe, hasRecipe }) => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col break-inside-avoid mb-3 md:mb-4">
            {/* Product Header */}
            <div className="p-3 md:p-4 border-b border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-bold text-gray-900">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                </div>
                <button
                  onClick={() => hasRecipe && baseRecipe ? handleEditRecipe(baseRecipe) : handleSetRecipe(product)}
                  className="p-1.5 rounded-lg transition hover:bg-gray-100"
                  title={hasRecipe ? "Edit Recipe" : "Set Recipe"}
                >
                  <PlusIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span 
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{
                    backgroundColor: hasRecipe ? '#B2FF5E' : '#FF6859',
                    color: hasRecipe ? '#000000' : '#FFFFFF'
                  }}
                >
                  {hasRecipe ? 'Has Recipe' : 'No Recipe'}
                </span>
              </div>
            </div>

            {/* Recipe Info */}
            <div className="p-3 md:p-4 flex-1">
              {baseRecipe ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-600 uppercase">Ingredients:</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {baseRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-2 rounded">
                        <span className="text-gray-700 truncate flex-1">{ing.ingredient_name}</span>
                        <span className="font-medium text-gray-900 ml-2">{ing.quantity_needed} {ing.unit}</span>
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
        />
      )}
    </div>
  )
}
