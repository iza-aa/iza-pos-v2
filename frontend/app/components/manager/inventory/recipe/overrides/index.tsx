'use client'

import { useState, useEffect } from 'react'
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { showSuccess, showError, confirmDelete } from '@/lib/errorHandling'
import { validateRequired, isPositiveNumber } from '@/lib/validation'
import type { VariantOption } from '@/lib/types'

interface ProductOverridesTabProps {
  viewAsOwner: boolean
}

interface IngredientInput {
  inventory_item_id: string
  ingredient_name: string
  quantity_needed: number
  unit: string
}

interface OverrideRecipe {
  id: string
  product_id: string
  product_name: string
  variant_name: string
  recipe_scope: string
  is_override: boolean
  ingredients: IngredientInput[]
}

interface Product {
  id: string
  name: string
}

export default function ProductOverridesTab({ viewAsOwner }: ProductOverridesTabProps) {
  const [overrides, setOverrides] = useState<OverrideRecipe[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showIngredientModal, setShowIngredientModal] = useState(false)
  const [selectedOverride, setSelectedOverride] = useState<OverrideRecipe | null>(null)
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set())
  
  // Form states
  const [newOverride, setNewOverride] = useState({
    product_id: '',
    variant_name: ''
  })
  const [newIngredient, setNewIngredient] = useState({
    inventory_item_id: '',
    quantity_needed: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name')
        .eq('available', true)
        .order('name')

      setProducts(productsData || [])

      // Fetch variant groups and options
      const { data: groupsData } = await supabase
        .from('variant_groups')
        .select('id, name')
        .eq('is_active', true)

      const { data: optionsData } = await supabase
        .from('variant_options')
        .select('id, name, variant_group_id')
        .eq('is_active', true)

      const optionsWithGroups: VariantOption[] = (optionsData || []).map(opt => {
        const group = (groupsData || []).find(g => g.id === opt.variant_group_id)
        return {
          id: opt.id,
          name: opt.name,
          groupName: group?.name || 'Unknown'
        }
      })
      setVariantOptions(optionsWithGroups)

      // Fetch inventory items
      const { data: inventoryData } = await supabase
        .from('inventory_items')
        .select('id, name, unit, category')

      setInventoryItems(inventoryData || [])

      // Fetch product overrides
      const { data: overridesData, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('recipe_scope', 'product-override')
        .eq('is_override', true)
        .order('product_name')

      if (error) throw error

      // Fetch ingredients for each override
      const { data: ingredientsData } = await supabase
        .from('recipe_ingredients')
        .select('*')

      // Transform overrides with ingredients
      const transformedOverrides: OverrideRecipe[] = (overridesData || []).map(recipe => {
        const recipeIngredients = (ingredientsData || [])
          .filter((ing: any) => ing.recipe_id === recipe.id)
          .map((ing: any) => {
            const inventoryItem = (inventoryData || []).find((inv: any) => inv.id === ing.inventory_item_id)
            return {
              inventory_item_id: ing.inventory_item_id,
              ingredient_name: inventoryItem?.name || ing.ingredient_name || 'Unknown',
              quantity_needed: ing.quantity_needed,
              unit: ing.unit
            }
          })

        return {
          id: recipe.id,
          product_id: recipe.product_id,
          product_name: recipe.product_name || '',
          variant_name: recipe.variant_name || '',
          recipe_scope: recipe.recipe_scope,
          is_override: recipe.is_override,
          ingredients: recipeIngredients
        }
      })

      setOverrides(transformedOverrides)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const rawMaterials = inventoryItems.filter(item => item.category !== 'Finished Goods')

  const toggleOverride = (id: string) => {
    const newExpanded = new Set(expandedOverrides)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedOverrides(newExpanded)
  }

  const handleCreateOverride = async () => {
    if (!newOverride.product_id || !newOverride.variant_name) {
      showError('Pilih product dan variant terlebih dahulu')
      return
    }

    const product = products.find(p => p.id === newOverride.product_id)
    if (!product) return

    try {
      const overrideData = {
        product_id: newOverride.product_id,
        product_name: product.name,
        recipe_type: 'variant-specific',
        recipe_scope: 'product-override',
        variant_name: newOverride.variant_name,
        is_override: true,
        is_active: true
      }

      const { error } = await supabase
        .from('recipes')
        .insert([overrideData])

      if (error) throw error

      await fetchData()
      setShowAddModal(false)
      setNewOverride({ product_id: '', variant_name: '' })
    } catch (error) {
      showError('Gagal membuat override')
    }
  }

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Are you sure you want to delete this override?')) return

    try {
      // Delete ingredients first
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id)

      // Delete override
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
      showSuccess('Override berhasil dihapus')
    } catch (error) {
      showError('Gagal menghapus override')
    }
  }

  const handleAddIngredient = async () => {
    if (!selectedOverride || !newIngredient.inventory_item_id || newIngredient.quantity_needed <= 0) return

    const selectedItem = rawMaterials.find(item => item.id === newIngredient.inventory_item_id)
    if (!selectedItem) return

    try {
      const ingredientData = {
        recipe_id: selectedOverride.id,
        inventory_item_id: selectedItem.id,
        ingredient_name: selectedItem.name,
        quantity_needed: newIngredient.quantity_needed,
        unit: selectedItem.unit
      }

      const { error } = await supabase
        .from('recipe_ingredients')
        .insert([ingredientData])

      if (error) throw error

      await fetchData()
      setShowIngredientModal(false)
      setNewIngredient({ inventory_item_id: '', quantity_needed: 0 })
      showSuccess('Ingredient berhasil ditambahkan')
    } catch (error) {
      showError('Gagal menambahkan ingredient')
    }
  }

  const handleRemoveIngredient = async (overrideId: string, inventoryItemId: string) => {
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', overrideId)
        .eq('inventory_item_id', inventoryItemId)

      if (error) throw error
      await fetchData()
      showSuccess('Ingredient berhasil dihapus')
    } catch (error) {
      showError('Gagal menghapus ingredient')
    }
  }

  const filteredOverrides = overrides.filter(o =>
    o.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.variant_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <section className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Product Overrides</h2>
            <p className="text-xs md:text-sm text-gray-500">
              Set exact ingredient quantities for specific product + variant combinations. Overrides take priority over default modifiers.
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative flex-1 md:flex-initial">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search overrides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full md:w-64"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-700 font-medium transition text-sm md:text-base whitespace-nowrap"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Add Override</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 md:p-4 rounded-xl border-2" style={{ backgroundColor: '#FFE5E2', borderColor: '#FF6859' }}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6859' }}>
              <span className="text-white font-bold text-sm">!</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm md:text-base" style={{ color: '#FF6859' }}>When to Use Overrides</h4>
              <p className="text-xs md:text-sm text-gray-900 mt-1">
                Use overrides when a specific product needs <strong>different ingredients</strong> than the default modifier would calculate.<br/>
                Example: Large Americano needs exactly 18g coffee (not 15g from +50% modifier).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="flex-1 overflow-auto bg-gray-50 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading overrides...</p>
          </div>
        ) : filteredOverrides.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No product overrides yet</p>
              <p className="text-sm text-gray-400">Click "Add Override" to create a custom recipe for a specific product variant</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[22%] px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                  <th className="w-[15%] px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Variant</th>
                  <th className="w-[43%] px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ingredients</th>
                  <th className="w-[20%] px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOverrides.map(override => {
                  const isExpanded = expandedOverrides.has(override.id)
                  
                  return (
                    <tr key={override.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-900">
                        {override.product_name}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
                          {override.variant_name}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-2">
                          {!isExpanded ? (
                            <button
                              onClick={() => toggleOverride(override.id)}
                              className="flex items-center gap-2 text-xs md:text-sm text-gray-900 hover:text-gray-700"
                            >
                              <span className="border text-gray-900 px-2 py-0.5 rounded-full text-xs"
                                style={{
                                  borderColor: override.ingredients.length > 0 ? '#B2FF5E' : '#FF6859',
                                  backgroundColor: 'white'
                                }}>
                                {override.ingredients.length} ingredient{override.ingredients.length !== 1 ? 's' : ''}
                              </span>
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <button
                                onClick={() => toggleOverride(override.id)}
                                className="flex items-center gap-1 text-xs md:text-sm text-gray-900 hover:text-gray-700"
                              >
                                <ChevronUpIcon className="w-4 h-4" />
                                <span>Hide</span>
                              </button>
                              
                              {override.ingredients.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No ingredients yet</p>
                              ) : (
                                <div className="space-y-1">
                                  {override.ingredients.map((ing, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                      <span className="text-xs md:text-sm">
                                        <strong>{ing.ingredient_name}</strong>
                                        <span className="text-gray-500 ml-2">{ing.quantity_needed} {ing.unit}</span>
                                      </span>
                                      <button
                                        onClick={() => handleRemoveIngredient(override.id, ing.inventory_item_id)}
                                        className="p-1.5 bg-white border hover:bg-gray-50 rounded transition"
                                        style={{ borderColor: '#FF6859', color: '#FF6859' }}
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <button
                                onClick={() => {
                                  setSelectedOverride(override)
                                  if (rawMaterials.length > 0) {
                                    setNewIngredient({
                                      inventory_item_id: rawMaterials[0].id,
                                      quantity_needed: 0
                                    })
                                  }
                                  setShowIngredientModal(true)
                                }}
                                className="flex items-center gap-1 text-xs text-white bg-gray-900 hover:bg-gray-700 font-medium px-3 py-1.5 rounded-lg transition"
                              >
                                <PlusIcon className="w-4 h-4" />
                                Add Ingredient
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center justify-center gap-2 md:gap-3">
                          <button
                            className="text-xs md:text-sm font-medium text-gray-700 hover:text-gray-900 transition whitespace-nowrap"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOverride(override.id)}
                            className="text-xs md:text-sm font-medium transition whitespace-nowrap"
                            style={{ color: '#FF6859' }}
                            title="Delete override"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Override Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Create Product Override</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
                <select
                  value={newOverride.product_id}
                  onChange={(e) => setNewOverride({ ...newOverride, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">-- Select Product --</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Variant</label>
                <select
                  value={newOverride.variant_name}
                  onChange={(e) => setNewOverride({ ...newOverride, variant_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">-- Select Variant --</option>
                  {variantOptions.map(option => (
                    <option key={option.id} value={option.name}>
                      {option.groupName} - {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOverride}
                disabled={!newOverride.product_id || !newOverride.variant_name}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {showIngredientModal && selectedOverride && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Add Ingredient</h3>
              <button onClick={() => setShowIngredientModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Adding to: <strong>{selectedOverride.product_name} - {selectedOverride.variant_name}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Ingredient</label>
                <select
                  value={newIngredient.inventory_item_id}
                  onChange={(e) => setNewIngredient({ ...newIngredient, inventory_item_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {rawMaterials.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newIngredient.quantity_needed || ''}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity_needed: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowIngredientModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIngredient}
                disabled={!newIngredient.inventory_item_id || newIngredient.quantity_needed <= 0}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Ingredient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
