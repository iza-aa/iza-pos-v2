"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/config/supabaseClient';
import { MagnifyingGlassIcon, ShoppingCartIcon, XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ProductImagePlaceholder } from '@/app/components/ui';
import { Coffee, UtensilsCrossed, Cookie, Cake, Milk, Pizza, Sandwich, Soup, Salad, IceCream, LayoutGrid } from 'lucide-react';

// Icon mapping for categories
const iconNameToComponent: Record<string, any> = {
  'All': LayoutGrid,
  'Coffee': Coffee,
  'UtensilsCrossed': UtensilsCrossed,
  'Cookie': Cookie,
  'Cake': Cake,
  'Milk': Milk,
  'Pizza': Pizza,
  'Sandwich': Sandwich,
  'Soup': Soup,
  'Salad': Salad,
  'IceCream': IceCream,
};

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: number;
  image: string | null;
  available: boolean;
  hasVariants: boolean;
  description?: string;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  variants?: any[];
}

export default function CustomerMenuPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [showCart, setShowCart] = useState(false);

  // Check table session (run only once on mount)
  useEffect(() => {
    const tableInfo = localStorage.getItem('customer_table');
    if (!tableInfo) {
      // No session - redirect to scan QR code
      console.log('No table session found, redirecting to scan QR...');
      window.location.replace('/customer/table');
      return;
    }

    // Load cart from localStorage first (sync)
    const savedCart = localStorage.getItem('customer_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        localStorage.removeItem('customer_cart');
      }
    }

    // Fetch data
    Promise.all([fetchCategories(), fetchProducts()]).finally(() => {
      setInitializing(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - run only once

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('customer_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('customer_cart');
    }
  }, [cart]);

  // Fetch categories
  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (data) {
      setCategories([
        { id: 'all', name: 'All', icon: 'All', type: 'all' },
        ...data.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon || '🍽️',
          type: cat.type || 'food'
        }))
      ]);
    }
  }

  // Fetch products
  async function fetchProducts() {
    setLoading(true);
    
    let query = supabase
      .from('products')
      .select('*, category:categories(name)')
      .eq('available', true)
      .order('name', { ascending: true });

    if (selectedCategory !== 'all') {
      query = query.eq('category_id', selectedCategory);
    }

    const { data, error } = await query;

    if (data) {
      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category?.name || 'Unknown',
        categoryId: p.category_id,
        price: p.price,
        image: p.image || null,
        available: p.available,
        hasVariants: p.has_variants || false,
        description: p.description
      })));
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  // Filter products by search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add to cart
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      };
      setCart([...cart, newItem]);
    }
  };

  // Update quantity
  const updateQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Go to checkout
  const goToCheckout = () => {
    if (cart.length === 0) return;
    router.push('/customer/checkout');
  };

  // Show initial loading screen without logo
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Loading Text */}
          <p className="text-white text-lg font-medium">Loading Menu...</p>
          <p className="text-gray-400 text-sm mt-2">Preparing your experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Menu</h1>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map(cat => {
              const IconComponent = iconNameToComponent[cat.icon] || Cookie;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200"
              >
                <div className="aspect-square relative bg-gray-100">
                  <ProductImagePlaceholder
                    name={product.name}
                    imageUrl={product.image}
                    className="w-full h-full"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">
                      Rp {product.price.toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => addToCart(product)}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-20 right-4 bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition"
        >
          <ShoppingCartIcon className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
            {cart.length}
          </span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCart(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 last:border-0">
                  <img
                    src={item.image || ''}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm font-bold text-gray-900">
                      Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      <MinusIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="w-8 text-center font-semibold text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      <PlusIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 font-medium">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  Rp {calculateTotal().toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={goToCheckout}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                Checkout ({cart.length} items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
