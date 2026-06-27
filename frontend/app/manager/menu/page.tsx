"use client";

import { useState, useEffect } from "react";
import type { ElementType } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { formatCurrency } from "@/lib/constants";
import { getCurrentUser } from "@/lib/utils";
import { logActivity } from "@/lib/services/activity/activityLogger";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  LayoutGrid,
  Coffee,
  UtensilsCrossed,
  Cookie,
  Cake,
  Milk,
  Pizza,
  Sandwich,
  Soup,
  Salad,
  IceCream,
} from "lucide-react";
import { supabase } from "@/lib/config/supabaseClient";
import MenuModal from "@/app/components/manager/menu/MenuModal";
import CategoryModal from "@/app/components/manager/menu/CategoryModal";
import { DeleteModal, ProductImagePlaceholder } from "@/app/components/ui";
import { useLanguage } from "@/app/components/shared/i18n";
import type { MenuItem } from "@/lib/types";

type Category = {
  id: string;
  name: string;
  icon?: string | null;
  type?: string | null;
  count?: number;
};

type ProductVariantGroupRelation = {
  variant_group_id: string;
};

type ProductCategoryRelation = {
  name?: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  category_id: string;
  price: number;
  image?: string | null;
  available?: boolean | null;
  is_available?: boolean | null;
  has_variants?: boolean | null;
  type?: string | null;
  category?: ProductCategoryRelation | ProductCategoryRelation[] | null;
  product_variant_groups?: ProductVariantGroupRelation[] | null;
};

type InventoryItemRelation = {
  current_stock?: number | string | null;
};

type RecipeIngredientRelation = {
  quantity_needed?: number | string | null;
  inventory_items?: InventoryItemRelation | InventoryItemRelation[] | null;
};

type RecipeRow = {
  product_id: string;
  recipe_ingredients?: RecipeIngredientRelation[] | null;
};

type StockInfo = {
  canMake: number;
  status: "available" | "low" | "out";
};

const AVAILABLE_BADGE_STYLE = {
  backgroundColor: "#D8F999",
  color: "#111827",
  borderColor: "#C3EE78",
};

const WARNING_BADGE_STYLE = {
  backgroundColor: "#FFF4CC",
  color: "#92400E",
  borderColor: "#F5D56B",
};

const UNAVAILABLE_BADGE_STYLE = {
  backgroundColor: "#FFE1E1",
  color: "#C00000",
  borderColor: "#FFC7C7",
};

const getRelationObject = <T,>(
  relation: T | T[] | null | undefined,
): T | null => {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
};

// Icon mapping for categories - maps icon name to Lucide components
const iconNameToComponent: Record<string, ElementType> = {
  Coffee: Coffee,
  UtensilsCrossed: UtensilsCrossed,
  Cookie: Cookie,
  Cake: Cake,
  Milk: Milk,
  Pizza: Pizza,
  Sandwich: Sandwich,
  Soup: Soup,
  Salad: Salad,
  IceCream: IceCream,
  // Legacy emoji support (for existing data)
  "☕": Coffee,
  "🍽️": UtensilsCrossed,
  "🍟": Cookie,
  "🍰": Cake,
  "🍵": Milk,
};

const categoryIcons: Record<string, ElementType> = {
  all: LayoutGrid,
};

const parseNumericValue = (
  value: number | string | null | undefined,
): number => {
  const parsedValue = Number(value ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const getStockStatus = (canMake: number): StockInfo["status"] => {
  if (canMake <= 0) return "out";
  if (canMake <= 5) return "low";
  return "available";
};

const getDefaultStockInfo = (): StockInfo => ({
  canMake: 0,
  status: "out",
});

const calculateEstimatedStockByProduct = (
  recipes: RecipeRow[],
): Record<string, StockInfo> => {
  const ingredientPortionsByProduct = new Map<string, number[]>();

  recipes.forEach((recipe) => {
    const ingredients = recipe.recipe_ingredients ?? [];

    ingredients.forEach((ingredient) => {
      const quantityNeeded = parseNumericValue(ingredient.quantity_needed);
      const inventoryItem = getRelationObject(ingredient.inventory_items);
      const currentStock = parseNumericValue(inventoryItem?.current_stock);

      if (quantityNeeded <= 0) return;

      const possiblePortions = Math.max(
        0,
        Math.floor(currentStock / quantityNeeded),
      );
      const existingPortions =
        ingredientPortionsByProduct.get(recipe.product_id) ?? [];

      ingredientPortionsByProduct.set(recipe.product_id, [
        ...existingPortions,
        possiblePortions,
      ]);
    });
  });

  const stockByProductId: Record<string, StockInfo> = {};

  ingredientPortionsByProduct.forEach((portions, productId) => {
    const canMake = portions.length > 0 ? Math.min(...portions) : 0;

    stockByProductId[productId] = {
      canMake,
      status: getStockStatus(canMake),
    };
  });

  return stockByProductId;
};

export default function MenuPage() {
  const { t } = useLanguage();
  useSessionValidation();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [deletingMenu, setDeletingMenu] = useState<MenuItem | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [estimatedStockByProductId, setEstimatedStockByProductId] = useState<
    Record<string, StockInfo>
  >({});
  const [, setLoading] = useState(true);
  const [showCategorySidebar, setShowCategorySidebar] = useState(false);

  // Fetch categories from Supabase
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (data) {
        // Get product counts for each category
        const categoriesWithCount = await Promise.all(
          data.map(async (cat) => {
            const { count } = await supabase
              .from("products")
              .select("*", { count: "exact", head: true })
              .eq("category_id", cat.id);

            return {
              id: cat.id,
              name: cat.name,
              icon: cat.icon,
              type: cat.type, // Include type field
              count: count || 0,
            };
          }),
        );

        // Get total products count
        const { count: totalCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        setCategories([
          { id: "all", name: t("manager.menu.allMenu"), count: totalCount || 0 },
          ...categoriesWithCount,
        ]);
      }
    }

    fetchCategories();
  }, [t]);

  // Fetch products from Supabase
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);

      let query = supabase
        .from("products")
        .select(
          `
          *,
          category:categories(name),
          product_variant_groups(variant_group_id)
        `,
        )
        .order("name", { ascending: true });

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data } = await query;

      if (data) {
        const products = (data as ProductRow[]).map((product) => {
          const categoryRelation = getRelationObject(product.category);
          const available = product.available ?? product.is_available ?? true;

          return {
            id: product.id,
            name: product.name,
            category: categoryRelation?.name || t("manager.menu.unknownCategory"),
            categoryId: product.category_id,
            price: product.price,
            image: product.image || undefined,
            available,
            is_available: available,
            hasVariants: Boolean(product.has_variants),
            variantGroups:
              product.product_variant_groups?.map(
                (productVariantGroup: ProductVariantGroupRelation) =>
                  productVariantGroup.variant_group_id,
              ) || [],
            type: product.type === "drink" ? "drink" : "food",
          } satisfies MenuItem;
        });

        setMenuItems(products);

        const productIds = products.map((product) => product.id);

        if (productIds.length === 0) {
          setEstimatedStockByProductId({});
        } else {
          const { data: recipeData, error: recipeError } = await supabase
            .from("recipes")
            .select(
              `
              product_id,
              recipe_ingredients (
                quantity_needed,
                inventory_items (
                  current_stock
                )
              )
            `,
            )
            .in("product_id", productIds)
            .eq("recipe_type", "base")
            .eq("recipe_scope", "product")
            .eq("is_override", false)
            .eq("is_active", true);

          if (recipeError) {
            console.error("Failed to calculate estimated stock:", recipeError);
            setEstimatedStockByProductId({});
          } else {
            setEstimatedStockByProductId(
              calculateEstimatedStockByProduct(
                (recipeData ?? []) as RecipeRow[],
              ),
            );
          }
        }
      } else {
        setMenuItems([]);
        setEstimatedStockByProductId({});
      }

      setLoading(false);
    }

    fetchProducts();
  }, [selectedCategory, t]);

  const filteredMenuItems = menuItems.filter((menu) =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentCategory = categories.find((cat) => cat.id === selectedCategory);

  const getEstimatedStock = (menuId: string): StockInfo => {
    return estimatedStockByProductId[menuId] ?? getDefaultStockInfo();
  };

  const getStockBadgeStyle = (status: StockInfo["status"]) => {
    if (status === "available") return AVAILABLE_BADGE_STYLE;
    if (status === "low") return WARNING_BADGE_STYLE;
    return UNAVAILABLE_BADGE_STYLE;
  };

  const handleAddNewCategory = () => {
    setEditingCategory(null);
    setShowAddCategoryModal(true);
  };

  const handleSaveNewCategory = async (
    name: string,
    icon: string,
  ) => {
    if (editingCategory) {
      // Update existing category
      const { data, error } = await supabase
        .from("categories")
        .update({
          name: name,
          icon: icon,
        })
        .eq("id", editingCategory.id)
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update category");
      }

      // Update local state
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editingCategory.id
            ? { ...cat, name: data.name, icon: data.icon }
            : cat,
        ),
      );
      setEditingCategory(null);
    } else {
      // Save new category to Supabase
      const { data, error } = await supabase
        .from("categories")
        .insert([
          {
            name: name,
            icon: icon,
            sort_order: categories.length,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to create category");
      }

      // Add to local state
      setCategories((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          icon: data.icon,
          count: 0,
        },
      ]);
    }
  };

  const handleAddNewMenu = () => {
    setShowAddMenuModal(true);
    setEditingMenu(null);
    console.log("Adding new menu to category:", selectedCategory);
  };

  const handleEditMenu = (menu: MenuItem) => {
    setEditingMenu(menu);
    console.log("Editing menu:", menu);
  };

  const handleSaveNewMenu = async (newMenu: Omit<MenuItem, "id">) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const { data } = await supabase
      .from("products")
      .insert([
        {
          name: newMenu.name,
          category_id: newMenu.categoryId,
          price: newMenu.price,
          image: newMenu.image,
          available: newMenu.available,
          has_variants: newMenu.hasVariants,
          type: newMenu.type || "food",
          created_by: currentUser.id,
          updated_by: currentUser.id,
        },
      ])
      .select()
      .single();

    if (data) {
      // Save product variant groups relationship
      const selectedVariantGroups = newMenu.variantGroups ?? [];

      if (newMenu.hasVariants && selectedVariantGroups.length > 0) {
        const variantGroupsData = selectedVariantGroups.map((vgId) => ({
          product_id: data.id,
          variant_group_id: vgId,
        }));

        await supabase.from("product_variant_groups").insert(variantGroupsData);
      }

      const { data: categoryData } = await supabase
        .from("categories")
        .select("name")
        .eq("id", data.category_id)
        .single();

      const menuAvailability = data.available ?? data.is_available ?? true;

      const menu: MenuItem = {
        id: data.id,
        name: data.name,
        category: categoryData?.name || t("manager.menu.unknownCategory"),
        categoryId: data.category_id,
        price: data.price,
        image: data.image || null,
        available: menuAvailability,
        is_available: menuAvailability,
        hasVariants: data.has_variants ?? false,
        variantGroups: selectedVariantGroups,
        type: data.type || "food",
      };

      setMenuItems((prev) => [...prev, menu]);
      setShowAddMenuModal(false);

      // Log activity
      await logActivity({
        action: "CREATE",
        category: "MENU",
        description: `Created new menu item: ${menu.name}`,
        resourceType: "Menu Item",
        resourceId: menu.id,
        resourceName: menu.name,
        newValue: {
          name: menu.name,
          category: menu.category,
          price: menu.price,
          hasVariants: menu.hasVariants,
        },
        severity: "info",
        tags: ["menu", "create"],
      });
    }
  };

  const handleUpdateMenu = async (updatedMenu: MenuItem) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const { error } = await supabase
      .from("products")
      .update({
        name: updatedMenu.name,
        category_id: updatedMenu.categoryId,
        price: updatedMenu.price,
        image: updatedMenu.image,
        available: updatedMenu.available,
        has_variants: updatedMenu.hasVariants,
        type: updatedMenu.type || "food",
        updated_by: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedMenu.id);

    if (!error) {
      // Update product variant groups
      // First delete existing relationships
      await supabase
        .from("product_variant_groups")
        .delete()
        .eq("product_id", updatedMenu.id);

      // Then insert new ones if has variants
      const selectedVariantGroups = updatedMenu.variantGroups ?? [];

      if (updatedMenu.hasVariants && selectedVariantGroups.length > 0) {
        const variantGroupsData = selectedVariantGroups.map((vgId) => ({
          product_id: updatedMenu.id,
          variant_group_id: vgId,
        }));

        await supabase.from("product_variant_groups").insert(variantGroupsData);
      }

      // Find old menu for comparison
      const oldMenu = menuItems.find((m) => m.id === updatedMenu.id);

      setMenuItems((prev) =>
        prev.map((m) => (m.id === updatedMenu.id ? updatedMenu : m)),
      );
      setEditingMenu(null);

      // Calculate price change percentage
      let priceChangePercent = 0;
      let severity: "info" | "warning" = "info";
      let changesSummary = "";

      if (oldMenu && oldMenu.price !== updatedMenu.price) {
        priceChangePercent = Math.abs(
          ((updatedMenu.price - oldMenu.price) / oldMenu.price) * 100,
        );

        // Set warning severity if price change > 20%
        if (priceChangePercent > 20) {
          severity = "warning";
        }

        changesSummary = `Price: ${formatCurrency(oldMenu.price)} → ${formatCurrency(updatedMenu.price)} (${priceChangePercent.toFixed(1)}% change)`;
      }

      // Log activity with changes
      await logActivity({
        action: "UPDATE",
        category: "MENU",
        description: `Updated menu item: ${updatedMenu.name}`,
        resourceType: "Menu Item",
        resourceId: updatedMenu.id,
        resourceName: updatedMenu.name,
        previousValue: oldMenu
          ? {
              name: oldMenu.name,
              price: oldMenu.price,
              available: oldMenu.available,
            }
          : undefined,
        newValue: {
          name: updatedMenu.name,
          price: updatedMenu.price,
          available: updatedMenu.available,
        },
        changesSummary: changesSummary ? [changesSummary] : undefined,
        severity,
        tags: [
          "menu",
          "update",
          priceChangePercent > 20 ? "price-alert" : undefined,
        ].filter(Boolean) as string[],
      });
    }
  };

  const handleDeleteMenu = (menu: MenuItem) => {
    setDeletingMenu(menu);
  };

  const confirmDeleteMenu = async () => {
    if (deletingMenu) {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", deletingMenu.id);

      if (!error) {
        setMenuItems((prev) => prev.filter((m) => m.id !== deletingMenu.id));

        // Log activity
        await logActivity({
          action: "DELETE",
          category: "MENU",
          description: `Deleted menu item: ${deletingMenu.name}`,
          resourceType: "Menu Item",
          resourceId: deletingMenu.id,
          resourceName: deletingMenu.name,
          previousValue: {
            name: deletingMenu.name,
            category: deletingMenu.category,
            price: deletingMenu.price,
          },
          severity: "critical",
          tags: ["menu", "delete"],
          isReversible: false,
        });

        setDeletingMenu(null);
      }
    }
  };

  const handleDeleteCategory = (category: Category) => {
    if (category.id === "all") return; // Cannot delete 'All Menu'
    setDeletingCategory(category);
  };

  const confirmDeleteCategory = async () => {
    if (deletingCategory) {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", deletingCategory.id);

      if (!error) {
        setCategories((prev) =>
          prev.filter((c) => c.id !== deletingCategory.id),
        );
        // If deleted category was selected, switch to 'all'
        if (selectedCategory === deletingCategory.id) {
          setSelectedCategory("all");
        }
        setDeletingCategory(null);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-55px)] bg-white flex flex-col lg:flex-row h-[calc(100vh-55px)] overflow-hidden">
      {/* Floating Category Button - Mobile Only */}
      <button
        onClick={() => setShowCategorySidebar(true)}
        className="lg:hidden fixed bottom-6 left-6 w-14 h-14 bg-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white hover:scale-110 z-40"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Backdrop - Mobile Only */}
      {showCategorySidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setShowCategorySidebar(false)}
        />
      )}

      {/* Section 1: Sidebar Categories - Fixed height with scroll */}
      <section
        className={`w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 md:p-6 flex flex-col lg:h-full overflow-hidden
        lg:relative fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${showCategorySidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Close button - Mobile Only */}
        <button
          onClick={() => setShowCategorySidebar(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-4 shrink-0">
          Menu Category
        </h2>

        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {categories.map((category) => {
            // Map icon name/emoji to Lucide component
            const IconComponent =
              category.id === "all"
                ? categoryIcons["all"]
                : iconNameToComponent[category.icon ?? ""] || Cookie;

            const isSelected = selectedCategory === category.id;

            return (
              <div key={category.id} className="relative">
                <div
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setShowCategorySidebar(false); // Close sidebar on mobile when category is selected
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition cursor-pointer ${
                    isSelected
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent
                      className={`w-5 h-5 transition ${
                        isSelected ? "text-white" : "text-gray-600"
                      }`}
                      strokeWidth={2}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>

                  {/* Edit and Delete buttons - only show when selected and not 'all' */}
                  {isSelected && category.id !== "all" && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(category);
                          setShowAddCategoryModal(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                        title={t("manager.menu.editCategory")}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category);
                        }}
                        className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                        title={t("manager.menu.deleteCategory")}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleAddNewCategory}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-900 text-white px-3 py-2.5 rounded-lg hover:bg-gray-800 transition font-medium shrink-0 text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          {t("manager.menu.addNewCategory")}
        </button>
      </section>

      {/* Section 2 & 3: Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section 2: Header - Fixed, tidak bisa scroll */}
        <section className="bg-white p-4 md:p-6 border-b border-gray-200 shrink-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                  {t("manager.menu.title")}
                </h1>
                <p className="text-xs md:text-sm text-gray-500">
                  {t("manager.menu.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 lg:flex-none">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("manager.menu.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full lg:w-64 text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Menu List - HANYA INI yang bisa scroll */}
        <section className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-8">
            {/* Add New Menu Card */}
            <button
              onClick={handleAddNewMenu}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center gap-2 md:gap-3 hover:border-gray-900 hover:bg-gray-100 transition min-h-50 md:min-h-62.5"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-900 rounded-full flex items-center justify-center">
                <PlusIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {t("manager.menu.addNewMenuTo")}
              </p>
              <p className="text-sm font-semibold text-gray-700">
                {currentCategory?.name}
              </p>
            </button>

            {/* Menu Cards */}
            {filteredMenuItems.map((menu) => {
              const stockInfo = getEstimatedStock(menu.id);

              return (
                <div
                  key={menu.id}
                  className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition flex flex-col"
                >
                  {/* Menu Image */}
                  <div className="relative p-0.75">
                    <div className="w-full h-20 md:h-24 bg-gray-200 rounded-xl overflow-hidden">
                      <ProductImagePlaceholder
                        name={menu.name}
                        imageUrl={menu.image}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Menu Info */}
                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <p className="text-[10px] md:text-xs text-gray-500 mb-1">
                      {menu.category}
                    </p>
                    <h3 className="text-sm md:text-base font-semibold text-gray-800 truncate">
                      {menu.name}
                    </h3>

                    {/* Availability Status */}
                    <div className="mb-2">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold"
                        style={menu.available ? AVAILABLE_BADGE_STYLE : UNAVAILABLE_BADGE_STYLE}
                      >
                        {menu.available
                          ? t("manager.menu.available")
                          : t("manager.menu.unavailable")}
                      </span>
                    </div>

                    {/* Stock Status (Real-time from inventory) */}
                    <div className="mb-2 text-[10px] md:text-xs">
                      <span className="font-medium text-gray-600">
                        {t("manager.menu.estimatedStock")}:
                      </span>{" "}
                      <span
                        className="inline-flex rounded-full border px-2 py-0.5 font-semibold"
                        style={getStockBadgeStyle(stockInfo.status)}
                      >
                        {stockInfo.canMake}
                      </span>
                    </div>

                    {/* Has Variants Indicator */}
                    {menu.hasVariants && (
                      <div
                        className="mb-3 text-[10px] md:text-xs font-medium"
                        style={{ color: "#FF6859" }}
                      >
                        {t("manager.menu.hasVariants")}
                      </div>
                    )}

                    {/* Spacer to push content to bottom */}
                    <div className="flex-1"></div>

                    <p className="text-sm md:text-base font-bold text-gray-900 mb-2 md:mb-3">
                      {formatCurrency(menu.price)}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        onClick={() => handleEditMenu(menu)}
                        className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleDeleteMenu(menu)}
                        className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-xl hover:bg-red-50 transition"
                        style={{
                          color: "#FF6859",
                          borderColor: "#FF6859",
                          borderWidth: "1px",
                          borderStyle: "solid",
                        }}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Menu Modal */}
      <MenuModal
        isOpen={showAddMenuModal || editingMenu !== null}
        onClose={() => {
          setShowAddMenuModal(false);
          setEditingMenu(null);
        }}
        onSave={handleSaveNewMenu}
        onUpdate={handleUpdateMenu}
        editMenu={editingMenu}
        categories={categories.filter((c) => c.id !== "all")}
        defaultCategoryId={
          selectedCategory !== "all" ? selectedCategory : undefined
        }
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => {
          setShowAddCategoryModal(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveNewCategory}
        category={
          editingCategory
            ? {
                id: editingCategory.id,
                name: editingCategory.name,
                icon: editingCategory.icon ?? "Coffee",
              }
            : null
        }
      />

      {/* Delete Menu Modal */}
      <DeleteModal
        isOpen={deletingMenu !== null}
        onClose={() => setDeletingMenu(null)}
        onConfirm={confirmDeleteMenu}
        title={t("manager.menu.deleteMenu")}
        itemName={deletingMenu?.name || ""}
        description={t("manager.menu.deleteMenuDescription")}
      />

      {/* Delete Category Modal */}
      <DeleteModal
        isOpen={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={confirmDeleteCategory}
        title={t("manager.menu.deleteCategory")}
        itemName={deletingCategory?.name || ""}
        description={t("manager.menu.deleteCategoryDescription")}
      />
    </div>
  );
}
