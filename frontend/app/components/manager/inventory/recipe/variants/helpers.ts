// Helper functions for Recipe Variants

/**
 * Format price modifier for display
 */
export function formatPriceModifier(modifier: number): string {
  if (modifier === 0) return 'Rp 0'
  const sign = modifier >= 0 ? '+' : ''
  return `${sign}Rp ${modifier.toLocaleString('id-ID')}`
}

/**
 * Get recipe for a specific variant option
 */
export function getRecipeForOption(recipes: any[], optionId: string): any | undefined {
  return recipes.find(r => {
    if (!r.variant_combination) return false
    const combo = typeof r.variant_combination === 'string'
      ? JSON.parse(r.variant_combination)
      : r.variant_combination
    return combo && combo[Object.keys(combo)[0]] === optionId
  })
}

/**
 * Calculate statistics for variant recipes
 */
export function calculateVariantStats(variantGroups: any[], recipes: any[]) {
  let totalVariants = 0
  let variantsWithRecipes = 0

  variantGroups.forEach(group => {
    group.options.forEach((option: any) => {
      totalVariants++
      const recipe = getRecipeForOption(recipes, option.id)
      if (recipe && recipe.ingredients.length > 0) {
        variantsWithRecipes++
      }
    })
  })

  return {
    totalVariants,
    variantsWithRecipes,
    variantsWithoutRecipes: totalVariants - variantsWithRecipes,
    completionPercentage: totalVariants > 0 ? Math.round((variantsWithRecipes / totalVariants) * 100) : 0
  }
}

/**
 * Filter variant groups by search query
 */
export function filterVariantGroups(groups: any[], searchQuery: string) {
  if (!searchQuery) return groups

  return groups.filter(vg =>
    vg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vg.options.some((opt: any) => opt.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )
}
