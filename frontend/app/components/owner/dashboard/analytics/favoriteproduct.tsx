"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { StarIcon, FireIcon } from "@heroicons/react/24/solid";

export default function FavoriteProduct() {
  const products = [
    { name: "Classic Burger Stack", category: "Foods", emoji: "🍔", orders: 250, trend: "+12%" },
    { name: "Hazelnut Cappuccino", category: "Coffee", emoji: "☕", orders: 225, trend: "+8%" },
    { name: "Chocolate Lava Cake", category: "Desserts", emoji: "🍰", orders: 180, trend: "+5%" },
    { name: "Strawberry Banana Swirl", category: "Smoothies", emoji: "🍹", orders: 120, trend: "+3%" },
    { name: "Spicy Chicken Wings", category: "Snacks", emoji: "🍗", orders: 96, trend: "-2%" },
  ];

  const maxOrders = Math.max(...products.map(p => p.orders));

  const getCategoryStyle = () => {
    return "text-gray-600 bg-gray-100 border border-gray-200";
  };

  const getEmojiBackground = () => {
    return "from-gray-100 to-gray-50";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow duration-300 overflow-hidden h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div className="bg-gray-100 rounded-xl p-2">
            <StarIcon className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">Top Products</h3>
              <p className="text-xs text-gray-500">Best sellers this month</p>
            </div>
          </div>
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white w-36 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="divide-y divide-gray-50">
        {products.map((product, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer group"
          >
            {/* Rank Badge */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              idx === 0 ? 'bg-gray-800 text-white' : 
              idx === 1 ? 'bg-gray-600 text-white' : 
              idx === 2 ? 'bg-gray-400 text-white' : 
              'bg-gray-200 text-gray-600'
            }`}>
              {idx + 1}
            </div>

            {/* Product Icon */}
            <div className={`w-9 h-9 bg-gradient-to-br ${getEmojiBackground()} rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform`}>
              {product.emoji}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${getCategoryStyle()}`}>
                {product.category}
              </span>
            </div>

            {/* Orders & Progress */}
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-sm font-semibold text-gray-800">{product.orders}</span>
                <span className="text-xs text-gray-400">orders</span>
              </div>
              {/* Mini progress bar */}
              <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gray-400 to-gray-600 rounded-full transition-all"
                  style={{ width: `${(product.orders / maxOrders) * 100}%` }}
                />
              </div>
            </div>

            {/* Trend */}
            <div 
              className="text-xs font-semibold px-2 py-1 rounded-lg shrink-0"
              style={{ 
                backgroundColor: product.trend.startsWith('+') ? '#B2FF5E' : '#FF6859',
                color: product.trend.startsWith('+') ? '#166534' : '#7f1d1d'
              }}
            >
              {product.trend}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
