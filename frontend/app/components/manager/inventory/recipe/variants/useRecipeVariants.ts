'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/config/supabaseClient'
import { Recipe, VariantGroup, VariantOption } from './types'

/**
 * Custom hook for managing recipe variants data
 */
export function useRecipeVariants() {
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

      // Fetch inventory items for ingredient names
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, name, unit, category')

      if (inventoryError) throw inventoryError
      setInventoryItems(inventoryData || [])

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

  return {
    variantGroups,
    recipes,
    inventoryItems,
    loading,
    refetch: fetchData
  }
}
