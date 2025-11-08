'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline'

interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
}

export default function ManagerProductsPage() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Mock data untuk demo
    setProducts([
      { id: 1, name: 'Espresso', category: 'Coffee', price: 25000, stock: 100 },
      { id: 2, name: 'Cappuccino', category: 'Coffee', price: 30000, stock: 85 },
      { id: 3, name: 'Latte', category: 'Coffee', price: 32000, stock: 90 },
      { id: 4, name: 'Americano', category: 'Coffee', price: 28000, stock: 95 },
      { id: 5, name: 'Mocha', category: 'Coffee', price: 35000, stock: 70 },
      { id: 6, name: 'Affogato', category: 'Coffee', price: 38000, stock: 45 },
      { id: 7, name: 'Green Tea Latte', category: 'Non-Coffee', price: 30000, stock: 60 },
      { id: 8, name: 'Chocolate', category: 'Non-Coffee', price: 28000, stock: 75 },
      { id: 9, name: 'Croissant', category: 'Pastry', price: 25000, stock: 50 },
      { id: 10, name: 'Blueberry Muffin', category: 'Pastry', price: 22000, stock: 40 },
    ])
  }, [viewAsOwner])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kelola Produk</h1>
            {viewAsOwner && (
              <span className="inline-block mt-2 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                👁️ Viewing as Owner
              </span>
            )}
            <p className="text-gray-500 text-sm mt-1">
              {viewAsOwner 
                ? "Monitoring semua produk sebagai owner"
                : "Kelola dan update produk menu"
              }
            </p>
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
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 w-64"
              />
            </div>

            {!viewAsOwner && (
              <button className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-xl hover:bg-teal-600 transition font-medium">
                <PlusIcon className="w-5 h-5" />
                Add Product
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products Table */}
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
                    <button className="flex items-center gap-1 text-teal-600 hover:text-teal-800 text-sm font-medium transition">
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      )}
    </div>
  )
}
