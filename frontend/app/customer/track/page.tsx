"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/config/supabaseClient';
import { ClockIcon, CheckCircleIcon, FireIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import OrderProgressBar from '@/app/components/customer/track/OrderProgressBar';
import LoadingScreen from '@/app/components/customer/LoadingScreen';

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
      return { label: 'Waiting Kitchen', color: 'text-gray-700', bg: 'bg-gray-100' };
    case 'cooking':
      return { label: 'Cooking', color: 'text-orange-700', bg: 'bg-orange-100' };
    case 'ready':
      return { label: 'Ready to Serve', color: 'text-green-700', bg: 'bg-green-100' };
    case 'not_required':
      return { label: 'No Cooking', color: 'text-blue-700', bg: 'bg-blue-100' };
    default:
      return { label: status, color: 'text-gray-700', bg: 'bg-gray-100' };
  }
};

export default function CustomerTrackPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const tableData = localStorage.getItem('customer_table');
    if (!tableData) {
      // No table session
      setLoading(false);
      setInitializing(false);
      return;
    }

    let tableId;
    try {
      const parsed = JSON.parse(tableData);
      tableId = parsed.id;
    } catch (e) {
      setLoading(false);
      setInitializing(false);
      return;
    }

    fetchOrders(tableId);
    setTimeout(() => setInitializing(false), 300);

    // Set up real-time subscription for all orders of this table
    const channel = supabase
      .channel('customer-table-orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${tableId}` },
        () => fetchOrders(tableId)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => fetchOrders(tableId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchOrders = async (tableId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_id', tableId)
        .in('status', ['new', 'preparing', 'partially-served', 'served'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const fetchedOrders = (data as Order[]) || [];
      setOrders(fetchedOrders);
      
      // Auto-expand first order if none expanded
      if (!expandedOrderId && fetchedOrders.length > 0) {
        setExpandedOrderId(fetchedOrders[0].id);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    const tableData = localStorage.getItem('customer_table');
    if (tableData) {
      try {
        const parsed = JSON.parse(tableData);
        setRefreshing(true);
        fetchOrders(parsed.id);
      } catch (e) {
        console.error('Failed to parse table data');
      }
    }
  };

  const handleNewOrder = () => {
    localStorage.removeItem('current_order_id');
    router.push('/customer/menu');
  };

  // Show initial loading screen with logo
  if (initializing) {
    return <LoadingScreen title="Loading Order Status..." hideBottomNav />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">Track Orders</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h2>
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

  // Render single order card
  const renderOrderCard = (order: Order, index: number) => {
    const statusConfig = getStatusConfig(order.status);
    const servedCount = order.order_items.filter(item => item.served).length;
    const totalCount = order.order_items.length;
    const isExpanded = expandedOrderId === order.id;

    // Check if there are items that need kitchen preparation
    const hasKitchenItems = order.order_items.some(item => item.kitchen_status !== 'not_required');
    
    // Determine current progress step
    const getCurrentStep = () => {
      if (order.status === 'completed') return hasKitchenItems ? 4 : 3;
      if (servedCount === totalCount && totalCount > 0) return hasKitchenItems ? 3 : 2;
      
      if (hasKitchenItems) {
        const allReady = order.order_items
          .filter(item => item.kitchen_status !== 'not_required')
          .every(item => item.kitchen_status === 'ready');
        const someCooking = order.order_items.some(item => item.kitchen_status === 'cooking');
        
        if (allReady) return 3;
        if (someCooking) return 2;
        return 1;
      }
      
      return 1;
    };

    const currentStep = getCurrentStep();
    const totalSteps = hasKitchenItems ? 4 : 3;

    // Progress steps configuration
    const getProgressSteps = () => {
      if (hasKitchenItems) {
        return [
          { label: 'Order Placed', icon: '📝' },
          { label: 'Kitchen Preparing', icon: '🍳' },
          { label: 'Ready to Serve', icon: '✓' },
          { label: 'Completed', icon: '✔️' }
        ];
      }
      return [
        { label: 'Order Placed', icon: '📝' },
        { label: 'Ready to Serve', icon: '✓' },
        { label: 'Completed', icon: '✔️' }
      ];
    };

    const progressSteps = getProgressSteps();

    return (
      <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Clickable Card Header */}
        <div 
          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
          className="p-4 cursor-pointer hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                order.status === 'completed' ? 'bg-green-500' :
                order.status === 'served' ? 'bg-blue-500' :
                'bg-orange-500 animate-pulse'
              }`}></div>
              <div>
                <span className="text-sm font-bold text-gray-900">Order #{order.order_number}</span>
                {index === 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Latest</span>
                )}
              </div>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bg}`}>
              <span>{statusConfig.icon}</span>
              <span className={`text-xs font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
            <span className="text-sm text-gray-600">{servedCount}/{totalCount} served</span>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 animate-slide-down">
            <div className="p-4 space-y-4">

              {/* Progress Steps */}
              <OrderProgressBar currentStep={currentStep} steps={progressSteps} />

        {/* Items Progress Bar */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Items Served</h3>
            <span className="text-sm font-bold text-gray-900">
              {servedCount}/{totalCount}
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
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {item.quantity}x {item.product_name}
                        </h4>
                        {item.variants && typeof item.variants === 'string' && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {(() => {
                              try {
                                const variants = JSON.parse(item.variants);
                                return variants.map((v: any, idx: number) => (
                                  <span key={idx}>
                                    {v.optionName}{idx < variants.length - 1 ? ', ' : ''}
                                  </span>
                                ));
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </div>
                        )}
                      </div>
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
        )}
        
        <style jsx>{`
          @keyframes slide-down {
            from {
              opacity: 0;
              max-height: 0;
            }
            to {
              opacity: 1;
              max-height: 2000px;
            }
          }
          .animate-slide-down {
            animation: slide-down 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Track Orders</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {orders.map((order, index) => renderOrderCard(order, index))}
      </div>
    </div>
  );
}
