"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/config/supabaseClient";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import VariantModal from "@/app/components/customer/menu/VariantModal";
import SearchBar from "@/app/components/customer/menu/SearchBar";
import CategoryTabs from "@/app/components/customer/menu/CategoryTabs";
import ProductCard from "@/app/components/customer/menu/ProductCard";
import CartDrawer from "@/app/components/customer/menu/CartDrawer";
import LoadingScreen from "@/app/components/customer/LoadingScreen";
import {
  type CustomerTableSession,
  validateStoredCustomerTableSession,
} from "@/lib/customer/customerSession";

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
  image: string;
  variants?: unknown[];
}

interface StoredCartItem {
  id?: unknown;
  productId?: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  image?: unknown;
  variants?: unknown;
}

interface ProductCategoryRelation {
  name: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  category_id: string | null;
  price: number | string | null;
  image: string | null;
  available: boolean | null;
  has_variants: boolean | null;
  description: string | null;
  category: ProductCategoryRelation | ProductCategoryRelation[] | null;
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "all",
    name: "All",
    icon: "All",
    type: "all",
  },
];

function getCategoryIcon(categoryName: string): string {
  const normalizedName = categoryName.trim().toLowerCase();

  if (normalizedName.includes("coffee") && !normalizedName.includes("non")) {
    return "Coffee";
  }

  if (normalizedName.includes("non") && normalizedName.includes("coffee")) {
    return "Non Coffee";
  }

  if (normalizedName.includes("snack")) {
    return "Snack";
  }

  if (normalizedName.includes("dessert") || normalizedName.includes("cake")) {
    return "Dessert";
  }

  if (
    normalizedName.includes("drink") ||
    normalizedName.includes("tea") ||
    normalizedName.includes("beverage")
  ) {
    return "Drink";
  }

  return "Food";
}

function getCategoryType(categoryName: string): string {
  const normalizedName = categoryName.trim().toLowerCase();

  if (
    normalizedName.includes("coffee") ||
    normalizedName.includes("drink") ||
    normalizedName.includes("tea") ||
    normalizedName.includes("beverage")
  ) {
    return "drink";
  }

  return "food";
}

function normalizeCartItem(item: StoredCartItem): CartItem | null {
  if (
    typeof item.id !== "string" ||
    typeof item.productId !== "string" ||
    typeof item.name !== "string" ||
    typeof item.price !== "number" ||
    typeof item.quantity !== "number"
  ) {
    return null;
  }

  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    image: typeof item.image === "string" ? item.image : "",
    variants: Array.isArray(item.variants) ? item.variants : undefined,
  };
}

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeCartItem(item as StoredCartItem))
      .filter((item): item is CartItem => item !== null);
  } catch {
    localStorage.removeItem("customer_cart");
    return [];
  }
}

function getCategoryRelation(
  category: ProductCategoryRelation | ProductCategoryRelation[] | null,
): ProductCategoryRelation | null {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category;
}

function getCategoryName(
  category: ProductCategoryRelation | ProductCategoryRelation[] | null,
): string {
  return getCategoryRelation(category)?.name ?? "Uncategorized";
}

function buildCategoriesFromProducts(products: Product[]): Category[] {
  const categoryMap = new Map<string, Category>();

  for (const product of products) {
    if (!product.categoryId) {
      continue;
    }

    const categoryName = product.category || "Uncategorized";

    categoryMap.set(product.categoryId, {
      id: product.categoryId,
      name: categoryName,
      icon: getCategoryIcon(categoryName),
      type: getCategoryType(categoryName),
    });
  }

  return [...DEFAULT_CATEGORIES, ...Array.from(categoryMap.values())];
}

export default function CustomerMenuPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableSession, setTableSession] = useState<CustomerTableSession | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);

  const isDineInFromQr = Boolean(tableSession);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const [validSession] = await Promise.all([
        validateStoredCustomerTableSession(),
      ]);

      if (!isMounted) {
        return;
      }

      const storedCart = parseStoredCart(localStorage.getItem("customer_cart"));

      setTableSession(validSession);
      setCart(storedCart);
      setInitializing(false);
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initializing) {
      return;
    }

    void fetchProducts();
  }, [initializing]);

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (cart.length > 0) {
      localStorage.setItem("customer_cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("customer_cart");
    }
  }, [cart, initializing]);

  useEffect(() => {
    if (cart.length === 0 && showCart) {
      setShowCart(false);
    }
  }, [cart.length, showCart]);

  async function fetchProducts() {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(name)")
      .eq("available", true)
      .order("name", { ascending: true });

    if (error) {
      setProducts([]);
      setCategories(DEFAULT_CATEGORIES);
      setLoadingProducts(false);
      return;
    }

    const rows = (data ?? []) as ProductRow[];

    const mappedProducts = rows.map((product) => ({
      id: product.id,
      name: product.name,
      category: getCategoryName(product.category),
      categoryId: product.category_id ?? "",
      price: Number(product.price) || 0,
      image: product.image,
      available: product.available === true,
      hasVariants: product.has_variants === true,
      description: product.description ?? undefined,
    }));

    setProducts(mappedProducts);
    setCategories(buildCategoriesFromProducts(mappedProducts));
    setLoadingProducts(false);
  }

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.categoryId === selectedCategory;
      const matchesSearch =
        !keyword || product.name.toLowerCase().includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  const addToCart = (product: Product) => {
    if (product.hasVariants) {
      setSelectedProduct(product);
      setShowVariantModal(true);
      return;
    }

    const existingItem = cart.find(
      (item) => item.productId === product.id && !item.variants,
    );

    if (existingItem) {
      setCart((currentCart) =>
        currentCart.map((item) =>
          item.productId === product.id && !item.variants
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
      return;
    }

    const newItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image ?? "",
    };

    setCart((currentCart) => [...currentCart, newItem]);
  };

  const addToCartWithVariants = (
    product: Product,
    variants: unknown[],
    totalPrice: number,
    quantity: number,
  ) => {
    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: totalPrice,
      quantity,
      image: product.image ?? "",
      variants,
    };

    setCart((currentCart) => [...currentCart, cartItem]);
    setShowVariantModal(false);
    setSelectedProduct(null);
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity + change,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const goToCheckout = () => {
    if (cart.length === 0) {
      return;
    }

    router.push("/customer/menu/checkout");
  };

  if (initializing) {
    return (
      <LoadingScreen
        title="Loading Menu..."
        subtitle="Preparing your experience"
        hideBottomNav
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="mb-3">
            <h1 className="text-xl font-bold text-gray-900">Menu</h1>
            {isDineInFromQr ? (
              <p className="text-xs text-gray-500 mt-1">
                Enjoy your dine-in experience! Browse the menu and place your order.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Browse menu without table. Checkout will continue as take away.
              </p>
            )}
          </div>

          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      <div className="px-4 py-4">
        {loadingProducts ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="fixed bottom-20 right-4 bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition"
        >
          <ShoppingCartIcon className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
            {cart.length}
          </span>
        </button>
      )}

      <CartDrawer
        cart={cart}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onCheckout={goToCheckout}
      />

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