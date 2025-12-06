'use client'

import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface RecipeVariantsCardProps {
  variantGroups: any[]
  recipes: any[]
  rawMaterials: any[]
  searchQuery: string
  onOpenAddModal: (groupId: string, optionId: string, optionName: string) => void
  onOpenEditModal: (optionId: string, index: number, ingredient: any) => void
  onRemoveIngredient: (optionId: string, index: number) => void
  getRecipeForOption: (optionId: string) => any
}

export default function RecipeVariantsCard({
  variantGroups,
  recipes,
  rawMaterials,
  searchQuery,
  onOpenAddModal,
  onOpenEditModal,
  onRemoveIngredient,
  getRecipeForOption
}: RecipeVariantsCardProps) {
  const filteredGroups = variantGroups.filter(vg =>
    vg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vg.options.some((opt: any) => opt.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="columns-3 gap-4 space-y-4">
      {filteredGroups.map(vg => {
        const totalOptions = vg.options.length
        const optionsWithRecipes = vg.options.filter((opt: any) => {
          const recipe = getRecipeForOption(opt.id)
          return recipe && recipe.ingredients.length > 0
        }).length

        return (
          <div key={vg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden break-inside-avoid mb-4">
            {/* Group Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{vg.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-600">
                  {totalOptions} options
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  {optionsWithRecipes}/{totalOptions} configured
                </span>
              </div>
            </div>

            {/* Options List */}
            <div className="p-4 space-y-3">
              {vg.options.map((option: any) => {
                const recipe = getRecipeForOption(option.id)
                const hasRecipe = !!recipe

                return (
                  <div key={option.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Option Header */}
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900">{option.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              hasRecipe && recipe.ingredients.length > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {hasRecipe && recipe.ingredients.length > 0 
                                ? `${recipe.ingredients.length} ingredient${recipe.ingredients.length !== 1 ? 's' : ''}` 
                                : 'No Recipe'}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              option.price_modifier >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {option.price_modifier >= 0 ? '+' : ''}{option.price_modifier.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div className="p-3">
                      {hasRecipe && recipe.ingredients.length > 0 ? (
                        <div className="space-y-2">
                          {recipe.ingredients.map((ing: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-200">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-900 truncate block">
                                  {rawMaterials.find(rm => rm.id === ing.inventory_item_id)?.name || ing.ingredient_name}
                                </span>
                                <span className="text-gray-500">
                                  {ing.quantity_needed} {ing.unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  onClick={() => onOpenEditModal(option.id, idx, ing)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit ingredient"
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onRemoveIngredient(option.id, idx)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete ingredient"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => onOpenAddModal(vg.id, option.id, option.name)}
                            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded transition"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Add Ingredient
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-xs text-gray-400 mb-2">No ingredients yet</p>
                          <button
                            onClick={() => onOpenAddModal(vg.id, option.id, option.name)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            + Add first ingredient
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Updated At */}
                    {hasRecipe && recipe.updated_at && (
                      <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(recipe.updated_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
