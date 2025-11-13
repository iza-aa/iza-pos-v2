'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  Squares2X2Icon, 
  ListBulletIcon, 
  FunnelIcon
} from '@heroicons/react/24/outline'
import { 
  LayoutGrid, 
  Coffee, 
  UtensilsCrossed, 
  Cookie, 
  Cake, 
  Milk
} from 'lucide-react'
import { products, categories as mockCategories, recipes, inventoryItems, findMatchingRecipe, calculateCanMake } from '@/lib/mockData'
import MenuModal from '@/app/components/manager/menu/MenuModal'
import CategoryModal from '@/app/components/manager/menu/CategoryModal'
import DeleteModal from '@/app/components/ui/DeleteModal'

interface MenuItem {
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

// Icon mapping for categories
const categoryIcons: Record<string, any> = {
  'all': LayoutGrid,              // All Menu - Grid layout
  'cat-coffee': Coffee,            // Coffee - Coffee cup
  'cat-food': UtensilsCrossed,     // Food - Fork & Knife crossed
  'cat-snack': Cookie,             // Snack - Cookie
  'cat-dessert': Cake,             // Dessert - Cake slice
  'cat-non-coffee': Milk,          // Non Coffee - Milk/Beverage
}

const categories = [
  { id: 'all', name: 'All Menu', count: products.length },
  ...mockCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    count: cat.count,
  }))
]

export default function MenuPage() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showAddMenuModal, setShowAddMenuModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null)
  const [deletingMenu, setDeletingMenu] = useState<MenuItem | null>(null)

  useEffect(() => {
    // Filter products by selected category
    const filteredProducts = selectedCategory === 'all' 
      ? products 
      : products.filter(p => p.categoryId === selectedCategory);
    
    setMenuItems(filteredProducts.map(p => ({
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

  const filteredMenuItems = menuItems.filter(menu =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentCategory = categories.find(cat => cat.id === selectedCategory)

  // Calculate estimated stock for a menu item
  const getEstimatedStock = (menuId: string): { canMake: number; status: 'available' | 'low' | 'out' } => {
    const recipe = findMatchingRecipe(menuId)
    if (!recipe) {
      // No recipe found - assume unlimited
      return { canMake: 999, status: 'available' }
    }
    
    const canMake = calculateCanMake(recipe, inventoryItems)
    
    if (canMake === 0) return { canMake: 0, status: 'out' }
    if (canMake <= 10) return { canMake, status: 'low' }
    return { canMake, status: 'available' }
  }

  const handleAddNewCategory = () => {
    setShowAddCategoryModal(true)
    console.log('Opening Add Category modal')
  }

  const handleSaveNewCategory = (name: string, icon: string) => {
    console.log('New category added:', name, icon)
    // TODO: Add to categories array and update Supabase
    setShowAddCategoryModal(false)
  }

  const handleAddNewMenu = () => {
    setShowAddMenuModal(true)
    setEditingMenu(null)
    console.log('Adding new menu to category:', selectedCategory)
  }

  const handleEditMenu = (menu: MenuItem) => {
    setEditingMenu(menu)
    console.log('Editing menu:', menu)
  }

  const handleSaveNewMenu = (newMenu: Omit<MenuItem, 'id'>) => {
    const menu: MenuItem = {
      ...newMenu,
      id: `menu-${Date.now()}`,
    }
    setMenuItems(prev => [...prev, menu])
    setShowAddMenuModal(false)
    console.log('Menu added:', menu)
  }

  const handleUpdateMenu = (updatedMenu: MenuItem) => {
    setMenuItems(prev => prev.map(m => m.id === updatedMenu.id ? updatedMenu : m))
    setEditingMenu(null)
    console.log('Menu updated:', updatedMenu)
  }

  const handleDeleteMenu = (menu: MenuItem) => {
    setDeletingMenu(menu)
  }

  const confirmDeleteMenu = () => {
    if (deletingMenu) {
      setMenuItems(prev => prev.filter(m => m.id !== deletingMenu.id))
      console.log('Menu deleted:', deletingMenu)
    }
  }

  const handleFilter = () => {
    setShowFilterModal(true)
    console.log('Opening filter modal')
  }

  return (
    <div className="h-[calc(100vh-55px)] bg-gray-50 flex overflow-hidden">
      {/* Section 1: Sidebar Categories - Fixed, tidak bisa scroll */}
      <section className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col overflow-hidden">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex-shrink-0">Menu Category</h2>
        
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {categories.map((category) => {
            const IconComponent = categoryIcons[category.id] || Cookie
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center px-2.5 py-2 rounded-lg transition group ${
                  selectedCategory === category.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className={`w-5 h-5 transition ${
                    selectedCategory === category.id
                      ? 'text-blue-500'
                      : 'text-gray-600'
                  }`} strokeWidth={2} />
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
              </button>
            )
          })}
        </div>

        {!viewAsOwner && (
          <button 
            onClick={handleAddNewCategory}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-2.5 rounded-lg hover:bg-blue-600 transition font-medium flex-shrink-0 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Add New Category
          </button>
        )}
      </section>

      {/* Section 2 & 3: Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section 2: Header - Fixed, tidak bisa scroll */}
        <section className="bg-white p-6 border-b border-gray-200 flex-shrink-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-gray-800">Manage Menu</h1>
                <p className="text-sm text-gray-500">Lihat, tambahkan, edit, atau hapus menu dan detail produk yang tersedia.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
                            {viewAsOwner && (
                <span className="inline-block text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  👁️ Viewing as Owner
                </span>
              )}
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu"
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

            </div>
          </div>
        </section>

        {/* Section 3: Menu List - HANYA INI yang bisa scroll */}
        <section className="flex-1 overflow-y-auto p-6 bg-gray-100">

          {/* Menu Grid */}
          <div className="grid grid-cols-4 gap-4 pb-8">
            {/* Add New Menu Card */}
            {!viewAsOwner && (
              <button 
                onClick={handleAddNewMenu}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition min-h-[250px]"
              >
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <PlusIcon className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Add New Menu to</p>
                <p className="text-sm font-semibold text-gray-700">{currentCategory?.name}</p>
              </button>
            )}

            {/* Menu Cards */}
            {filteredMenuItems.map((menu) => {
              const stockInfo = getEstimatedStock(menu.id)
              
              return (
              <div key={menu.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition flex flex-col">
                {/* Menu Image */}
                <div className="relative p-[3px]">
                  <div className="w-full h-24 bg-gray-200 rounded-xl overflow-hidden">
                    <img
                      src={menu.image || "/placeholder.jpg"}
                      alt={menu.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Menu Info */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-xs text-gray-500 mb-1">{menu.category}</p>
                  <h3 className="font-semibold text-gray-800  truncate">{menu.name}</h3>
                  
                  {/* Availability Status */}
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      menu.available 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {menu.available ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  
                  {/* Stock Status (Real-time from inventory) */}
                  <div className="mb-2 text-xs">
                    <span className="font-medium text-gray-600">Est. Stock:</span>{' '}
                    <span className={`font-semibold ${
                      stockInfo.status === 'out' ? 'text-red-600' :
                      stockInfo.status === 'low' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {stockInfo.canMake === 0 ? '0' : stockInfo.canMake >= 999 ? '999+' : stockInfo.canMake}
                    </span>
                  </div>
                  
                  {/* Has Variants Indicator */}
                  {menu.hasVariants && (
                    <div className="mb-3 text-xs text-blue-600 font-medium">
                      This menu has variants
                    </div>
                  )}
                  
                  <p className="font-bold text-gray-900 mb-4">${menu.price.toFixed(2)}</p>

                  {/* Spacer to push buttons to bottom */}
                  <div className="flex-1"></div>

                  {/* Actions */}
                  {!viewAsOwner && (
                    <div className="flex items-center gap-2 mt-auto">
                      <button 
                        onClick={() => handleEditMenu(menu)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteMenu(menu)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Menu Modal */}
      <MenuModal
        isOpen={showAddMenuModal || editingMenu !== null}
        onClose={() => {
          setShowAddMenuModal(false)
          setEditingMenu(null)
        }}
        onSave={handleSaveNewMenu}
        onUpdate={handleUpdateMenu}
        editMenu={editingMenu}
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
        isOpen={deletingMenu !== null}
        onClose={() => setDeletingMenu(null)}
        onConfirm={confirmDeleteMenu}
        title="Delete Menu"
        itemName={deletingMenu?.name || ''}
        description="This menu will be permanently removed from the menu."
      />
    </div>
  )
}
