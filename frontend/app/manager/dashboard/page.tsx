"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/authUtils";
import { 
  ChartBarIcon, 
  ShoppingBagIcon, 
  CubeIcon, 
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  UsersIcon
} from "@heroicons/react/24/outline";

export default function ManagerDashboardPage() {
  const [userName, setUserName] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const initializePage = async () => {
      // Check if user is actually a manager
      const currentUser = getCurrentUser();
      if (!currentUser) {
        window.location.href = '/manager/login';
        return;
      }
      
      // If not manager, redirect to appropriate dashboard
      if (currentUser.role === "staff") {
        window.location.href = "/staff/dashboard";
        return;
      } else if (currentUser.role === "owner") {
        window.location.href = "/owner/dashboard";
        return;
      }

      // Verify manager still exists in database
      if (currentUser.id && currentUser.role === "manager") {
        const { data, error } = await supabase
          .from('staff')
          .select('id, name, status, role')
          .eq('id', currentUser.id)
          .eq('role', 'manager')
          .maybeSingle();
        
        // If manager not found or inactive, logout
        if (error || !data || data.status !== 'active') {
          localStorage.clear();
          window.location.href = '/manager/login';
          return;
        }
      }

      // Get user name from auth helper
      setUserName(currentUser.name);

      // Set greeting based on time
      const hour = new Date().getHours();
      if (hour < 12) {
        setGreeting("Good Morning");
      } else if (hour < 18) {
        setGreeting("Good Afternoon");
      } else {
        setGreeting("Good Evening");
      }
    };
    
    initializePage();
  }, []);

  const quickActions = [
    {
      title: "Manage Menu",
      description: "Add, edit, or remove menu items",
      icon: ShoppingBagIcon,
      href: "/manager/menu",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600"
    },
    {
      title: "Inventory",
      description: "Track stock and raw materials",
      icon: CubeIcon,
      href: "/manager/inventory",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600"
    },
    {
      title: "Variants",
      description: "Manage product variants",
      icon: ClipboardDocumentListIcon,
      href: "/manager/variants",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600"
    },
    {
      title: "Orders",
      description: "View and manage orders",
      icon: ChartBarIcon,
      href: "/manager/order",
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600"
    }
  ];

  const stats = [
    {
      label: "Total Products",
      value: "24",
      icon: ShoppingBagIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "Low Stock Items",
      value: "3",
      icon: CubeIcon,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      label: "Active Orders",
      value: "12",
      icon: ArrowTrendingUpIcon,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "Staff On Duty",
      value: "8",
      icon: UsersIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header with Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting}, {userName}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome to your manager dashboard. Here's what you can manage today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <a
                key={index}
                href={action.href}
                className={`${action.color} ${action.hoverColor} text-white rounded-xl p-6 transition-all transform hover:scale-105 shadow-lg`}
              >
                <action.icon className="w-8 h-8 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                <p className="text-sm text-white/90">{action.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Today's Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">Rp 2,450,000</p>
              <p className="text-xs text-green-600 mt-1">+12% from yesterday</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Orders Completed</p>
              <p className="text-2xl font-bold text-gray-900">48</p>
              <p className="text-xs text-green-600 mt-1">+8% from yesterday</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">Rp 51,000</p>
              <p className="text-xs text-gray-600 mt-1">Same as yesterday</p>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activities
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">New order received</p>
                  <p className="text-xs text-gray-500">Table 5 - Order #ORD-1234</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">2 mins ago</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Menu item updated</p>
                  <p className="text-xs text-gray-500">Cappuccino - Price changed</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">15 mins ago</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Low stock alert</p>
                  <p className="text-xs text-gray-500">Coffee Beans - Only 2kg left</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">1 hour ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
