"use client";

import { BoltIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: "new" | "preparing" | "served" | "completed";
  total: number;
  time: string;
  items: number;
  createdBy: string;
  servedBy?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "new":
      return { label: "NEW", bg: "bg-purple-100", text: "text-purple-700" };
    case "preparing":
      return { label: "PREP", bg: "bg-blue-100", text: "text-blue-700" };
    case "served":
      return { label: "SERVED", bg: "bg-green-100", text: "text-green-700" };
    case "completed":
      return { label: "DONE", bg: "bg-gray-100", text: "text-gray-700" };
    default:
      return { label: "NEW", bg: "bg-gray-100", text: "text-gray-700" };
  }
};

const generateOrders = (): Order[] => {
  return [
    { id: "1", orderNumber: "ORD-1842", customerName: "John Doe", status: "new", total: 125000, time: "now", items: 3, createdBy: "Alice" },
    { id: "2", orderNumber: "ORD-1841", customerName: "Jane Smith", status: "preparing", total: 85000, time: "2m", items: 2, createdBy: "Bob" },
    { id: "3", orderNumber: "ORD-1840", customerName: "Mike Chen", status: "served", total: 65000, time: "5m", items: 1, createdBy: "Alice", servedBy: "Charlie" },
    { id: "4", orderNumber: "ORD-1839", customerName: "Sarah Lee", status: "completed", total: 45000, time: "8m", items: 2, createdBy: "Bob", servedBy: "Alice" },
    { id: "5", orderNumber: "ORD-1838", customerName: "Alex Wang", status: "completed", total: 92000, time: "12m", items: 4, createdBy: "Charlie", servedBy: "Bob" },
    { id: "6", orderNumber: "ORD-1837", customerName: "Lisa Kim", status: "completed", total: 58000, time: "15m", items: 2, createdBy: "Alice", servedBy: "Charlie" },
  ];
};

export default function LiveActivity() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(generateOrders());
  }, []);

  return (
    <div className="bg-white rounded-2xl p-4 w-full border border-gray-200 hover:shadow-lg transition h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 rounded-lg p-2">
            <BoltIcon className="h-4 w-4 text-gray-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Live Activity</h3>
            <p className="text-[10px] text-gray-500">Recent orders</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-800">24</p>
            <p className="text-[8px] text-gray-500">Orders</p>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="text-center">
            <p className="text-xs font-bold text-gray-800">18</p>
            <p className="text-[8px] text-gray-500">Paid</p>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="text-center">
            <p className="text-xs font-bold text-gray-800">6</p>
            <p className="text-[8px] text-gray-500">Pending</p>
          </div>
        </div>
      </div>

      {/* Order Cards - Mini Version */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {orders.map((order) => {
          const statusConfig = getStatusConfig(order.status);
          return (
            <div
              key={order.id}
              className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition cursor-pointer"
            >
              {/* Two Column Layout - 50/50 */}
              <div className="flex">
                {/* Left Side - Order Info */}
                <div className="flex-1 flex items-center gap-2 border-r border-gray-200 pr-2">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{order.customerName}</p>
                    <p className="text-[9px] text-gray-400">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-600">Rp{(order.total / 1000).toFixed(0)}K</p>
                    <p className="text-[9px] text-gray-400">{order.time}</p>
                  </div>
                </div>

                {/* Right Side - Staff Info */}
                <div className="flex-1 pl-2 flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Created by</span>
                    <span className="text-xs font-semibold text-blue-600">{order.createdBy}</span>
                  </div>
                  {order.servedBy && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500">Served by</span>
                      <span className="text-xs font-semibold text-green-600">{order.servedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
