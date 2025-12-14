'use client'

import { useState } from 'react'
import { EllipsisVerticalIcon, ArrowUpTrayIcon, AdjustmentsHorizontalIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getInventoryStatusColor, getInventoryStatusStyle, getInventoryStatusText } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  category: string
  currentStock: number
  reorderLevel: number
  unit: string
  supplier: string
  lastRestocked: string
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
}

interface InventoryTableProps {
  items: InventoryItem[]
  onRestock: (item: InventoryItem) => void
  onAdjust: (item: InventoryItem) => void
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

export default function InventoryTable({ items, onRestock, onAdjust, onEdit, onDelete }: InventoryTableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden ">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[1000px] table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th className="w-[14%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="w-[11%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Reorder
              </th>
              <th className="w-[14%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Restocked
              </th>
              <th className="w-[11%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap w-[14%]">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-[11%]">
                  <div className="text-sm text-gray-700">{item.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                  <div className="text-sm font-semibold" style={{
                    color: item.currentStock <= item.reorderLevel ? '#FF6859' : '#000000'
                  }}>
                    {item.currentStock} {item.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                  <div className="text-sm text-gray-700">{item.reorderLevel} {item.unit}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-[14%]">
                  <div className="text-sm text-gray-700">{item.supplier}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                  <div className="text-sm text-gray-700">
                    {new Date(item.lastRestocked).toLocaleDateString('id-ID', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-[11%]">
                  <span 
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getInventoryStatusColor(item.status)}`}
                    style={getInventoryStatusStyle(item.status)}
                  >
                    {getInventoryStatusText(item.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left w-[14%]">
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                    </button>
                      
                      {openDropdown === item.id && (
                        <>
                          {/* Backdrop */}
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenDropdown(null)}
                          />
                          
                          {/* Dropdown Menu */}
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => {
                                onRestock?.(item)
                                setOpenDropdown(null)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-3"
                            >
                              <ArrowUpTrayIcon className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="font-medium">Restock</div>
                                <div className="text-xs text-gray-500">Add from supplier</div>
                              </div>
                            </button>
                            
                            <button
                              onClick={() => {
                                onAdjust?.(item)
                                setOpenDropdown(null)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-3"
                            >
                              <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="font-medium">Adjust Stock</div>
                                <div className="text-xs text-gray-500">Correction/damaged</div>
                              </div>
                            </button>
                            
                            <div className="border-t border-gray-200 my-1" />
                            
                            <button
                              onClick={() => {
                                onEdit?.(item)
                                setOpenDropdown(null)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-3"
                            >
                              <PencilIcon className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="font-medium">Edit Details</div>
                                <div className="text-xs text-gray-500">Name, category, etc</div>
                              </div>
                            </button>
                            
                            <button
                              onClick={() => {
                                onDelete?.(item)
                                setOpenDropdown(null)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-3"
                            >
                              <TrashIcon className="w-5 h-5 text-red-600" />
                              <div>
                                <div className="font-medium">Delete</div>
                                <div className="text-xs text-red-500">Remove item</div>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
