'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { products as mockProducts } from '@/app/lib/mockData'
import ProductModal from './ProductModal'
import DeleteModal from '../ui/DeleteModal'

interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  hasVariants?: boolean
  variantGroups?: string[]
}

export default function ProductsManager() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  useEffect(() => {
    // Use data from mockData
    setProducts(mockProducts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      hasVariants: p.hasVariants,
      variantGroups: p.variantGroups,
    })));
  }, [])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddProduct = () => {
    setShowAddModal(true)
    console.log('Opening Add Product modal')
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    console.log('Editing product:', product)
  }

  const handleSaveNewProduct = (newProduct: Omit<Product, 'id'>) => {
    const product: Product = {
      ...newProduct,
      id: `prod-${Date.now()}`, // Generate temporary ID
    }
    setProducts(prev => [...prev, product])
    setShowAddModal(false)
    console.log('Product added:', product)
  }

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
    setEditingProduct(null)
    console.log('Product updated:', updatedProduct)
  }

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product)
  }

  const confirmDelete = () => {
    if (deletingProduct) {
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id))
      console.log('Product deleted:', deletingProduct)
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex flex-col overflow-hidden">
      {/* Section 1: Header + Search (Fixed) */}
      <section className="flex-shrink-0 p-8 pb-4 overflow-hidden">
        {/* Header dengan Title dan Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Kelola Produk</h1>
            
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
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {!viewAsOwner && (
              <button 
                onClick={handleAddProduct}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                Add Product
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Table (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produk</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Harga</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stok</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-800">{product.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{product.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-800">Rp {product.price.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      product.stock > 50 
                        ? 'bg-green-100 text-green-700' 
                        : product.stock > 20 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {product.stock} unit
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!viewAsOwner ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Product Modal */}
      <ProductModal
        isOpen={showAddModal || editingProduct !== null}
        onClose={() => {
          setShowAddModal(false)
          setEditingProduct(null)
        }}
        onSave={handleSaveNewProduct}
        onUpdate={handleUpdateProduct}
        editProduct={editingProduct}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deletingProduct !== null}
        onClose={() => setDeletingProduct(null)}
        onConfirm={confirmDelete}
        title="Delete Product"
        itemName={deletingProduct?.name || ''}
        description="This product will be permanently removed from your inventory."
      />
    </div>
  )
}
