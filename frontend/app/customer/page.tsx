/**
 * Customer Dashboard/Home Page
 * Mobile-first landing page after table selection
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBagIcon,
  ClockIcon,
  SparklesIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

export default function CustomerDashboard() {
  const router = useRouter();
  const [tableInfo, setTableInfo] = useState<any>(null);

  useEffect(() => {
    const storedTable = localStorage.getItem('customer_table');
    if (!storedTable) {
      // Redirect ke table selection jika belum pilih meja
      router.push('/customer/table');
      return;
    }
    setTableInfo(JSON.parse(storedTable));
  }, []);

  const quickActions = [
    {
      title: 'Browse Menu',
      description: 'View our delicious menu',
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
      action: () => router.push('/customer/menu'),
    },
    {
      title: 'Track Order',
      description: 'Check your order status',
      icon: ClockIcon,
      color: 'bg-amber-500',
      action: () => router.push('/customer/track'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
          {tableInfo && (
            <p className="text-gray-300">
              You're at <span className="font-semibold text-white">{tableInfo.table_number}</span>
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-6 -mt-6">
        <div className="max-w-lg mx-auto space-y-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="w-full bg-white rounded-lg border border-gray-200 p-4 flex items-center hover:border-gray-900 transition-colors"
            >
              <div className={`${action.color} rounded-full p-3 mr-4`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Featured/Popular Items */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center mb-4">
            <FireIcon className="h-5 w-5 text-red-500 mr-2" />
            <h2 className="text-lg font-bold text-gray-900">Popular Items</h2>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">
              Start browsing our menu to see popular items
            </p>
            <button
              onClick={() => router.push('/customer/order')}
              className="mt-3 px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              View Menu
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-900">Fast</div>
            <div className="text-xs text-green-700 mt-1">Quick Service</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">Easy</div>
            <div className="text-xs text-blue-700 mt-1">Self Ordering</div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">Need assistance?</p>
          <p className="text-xs text-gray-500">
            Our staff is here to help. Just raise your hand or press the call button.
          </p>
        </div>
      </div>
    </div>
  );
}
