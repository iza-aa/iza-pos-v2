'use client'

import { useState, useEffect } from 'react'
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon, ChevronDownIcon, ChevronUpIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import RecipeVariantsCard from './RecipeVariantsCard'

interface RecipeVariantsTabProps {
  viewAsOwner: boolean
}

interface IngredientInput {
  inventory_item_id: string
  ingredient_name: string
  quantity_needed: number
  unit: string
}

interface Recipe {
  id: string
  product_id: string
  product_name: string
  recipe_type: 'base' | 'variant-specific'
  variant_combination?: any
  ingredients: IngredientInput[]
  created_at: string
  updated_at: string
}

interface VariantOption {
  id: string
  name: string
  price_modifier: number
}

interface VariantGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  options: VariantOption[]
}

export default function RecipeVariantsTab({ viewAsOwner }: RecipeVariantsTabProps) {
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedOptionForAdd, setSelectedOptionForAdd] = useState<{
    groupId: string
    optionId: string
    optionName: string
  } | null>(null)
  const [newIngredient, setNewIngredient] = useState({
    inventory_item_id: '',
    quantity_needed: 0
  })
  const [editingIngredient, setEditingIngredient] = useState<{
    optionId: string
    index: number
    ingredient: IngredientInput
  } | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch variant groups with options
      const { data: groupsData, error: groupsError } = await supabase
        .from('variant_groups')
        .select('*')
        .order('name')

      if (groupsError) throw groupsError

      // Fetch variant options
      const { data: optionsData, error: optionsError } = await supabase
        .from('variant_options')
        .select('*')
        .order('name')

      if (optionsError) throw optionsError

      // Combine groups with their options
      const groupsWithOptions: VariantGroup[] = (groupsData || []).map(group => ({
        id: group.id,
        name: group.name,
        type: group.type,
        required: group.required,
        options: (optionsData || [])
          .filter((opt: any) => opt.variant_group_id === group.id)
          .map((opt: any) => ({
            id: opt.id,
            name: opt.name,
            price_modifier: opt.price_modifier || 0
          }))
      }))

      setVariantGroups(groupsWithOptions)

      // Fetch variant-specific recipes
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .eq('recipe_type', 'variant-specific')

      if (recipesError) throw recipesError

      // Fetch recipe ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('*')

      if (ingredientsError) throw ingredientsError

      // Fetch inventory items for ingredient names (with category for filtering)
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, name, unit, category')

      if (inventoryError) throw inventoryError
      setInventoryItems(inventoryData || [])
      console.log('Fetched inventory items:', inventoryData) // Debug

      // Transform recipes
      const transformedRecipes: Recipe[] = (recipesData || []).map(recipe => {
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
          recipe_type: recipe.recipe_type,
          variant_combination: recipe.variant_combination,
          ingredients: recipeIngredients,
          created_at: recipe.created_at,
          updated_at: recipe.updated_at
        }
      })

      setRecipes(transformedRecipes)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalVariantGroups: variantGroups.length,
    totalVariantOptions: variantGroups.reduce((sum, vg) => sum + vg.options.length, 0),
    totalVariantRecipes: recipes.filter(r => r.recipe_type === 'variant-specific').length
  }

  // Get all inventory items for ingredients (don't filter by category yet, show all)
  const rawMaterials = inventoryItems.filter(item => item.category !== 'Finished Goods')
  
  console.log('Raw Materials:', rawMaterials) // Debug
  console.log('All Inventory Items:', inventoryItems) // Debug

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const getRecipeForOption = (optionId: string) => {
    return recipes.find(r => 
      r.recipe_type === 'variant-specific' &&
      r.variant_combination &&
      Object.values(r.variant_combination).includes(optionId)
    )
  }

  const handleOpenAddModal = (groupId: string, optionId: string, optionName: string) => {
    setSelectedOptionForAdd({ groupId, optionId, optionName })
    if (rawMaterials.length > 0) {
      setNewIngredient({
        inventory_item_id: rawMaterials[0].id,
        quantity_needed: 0
      })
    }
    setShowAddModal(true)
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setSelectedOptionForAdd(null)
    setNewIngredient({
      inventory_item_id: '',
      quantity_needed: 0
    })
  }

  const handleOpenEditModal = (optionId: string, index: number, ingredient: IngredientInput) => {
    setEditingIngredient({ optionId, index, ingredient })
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingIngredient(null)
  }

  const handleUpdateIngredient = async () => {
    if (!editingIngredient) return

    const recipe = getRecipeForOption(editingIngredient.optionId)
    if (!recipe) return

    const oldIngredient = editingIngredient.ingredient
    const selectedItem = rawMaterials.find(item => item.id === editingIngredient.ingredient.inventory_item_id)
    if (!selectedItem) return

    try {
      // Find the ingredient in database
      const { data: ingredientData } = await supabase
        .from('recipe_ingredients')
        .select('id')
        .eq('recipe_id', recipe.id)
        .eq('inventory_item_id', oldIngredient.inventory_item_id)
        .single()

      if (ingredientData) {
        const { error } = await supabase
          .from('recipe_ingredients')
          .update({
            inventory_item_id: editingIngredient.ingredient.inventory_item_id,
            ingredient_name: selectedItem.name,
            quantity_needed: editingIngredient.ingredient.quantity_needed,
            unit: selectedItem.unit
          })
          .eq('id', ingredientData.id)

        if (error) throw error
        await fetchData()
        handleCloseEditModal()
      }
    } catch (error) {
      console.error('Error updating ingredient:', error)
      alert('Failed to update ingredient')
    }
  }

  const handleAddIngredient = async () => {
    if (!selectedOptionForAdd) return

    // Check if recipe exists, if not create it first
    let recipe = getRecipeForOption(selectedOptionForAdd.optionId)
    
    if (!recipe) {
      // Create recipe first
      const variantGroup = variantGroups.find(vg => vg.id === selectedOptionForAdd.groupId)
      const option = variantGroup?.options.find(opt => opt.id === selectedOptionForAdd.optionId)
      
      if (!variantGroup || !option) return

      try {
        const newRecipe = {
          product_id: null,
          product_name: `${variantGroup.name} - ${option.name}`,
          recipe_type: 'variant-specific',
          variant_combination: { [selectedOptionForAdd.groupId]: selectedOptionForAdd.optionId }
        }

        const { data, error } = await supabase
          .from('recipes')
          .insert([newRecipe])
          .select()

        if (error) throw error
        
        // Refresh data to get the new recipe
        await fetchData()
        
        // Get the newly created recipe
        recipe = getRecipeForOption(selectedOptionForAdd.optionId)
        if (!recipe) return
      } catch (error) {
        console.error('Error creating recipe:', error)
        alert('Failed to create recipe')
        return
      }
    }

    // Now add ingredient
    const selectedItem = rawMaterials.find(item => item.id === newIngredient.inventory_item_id)
    if (!selectedItem || !recipe) return

    const ingredientData = {
      recipe_id: recipe.id,
      inventory_item_id: selectedItem.id,
      ingredient_name: selectedItem.name,
      quantity_needed: newIngredient.quantity_needed,
      unit: selectedItem.unit
    }

    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert([ingredientData])

      if (error) throw error
      await fetchData()
      handleCloseAddModal()
    } catch (error) {
      console.error('Error adding ingredient:', error)
      alert('Failed to add ingredient')
    }
  }

  const handleRemoveIngredient = async (optionId: string, ingredientIndex: number) => {
    const recipe = getRecipeForOption(optionId)
    if (!recipe) return

    const ingredientToDelete = recipe.ingredients[ingredientIndex]
    
    try {
      // Delete ingredient directly using recipe_id and inventory_item_id
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipe.id)
        .eq('inventory_item_id', ingredientToDelete.inventory_item_id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error removing ingredient:', error)
      alert('Failed to remove ingredient')
    }
  }

  const handleIngredientChange = async (optionId: string, ingredientIndex: number, itemId: string) => {
    const recipe = getRecipeForOption(optionId)
    if (!recipe) return

    const item = rawMaterials.find(i => i.id === itemId)
    if (!item) return

    const oldIngredient = recipe.ingredients[ingredientIndex]

    try {
      // Find the ingredient in database
      const { data: ingredientData } = await supabase
        .from('recipe_ingredients')
        .select('id')
        .eq('recipe_id', recipe.id)
        .eq('inventory_item_id', oldIngredient.inventory_item_id)
        .single()

      if (ingredientData) {
        const { error } = await supabase
          .from('recipe_ingredients')
          .update({
            inventory_item_id: item.id,
            ingredient_name: item.name,
            unit: item.unit
          })
          .eq('id', ingredientData.id)

        if (error) throw error
        await fetchData()
      }
    } catch (error) {
      console.error('Error updating ingredient:', error)
      alert('Failed to update ingredient')
    }
  }

  const handleQuantityChange = async (optionId: string, ingredientIndex: number, quantity: number) => {
    const recipe = getRecipeForOption(optionId)
    if (!recipe) return

    const ingredient = recipe.ingredients[ingredientIndex]

    try {
      // Find the ingredient in database
      const { data: ingredientData } = await supabase
        .from('recipe_ingredients')
        .select('id')
        .eq('recipe_id', recipe.id)
        .eq('inventory_item_id', ingredient.inventory_item_id)
        .single()

      if (ingredientData) {
        const { error } = await supabase
          .from('recipe_ingredients')
          .update({ quantity_needed: quantity })
          .eq('id', ingredientData.id)

        if (error) throw error
        
        // Update local state immediately for better UX
        const updatedRecipes = recipes.map(r => {
          if (r.id === recipe.id) {
            const updatedIngredients = [...r.ingredients]
            updatedIngredients[ingredientIndex] = {
              ...updatedIngredients[ingredientIndex],
              quantity_needed: quantity
            }
            return { ...r, ingredients: updatedIngredients }
          }
          return r
        })
        setRecipes(updatedRecipes)
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      alert('Failed to update quantity')
    }
  }

  const handleCreateRecipe = async (groupId: string, groupName: string, optionId: string, optionName: string) => {
    try {
      const newRecipe = {
        product_id: null, // variant-only, no specific product
        product_name: `${groupName} - ${optionName}`,
        recipe_type: 'variant-specific',
        variant_combination: { [groupId]: optionId }
      }

      const { error } = await supabase
        .from('recipes')
        .insert([newRecipe])

      if (error) throw error
      await fetchData()
      
      // Don't auto-expand, let user click "Show ingredients" when ready
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Failed to create recipe')
    }
  }

  const filteredGroups = variantGroups.filter(vg =>
    vg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vg.options.some(opt => opt.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Group options by variant group for better table display
  const groupedOptions = filteredGroups.map(vg => ({
    groupId: vg.id,
    groupName: vg.name,
    options: vg.options.map(opt => ({
      ...opt,
      groupId: vg.id,
      groupName: vg.name,
      recipe: getRecipeForOption(opt.id)
    }))
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header + Stats */}
      <section className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Variants (Variant-Specific Recipes)</h2>
            <p className="text-xs md:text-sm text-gray-500">Manage recipes for each variant option</p>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center justify-center w-10 h-10 transition ${
                  viewMode === 'table' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Table View"
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center justify-center w-10 h-10 transition ${
                  viewMode === 'card' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Card View"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
            </div>

            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              {showStats ? <EyeSlashIcon className="w-5 h-5 text-gray-600" /> : <EyeIcon className="w-5 h-5 text-gray-600" />}
            </button>

            <div className="relative flex-1 md:flex-initial">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search variants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 pt-4 md:pt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Variant Groups</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalVariantGroups}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Total Options</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalVariantOptions}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Variant Recipes</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalVariantRecipes}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Coverage</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {stats.totalVariantOptions > 0 ? Math.round((stats.totalVariantRecipes / stats.totalVariantOptions) * 100) : 0}%
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Content View - Table or Card */}
      <section className="flex-1 overflow-auto bg-gray-50 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading variant groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">No variant options found</p>
          </div>
        ) : viewMode === 'card' ? (
          <RecipeVariantsCard
            variantGroups={filteredGroups}
            recipes={recipes}
            rawMaterials={rawMaterials}
            searchQuery={searchQuery}
            onOpenAddModal={handleOpenAddModal}
            onOpenEditModal={handleOpenEditModal}
            onRemoveIngredient={handleRemoveIngredient}
            getRecipeForOption={getRecipeForOption}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Variant Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
                    Option Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
                    Price Modifier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
                    Recipe Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
                    Ingredients
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groupedOptions.map((group) => 
                  group.options.map((option, idx) => {
                    const hasRecipe = !!option.recipe
                    const isExpanded = expandedGroups.has(option.id)

                    return (
                      <tr key={option.id} className="hover:bg-gray-50">
                        {idx === 0 && (
                          <td 
                            rowSpan={group.options.length} 
                            className="px-6 py-4 text-sm text-gray-900 font-bold bg-gray-50 border-r border-gray-200 align-top"
                          >
                            {option.groupName}
                          </td>
                        )}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {option.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-900"
                          style={{
                            backgroundColor: option.price_modifier >= 0 ? '#B2FF5E' : '#FF6859'
                          }}>
                          {option.price_modifier >= 0 ? '+' : ''}{option.price_modifier.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border text-gray-900"
                          style={{
                            borderColor: hasRecipe && option.recipe!.ingredients.length > 0 ? '#B2FF5E' : '#FF6859',
                            backgroundColor: 'white'
                          }}>
                          {hasRecipe && option.recipe!.ingredients.length > 0 
                            ? `${option.recipe!.ingredients.length} ingredient${option.recipe!.ingredients.length !== 1 ? 's' : ''}` 
                            : 'No Recipe'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2 flex flex-col items-center">
                          {/* Toggle Button - Chevron Down (when collapsed) */}
                          {!isExpanded && (
                            <button
                              onClick={() => toggleGroup(option.id)}
                              className="flex items-center gap-2 text-sm text-gray-900 hover:text-gray-700 font-medium"
                            >
                              <ChevronDownIcon className="w-5 h-5" />
                            </button>
                          )}

                          {/* Expanded Ingredients List */}
                          {isExpanded && (
                            <div className="mt-3 space-y-2 w-full">
                              {(!hasRecipe || !option.recipe || option.recipe.ingredients.length === 0) ? (
                                <div className="relative text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                  {/* Chevron Up - Top Right */}
                                  <button
                                    onClick={() => toggleGroup(option.id)}
                                    className="absolute -top-2 -right-2 p-1 bg-white text-gray-900 hover:text-gray-700 rounded-full border border-gray-300 shadow-sm"
                                  >
                                    <ChevronUpIcon className="w-4 h-4" />
                                  </button>
                                  <p className="text-xs text-gray-500 mb-2">No ingredients yet</p>
                                  <button
                                    onClick={() => handleOpenAddModal(option.groupId, option.id, option.name)}
                                    className="text-xs text-gray-900 hover:text-gray-700 font-medium"
                                  >
                                    + Add first ingredient
                                  </button>
                                </div>
                              ) : (
                                <div className="relative">
                                  {/* Chevron Up - Top Right of first ingredient card */}
                                  <button
                                    onClick={() => toggleGroup(option.id)}
                                    className="absolute -top-2 -right-2 p-1 bg-white text-gray-900 hover:text-gray-700 rounded-full border border-gray-300 shadow-sm z-10"
                                  >
                                    <ChevronUpIcon className="w-4 h-4" />
                                  </button>
                                  
                                  <div className="space-y-2">
                                    {option.recipe!.ingredients.map((ing, idx) => (
                                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium text-gray-900 truncate">
                                                {rawMaterials.find(rm => rm.id === ing.inventory_item_id)?.name || ing.ingredient_name}
                                              </span>
                                              <span className="text-xs text-gray-600 whitespace-nowrap">
                                                {ing.quantity_needed} {ing.unit}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                              onClick={() => handleOpenEditModal(option.id, idx, ing)}
                                              className="p-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition"
                                              title="Edit ingredient"
                                            >
                                              <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleRemoveIngredient(option.id, idx)}
                                              className="p-1.5 bg-white border hover:bg-gray-50 rounded transition"
                                              style={{ borderColor: '#FF6859', color: '#FF6859' }}
                                              title="Delete ingredient"
                                            >
                                              <TrashIcon className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Add Ingredient Button */}
                                    <button
                                      onClick={() => handleOpenAddModal(option.groupId, option.id, option.name)}
                                      className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition"
                                    >
                                      <PlusIcon className="w-4 h-4" />
                                      Add Ingredient
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Ingredient Modal */}
      {showAddModal && selectedOptionForAdd && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Add Ingredient</h3>
              <button
                onClick={handleCloseAddModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Adding ingredient to: <span className="font-semibold text-gray-900">{selectedOptionForAdd.optionName}</span>
                </p>
              </div>

              {/* Ingredient Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ingredient
                </label>
                <select
                  value={newIngredient.inventory_item_id}
                  onChange={(e) => setNewIngredient({ ...newIngredient, inventory_item_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {rawMaterials.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newIngredient.quantity_needed || ''}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity_needed: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Unit Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={rawMaterials.find(item => item.id === newIngredient.inventory_item_id)?.unit || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseAddModal}
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

      {/* Edit Ingredient Modal */}
      {showEditModal && editingIngredient && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Edit Ingredient</h3>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Ingredient Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ingredient
                </label>
                <select
                  value={editingIngredient.ingredient.inventory_item_id}
                  onChange={(e) => {
                    const selectedItem = rawMaterials.find(item => item.id === e.target.value)
                    if (selectedItem) {
                      setEditingIngredient({
                        ...editingIngredient,
                        ingredient: {
                          ...editingIngredient.ingredient,
                          inventory_item_id: selectedItem.id,
                          ingredient_name: selectedItem.name,
                          unit: selectedItem.unit
                        }
                      })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {rawMaterials.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingIngredient.ingredient.quantity_needed || ''}
                  onChange={(e) => setEditingIngredient({
                    ...editingIngredient,
                    ingredient: {
                      ...editingIngredient.ingredient,
                      quantity_needed: parseFloat(e.target.value) || 0
                    }
                  })}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Unit Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={editingIngredient.ingredient.unit}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseEditModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateIngredient}
                disabled={!editingIngredient.ingredient.inventory_item_id || editingIngredient.ingredient.quantity_needed <= 0}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Update Ingredient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
