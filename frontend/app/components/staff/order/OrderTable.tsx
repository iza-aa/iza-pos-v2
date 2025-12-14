'use client'

import OrderSourceBadge from '@/app/components/shared/OrderSourceBadge';

interface OrderItem {
  name: string
  quantity: number
  price: number
  served: boolean
  servedAt?: string
}

interface Order {
  id: string
  customerName: string
  orderNumber: string
  orderType: string
  items: OrderItem[]
  total: number
  date: string
  time: string
  status: "new" | "preparing" | "partially-served" | "served" | "completed"
  table?: string
  orderSource?: 'pos' | 'qr'
}

interface OrderTableProps {
  orders: Order[]
  onOrderClick: (order: Order) => void
}

export default function OrderTable({ orders, onOrderClick }: OrderTableProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "new": {
        icon: "✨",
        color: "text-purple-600",
        bg: "bg-purple-50",
        label: "New Order",
      },
      "preparing": {
        icon: "🍳",
        color: "text-blue-600",
        bg: "bg-blue-50",
        label: "Preparing",
      },
      "partially-served": {
        icon: "🍽️",
        color: "text-orange-600",
        bg: "bg-orange-50",
        label: "Partially Served",
      },
      "served": {
        icon: "✅",
        color: "text-green-600",
        bg: "bg-green-50",
        label: "Served",
      },
      "completed": {
        icon: "✔️",
        color: "text-gray-600",
        bg: "bg-gray-50",
        label: "Completed",
      },
    }
    
    return statusConfig[status as keyof typeof statusConfig]
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[calc(100vh-280px)]">
      <div className="overflow-auto h-full">
        <table className="w-full min-w-[1200px] table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr className="border-b border-gray-200">
              <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Table/Type
              </th>
              <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="w-[13%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">{orders.map((order) => {
              const config = getStatusBadge(order.status)
              const displayItems = order.items.slice(0, 2)
              const hasMore = order.items.length > 2

              return (
                <tr 
                  key={order.id}
                  onClick={() => onOrderClick(order)}
                  className="hover:bg-gray-50 cursor-pointer transition"
                >
                  <td className="w-[10%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                  </td>
                  
                  <td className="w-[15%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                  </td>
                  
                  <td className="w-[12%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{order.time}</div>
                    <div className="text-xs text-gray-500">{order.date}</div>
                  </td>
                  
                  <td className="w-[10%] px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm text-gray-700 ${!order.table ? 'font-bold' : ''}`}>
                      {order.table || "Takeway"}
                    </div>
                  </td>
                  
                  <td className="w-[10%] px-6 py-4 whitespace-nowrap">
                    {order.orderSource && (
                      <OrderSourceBadge source={order.orderSource} size="sm" />
                    )}
                  </td>
                  
                  <td className="w-[10%] px-6 py-4">
                    <div className="space-y-1">
                      {displayItems.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                      {hasMore && (
                        <div className="text-xs text-blue-600 font-medium">
                          +{order.items.length - 2} more
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="w-[10%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">
                      ${order.total.toFixed(2)}
                    </div>
                  </td>
                  
                  <td className="w-[13%] px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bg}`}>
                      <span className="text-base">{config.icon}</span>
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
