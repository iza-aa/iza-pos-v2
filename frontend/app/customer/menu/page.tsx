"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/config/supabaseClient';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import VariantModal from '@/app/components/customer/menu/VariantModal';
import SearchBar from '@/app/components/customer/menu/SearchBar';
import CategoryTabs from '@/app/components/customer/menu/CategoryTabs';
import ProductCard from '@/app/components/customer/menu/ProductCard';
import CartDrawer from '@/app/components/customer/menu/CartDrawer';
import LoadingScreen from '@/app/components/customer/LoadingScreen';

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);

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
    // Check if product has variants
    if (product.hasVariants) {
      setSelectedProduct(product);
      setShowVariantModal(true);
      return;
    }

    // No variants - add directly
    const existingItem = cart.find(item => item.productId === product.id && !item.variants);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id && !item.variants
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

  // Add item with variants to cart
  const addToCartWithVariants = (product: any, variants: any[], totalPrice: number, quantity: number) => {
    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: totalPrice,
      quantity: quantity,
      image: product.image,
      variants: variants
    };
    setCart([...cart, cartItem]);
    setShowVariantModal(false);
    setSelectedProduct(null);
  };

  // Update quantity (can remove item when quantity reaches 0)
  const updateQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: item.quantity + change };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Auto-close cart when empty
  useEffect(() => {
    if (cart.length === 0 && showCart) {
      setShowCart(false);
    }
  }, [cart.length, showCart]);

  // Go to checkout
  const goToCheckout = () => {
    if (cart.length === 0) return;
    router.push('/customer/checkout');
  };

  // Show initial loading screen without logo
  if (initializing) {
    return <LoadingScreen title="Loading Menu..." subtitle="Preparing your experience" hideBottomNav />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Menu</h1>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <CategoryTabs 
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
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
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
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
      <CartDrawer 
        cart={cart}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onCheckout={goToCheckout}
      />

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <VariantModal
          product={selectedProduct}
          onAddToCart={addToCartWithVariants}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
