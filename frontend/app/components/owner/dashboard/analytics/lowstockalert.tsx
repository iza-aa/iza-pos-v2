"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  percentage: number;
}

export default function LowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLowStockItems();
  }, []);

  const fetchLowStockItems = async () => {
    try {
      // Fetch all inventory items with reorder_level
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, current_stock, reorder_level, unit')
        .order('current_stock', { ascending: true });

      if (error) {
        // RLS or other error - just show empty state, don't throw
        console.warn('Could not fetch inventory (RLS may be enabled):', error.message || 'Unknown error');
        setLowStockItems([]);
        return;
      }

      if (data && data.length > 0) {
        // Calculate how close each item is to reorder level
        // Sort by: items at or below reorder first, then by percentage of stock remaining
        const itemsWithPercentage = data
          .map(item => {
            const reorderLevel = item.reorder_level || 100;
            const percentage = Math.round((item.current_stock / reorderLevel) * 100);
            return {
              ...item,
              minimum_stock: reorderLevel,
              percentage,
              needsReorder: item.current_stock <= reorderLevel
            };
          })
          // Sort: items needing reorder first, then by lowest percentage
          .sort((a, b) => {
            if (a.needsReorder && !b.needsReorder) return -1;
            if (!a.needsReorder && b.needsReorder) return 1;
            return a.percentage - b.percentage;
          })
          .slice(0, 5);

        setLowStockItems(itemsWithPercentage);
      } else {
        setLowStockItems([]);
      }
    } catch (err) {
      console.warn('Error fetching low stock items:', err);
      setLowStockItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStockColor = (percentage: number) => {
    if (percentage <= 20) return 'bg-red-500';
    if (percentage <= 50) return 'bg-orange-400';
    if (percentage <= 100) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const getStockBgColor = (percentage: number) => {
    if (percentage <= 20) return 'bg-red-100';
    if (percentage <= 50) return 'bg-orange-100';
    if (percentage <= 100) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  // Count items that actually need reorder
  const needsAttentionCount = lowStockItems.filter(item => item.percentage <= 100).length;

  return (
    <div className="bg-white rounded-2xl p-5 w-full border border-gray-300 hover:shadow-lg transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${needsAttentionCount > 0 ? 'bg-red-100' : 'bg-blue-100'} rounded-xl p-2.5`}>
            <ExclamationTriangleIcon className={`h-5 w-5 ${needsAttentionCount > 0 ? 'text-red-500' : 'text-blue-500'}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Stock Levels</h3>
            {lowStockItems.length > 0 && (
              <span className={`text-xs font-medium ${needsAttentionCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {needsAttentionCount > 0 ? `${needsAttentionCount} items need reorder` : 'All stocks healthy'}
              </span>
            )}
          </div>
        </div>
        <a 
          href="/manager/inventory" 
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="View Inventory"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
        </a>
      </div>

      {/* Stock List */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full"></div>
            </div>
          ))
        ) : lowStockItems.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-400 text-2xl mb-2">📦</div>
            <p className="text-sm text-gray-500">No inventory data</p>
          </div>
        ) : (
          lowStockItems.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                  {item.name}
                </span>
                <span className="text-xs text-gray-500">
                  {item.current_stock.toLocaleString()} / {item.minimum_stock.toLocaleString()} {item.unit}
                </span>
              </div>
              <div className={`h-2 ${getStockBgColor(item.percentage)} rounded-full overflow-hidden`}>
                <div 
                  className={`h-full ${getStockColor(item.percentage)} rounded-full transition-all`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {lowStockItems.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <a 
            href="/manager/inventory"
            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            Manage Inventory
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
