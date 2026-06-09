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
import { getProductKitchenAvailability } from "@/lib/services/inventory/inventoryBatchService";
import {
  calculateOrderFinancialTotals,
  defaultFinancialSettings,
} from "@/lib/services/bookkeeping/financialSettings";
import type { BookkeepingFinancialSettings } from "@/lib/services/bookkeeping/bookkeepingTypes";

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
  unavailableReason?: string;
  hasVariants: boolean;
  description?: string;
}

interface MenuBundleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  image: string | null;
  available: boolean;
}

interface MenuBundle {
  id: string;
  name: string;
  description: string;
  bundlePrice: number;
  normalPrice: number;
  items: MenuBundleItem[];
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

interface MenuBundleRow {
  id: string;
  name: string | null;
  description: string | null;
  bundle_price: number | string | null;
  starts_at: string | null;
  ends_at: string | null;
}

interface MenuBundleItemRow {
  id: string;
  bundle_id: string | null;
  product_id: string | null;
  quantity: number | string | null;
  sort_order: number | string | null;
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
  const [bundles, setBundles] = useState<MenuBundle[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableSession, setTableSession] = useState<CustomerTableSession | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [financialSettings, setFinancialSettings] =
    useState<BookkeepingFinancialSettings>(defaultFinancialSettings);

  const isDineInFromQr = Boolean(tableSession);
  const fulfillmentMethod = isDineInFromQr ? "table_service" : "counter_pickup";

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

  useEffect(() => {
    let isMounted = true;

    const loadFinancialSettings = async () => {
      try {
        const response = await fetch("/api/bookkeeping/financial-settings", {
          cache: "no-store",
        });
        const result = (await response.json().catch(() => ({}))) as {
          settings?: BookkeepingFinancialSettings;
        };

        if (isMounted && result.settings) {
          setFinancialSettings(result.settings);
        }
      } catch (error) {
        console.warn("Failed to load financial settings, using defaults:", error);
      }
    };

    void loadFinancialSettings();

    return () => {
      isMounted = false;
    };
  }, []);

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

    const kitchenAvailability = await getProductKitchenAvailability(
      rows.map((product) => product.id),
    ).catch((availabilityError) => {
      console.warn("Failed to load kitchen product availability:", availabilityError);
      return new Map();
    });

    const mappedProducts = rows.map((product) => {
      const availability = kitchenAvailability.get(product.id);
      const isKitchenReady = availability?.available !== false;
      return {
      id: product.id,
      name: product.name,
      category: getCategoryName(product.category),
      categoryId: product.category_id ?? "",
      price: Number(product.price) || 0,
      image: product.image,
      available: product.available === true && isKitchenReady,
      unavailableReason: !isKitchenReady ? availability?.reason : undefined,
      hasVariants: product.has_variants === true,
      description: product.description ?? undefined,
      };
    });

    setProducts(mappedProducts);
    setCategories(buildCategoriesFromProducts(mappedProducts));
    await fetchBundles(mappedProducts);
    setLoadingProducts(false);
  }

  async function fetchBundles(menuProducts: Product[]) {
    const today = new Date().toISOString().slice(0, 10);
    const [bundleResult, itemResult] = await Promise.all([
      supabase
        .from("menu_bundles")
        .select("id,name,description,bundle_price,starts_at,ends_at")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_bundle_items")
        .select("id,bundle_id,product_id,quantity,sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (bundleResult.error || itemResult.error) {
      setBundles([]);
      return;
    }

    const productById = new Map(menuProducts.map((product) => [product.id, product]));
    const itemRows = (itemResult.data ?? []) as MenuBundleItemRow[];
    const activeBundles = ((bundleResult.data ?? []) as MenuBundleRow[])
      .filter((bundle) => {
        const startsAt = bundle.starts_at ? String(bundle.starts_at).slice(0, 10) : "";
        const endsAt = bundle.ends_at ? String(bundle.ends_at).slice(0, 10) : "";
        return (!startsAt || startsAt <= today) && (!endsAt || endsAt >= today);
      })
      .map((bundle) => {
        const items = itemRows
          .filter((item) => item.bundle_id === bundle.id)
          .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
          .map((item) => {
            const product = item.product_id ? productById.get(item.product_id) : undefined;
            if (!product) return null;
            return {
              id: item.id,
              productId: product.id,
              productName: product.name,
              quantity: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
              unitPrice: product.price,
              image: product.image,
              available: product.available,
            } satisfies MenuBundleItem;
          })
          .filter((item): item is MenuBundleItem => item !== null);
        const normalPrice = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

        return {
          id: bundle.id,
          name: bundle.name || "Menu Bundle",
          description: bundle.description || "",
          bundlePrice: Number(bundle.bundle_price) || 0,
          normalPrice,
          items,
        } satisfies MenuBundle;
      })
      .filter(
        (bundle) =>
          bundle.items.length >= 2 &&
          bundle.bundlePrice > 0 &&
          bundle.items.every((item) => item.available),
      );

    setBundles(activeBundles);
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
    if (!product.available) {
      return;
    }

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
    if (!product.available) {
      return;
    }

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

  const addBundleToCart = (bundle: MenuBundle) => {
    const normalTotal = Math.max(1, bundle.normalPrice);
    const now = Date.now();
    const bundleItems = bundle.items.map((item, index) => {
      const lineNormalTotal = item.unitPrice * item.quantity;
      const lineBundleTotal = Math.round((lineNormalTotal / normalTotal) * bundle.bundlePrice);
      const unitBundlePrice = Math.max(0, Math.round(lineBundleTotal / item.quantity));

      return {
        id: `${bundle.id}-${item.productId}-${now}-${index}`,
        productId: item.productId,
        name: item.productName,
        price: unitBundlePrice,
        quantity: item.quantity,
        image: item.image ?? "",
        variants: [{ optionName: `Bundle: ${bundle.name}` }],
      } satisfies CartItem;
    });

    setCart((currentCart) => [...currentCart, ...bundleItems]);
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

  const cartFinancialTotals = useMemo(
    () => calculateOrderFinancialTotals(
      cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      financialSettings,
      {
        orderType: isDineInFromQr ? "Dine in" : "Take Away",
        fulfillmentMethod,
      },
    ),
    [cart, financialSettings, fulfillmentMethod, isDineInFromQr],
  );

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
        ) : (
          <div className="space-y-5">
            {bundles.length > 0 && selectedCategory === "all" && !searchQuery.trim() ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">Menu Bundles</h2>
                  <span className="text-xs font-semibold text-gray-500">Limited offers</span>
                </div>
                <div className="space-y-3">
                  {bundles.map((bundle) => (
                    <article
                      key={bundle.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-gray-900">{bundle.name}</h3>
                          {bundle.description ? (
                            <p className="mt-1 text-xs text-gray-500">{bundle.description}</p>
                          ) : null}
                          <p className="mt-2 text-xs text-gray-500">
                            {bundle.items
                              .map((item) => `${item.quantity}x ${item.productName}`)
                              .join(", ")}
                          </p>
                        </div>
                        {bundle.normalPrice > bundle.bundlePrice ? (
                          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            Save Rp {(bundle.normalPrice - bundle.bundlePrice).toLocaleString("id-ID")}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div>
                          {bundle.normalPrice > bundle.bundlePrice ? (
                            <p className="text-xs text-gray-400 line-through">
                              Rp {bundle.normalPrice.toLocaleString("id-ID")}
                            </p>
                          ) : null}
                          <p className="text-base font-bold text-gray-900">
                            Rp {bundle.bundlePrice.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addBundleToCart(bundle)}
                          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                        >
                          Add Bundle
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {filteredProducts.length === 0 ? (
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
        subtotal={cartFinancialTotals.subtotal}
        serviceCharge={cartFinancialTotals.serviceCharge}
        tax={cartFinancialTotals.tax}
        taxLabel={financialSettings.taxLabel}
        total={cartFinancialTotals.total}
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
