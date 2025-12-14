"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/config/supabaseClient';
import { ClockIcon, CheckCircleIcon, FireIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  base_price: number;
  total_price: number;
  served: boolean;
  kitchen_status: string;
  variants?: any;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  table_number: string;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'new':
      return {
        label: 'Order Received',
        icon: <ClockIcon className="w-5 h-5" />,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        description: 'Your order has been received'
      };
    case 'preparing':
      return {
        label: 'Preparing',
        icon: <FireIcon className="w-5 h-5" />,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        description: 'Kitchen is preparing your order'
      };
    case 'partially-served':
      return {
        label: 'Partially Served',
        icon: <CheckCircleIcon className="w-5 h-5" />,
        color: 'text-green-600',
        bg: 'bg-green-50',
        description: 'Some items have been served'
      };
    case 'served':
      return {
        label: 'Served',
        icon: <CheckCircleIcon className="w-5 h-5" />,
        color: 'text-green-600',
        bg: 'bg-green-50',
        description: 'All items served. Enjoy your meal!'
      };
    case 'completed':
      return {
        label: 'Completed',
        icon: <CheckCircleIcon className="w-5 h-5" />,
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        description: 'Order completed'
      };
    default:
      return {
        label: status,
        icon: <ClockIcon className="w-5 h-5" />,
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        description: ''
      };
  }
};

const getKitchenStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'text-gray-700', bg: 'bg-gray-100' };
    case 'preparing':
      return { label: 'Preparing', color: 'text-orange-700', bg: 'bg-orange-100' };
    case 'ready':
      return { label: 'Ready', color: 'text-green-700', bg: 'bg-green-100' };
    case 'not_required':
      return { label: 'No Cooking', color: 'text-blue-700', bg: 'bg-blue-100' };
    default:
      return { label: status, color: 'text-gray-700', bg: 'bg-gray-100' };
  }
};

export default function CustomerTrackPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const orderId = localStorage.getItem('current_order_id');
    if (!orderId) {
      // No active order, stay on track page (empty state)
      setLoading(false);
      setInitializing(false);
      return;
    }

    fetchOrder(orderId);
    setTimeout(() => setInitializing(false), 300);

    // Set up real-time subscription
    const channel = supabase
      .channel('customer-order-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => fetchOrder(orderId)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` },
        () => fetchOrder(orderId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setOrder(data as Order);
      
      // Auto-clear session when order completed
      if (data && data.status === 'completed') {
        setTimeout(() => {
          localStorage.removeItem('customer_table');
          localStorage.removeItem('customer_cart');
          localStorage.removeItem('customer_name');
          localStorage.removeItem('current_order_id');
          localStorage.removeItem('table_session_start');
        }, 5000); // Give 5 seconds to see "Order Again" button
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    const orderId = localStorage.getItem('current_order_id');
    if (orderId) {
      setRefreshing(true);
      fetchOrder(orderId);
    }
  };

  const handleNewOrder = () => {
    localStorage.removeItem('current_order_id');
    router.push('/customer/menu');
  };

  // Show initial loading screen with logo
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8 animate-pulse">
            <img src="/logo/IZALogo1.png" alt="IZA POS" className="w-32 h-32 mx-auto object-contain" />
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
          <p className="text-white text-lg font-medium">Loading Order Status...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">Track Order</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Order</h2>
          <p className="text-gray-500 text-center mb-6">
            You don't have any active orders at the moment.
          </p>
          <button
            onClick={handleNewOrder}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const servedCount = order.order_items.filter(item => item.served).length;
  const totalCount = order.order_items.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Track Order</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Order Status */}
        <div className={`${statusConfig.bg} rounded-lg p-4 border border-gray-200`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={statusConfig.color}>
              {statusConfig.icon}
            </div>
            <h2 className={`text-lg font-bold ${statusConfig.color}`}>
              {statusConfig.label}
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">{statusConfig.description}</p>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Order #{order.order_number}</span>
            <span className="text-gray-600">Table {order.table_number}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Items Progress</h3>
            <span className="text-sm font-bold text-gray-900">
              {servedCount}/{totalCount} served
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(servedCount / totalCount) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Order Items</h3>
          <div className="space-y-3">
            {order.order_items.map(item => {
              const kitchenStatus = getKitchenStatusBadge(item.kitchen_status);
              return (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {item.quantity}x {item.product_name}
                      </h4>
                      {item.served ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <ClockIcon className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${kitchenStatus.bg} ${kitchenStatus.color} font-medium`}>
                        {kitchenStatus.label}
                      </span>
                      {item.served && (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Served
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Total */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-semibold">Total</span>
            <span className="text-xl font-bold text-gray-900">
              Rp {order.total.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Actions */}
        {order.status === 'completed' && (
          <button
            onClick={handleNewOrder}
            className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            Order Again
          </button>
        )}
      </div>
    </div>
  );
}
