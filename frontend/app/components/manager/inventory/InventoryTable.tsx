'use client'

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
}

export default function InventoryTable({ items, viewAsOwner, onRestock, onEdit }: InventoryTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-700'
      case 'low-stock': return 'bg-yellow-100 text-yellow-700'
      case 'out-of-stock': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Item Name</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Reorder Level</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Last Restocked</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            {!viewAsOwner && (
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <p className="text-sm font-semibold text-gray-800">{item.name}</p>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">{item.category}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`text-sm font-semibold ${
                  item.currentStock <= item.reorderLevel ? 'text-red-600' : 'text-gray-800'
                }`}>
                  {item.currentStock} {item.unit}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">{item.reorderLevel} {item.unit}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">{item.supplier}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">
                  {new Date(item.lastRestocked).toLocaleDateString('id-ID', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                  {getStatusText(item.status)}
                </span>
              </td>
              {!viewAsOwner && (
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onRestock?.(item)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Restock
                    </button>
                    <span className="text-gray-300">|</span>
                    <button 
                      onClick={() => onEdit?.(item)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
