"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center">Loading kitchen orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Kitchen Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center text-gray-500">
          No pending orders in kitchen
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((item: any) => (
            <div key={item.id} className="bg-white rounded-lg p-4 shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">
                    {item.orders?.order_number} • Table {item.orders?.table_number || 'Takeaway'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.kitchen_status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.kitchen_status}
                </span>
              </div>

              <p className="text-gray-700 mb-3">Qty: {item.quantity}</p>

              {item.variants && (
                <p className="text-sm text-gray-600 mb-3">
                  {Object.entries(item.variants).map(([key, value]) => value).join(', ')}
                </p>
              )}

              <div className="flex gap-2">
                {item.kitchen_status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'cooking')}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Start Cooking
                  </button>
                )}
                {item.kitchen_status === 'cooking' && (
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'ready')}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
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
  );
}
