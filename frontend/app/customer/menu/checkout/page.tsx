"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/config/supabaseClient';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import QRISPayment from '@/app/components/customer/menu/checkout/QRISPayment';
import CheckoutCartItem from '@/app/components/customer/menu/checkout/CheckoutCartItem';
import OrderSummary from '@/app/components/customer/menu/checkout/OrderSummary';
import LoadingScreen from '@/app/components/customer/LoadingScreen';

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
  id: string;
  table_number: string;
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
  const [showQRISPayment, setShowQRISPayment] = useState(false);
  const [pendingOrderNumber, setPendingOrderNumber] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState('');

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

  // Prepare order (before payment)
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

      // Create order with pending payment
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_name: customerName.trim(),
          table_number: tableInfo?.table_number,
          table_id: tableInfo?.id,
          order_source: 'qr',
          order_type: 'Dine in',
          status: 'new',
          subtotal: total,
          tax: 0,
          discount: 0,
          total: total,
          payment_method: 'QRIS',
          payment_status: 'pending',
          notes: notes.trim() || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Fetch products to determine type
      const productIds = cart.map(item => item.productId);
      const { data: productsData, error: productError } = await supabase
        .from("products")
        .select("id, name, category_id, categories(name)")
        .in("id", productIds);

      if (productError) throw productError;

      // Create order items with variants
      const orderItems = cart.map(item => {
        const product = productsData?.find(p => p.id === item.productId);
        const productType = product?.type || 'food';
        const isFood = productType === 'food';

        return {
          order_id: orderData.id,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          base_price: item.price,
          variants: item.variants ? JSON.stringify(item.variants) : null,
          total_price: item.price * item.quantity,
          kitchen_status: isFood ? 'pending' : 'not_required'
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Save order info and show QRIS payment
      setPendingOrderNumber(orderNumber);
      setPendingOrderId(orderData.id);
      setShowQRISPayment(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to create order. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle payment confirmation
  const handlePaymentConfirmed = async () => {
    try {
      // Update payment status
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', pendingOrderId);

      if (error) throw error;

      // Save customer name and order ID
      localStorage.setItem('customer_name', customerName);
      localStorage.setItem('current_order_id', pendingOrderId);
      
      // Clear cart
      localStorage.removeItem('customer_cart');

      // Redirect to track page
      router.push('/customer/track');
    } catch (error) {
      console.error('Payment confirmation error:', error);
      alert('Failed to confirm payment. Please try again.');
    }
  };
  // Show loading screen
  if (initializing) {
    return <LoadingScreen title="Loading Checkout..." subtitle="Preparing your order" />;
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
              <CheckoutCartItem 
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                disabled={isSubmitting}
              />
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
        <OrderSummary subtotal={calculateTotal()} />
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={placeOrder}
          disabled={isSubmitting || !customerName.trim() || cart.length === 0}
          className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Order...' : 'Proceed to Payment'}
        </button>
      </div>

      {/* QRIS Payment Modal */}
      {showQRISPayment && (
        <QRISPayment
          orderNumber={pendingOrderNumber}
          totalAmount={calculateTotal()}
          onPaymentConfirmed={handlePaymentConfirmed}
          onCancel={() => setShowQRISPayment(false)}
        />
      )}
    </div>
  );
}
