'use client'

interface Category {
  id: string
  name: string
  count: number
}

interface InventoryFiltersProps {
  categories: Category[]
  selectedCategory: string
  onCategoryChange: (categoryId: string) => void
}

export default function InventoryFilters({ 
  categories, 
  selectedCategory, 
  onCategoryChange
}: InventoryFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Category Pills */}
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition ${
            selectedCategory === cat.id
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
