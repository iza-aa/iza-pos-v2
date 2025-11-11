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
    <div className="flex items-center gap-2">
      {/* Category Pills */}
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            selectedCategory === cat.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {cat.name} ({cat.count})
        </button>
      ))}
    </div>
  )
}
