// Types for Recipe Variants Tab
export interface IngredientInput {
  inventory_item_id: string
  ingredient_name: string
  quantity_needed: number
  unit: string
}

export interface Recipe {
  id: string
  product_id: string
  product_name: string
  recipe_type: 'base' | 'variant-specific'
  variant_combination?: any
  ingredients: IngredientInput[]
  created_at: string
  updated_at: string
}

export interface VariantOption {
  id: string
  name: string
  price_modifier: number
  recipe?: Recipe
}

export interface VariantGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  options: VariantOption[]
}

export interface RecipeVariantsTabProps {
}

export interface SelectedOptionForAdd {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
}

export interface EditingIngredient {
  optionId: string
  index: number
  ingredient: IngredientInput
}
