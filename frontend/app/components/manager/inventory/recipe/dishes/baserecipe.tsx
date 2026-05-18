'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { showError, showSuccess } from '@/lib/services/errorHandling'
import { logActivity } from '@/lib/services/activity/activityLogger'
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
  category_id: string | null
  type: string | null
}

interface ProductRecipeState {
  product: Product
  baseRecipe: Recipe | undefined
  hasRecipe: boolean
}

interface RecipeFormPayload {
  product_id: string
  ingredients: RecipeIngredient[]
}

interface RecipeUpdatePayload extends RecipeFormPayload {
  id: string
}

interface RecipeDbRow {
  id: string
  product_id: string
  product_name?: string | null
  created_at?: string | null
  updated_at?: string | null
  recipe_type?: string | null
}

interface RecipeIngredientDbRow {
  recipe_id: string
  inventory_item_id: string
  ingredient_name?: string | null
  quantity_needed: number
  unit: string
}

interface InventoryLookupRow {
  id: string
  name: string
}

const formatDate = (value?: string) => {
  if (!value) return 'Unknown'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

const buildRecipeActivityValue = (recipe: {
  productName?: string
  ingredients: RecipeIngredient[]
}): Record<string, unknown> => ({
  productName: recipe.productName ?? 'Product',
  ingredientsCount: recipe.ingredients.length,
  ingredients: recipe.ingredients.map((ingredient) => ({
    inventoryItemId: ingredient.inventory_item_id,
    name: ingredient.ingredient_name,
    quantity: ingredient.quantity_needed,
    unit: ingredient.unit,
  })),
})

export default function RecipeDishesTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    void fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category_id, type')
        .order('name')

      if (productsError) throw productsError

      const normalizedProducts = (productsData ?? []) as Product[]
      setProducts(normalizedProducts)

      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('id, product_id, product_name, recipe_type, created_at, updated_at')
        .eq('recipe_type', 'base')

      if (recipesError) throw recipesError

      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit')

      if (ingredientsError) throw ingredientsError

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, name')

      if (inventoryError) throw inventoryError

      const recipeRows = (recipesData ?? []) as RecipeDbRow[]
      const ingredientRows = (ingredientsData ?? []) as RecipeIngredientDbRow[]
      const inventoryRows = (inventoryData ?? []) as InventoryLookupRow[]

      const transformedRecipes: Recipe[] = recipeRows.map((recipe) => {
        const recipeIngredients = ingredientRows
          .filter((ingredient) => ingredient.recipe_id === recipe.id)
          .map((ingredient) => {
            const inventoryItem = inventoryRows.find(
              (item) => item.id === ingredient.inventory_item_id,
            )

            return {
              inventory_item_id: ingredient.inventory_item_id,
              ingredient_name: inventoryItem?.name || ingredient.ingredient_name || 'Unknown item',
              quantity_needed: Number(ingredient.quantity_needed) || 0,
              unit: ingredient.unit,
            }
          })

        const product = normalizedProducts.find((item) => item.id === recipe.product_id)

        return {
          id: recipe.id,
          product_id: recipe.product_id,
          product_name: product?.name || recipe.product_name || 'Unknown product',
          ingredients: recipeIngredients,
          createdAt: recipe.created_at ?? '',
          updatedAt: recipe.updated_at ?? recipe.created_at ?? '',
        }
      })

      setRecipes(transformedRecipes)
    } catch (error) {
      console.error('Failed to load base recipes:', error)
      showError(getErrorMessage(error, 'Failed to load base recipes.'))
    } finally {
      setLoading(false)
    }
  }

  const productRecipes: ProductRecipeState[] = useMemo(
    () =>
      products.map((product) => {
        const baseRecipe = recipes.find((recipe) => recipe.product_id === product.id)
        return {
          product,
          baseRecipe,
          hasRecipe: Boolean(baseRecipe),
        }
      }),
    [products, recipes],
  )

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return productRecipes

    return productRecipes.filter(({ product }) => product.name.toLowerCase().includes(query))
  }, [productRecipes, searchQuery])

  const stats = useMemo(
    () => ({
      totalProducts: products.length,
      withRecipe: productRecipes.filter((item) => item.hasRecipe).length,
      withoutRecipe: productRecipes.filter((item) => !item.hasRecipe).length,
    }),
    [productRecipes, products.length],
  )

  const coverage = stats.totalProducts > 0 ? Math.round((stats.withRecipe / stats.totalProducts) * 100) : 0

  const handleSetRecipe = (product: Product) => {
    setSelectedProduct({ id: product.id, name: product.name })
    setEditingRecipe(null)
    setShowRecipeModal(true)
  }

  const handleEditRecipe = (recipe: Recipe) => {
    const product = products.find((item) => item.id === recipe.product_id)
    if (!product) return

    setSelectedProduct({ id: product.id, name: product.name })
    setEditingRecipe(recipe)
    setShowRecipeModal(true)
  }

  const handleSaveRecipe = async (newRecipe: RecipeFormPayload) => {
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert([
          {
            product_id: newRecipe.product_id,
            product_name: selectedProduct?.name || '',
            recipe_type: 'base',
          },
        ])
        .select('id')
        .single()

      if (recipeError) throw recipeError
      if (!recipeData?.id) throw new Error('Recipe was created without an id.')

      const ingredients = newRecipe.ingredients.map((ingredient) => ({
        recipe_id: recipeData.id,
        inventory_item_id: ingredient.inventory_item_id,
        ingredient_name: ingredient.ingredient_name,
        quantity_needed: ingredient.quantity_needed,
        unit: ingredient.unit,
      }))

      const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(ingredients)
      if (ingredientsError) throw ingredientsError

      await logActivity({
        action: 'CREATE',
        category: 'INVENTORY',
        description: `Created base recipe for ${selectedProduct?.name || 'product'}`,
        severity: 'warning',
        resourceType: 'recipe',
        resourceId: recipeData.id,
        resourceName: selectedProduct?.name || '',
        newValue: buildRecipeActivityValue({
          productName: selectedProduct?.name,
          ingredients: newRecipe.ingredients,
        }),
        notes: `Recipe with ${newRecipe.ingredients.length} ingredients`,
        tags: ['recipe', 'create', 'inventory'],
      })

      await fetchData()
      setShowRecipeModal(false)
      setSelectedProduct(null)
      setEditingRecipe(null)
      showSuccess('Recipe saved successfully.')
    } catch (error) {
      console.error('Failed to save recipe:', error)
      showError(getErrorMessage(error, 'Failed to save recipe.'))
    }
  }

  const handleUpdateRecipe = async (updatedRecipe: RecipeUpdatePayload) => {
    try {
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', updatedRecipe.id)

      if (updateError) throw updateError

      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', updatedRecipe.id)

      if (deleteError) throw deleteError

      const ingredients = updatedRecipe.ingredients.map((ingredient) => ({
        recipe_id: updatedRecipe.id,
        inventory_item_id: ingredient.inventory_item_id,
        ingredient_name: ingredient.ingredient_name,
        quantity_needed: ingredient.quantity_needed,
        unit: ingredient.unit,
      }))

      const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(ingredients)
      if (ingredientsError) throw ingredientsError

      const product = products.find((item) => item.id === updatedRecipe.product_id)

      await logActivity({
        action: 'UPDATE',
        category: 'INVENTORY',
        description: `Updated base recipe for ${product?.name || 'product'}`,
        severity: 'warning',
        resourceType: 'recipe',
        resourceId: updatedRecipe.id,
        resourceName: product?.name || '',
        previousValue: editingRecipe
          ? buildRecipeActivityValue({
              productName: product?.name,
              ingredients: editingRecipe.ingredients,
            })
          : undefined,
        newValue: buildRecipeActivityValue({
          productName: product?.name,
          ingredients: updatedRecipe.ingredients,
        }),
        notes: 'Recipe ingredients updated.',
        tags: ['recipe', 'update', 'inventory'],
      })

      await fetchData()
      setShowRecipeModal(false)
      setSelectedProduct(null)
      setEditingRecipe(null)
      showSuccess('Recipe updated successfully.')
    } catch (error) {
      console.error('Failed to update recipe:', error)
      showError(getErrorMessage(error, 'Failed to update recipe.'))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <section className="shrink-0 border-b border-gray-200 bg-white p-4 md:p-6">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-gray-900 md:text-xl">Dishes (Base Recipes)</h2>
            <p className="text-xs text-gray-500 md:text-sm">
              Manage default ingredients for each menu product before variant adjustments are applied.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 md:gap-4 lg:w-auto">
            <button
              type="button"
              onClick={() => setShowStats((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 transition hover:bg-gray-50"
              title={showStats ? 'Hide statistics' : 'Show statistics'}
            >
              {showStats ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-600" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-600" />
              )}
            </button>

            <div className="relative flex-1 lg:flex-none">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 md:h-5 md:w-5" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 md:pl-10 lg:w-64"
              />
            </div>
          </div>
        </div>

        {showStats && (
          <div className="grid grid-cols-2 gap-3 pt-4 md:gap-4 md:pt-6 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
              <div className="mb-1 text-xs text-gray-600 md:text-sm">Total Dishes</div>
              <div className="text-xl font-bold text-gray-900 md:text-2xl">{stats.totalProducts}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
              <div className="mb-1 text-xs text-gray-600 md:text-sm">With Recipe</div>
              <div className="text-xl font-bold text-gray-900 md:text-2xl">{stats.withRecipe}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
              <div className="mb-1 text-xs text-gray-600 md:text-sm">Without Recipe</div>
              <div className="text-xl font-bold text-gray-900 md:text-2xl">{stats.withoutRecipe}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
              <div className="mb-1 text-xs text-gray-600 md:text-sm">Coverage</div>
              <div className="text-xl font-bold text-gray-900 md:text-2xl">{coverage}%</div>
            </div>
          </div>
        )}
      </section>

      <section className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 md:px-6 md:py-6">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading base recipes...
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="columns-1 gap-3 space-y-3 md:gap-4 md:space-y-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {filteredProducts.map(({ product, baseRecipe, hasRecipe }) => (
              <div
                key={product.id}
                className="mb-3 flex break-inside-avoid flex-col overflow-hidden rounded-lg border border-gray-200 bg-white md:mb-4"
              >
                <div className="border-b border-gray-200 p-3 md:p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold text-gray-900 md:text-lg">{product.name}</h3>
                      <p className="mt-1 text-xs capitalize text-gray-500">{product.type || 'Menu item'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (hasRecipe && baseRecipe ? handleEditRecipe(baseRecipe) : handleSetRecipe(product))}
                      className="rounded-lg p-1.5 transition hover:bg-gray-100"
                      title={hasRecipe ? 'Edit recipe' : 'Set recipe'}
                    >
                      <PlusIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      hasRecipe ? 'bg-lime-200 text-gray-900' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {hasRecipe ? 'Has Recipe' : 'No Recipe'}
                  </span>
                </div>

                <div className="flex-1 p-3 md:p-4">
                  {baseRecipe ? (
                    <div className="space-y-3">
                      <div className="text-xs font-medium uppercase text-gray-600">Ingredients</div>
                      <div className="max-h-40 space-y-2 overflow-y-auto">
                        {baseRecipe.ingredients.map((ingredient) => (
                          <div
                            key={`${baseRecipe.id}-${ingredient.inventory_item_id}`}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-2 text-xs"
                          >
                            <span className="min-w-0 flex-1 truncate text-gray-700">
                              {ingredient.ingredient_name}
                            </span>
                            <span className="ml-2 font-medium text-gray-900">
                              {ingredient.quantity_needed} {ingredient.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 text-xs text-gray-400">
                        Updated: {formatDate(baseRecipe.updatedAt)}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetRecipe(product)}
                      className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-400 transition hover:border-gray-400 hover:bg-gray-50"
                    >
                      <span className="text-xs font-medium">No recipe set</span>
                      <span className="mt-1 text-xs">Click to add base ingredients</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No dishes match your search.
          </div>
        )}
      </section>

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