'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { showSuccess, showError } from '@/lib/services/errorHandling'
import RecipeVariantsCard from './RecipeVariantsCard'
import { useRecipeVariants } from './useRecipeVariants'
import { getRecipeForOption, filterVariantGroups, formatPriceModifier } from './helpers'
import RecipeVariantsStats from './RecipeVariantsStats'
import { AddIngredientModal, EditIngredientModal } from './RecipeVariantsModals'
import RecipeVariantsTableView from './RecipeVariantsTableView'
import type { RecipeVariantsTabProps, SelectedOptionForAdd, EditingIngredient } from './types'

export default function RecipeVariantsTab() {
  const { variantGroups, recipes, inventoryItems, loading, refetch } = useRecipeVariants()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedOptionForAdd, setSelectedOptionForAdd] = useState<SelectedOptionForAdd | null>(null)
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<EditingIngredient | null>(null)

  const rawMaterials = inventoryItems.filter(item => item.category === 'raw-material')
  const filteredGroups = filterVariantGroups(variantGroups, searchQuery)

  const handleToggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const handleOpenAddModal = (groupId: string, groupName: string, optionId: string, optionName: string) => {
    setSelectedOptionForAdd({ groupId, groupName, optionId, optionName })
    setShowAddModal(true)
  }

  const handleOpenEditModal = (optionId: string, index: number, ingredient: any) => {
    setEditingIngredient({ optionId, index, ingredient })
    setShowEditModal(true)
  }

  const handleAddIngredient = async (inventoryItemId: string, quantity: number) => {
    if (!selectedOptionForAdd) return

    try {
      // Check if recipe exists, if not create it first
      let recipe = getRecipeForOption(recipes, selectedOptionForAdd.optionId)
      
      if (!recipe) {
        const newRecipe = {
          product_id: null,
          product_name: `${selectedOptionForAdd.groupName} - ${selectedOptionForAdd.optionName}`,
          recipe_type: 'variant-specific',
          variant_combination: { [selectedOptionForAdd.groupId]: selectedOptionForAdd.optionId }
        }

        const { data, error } = await supabase
          .from('recipes')
          .insert([newRecipe])
          .select()
          .single()

        if (error) throw error
        recipe = data
      }

      // Now add ingredient
      const selectedItem = rawMaterials.find(item => item.id === inventoryItemId)
      if (!selectedItem || !recipe) return

      const ingredientData = {
        recipe_id: recipe.id,
        inventory_item_id: inventoryItemId,
        ingredient_name: selectedItem.name,
        quantity_needed: quantity,
        unit: selectedItem.unit
      }

      const { error } = await supabase
        .from('recipe_ingredients')
        .insert([ingredientData])

      if (error) throw error
      await refetch()
      showSuccess('Ingredient berhasil ditambahkan')
    } catch (error) {
      showError('Gagal menambahkan ingredient')
    }
  }

  const handleUpdateIngredient = async (inventoryItemId: string, quantity: number) => {
    if (!editingIngredient) return

    const recipe = getRecipeForOption(recipes, editingIngredient.optionId)
    if (!recipe) return

    const oldIngredient = recipe.ingredients[editingIngredient.index]
    const selectedItem = rawMaterials.find(item => item.id === inventoryItemId)
    if (!selectedItem) return

    try {
      // Delete old ingredient
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipe.id)
        .eq('inventory_item_id', oldIngredient.inventory_item_id)

      // Insert new/updated ingredient
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipe.id,
          inventory_item_id: inventoryItemId,
          ingredient_name: selectedItem.name,
          quantity_needed: quantity,
          unit: selectedItem.unit
        })

      if (error) throw error
      await refetch()
      showSuccess('Ingredient berhasil diupdate')
    } catch (error) {
      showError('Gagal mengupdate ingredient')
    }
  }

  const handleRemoveIngredient = async (optionId: string, ingredientIndex: number) => {
    const recipe = getRecipeForOption(recipes, optionId)
    if (!recipe) return

    const ingredientToDelete = recipe.ingredients[ingredientIndex]
    
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipe.id)
        .eq('inventory_item_id', ingredientToDelete.inventory_item_id)

      if (error) throw error
      await refetch()
      showSuccess('Ingredient berhasil dihapus')
    } catch (error) {
      showError('Gagal menghapus ingredient')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center justify-center w-10 h-10 transition ${
                  viewMode === 'card' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
            </div>

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

        <RecipeVariantsStats
          variantGroups={variantGroups}
          recipes={recipes}
          showStats={showStats}
          onToggleStats={() => setShowStats(!showStats)}
        />
      </section>

      {/* Content */}
      <section className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
        {viewMode === 'table' ? (
          <RecipeVariantsTableView
            variantGroups={filteredGroups}
            recipes={recipes}
            rawMaterials={rawMaterials}
            expandedGroups={expandedGroups}
            onToggleGroup={handleToggleGroup}
            onOpenAddModal={handleOpenAddModal}
            onOpenEditModal={handleOpenEditModal}
            onRemoveIngredient={handleRemoveIngredient}
            getRecipeForOption={(optionId: string) => getRecipeForOption(recipes, optionId)}
            formatPriceModifier={formatPriceModifier}
          />
        ) : (
          <RecipeVariantsCard
            variantGroups={filteredGroups}
            recipes={recipes}
            rawMaterials={rawMaterials}
            searchQuery={searchQuery}
            onOpenAddModal={(groupId: string, optionId: string, optionName: string) => handleOpenAddModal(groupId, '', optionId, optionName)}
            onOpenEditModal={handleOpenEditModal}
            onRemoveIngredient={handleRemoveIngredient}
            getRecipeForOption={(optionId: string) => getRecipeForOption(recipes, optionId)}
          />
        )}
      </section>

      {/* Modals */}
      <AddIngredientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedOption={selectedOptionForAdd}
        inventoryItems={inventoryItems}
        onAdd={handleAddIngredient}
      />

      <EditIngredientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editingIngredient={editingIngredient}
        inventoryItems={inventoryItems}
        onUpdate={handleUpdateIngredient}
      />
    </div>
  )
}
