'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, Squares2X2Icon, ListBulletIcon, FunnelIcon } from '@heroicons/react/24/outline'

interface Dish {
  id: number
  name: string
  category: string
  price: number
  image: string
  available: boolean
}

const categories = [
  { id: 'all', name: 'All Dishes', icon: '🍽️', count: 154 },
  { id: 'breakfast', name: 'Breakfast', icon: '🍳', count: 12 },
  { id: 'beef', name: 'Beef Dishes', icon: '🥩', count: 5 },
  { id: 'biryani', name: 'Biryani', icon: '🍛', count: 8 },
  { id: 'chicken', name: 'Chicken Dishes', icon: '🍗', count: 10 },
  { id: 'desserts', name: 'Desserts', icon: '🍰', count: 19 },
  { id: 'dinner', name: 'Dinner', icon: '🍽️', count: 8 },
  { id: 'drinks', name: 'Drinks', icon: '🥤', count: 15 },
  { id: 'fastfood', name: 'Fast Foods', icon: '🍔', count: 25 },
  { id: 'lunch', name: 'Lunch', icon: '🍱', count: 20 },
  { id: 'platters', name: 'Platters', icon: '🍛', count: 14 },
  { id: 'salads', name: 'Salads', icon: '🥗', count: 8 },
  { id: 'side', name: 'Side Dishes', icon: '🍟', count: 4 },
  { id: 'soups', name: 'Soups', icon: '🍲', count: 3 },
]

export default function MenuPage() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [selectedCategory, setSelectedCategory] = useState('desserts')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dishes, setDishes] = useState<Dish[]>([])

  useEffect(() => {
    // Mock data untuk desserts
    setDishes([
      { id: 1, name: 'Cheese Syrniki Pancakes', category: 'Dessert', price: 8.00, image: '🥞', available: true },
      { id: 2, name: 'Apple Stuffed Pancake', category: 'Dessert', price: 10.00, image: '🥞', available: true },
      { id: 3, name: 'Terracotta Bowl', category: 'Dessert', price: 12.00, image: '🍨', available: true },
      { id: 4, name: 'Croissant Dessert', category: 'Dessert', price: 15.00, image: '🥐', available: true },
      { id: 5, name: 'Granola Banana & Berry', category: 'Dessert', price: 10.00, image: '🥣', available: true },
      { id: 6, name: 'Vanilla Cherry Cupcake', category: 'Dessert', price: 8.00, image: '🧁', available: true },
      { id: 7, name: 'Belgian Waffles', category: 'Dessert', price: 20.00, image: '🧇', available: true },
      { id: 8, name: 'Granola with Yoghurt', category: 'Dessert', price: 15.00, image: '🥣', available: true },
      { id: 9, name: 'Apple Stuffed Pancake', category: 'Dessert', price: 8.00, image: '🥞', available: true },
      { id: 10, name: 'Muesli Bowl', category: 'Dessert', price: 10.00, image: '🥣', available: true },
      { id: 11, name: 'Waffles with Ice-cream', category: 'Dessert', price: 10.00, image: '🧇', available: true },
    ])
  }, [selectedCategory])

  const filteredDishes = dishes.filter(dish =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentCategory = categories.find(cat => cat.id === selectedCategory)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Categories */}
      <div className="w-64 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Dishes Category</h2>
        
        <div className="space-y-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                selectedCategory === category.id
                  ? 'bg-teal-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                selectedCategory === category.id
                  ? 'bg-white text-teal-500'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>

        <button className="w-full mt-6 flex items-center justify-center gap-2 bg-teal-500 text-white px-4 py-3 rounded-xl hover:bg-teal-600 transition font-medium">
          <PlusIcon className="w-5 h-5" />
          Add New Category
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manage Dishes</h1>
            {viewAsOwner && (
              <span className="inline-block mt-2 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
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
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 w-64"
              />
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Filter */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
              <FunnelIcon className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter</span>
            </button>

            {/* Add New Dish */}
            {!viewAsOwner && (
              <button className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-xl hover:bg-teal-600 transition font-medium">
                <PlusIcon className="w-5 h-5" />
                Add New Dishes
              </button>
            )}
          </div>
        </div>

        {/* Category Title */}
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {currentCategory?.name} ({filteredDishes.length})
        </h2>

        {/* Dishes Grid */}
        <div className="grid grid-cols-4 gap-6">
          {/* Add New Dish Card */}
          {!viewAsOwner && (
            <button className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-teal-500 hover:bg-teal-50 transition min-h-[280px]">
              <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center">
                <PlusIcon className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Add New Dish to</p>
              <p className="text-sm font-semibold text-gray-700">{currentCategory?.name}</p>
            </button>
          )}

          {/* Dish Cards */}
          {filteredDishes.map((dish) => (
            <div key={dish.id} className="bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-lg transition">
              {/* Checkbox */}
              <div className="flex items-start justify-between mb-3">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
              </div>

              {/* Dish Image */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
                  {dish.image}
                </div>
              </div>

              {/* Dish Info */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">{dish.category}</p>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{dish.name}</h3>
                <p className="text-lg font-bold text-gray-900">${dish.price.toFixed(2)}</p>
              </div>

              {/* Actions */}
              {!viewAsOwner && (
                <div className="flex items-center gap-2 mt-4">
                  <button className="flex-1 px-3 py-2 text-xs font-medium text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition">
                    Edit
                  </button>
                  <button className="flex-1 px-3 py-2 text-xs font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
