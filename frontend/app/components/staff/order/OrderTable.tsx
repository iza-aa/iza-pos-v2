'use client';

import type { Order } from '@/lib/types';
import OrderSourceBadge from '@/app/components/shared/OrderSourceBadge';

interface OrderTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

type FulfillmentMethod = 'table_service' | 'pager' | 'counter_pickup';

type OrderWithFulfillment = Order & {
  fulfillmentMethod?: FulfillmentMethod | null;
  pagerNumber?: string | null;
  pickupCode?: string | null;

  fulfillment_method?: FulfillmentMethod | null;
  pager_number?: string | null;
  pickup_code?: string | null;
};

export default function OrderTable({ orders, onOrderClick }: OrderTableProps) {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: {
        icon: '✨',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        label: 'New Order',
      },
      preparing: {
        icon: '🍳',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        label: 'Preparing',
      },
      'partially-served': {
        icon: '🍽️',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        label: 'Partially Served',
      },
      served: {
        icon: '✅',
        color: 'text-green-600',
        bg: 'bg-green-50',
        label: 'Served',
      },
      completed: {
        icon: '✔️',
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        label: 'Completed',
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] ?? statusConfig.new
    );
  };

  const getFulfillmentInfo = (order: OrderWithFulfillment) => {
    const fulfillmentMethod =
      order.fulfillmentMethod ?? order.fulfillment_method ?? null;

    const pagerNumber = order.pagerNumber ?? order.pager_number ?? null;
    const pickupCode = order.pickupCode ?? order.pickup_code ?? null;

    if (fulfillmentMethod === 'table_service') {
      return {
        label: order.table || order.tableNumber || 'Table',
        description: 'Table Service',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }

    if (fulfillmentMethod === 'pager') {
      return {
        label: pagerNumber ? `Pager ${pagerNumber}` : 'Pager',
        description: 'Guest Pager',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    }

    if (fulfillmentMethod === 'counter_pickup') {
      return {
        label: `Pickup ${pickupCode || order.orderNumber}`,
        description: 'Counter Pickup',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }

    if (order.table || order.tableNumber) {
      return {
        label: order.table || order.tableNumber,
        description: 'Table Service',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }

    return {
      label: order.orderType || 'Order',
      description: 'No fulfillment data',
      badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
    };
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[calc(100vh-280px)]">
      <div className="overflow-auto h-full">
        <table className="w-full min-w-[1200px] table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr className="border-b border-gray-200">
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th className="w-[14%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Fulfillment
              </th>
              <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {orders.map((order) => {
              const config = getStatusBadge(order.status);
              const displayItems = order.items?.slice(0, 2) || [];
              const hasMore = (order.items?.length || 0) > 2;
              const fulfillmentInfo = getFulfillmentInfo(
                order as OrderWithFulfillment
              );

              return (
                <tr
                  key={order.id}
                  onClick={() => onOrderClick(order)}
                  className="hover:bg-gray-50 cursor-pointer transition"
                >
                  <td className="w-[12%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </div>
                  </td>

                  <td className="w-[14%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.customerName}
                    </div>
                  </td>

                  <td className="w-[12%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{order.time}</div>
                    <div className="text-xs text-gray-500">{order.date}</div>
                  </td>

                  <td className="w-[15%] px-6 py-4 whitespace-nowrap">
                    <div
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${fulfillmentInfo.badgeClass}`}
                    >
                      {fulfillmentInfo.label}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {fulfillmentInfo.description}
                    </div>
                  </td>

                  <td className="w-[10%] px-6 py-4 whitespace-nowrap">
                    {order.orderSource && (
                      <OrderSourceBadge source={order.orderSource} size="sm" />
                    )}
                  </td>

                  <td className="w-[15%] px-6 py-4">
                    <div className="space-y-1">
                      {displayItems.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          {item.quantity}x {item.name}
                        </div>
                      ))}

                      {hasMore && (
                        <div className="text-xs text-blue-600 font-medium">
                          +{(order.items?.length ?? 0) - 2} more
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="w-[10%] px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">
                      {formatRupiah(order.total ?? 0)}
                    </div>
                  </td>

                  <td className="w-[12%] px-6 py-4 whitespace-nowrap">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bg}`}
                    >
                      <span className="text-base">{config.icon}</span>
                      <span className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}