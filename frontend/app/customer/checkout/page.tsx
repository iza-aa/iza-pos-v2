"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/config/supabaseClient';
import { ArrowLeftIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variants?: any[];
}

interface TableInfo {
  table_number: string;
  table_id: string;
  floor_name: string;
}

export default function CustomerCheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Get table info
    const tableData = localStorage.getItem('customer_table');
    if (!tableData) {
      router.replace('/customer/table');
      return;
    }
    
    try {
      setTableInfo(JSON.parse(tableData));
    } catch (e) {
      router.replace('/customer/table');
      return;
    }

    // Get cart
    const cartData = localStorage.getItem('customer_cart');
    if (!cartData) {
      router.replace('/customer/menu');
      return;
    }
    
    try {
      const parsedCart = JSON.parse(cartData);
      if (parsedCart.length === 0) {
        router.replace('/customer/menu');
        return;
      }
      setCart(parsedCart);
    } catch (e) {
      router.replace('/customer/menu');
      return;
    }

    // Get customer name from previous session
    const savedName = localStorage.getItem('customer_name');
    if (savedName) {
      setCustomerName(savedName);
    }

    // Remove initializing state
    setTimeout(() => setInitializing(false), 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  // Update quantity
  const updateQuantity = (itemId: string, change: number) => {
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setCart(updatedCart);
    localStorage.setItem('customer_cart', JSON.stringify(updatedCart));
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Place order
  const placeOrder = async () => {
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = `QR-${Date.now()}`;
      const total = calculateTotal();

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_name: customerName.trim(),
          table_number: tableInfo?.table_number,
          table_id: tableInfo?.table_id,
          order_source: 'qr',
          order_type: 'Dine in',
          status: 'new',
          subtotal: total,
          tax: 0,
          discount: 0,
          total: total,
          payment_method: 'Cash',
          payment_status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Fetch products to determine kitchen_status
      const productIds = cart.map(item => item.productId);
      const { data: productsData, error: productError } = await supabase
        .from('products')
        .select('id, name, category_id, categories!inner(name, type)')
        .in('id', productIds);

      if (productError) throw productError;

      // Create order items
      const orderItems = cart.map(item => {
        const product = productsData?.find(p => p.id === item.productId);
        const category = product?.categories as { type?: string };
        const categoryType = category?.type || 'food';
        const isBeverage = categoryType === 'beverage';

        return {
          order_id: orderData.id,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          base_price: item.price,
          variants: item.variants || null,
          total_price: item.price * item.quantity,
          kitchen_status: isBeverage ? 'not_required' : 'pending'
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Save customer name for next time
      localStorage.setItem('customer_name', customerName);
      localStorage.setItem('current_order_id', orderData.id);
      
      // Clear cart
      localStorage.removeItem('customer_cart');

      // Redirect to track page
      router.push('/customer/track');
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to place order. Please try again.');
      setIsSubmitting(false);
    }
  };
  // Show loading screen
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8 animate-pulse">
            <img src="/logo/IZALogo1.png" alt="IZA POS" className="w-32 h-32 mx-auto object-contain" />
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
          <p className="text-white text-lg font-medium">Loading Checkout...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Table Info */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">Table Information</h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-gray-900 text-white text-sm font-bold rounded-lg">
              {tableInfo?.table_number}
            </span>
            <span className="text-sm text-gray-600">{tableInfo?.floor_name}</span>
          </div>
        </div>

        {/* Customer Name */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Order Items</h2>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-gray-200 last:border-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Rp {item.price.toLocaleString('id-ID')} × {item.quantity}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    disabled={isSubmitting}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    <MinusIcon className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="w-8 text-center font-semibold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    disabled={isSubmitting}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    <PlusIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Special Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests?"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">
                Rp {calculateTotal().toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-semibold text-gray-900">Rp 0</span>
            </div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">
                Rp {calculateTotal().toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={placeOrder}
          disabled={isSubmitting || !customerName.trim() || cart.length === 0}
          className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}
