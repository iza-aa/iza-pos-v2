"use client";

import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon, CubeIcon } from "@heroicons/react/24/outline";
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

  const getStockStatus = (percentage: number) => {
    if (percentage <= 50) return { color: 'bg-gray-800', bgColor: 'bg-gray-100', label: 'Critical', textColor: 'text-gray-700' };
    if (percentage <= 100) return { color: 'bg-gray-500', bgColor: 'bg-gray-100', label: 'Low', textColor: 'text-gray-600' };
    return { color: 'bg-gray-300', bgColor: 'bg-gray-100', label: 'Good', textColor: 'text-gray-500' };
  };

  // Count items that actually need reorder
  const needsAttentionCount = lowStockItems.filter(item => item.percentage <= 100).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow duration-300 overflow-hidden h-full">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gray-100 rounded-xl p-2">
              {needsAttentionCount > 0 ? (
                <ExclamationTriangleIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
              ) : (
                <CheckCircleIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
              )}
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-800">Stock Levels</h3>
              <p className="text-[10px] md:text-xs font-medium text-gray-500">
                {needsAttentionCount > 0 ? `${needsAttentionCount} items need reorder` : 'All stocks healthy'}
              </p>
            </div>
          </div>
          <a 
            href="/manager/inventory" 
            className="p-2 hover:bg-gray-100 rounded-xl transition group"
            title="View Inventory"
          >
            <ArrowTopRightOnSquareIcon className="h-3 md:h-4 w-3 md:w-4 text-gray-400 group-hover:text-gray-600" />
          </a>
        </div>
      </div>

      {/* Stock List */}
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-24"></div>
                </div>
                <div className="text-right">
                  <div className="h-3 bg-gray-100 rounded w-20 mb-1.5"></div>
                  <div className="h-1.5 bg-gray-100 rounded-full w-16"></div>
                </div>
                <div className="h-6 bg-gray-100 rounded-lg w-14"></div>
              </div>
            </div>
          ))
        ) : lowStockItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CubeIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">No inventory data</p>
            <p className="text-xs text-gray-400 mt-1">Add items to track stock levels</p>
          </div>
        ) : (
          lowStockItems.map((item) => {
            const status = getStockStatus(item.percentage);
            return (
              <div key={item.id} className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                {/* Icon */}
                <div className={`w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <CubeIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-600" />
                </div>

                {/* Item Name - same height as Top Product (2 lines) */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-xs md:text-sm truncate">{item.name}</p>
                  <span className="inline-block text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full mt-0.5 md:mt-1 text-gray-600 bg-gray-100 border border-gray-200">
                    {item.unit}
                  </span>
                </div>

                {/* Stock Info & Progress */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="flex items-center gap-1 md:gap-1.5 justify-end">
                    <span className="text-xs md:text-sm font-semibold text-gray-800">{item.current_stock.toLocaleString()}</span>
                    <span className="text-[10px] md:text-xs text-gray-400">/ {item.minimum_stock.toLocaleString()}</span>
                  </div>
                  {/* Mini progress bar - same as Top Product */}
                  <div className="w-12 md:w-16 h-1.5 bg-gray-100 rounded-full mt-1 md:mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-gray-400 to-gray-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Status Badge */}
                <div 
                  className="text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg shrink-0"
                  style={{ 
                    backgroundColor: status.label === 'Good' ? '#B2FF5E' : '#FF6859',
                    color: status.label === 'Good' ? '#166534' : '#7f1d1d'
                  }}
                >
                  {status.label}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
