"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChefHatIcon, ClockIcon, CheckCircle2Icon } from "lucide-react";
import { parseSupabaseTimestamp, formatJakartaTime, getMinutesDifference, getJakartaNow } from "@/lib/dateUtils";

interface KitchenItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  variants: any;
  kitchenStatus: string;
  tableNumber?: string;
  createdAt: string;
  notes?: string;
}

export default function KitchenPage() {
  const [pendingItems, setPendingItems] = useState<KitchenItem[]>([]);
  const [cookingItems, setCookingItems] = useState<KitchenItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKitchenItems();

    // Real-time subscription
    const subscription = supabase
      .channel('kitchen-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchKitchenItems();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchKitchenItems() {
    try {
      // Fetch order items that need cooking (exclude drinks)
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_name,
          quantity,
          variants,
          kitchen_status,
          notes,
          created_at,
          orders!inner (order_number, table_number)
        `)
        .in('kitchen_status', ['pending', 'cooking'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const items: KitchenItem[] = data?.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        orderNumber: item.orders?.order_number || `#${item.order_id.substring(0, 8).toUpperCase()}`,
        productName: item.product_name || 'Unknown',
        quantity: item.quantity,
        variants: item.variants,
        kitchenStatus: item.kitchen_status,
        tableNumber: item.orders?.table_number,
        createdAt: item.created_at,
        notes: item.notes,
      })) || [];

      setPendingItems(items.filter(item => item.kitchenStatus === 'pending'));
      setCookingItems(items.filter(item => item.kitchenStatus === 'cooking'));
    } catch (error) {
      console.error('Error fetching kitchen items:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStartCooking = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({
          kitchen_status: 'cooking',
          cooking_started_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
      await fetchKitchenItems();
    } catch (error) {
      console.error('Error starting cooking:', error);
    }
  };

  const handleMarkReady = async (itemId: string) => {
    try {
      const staffId = localStorage.getItem('user_id');
      
      const { error } = await supabase
        .from('order_items')
        .update({
          kitchen_status: 'ready',
          ready_at: new Date().toISOString(),
          ready_by: staffId,
        })
        .eq('id', itemId);

      if (error) throw error;

      // Log activity
      await supabase
        .from('activity_logs')
        .insert([{
          staff_id: staffId,
          activity_type: 'item_ready',
          description: `Marked item as ready`,
          metadata: { item_id: itemId }
        }]);

      await fetchKitchenItems();
    } catch (error) {
      console.error('Error marking ready:', error);
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const orderTime = parseSupabaseTimestamp(createdAt);
    const now = getJakartaNow();
    return getMinutesDifference(now, orderTime);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHatIcon className="w-8 h-8 text-orange-500" />
            Kitchen Display
          </h1>
          <p className="text-gray-600 mt-1">Manage cooking orders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Queue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-yellow-500" />
                Pending ({pendingItems.length})
              </h2>
            </div>

            <div className="space-y-3">
              {pendingItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending items</p>
              ) : (
                pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">
                          {item.quantity}x {item.productName}
                        </p>
                        <p className="text-sm text-gray-600">{item.orderNumber}</p>
                        {item.tableNumber && (
                          <p className="text-sm text-gray-600">Table: {item.tableNumber}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-yellow-700 bg-yellow-200 px-2 py-1 rounded">
                        {getTimeElapsed(item.createdAt)} min
                      </span>
                    </div>

                    {item.variants && (
                      <p className="text-xs text-gray-600 mb-2">
                        {Object.entries(item.variants).map(([key, value]) => value).join(", ")}
                      </p>
                    )}

                    {item.notes && (
                      <p className="text-xs text-orange-600 mb-2">Note: {item.notes}</p>
                    )}

                    <button
                      onClick={() => handleStartCooking(item.id)}
                      className="w-full mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
                    >
                      Start Cooking
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cooking Queue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ChefHatIcon className="w-5 h-5 text-orange-500" />
                Cooking ({cookingItems.length})
              </h2>
            </div>

            <div className="space-y-3">
              {cookingItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items cooking</p>
              ) : (
                cookingItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">
                          {item.quantity}x {item.productName}
                        </p>
                        <p className="text-sm text-gray-600">{item.orderNumber}</p>
                        {item.tableNumber && (
                          <p className="text-sm text-gray-600">Table: {item.tableNumber}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded">
                        {getTimeElapsed(item.createdAt)} min
                      </span>
                    </div>

                    {item.variants && (
                      <p className="text-xs text-gray-600 mb-2">
                        {Object.entries(item.variants).map(([key, value]) => value).join(", ")}
                      </p>
                    )}

                    {item.notes && (
                      <p className="text-xs text-orange-600 mb-2">Note: {item.notes}</p>
                    )}

                    <button
                      onClick={() => handleMarkReady(item.id)}
                      className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle2Icon className="w-4 h-4" />
                      Mark as Ready
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
