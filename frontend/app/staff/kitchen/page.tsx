"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ClockIcon, FireIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface KitchenOrder {
  id: string;
  product_name: string;
  quantity: number;
  kitchen_status: 'pending' | 'cooking' | 'ready';
  variants?: Record<string, string>;
  created_at: string;
  ready_at?: string;
  orders?: {
    id: string;
    order_number: string;
    table_number?: number;
    customer_name?: string;
    created_at: string;
  };
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'cooking'>('all');

  // Page protection - only for Owner, Kitchen staff
  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    const staffType = localStorage.getItem('staff_type');
    
    // Allow: Owner OR Kitchen
    if (userRole !== 'owner' && staffType !== 'kitchen') {
      window.location.href = '/staff/dashboard';
    }
  }, []);

  useEffect(() => {
    fetchKitchenOrders();

    // Real-time subscription
    const subscription = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchKitchenOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchKitchenOrders() {
    setLoading(true);
    try {
      // Fetch order items yang butuh kitchen (kitchen_status = pending or cooking)
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (
            id,
            order_number,
            table_number,
            customer_name,
            created_at
          )
        `)
        .in('kitchen_status', ['pending', 'cooking'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(itemId: string, newStatus: 'cooking' | 'ready') {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ 
          kitchen_status: newStatus,
          ready_at: newStatus === 'ready' ? new Date().toISOString() : null
        })
        .eq('id', itemId);

      if (error) throw error;

      await fetchKitchenOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.kitchen_status === filter;
  });

  const pendingCount = orders.filter(o => o.kitchen_status === 'pending').length;
  const cookingCount = orders.filter(o => o.kitchen_status === 'cooking').length;

  if (loading) {
    return (
      <div className="h-[calc(100vh-55px)] flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kitchen Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track cooking orders in real-time</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
              <ClockIcon className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {pendingCount} Pending
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
              <FireIcon className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {cookingCount} Cooking
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex-shrink-0 bg-gray-100 px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
              filter === 'pending'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('cooking')}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
              filter === 'cooking'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Cooking ({cookingCount})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-100 px-6 pb-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Orders</h3>
            <p className="text-sm text-gray-500">
              {filter === 'all' ? 'No pending orders in kitchen' : `No ${filter} orders`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-gray-300 transition"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.kitchen_status === 'pending' 
                      ? 'bg-gray-100 text-gray-700 border border-gray-300'
                      : 'bg-gray-900 text-white'
                  }`}>
                    {item.kitchen_status === 'pending' ? 'Pending' : 'Cooking'}
                  </span>
                  
                  <div className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleTimeString('id-ID', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {/* Product Info */}
                <h3 className="font-bold text-lg text-gray-900 mb-1">{item.product_name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {item.orders?.order_number} • Table {item.orders?.table_number || 'Takeaway'}
                </p>

                {/* Quantity */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-700">Quantity:</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-bold text-gray-900">
                    {item.quantity}x
                  </span>
                </div>

                {/* Variants */}
                {item.variants && Object.keys(item.variants).length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Variants:</p>
                    <p className="text-sm text-gray-900">
                      {Object.entries(item.variants).map(([key, value]) => value).join(', ')}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {item.kitchen_status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'cooking')}
                      className="flex-1 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition font-medium text-sm"
                    >
                      Start Cooking
                    </button>
                  )}
                  {item.kitchen_status === 'cooking' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'ready')}
                      className="flex-1 px-4 py-2.5 rounded-xl transition font-medium text-sm"
                      style={{ backgroundColor: '#8FCC4A', color: 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7AB839'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8FCC4A'}
                    >
                      Mark Ready
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
