'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  Squares2X2Icon, 
  ListBulletIcon, 
  FunnelIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { 
  LayoutGrid, 
  Coffee, 
  UtensilsCrossed, 
  Cookie, 
  Cake, 
  Milk,
  Pizza,
  Sandwich,
  Soup,
  Salad,
  IceCream
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
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

// Icon mapping for categories - maps icon name to Lucide components
const iconNameToComponent: Record<string, any> = {
  'Coffee': Coffee,
  'UtensilsCrossed': UtensilsCrossed,
  'Cookie': Cookie,
  'Cake': Cake,
  'Milk': Milk,
  'Pizza': Pizza,
  'Sandwich': Sandwich,
  'Soup': Soup,
  'Salad': Salad,
  'IceCream': IceCream,
  // Legacy emoji support (for existing data)
  '☕': Coffee,
  '🍽️': UtensilsCrossed,
  '🍟': Cookie,
  '🍰': Cake,
  '🍵': Milk,
}

const categoryIcons: Record<string, any> = {
  'all': LayoutGrid,
}

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
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null)
  const [deletingMenu, setDeletingMenu] = useState<MenuItem | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCategorySidebar, setShowCategorySidebar] = useState(false)

  // Fetch categories from Supabase
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (data) {
        // Get product counts for each category
        const categoriesWithCount = await Promise.all(
          data.map(async (cat) => {
            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', cat.id)
            
            return {
              id: cat.id,
              name: cat.name,
              icon: cat.icon,
              type: cat.type, // Include type field
              count: count || 0
            }
          })
        )
        
        // Get total products count
        const { count: totalCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
        
        setCategories([
          { id: 'all', name: 'All Menu', count: totalCount || 0 },
          ...categoriesWithCount
        ])
      }
    }
    
    fetchCategories()
  }, [])

  // Fetch products from Supabase
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          product_variant_groups(variant_group_id)
        `)
        .order('name', { ascending: true })
      
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }
      
      const { data, error } = await query
      
      if (data) {
        setMenuItems(data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category?.name || 'Unknown',
          categoryId: p.category_id,
          price: p.price,
          image: p.image || '/picture/default-food.jpg',
          available: p.available,
          hasVariants: p.has_variants,
          variantGroups: p.product_variant_groups?.map((pvg: any) => pvg.variant_group_id) || [],
        })))
      }
      
      setLoading(false)
    }
    
    fetchProducts()
  }, [selectedCategory])

  const filteredMenuItems = menuItems.filter(menu =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentCategory = categories.find(cat => cat.id === selectedCategory)

  // Simplified stock calculation - can be enhanced later with recipe integration
  const getEstimatedStock = (menuId: string): { canMake: number; status: 'available' | 'low' | 'out' } => {
    // For now, return default values
    // TODO: Integrate with recipes and inventory_items tables
    return { canMake: 999, status: 'available' }
  }

  const handleAddNewCategory = () => {
    setEditingCategory(null)
    setShowAddCategoryModal(true)
    console.log('Opening Add Category modal')
  }

  const handleSaveNewCategory = async (name: string, icon: string, type: string) => {
    if (editingCategory) {
      // Update existing category
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: name,
          icon: icon,
          type: type
        })
        .eq('id', editingCategory.id)
        .select()
        .single()
      
      if (data) {
        // Update local state
        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id 
            ? { ...cat, name: data.name, icon: data.icon, type: data.type }
            : cat
        ))
        setShowAddCategoryModal(false)
        setEditingCategory(null)
      }
    } else {
      // Save new category to Supabase
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: name,
          icon: icon,
          type: type,
          sort_order: categories.length,
          is_active: true
        }])
        .select()
        .single()
      
      if (data) {
        // Add to local state
        setCategories(prev => [...prev, {
          id: data.id,
          name: data.name,
          icon: data.icon,
          type: data.type,
          count: 0
        }])
        setShowAddCategoryModal(false)
      }
    }
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

  const handleSaveNewMenu = async (newMenu: Omit<MenuItem, 'id'>) => {
    const managerId = localStorage.getItem('user_id')
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: newMenu.name,
        category_id: newMenu.categoryId,
        price: newMenu.price,
        image: newMenu.image,
        available: newMenu.available,
        has_variants: newMenu.hasVariants,
        created_by: managerId,
        updated_by: managerId
      }])
      .select()
      .single()
    
    if (data) {
      // Save product variant groups relationship
      if (newMenu.hasVariants && newMenu.variantGroups.length > 0) {
        const variantGroupsData = newMenu.variantGroups.map(vgId => ({
          product_id: data.id,
          variant_group_id: vgId
        }))
        
        await supabase
          .from('product_variant_groups')
          .insert(variantGroupsData)
      }
      
      const { data: categoryData } = await supabase
        .from('categories')
        .select('name')
        .eq('id', data.category_id)
        .single()
      
      const menu: MenuItem = {
        id: data.id,
        name: data.name,
        category: categoryData?.name || 'Unknown',
        categoryId: data.category_id,
        price: data.price,
        image: data.image,
        available: data.available,
        hasVariants: data.has_variants,
        variantGroups: newMenu.variantGroups
      }
      
      setMenuItems(prev => [...prev, menu])
      setShowAddMenuModal(false)
    }
  }

  const handleUpdateMenu = async (updatedMenu: MenuItem) => {
    const managerId = localStorage.getItem('user_id')
    
    const { error } = await supabase
      .from('products')
      .update({
        name: updatedMenu.name,
        category_id: updatedMenu.categoryId,
        price: updatedMenu.price,
        image: updatedMenu.image,
        available: updatedMenu.available,
        has_variants: updatedMenu.hasVariants,
        updated_by: managerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedMenu.id)
    
    if (!error) {
      // Update product variant groups
      // First delete existing relationships
      await supabase
        .from('product_variant_groups')
        .delete()
        .eq('product_id', updatedMenu.id)
      
      // Then insert new ones if has variants
      if (updatedMenu.hasVariants && updatedMenu.variantGroups.length > 0) {
        const variantGroupsData = updatedMenu.variantGroups.map(vgId => ({
          product_id: updatedMenu.id,
          variant_group_id: vgId
        }))
        
        await supabase
          .from('product_variant_groups')
          .insert(variantGroupsData)
      }
      
      setMenuItems(prev => prev.map(m => m.id === updatedMenu.id ? updatedMenu : m))
      setEditingMenu(null)
    }
  }

  const handleDeleteMenu = (menu: MenuItem) => {
    setDeletingMenu(menu)
  }

  const confirmDeleteMenu = async () => {
    if (deletingMenu) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deletingMenu.id)
      
      if (!error) {
        setMenuItems(prev => prev.filter(m => m.id !== deletingMenu.id))
        setDeletingMenu(null)
      }
    }
  }

  const handleFilter = () => {
    setShowFilterModal(true)
    console.log('Opening filter modal')
  }

  const handleDeleteCategory = (category: any) => {
    if (category.id === 'all') return // Cannot delete 'All Menu'
    setDeletingCategory(category)
  }

  const confirmDeleteCategory = async () => {
    if (deletingCategory) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deletingCategory.id)
      
      if (!error) {
        setCategories(prev => prev.filter(c => c.id !== deletingCategory.id))
        // If deleted category was selected, switch to 'all'
        if (selectedCategory === deletingCategory.id) {
          setSelectedCategory('all')
        }
        setDeletingCategory(null)
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-55px)] bg-white flex flex-col lg:flex-row h-[calc(100vh-55px)] overflow-hidden">
      {/* Floating Category Button - Mobile Only */}
      <button
        onClick={() => setShowCategorySidebar(true)}
        className="lg:hidden fixed bottom-6 left-6 w-14 h-14 bg-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white hover:scale-110 z-40"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Backdrop - Mobile Only */}
      {showCategorySidebar && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setShowCategorySidebar(false)}
        />
      )}

      {/* Section 1: Sidebar Categories - Fixed height with scroll */}
      <section className={`w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 md:p-6 flex flex-col lg:h-full overflow-hidden
        lg:relative fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${showCategorySidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button - Mobile Only */}
        <button
          onClick={() => setShowCategorySidebar(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-4 flex-shrink-0">Menu Category</h2>
        
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {categories.map((category) => {
            // Map icon name/emoji to Lucide component
            const IconComponent = category.id === 'all' 
              ? categoryIcons['all']
              : iconNameToComponent[category.icon] || Cookie
            
            const isSelected = selectedCategory === category.id
            
            return (
              <div key={category.id} className="relative">
                <div
                  onClick={() => {
                    setSelectedCategory(category.id)
                    setShowCategorySidebar(false) // Close sidebar on mobile when category is selected
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-5 h-5 transition ${
                      isSelected
                        ? 'text-white'
                        : 'text-gray-600'
                    }`} strokeWidth={2} />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  
                  {/* Edit and Delete buttons - only show when selected and not 'all' and not viewAsOwner */}
                  {isSelected && category.id !== 'all' && !viewAsOwner && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCategory(category)
                          setShowAddCategoryModal(true)
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                        title="Edit category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCategory(category)
                        }}
                        className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                        title="Delete category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!viewAsOwner && (
          <button 
            onClick={handleAddNewCategory}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-900 text-white px-3 py-2.5 rounded-lg hover:bg-gray-800 transition font-medium flex-shrink-0 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Add New Category
          </button>
        )}
      </section>

      {/* Section 2 & 3: Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section 2: Header - Fixed, tidak bisa scroll */}
        <section className="bg-white p-4 md:p-6 border-b border-gray-200 flex-shrink-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <div className="flex flex-col gap-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Manage Menu</h1>
                <p className="text-xs md:text-sm text-gray-500">Lihat, tambahkan, edit, atau hapus menu dan detail produk yang tersedia.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
                            {viewAsOwner && (
                <span className="inline-block text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  👁️ Viewing as Owner
                </span>
              )}
              {/* Search */}
              <div className="relative flex-1 lg:flex-none">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full lg:w-64 text-sm"
                />
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* Section 3: Menu List - HANYA INI yang bisa scroll */}
        <section className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">

          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-8">
            {/* Add New Menu Card */}
            {!viewAsOwner && (
              <button 
                onClick={handleAddNewMenu}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center gap-2 md:gap-3 hover:border-gray-900 hover:bg-gray-100 transition min-h-[200px] md:min-h-[250px]"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-900 rounded-full flex items-center justify-center">
                  <PlusIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
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
                  <div className="w-full h-20 md:h-24 bg-gray-200 rounded-xl overflow-hidden">
                    <img
                      src={menu.image || "/placeholder.jpg"}
                      alt={menu.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Menu Info */}
                <div className="p-3 md:p-4 flex flex-col flex-1">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1">{menu.category}</p>
                  <h3 className="text-sm md:text-base font-semibold text-gray-800 truncate">{menu.name}</h3>
                  
                  {/* Availability Status */}
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      menu.available 
                        ? 'text-black' 
                        : 'text-white'
                    }`}
                    style={{
                      backgroundColor: menu.available ? '#B2FF5E' : '#FF6859'
                    }}>
                      {menu.available ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  
                  {/* Stock Status (Real-time from inventory) */}
                  <div className="mb-2 text-[10px] md:text-xs">
                    <span className="font-medium text-gray-600">Est. Stock:</span>{' '}
                    <span 
                      className="font-semibold" 
                      style={{ color: '#7FCC2B' }}
                    >
                      {stockInfo.canMake === 0 ? '0' : stockInfo.canMake >= 999 ? '999+' : stockInfo.canMake}
                    </span>
                  </div>
                  
                  {/* Has Variants Indicator */}
                  {menu.hasVariants && (
                    <div 
                      className="mb-3 text-[10px] md:text-xs font-medium" 
                      style={{ color: '#FF6859' }}
                    >
                      This menu has variants
                    </div>
                  )}
                  
                  {/* Spacer to push content to bottom */}
                  <div className="flex-1"></div>
                  
                  <p className="text-sm md:text-base font-bold text-gray-900 mb-2 md:mb-3">Rp {menu.price.toLocaleString('id-ID')}</p>

                  {/* Actions */}
                  {!viewAsOwner && (
                    <div className="flex items-center gap-2 mt-auto">
                      <button 
                        onClick={() => handleEditMenu(menu)}
                        className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteMenu(menu)}
                        className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-xl hover:bg-red-50 transition"
                        style={{ color: '#FF6859', borderColor: '#FF6859', borderWidth: '1px', borderStyle: 'solid' }}
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
        defaultCategoryId={selectedCategory !== 'all' ? selectedCategory : undefined}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => {
          setShowAddCategoryModal(false)
          setEditingCategory(null)
        }}
        onSave={handleSaveNewCategory}
        category={editingCategory}
      />

      {/* Delete Menu Modal */}
      <DeleteModal
        isOpen={deletingMenu !== null}
        onClose={() => setDeletingMenu(null)}
        onConfirm={confirmDeleteMenu}
        title="Delete Menu"
        itemName={deletingMenu?.name || ''}
        description="This menu will be permanently removed from the menu."
      />

      {/* Delete Category Modal */}
      <DeleteModal
        isOpen={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        itemName={deletingCategory?.name || ''}
        description="This category and all its associated products will be affected. Are you sure?"
      />
    </div>
  )
}
