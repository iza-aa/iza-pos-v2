"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

export default function FavoriteProduct() {
  const products = [
    { name: "Classic Burger Stack", category: "Foods", emoji: "🍔", orders: 250, bgColor: "bg-orange-50" },
    { name: "Hazelnut Cappuccino", category: "Coffee", emoji: "☕", orders: 225, bgColor: "bg-amber-50" },
    { name: "Chocolate Lava Cake", category: "Desserts", emoji: "🍰", orders: 180, bgColor: "bg-purple-50" },
    { name: "Strawberry Banana Swirl", category: "Smoothies", emoji: "🍹", orders: 120, bgColor: "bg-pink-50" },
    { name: "Spicy Chicken Wings", category: "Snacks", emoji: "🍗", orders: 96, bgColor: "bg-cyan-50" },
  ];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Foods: "text-green-600 bg-green-100",
      Coffee: "text-yellow-600 bg-yellow-100",
      Desserts: "text-blue-600 bg-blue-100",
      Smoothies: "text-pink-600 bg-pink-100",
      Snacks: "text-cyan-600 bg-cyan-100",
    };
    return colors[category] || "text-gray-600 bg-gray-100";
  };

  return (
    <div className="bg-white rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-xl p-3">
            <StarIcon className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Favorite Product</h3>
        </div>
        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-2 gap-4 px-4 py-3 bg-gray-200 rounded-t-lg ">
        <span className="text-sm font-medium text-gray-600">Product Name</span>
        <span className="text-sm font-medium text-gray-600 text-right">Total Orders</span>
      </div>

      {/* Product List */}
      <div className="space-y-2 border-x border-b border-gray-200 rounded-b-lg p-2 ">
        {products.map((product, idx) => (
          <div
            key={idx}
            className="grid grid-cols-2 gap-4 items-center p-3 hover:bg-gray-50 rounded-lg transition cursor-pointer border-b border-gray-200 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${product.bgColor} rounded-xl flex items-center justify-center text-2xl`}>
                {product.emoji}
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(product.category)}`}>
                  {product.category}
                </span>
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-900 text-right">{product.orders} Times</span>
          </div>
        ))}
      </div>
    </div>
  );
}
