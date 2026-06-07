'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BeakerIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { showError } from '@/lib/services/errorHandling'
import { isPositiveNumber } from '@/lib/utils'
import { getCompatibleUnits } from '@/lib/utils/unitConversion'

interface RecipeIngredient {
  inventory_item_id: string
  ingredient_name?: string
  quantity_needed: number
  unit: string
  costing_mode?: RecipeCostingMode | null
}

interface Recipe {
  id: string
  product_id: string
  product_name?: string
  ingredients: RecipeIngredient[]
}

type RecipePayload = {
  product_id: string
  ingredients: {
    inventory_item_id: string
    quantity_needed: number
    unit: string
    ingredient_name: string
    costing_mode: RecipeCostingMode
  }[]
}

type RecipeUpdatePayload = RecipePayload & {
  id: string
}

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recipe: RecipePayload) => void
  onUpdate?: (recipe: RecipeUpdatePayload) => void
  editRecipe?: Recipe | null
  productId: string
  productName: string
}

interface IngredientInput {
  inventory_item_id: string
  ingredient_name: string
  quantity_needed: number
  unit: string
  costing_mode: RecipeCostingMode
}

interface InventoryItem {
  id: string
  name: string
  unit: string
  category?: string | null
  current_stock?: number | null
  tracking_mode?: 'direct_auto_deduct' | 'kitchen_station_auto_deduct' | 'bulk_usage_expense' | null
}

type RecipeCostingMode = 'deduct_from_pos' | 'cost_estimate_only' | 'kitchen_overhead'

const createEmptyIngredient = (): IngredientInput => ({
  inventory_item_id: '',
  ingredient_name: '',
  quantity_needed: 0,
  unit: '',
  costing_mode: 'deduct_from_pos',
})

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0'
  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })
}

const getDefaultCostingMode = (mode?: InventoryItem['tracking_mode']): RecipeCostingMode => {
  if (mode === 'bulk_usage_expense') return 'cost_estimate_only'
  return 'deduct_from_pos'
}

const getCostingModeLabel = (mode?: RecipeCostingMode) => {
  if (mode === 'kitchen_overhead') return 'Kitchen overhead'
  if (mode === 'cost_estimate_only') return 'Cost estimate only'
  return 'Deduct from POS'
}

const getTrackingModeLabel = (mode?: InventoryItem['tracking_mode'], costingMode?: RecipeCostingMode) => {
  if (costingMode === 'kitchen_overhead') return 'Kitchen overhead'
  if (costingMode === 'cost_estimate_only') return 'Cost estimate'
  if (mode === 'kitchen_station_auto_deduct') return 'Kitchen deduct'
  return 'Auto deduct'
}

const getQuantityLabel = (costingMode?: RecipeCostingMode) => {
  if (costingMode === 'kitchen_overhead') return 'Qty not required'
  if (costingMode === 'cost_estimate_only') return 'Costing Qty / Portion'
  return 'Deduct Qty / Portion'
}

const getQuantityHelpText = (mode?: InventoryItem['tracking_mode'], costingMode?: RecipeCostingMode) => {
  if (costingMode === 'kitchen_overhead') {
    return 'Recorded through Bulk Opened as general kitchen cost, not assigned to this menu.'
  }

  if (costingMode === 'cost_estimate_only') {
    return 'Used for menu cost and margin. Stock is recorded through Bulk Opened.'
  }

  if (mode === 'kitchen_station_auto_deduct') {
    return 'Used by POS from Kitchen Station Ready stock.'
  }

  return 'Used by POS for automatic stock deduction.'
}

export default function RecipeModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editRecipe,
  productId,
  productName,
}: RecipeModalProps) {
  const [ingredients, setIngredients] = useState<IngredientInput[]>([])
  const [availableIngredients, setAvailableIngredients] = useState<InventoryItem[]>([])
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [loadingIngredients, setLoadingIngredients] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    void fetchAvailableIngredients()

    if (editRecipe) {
      setIngredients(
        editRecipe.ingredients.map((ingredient) => ({
          inventory_item_id: ingredient.inventory_item_id,
          ingredient_name: ingredient.ingredient_name || '',
          quantity_needed: Number(ingredient.quantity_needed) || 0,
          unit: ingredient.unit,
          costing_mode: ingredient.costing_mode || 'deduct_from_pos',
        })),
      )
      return
    }

    setIngredients([])
    setIngredientSearch('')
  }, [isOpen, editRecipe])

  const fetchAvailableIngredients = async () => {
    setLoadingIngredients(true)

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, unit, category, current_stock, tracking_mode')
        .order('name', { ascending: true })

      if (error) throw error

      setAvailableIngredients((data || []) as InventoryItem[])
    } catch (error) {
      console.error('Error fetching ingredients:', error)
      showError('Failed to load inventory ingredients.')
      setAvailableIngredients([])
    } finally {
      setLoadingIngredients(false)
    }
  }

  const filteredIngredients = useMemo(() => {
    const keyword = ingredientSearch.trim().toLowerCase()

    if (!keyword) return availableIngredients

    return availableIngredients.filter((item) => {
      const name = item.name.toLowerCase()
      const category = (item.category || '').toLowerCase()
      return name.includes(keyword) || category.includes(keyword)
    })
  }, [availableIngredients, ingredientSearch])

  const selectedIngredientIds = useMemo(
    () => new Set(ingredients.map((ingredient) => ingredient.inventory_item_id).filter(Boolean)),
    [ingredients],
  )

  const totalIngredients = ingredients.length

  const handleAddIngredient = () => {
    setIngredients((current) => [...current, createEmptyIngredient()])
  }

  const handleQuickAddIngredient = (item: InventoryItem) => {
    if (selectedIngredientIds.has(item.id)) {
      showError(`${item.name} is already added to this recipe.`)
      return
    }

    setIngredients((current) => [
      ...current,
      {
        inventory_item_id: item.id,
        ingredient_name: item.name,
        quantity_needed: 0,
        unit: item.unit,
        costing_mode: getDefaultCostingMode(item.tracking_mode),
      },
    ])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients((current) => current.filter((_, ingredientIndex) => ingredientIndex !== index))
  }

  const handleIngredientChange = (
    index: number,
    field: keyof IngredientInput,
    value: string | number,
  ) => {
    setIngredients((current) => {
      const nextIngredients = [...current]
      const currentIngredient = nextIngredients[index] || createEmptyIngredient()

      if (field === 'inventory_item_id') {
        const selectedItem = availableIngredients.find((item) => item.id === value)

        if (!selectedItem) {
          nextIngredients[index] = {
            ...currentIngredient,
            inventory_item_id: '',
            ingredient_name: '',
            unit: '',
            costing_mode: 'deduct_from_pos',
          }
          return nextIngredients
        }

        nextIngredients[index] = {
          inventory_item_id: selectedItem.id,
          ingredient_name: selectedItem.name,
          quantity_needed: currentIngredient.quantity_needed || 0,
          unit: selectedItem.unit,
          costing_mode: getDefaultCostingMode(selectedItem.tracking_mode),
        }

        return nextIngredients
      }

      if (field === 'costing_mode' && value === 'kitchen_overhead') {
        nextIngredients[index] = {
          ...currentIngredient,
          costing_mode: 'kitchen_overhead',
          quantity_needed: 0,
        }

        return nextIngredients
      }

      nextIngredients[index] = {
        ...currentIngredient,
        [field]: value,
      }

      return nextIngredients
    })
  }

  const handleSubmit = () => {
    if (!productId) {
      showError('Product is not selected.')
      return
    }

    if (ingredients.length === 0) {
      showError('Add at least one ingredient to this recipe.')
      return
    }

    const hasDuplicateIngredient =
      new Set(ingredients.map((ingredient) => ingredient.inventory_item_id).filter(Boolean)).size !==
      ingredients.filter((ingredient) => Boolean(ingredient.inventory_item_id)).length

    if (hasDuplicateIngredient) {
      showError('Duplicate ingredients are not allowed in one recipe.')
      return
    }

    const hasInvalidIngredient = ingredients.some((ingredient) => {
      return (
        !ingredient.inventory_item_id ||
        !ingredient.ingredient_name.trim() ||
        !ingredient.unit.trim() ||
        !ingredient.costing_mode ||
        (ingredient.costing_mode !== 'kitchen_overhead' && !isPositiveNumber(ingredient.quantity_needed))
      )
    })

    if (hasInvalidIngredient) {
      showError('Complete all ingredient details. Quantity is required unless the ingredient is Kitchen overhead.')
      return
    }

    const recipeData: RecipePayload = {
      product_id: productId,
      ingredients: ingredients.map((ingredient) => ({
        inventory_item_id: ingredient.inventory_item_id,
        ingredient_name: ingredient.ingredient_name,
        quantity_needed: Number(ingredient.quantity_needed),
        unit: ingredient.unit,
        costing_mode: ingredient.costing_mode,
      })),
    }

    if (editRecipe && onUpdate) {
      onUpdate({
        id: editRecipe.id,
        ...recipeData,
      })
    } else {
      onSave(recipeData)
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Base Recipe
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              {editRecipe ? 'Edit Recipe' : 'Set Recipe'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Define the base inventory usage for{' '}
              <span className="font-medium text-gray-800">{productName}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            aria-label="Close recipe modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_360px]">
          <div className="min-h-0 overflow-y-auto p-5">
            <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Recipe Ingredients</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Add raw materials used by this product before variant adjustments.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                <PlusIcon className="h-4 w-4" />
                Add Ingredient
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                <div className="mb-4 rounded-lg bg-white p-3 text-gray-700 ring-1 ring-gray-200">
                  <BeakerIcon className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">No ingredients added</h4>
                <p className="mt-2 max-w-sm text-sm text-gray-500">
                  Start by adding inventory items such as coffee beans, milk, cups, or packaging.
                </p>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add First Ingredient
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => {
                  const selectedInventoryItem = availableIngredients.find((item) => item.id === ingredient.inventory_item_id)
                  const trackingMode = selectedInventoryItem?.tracking_mode
                  const quantityDisabled = ingredient.costing_mode === 'kitchen_overhead'

                  return (
                  <div
                    key={`${ingredient.inventory_item_id || 'new'}-${index}`}
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-700">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {ingredient.ingredient_name || 'New Ingredient'}
                            </p>
                            {ingredient.inventory_item_id ? (
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                {getTrackingModeLabel(trackingMode, ingredient.costing_mode)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-500">
                            {ingredient.unit ? `Unit: ${ingredient.unit}` : 'Select an inventory item'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                        aria-label="Remove ingredient"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_90px]">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                          Ingredient
                        </label>
                        <select
                          value={ingredient.inventory_item_id}
                          onChange={(event) =>
                            handleIngredientChange(index, 'inventory_item_id', event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                        >
                          <option value="">Select ingredient...</option>
                          {availableIngredients.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit}) - {getTrackingModeLabel(item.tracking_mode, getDefaultCostingMode(item.tracking_mode))}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                          {getQuantityLabel(ingredient.costing_mode)}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={quantityDisabled}
                          value={ingredient.quantity_needed || ''}
                          onChange={(event) =>
                            handleIngredientChange(
                              index,
                              'quantity_needed',
                              Number(event.target.value) || 0,
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
                          placeholder={quantityDisabled ? 'Not assigned' : '0'}
                        />
                        {ingredient.inventory_item_id ? (
                          <p className="mt-1 text-[11px] leading-4 text-gray-500">
                            {getQuantityHelpText(trackingMode, ingredient.costing_mode)}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">Unit</label>
                        <select
                          value={ingredient.unit}
                          onChange={(event) => handleIngredientChange(index, 'unit', event.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                        >
                          {(getCompatibleUnits(selectedInventoryItem?.unit || ingredient.unit).length > 0
                            ? getCompatibleUnits(selectedInventoryItem?.unit || ingredient.unit)
                            : [ingredient.unit || '-']
                          ).map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">
                        Cost behavior
                      </label>
                      <select
                        value={ingredient.costing_mode}
                        onChange={(event) =>
                          handleIngredientChange(index, 'costing_mode', event.target.value as RecipeCostingMode)
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="deduct_from_pos">{getCostingModeLabel('deduct_from_pos')}</option>
                        <option value="cost_estimate_only">{getCostingModeLabel('cost_estimate_only')}</option>
                        <option value="kitchen_overhead">{getCostingModeLabel('kitchen_overhead')}</option>
                      </select>
                      <p className="mt-1 text-[11px] leading-4 text-gray-500">
                        {ingredient.costing_mode === 'kitchen_overhead'
                          ? 'For salt, sugar, seasoning, or tiny garnish. Cost is captured from Bulk Opened, not this menu.'
                          : ingredient.costing_mode === 'cost_estimate_only'
                            ? 'For rice, sauce, vegetables, or packaging standards. It affects menu margin but is not deducted by POS.'
                            : 'For critical ingredients that POS should deduct or use for menu readiness.'}
                      </p>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col border-t border-gray-200 bg-gray-50 p-5 lg:border-l lg:border-t-0">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                  <CubeIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="text-sm font-semibold text-gray-900">{productName}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-xs text-gray-500">Ingredients</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{totalIngredients}</p>
                </div>
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-xs text-gray-500">Mode</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {editRecipe ? 'Edit' : 'Create'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Quick Add</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Select from inventory items to add them into the recipe.
                </p>
              </div>

              <div className="relative mb-3">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(event) => setIngredientSearch(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  placeholder="Search ingredients..."
                />
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {loadingIngredients ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                    Loading ingredients...
                  </div>
                ) : filteredIngredients.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                    No ingredients found.
                  </div>
                ) : (
                  filteredIngredients.map((item) => {
                    const isSelected = selectedIngredientIds.has(item.id)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleQuickAddIngredient(item)}
                        disabled={isSelected}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          isSelected
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.category || 'Inventory'} • {item.unit}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-gray-500">
                            {formatNumber(item.current_stock)}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            {editRecipe ? 'Update Recipe' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
