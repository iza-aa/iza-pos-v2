'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, Squares2X2Icon, ListBulletIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { products, categories as mockCategories } from '@/lib/mockData'
import DishModal from '@/app/components/manager/menu/DishModal'
import CategoryModal from '@/app/components/manager/menu/CategoryModal'
import DeleteModal from '@/app/components/ui/DeleteModal'

interface Dish {
  id: string
  name: string
  category: string
  categoryId: string
  price: number
  image: string
  available: boolean
  hasVariants?: boolean
  variantGroups: string[]
}

const categories = [
  { id: 'all', name: 'All Dishes', icon: '🍽️', count: products.length },
  ...mockCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    count: cat.count,
  }))
]

export default function MenuPage() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dishes, setDishes] = useState<Dish[]>([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showAddDishModal, setShowAddDishModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [deletingDish, setDeletingDish] = useState<Dish | null>(null)

  useEffect(() => {
    // Filter products by selected category
    const filteredProducts = selectedCategory === 'all' 
      ? products 
      : products.filter(p => p.categoryId === selectedCategory);
    
    setDishes(filteredProducts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      categoryId: p.categoryId,
      price: p.price,
      image: p.image,
      available: p.available,
      hasVariants: p.hasVariants,
      variantGroups: p.variantGroups || [],
    })));
  }, [selectedCategory])

  const filteredDishes = dishes.filter(dish =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentCategory = categories.find(cat => cat.id === selectedCategory)

  const handleAddNewCategory = () => {
    setShowAddCategoryModal(true)
    console.log('Opening Add Category modal')
  }

  const handleSaveNewCategory = (name: string, icon: string) => {
    console.log('New category added:', name, icon)
    // TODO: Add to categories array and update Supabase
    setShowAddCategoryModal(false)
  }

  const handleAddNewDish = () => {
    setShowAddDishModal(true)
    setEditingDish(null)
    console.log('Adding new dish to category:', selectedCategory)
  }

  const handleEditDish = (dish: Dish) => {
    setEditingDish(dish)
    console.log('Editing dish:', dish)
  }

  const handleSaveNewDish = (newDish: Omit<Dish, 'id'>) => {
    const dish: Dish = {
      ...newDish,
      id: `dish-${Date.now()}`,
    }
    setDishes(prev => [...prev, dish])
    setShowAddDishModal(false)
    console.log('Dish added:', dish)
  }

  const handleUpdateDish = (updatedDish: Dish) => {
    setDishes(prev => prev.map(d => d.id === updatedDish.id ? updatedDish : d))
    setEditingDish(null)
    console.log('Dish updated:', updatedDish)
  }

  const handleDeleteDish = (dish: Dish) => {
    setDeletingDish(dish)
  }

  const confirmDeleteDish = () => {
    if (deletingDish) {
      setDishes(prev => prev.filter(d => d.id !== deletingDish.id))
      console.log('Dish deleted:', deletingDish)
    }
  }

  const handleFilter = () => {
    setShowFilterModal(true)
    console.log('Opening filter modal')
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex overflow-hidden">
      {/* Section 1: Sidebar Categories - Fixed, tidak bisa scroll */}
      <section className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col overflow-hidden">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex-shrink-0">Dishes Category</h2>
        
        <div className="space-y-1 flex-1 overflow-y-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                selectedCategory === category.id
                  ? 'bg-white text-blue-500'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>

        <button 
          onClick={handleAddNewCategory}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition font-medium flex-shrink-0"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Category
        </button>
      </section>

      {/* Section 2 & 3: Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section 2: Header - Fixed, tidak bisa scroll */}
        <section className="bg-gray-50 p-8 border-b border-gray-200 flex-shrink-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Manage Dishes</h1>
              {viewAsOwner && (
                <span className="inline-block text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  👁️ Viewing as Owner
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dishes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Filter */}
              <button 
                onClick={handleFilter}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                <FunnelIcon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Dishes List - HANYA INI yang bisa scroll */}
        <section className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {/* Category Title */}
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {currentCategory?.name} ({filteredDishes.length})
          </h2>

          {/* Dishes Grid */}
          <div className="grid grid-cols-4 gap-6 pb-8">
            {/* Add New Dish Card */}
            {!viewAsOwner && (
              <button 
                onClick={handleAddNewDish}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition min-h-[280px]"
              >
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <PlusIcon className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Add New Dish to</p>
                <p className="text-sm font-semibold text-gray-700">{currentCategory?.name}</p>
              </button>
            )}

            {/* Dish Cards */}
            {filteredDishes.map((dish) => (
              <div key={dish.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition">
                {/* Dish Image */}
                <div className="relative p-[3px]">
                  <div className="w-full h-24 bg-gray-200 rounded-xl overflow-hidden">
                    <img
                      src={dish.image || "/placeholder.jpg"}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Dish Info */}
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{dish.category}</p>
                  <h3 className="font-semibold text-gray-800 mb-2 truncate">{dish.name}</h3>
                  <p className="font-bold text-gray-900 mb-4">${dish.price.toFixed(2)}</p>

                  {/* Actions */}
                  {!viewAsOwner && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditDish(dish)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteDish(dish)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Dish Modal */}
      <DishModal
        isOpen={showAddDishModal || editingDish !== null}
        onClose={() => {
          setShowAddDishModal(false)
          setEditingDish(null)
        }}
        onSave={handleSaveNewDish}
        onUpdate={handleUpdateDish}
        editDish={editingDish}
        categories={categories.filter(c => c.id !== 'all')}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onSave={handleSaveNewCategory}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deletingDish !== null}
        onClose={() => setDeletingDish(null)}
        onConfirm={confirmDeleteDish}
        title="Delete Dish"
        itemName={deletingDish?.name || ''}
        description="This dish will be permanently removed from the menu."
      />
    </div>
  )
}
