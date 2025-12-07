'use client'

import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

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
  viewAsOwner: boolean
  onRestock?: (item: InventoryItem) => void
  onEdit?: (item: InventoryItem) => void
  onDelete?: (item: InventoryItem) => void
}

export default function InventoryTable({ items, viewAsOwner, onRestock, onEdit, onDelete }: InventoryTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return ''
      case 'low-stock': return 'bg-yellow-100 text-yellow-700'
      case 'out-of-stock': return ''
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'in-stock': return { backgroundColor: '#B2FF5E', color: '#000000' }
      case 'out-of-stock': return { backgroundColor: '#FF6859', color: '#FFFFFF' }
      default: return {}
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in-stock': return 'In Stock'
      case 'low-stock': return 'Low Stock'
      case 'out-of-stock': return 'Out of Stock'
      default: return status
    }
  }

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
              {!viewAsOwner && (
                <th className="w-[14%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
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
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}
                    style={getStatusStyle(item.status)}
                  >
                    {getStatusText(item.status)}
                  </span>
                </td>
                {!viewAsOwner && (
                  <td className="px-6 py-4 whitespace-nowrap text-left w-[14%]">
                    <button
                      onClick={() => onEdit?.(item)}
                      className="text-gray-700 hover:text-gray-900 font-medium mr-3 text-sm"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete?.(item)}
                      className="hover:underline font-medium text-sm"
                      style={{ color: '#FF6859' }}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
