"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import type {
  CategoryRow,
  InventoryItemRow,
  OrderItemRow,
  OrderRow,
  ProductRow,
  RecipeIngredientRow,
  RecipeRow,
} from "../shared/dashboardTypes";

export type SalesDashboardData = {
  orders: OrderRow[];
  orderItems: OrderItemRow[];
  products: ProductRow[];
  categories: CategoryRow[];
  recipes: RecipeRow[];
  recipeIngredients: RecipeIngredientRow[];
  inventoryItems: InventoryItemRow[];
  loading: boolean;
  error: string;
};

const emptyData: SalesDashboardData = {
  orders: [],
  orderItems: [],
  products: [],
  categories: [],
  recipes: [],
  recipeIngredients: [],
  inventoryItems: [],
  loading: true,
  error: "",
};

const getErrorMessages = (
  errors: Array<{ message?: string } | null | undefined>,
) => errors.map((error) => error?.message).filter(Boolean).join(" ");

export default function useSalesDashboardData() {
  const [data, setData] = useState<SalesDashboardData>(emptyData);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setData((current) => ({ ...current, loading: true, error: "" }));

      const [
        orders,
        orderItems,
        productRelationResult,
        categories,
        recipes,
        recipeIngredients,
        inventoryItems,
      ] =
        await Promise.all([
          supabase
            .from("orders")
            .select("id,total,discount,status,payment_status,payment_method,order_date,order_time,created_at,fulfillment_method,customer_id,reward_redemption_id")
            .order("created_at", { ascending: true }),
          supabase
            .from("order_items")
            .select("order_id,product_id,product_name,quantity,total_price"),
          supabase
            .from("products")
            .select("id,name,price,stock,available,is_available,type,category_id,category:categories(name)")
            .order("name", { ascending: true }),
          supabase.from("categories").select("id,name"),
          supabase
            .from("recipes")
            .select("id,product_id,product_name,recipe_type")
            .eq("recipe_type", "base"),
          supabase
            .from("recipe_ingredients")
            .select("recipe_id,inventory_item_id,ingredient_name,quantity_needed,unit"),
          supabase.from("inventory_items").select("*"),
        ]);
      const productFallbackResult = productRelationResult.error
        ? await supabase
            .from("products")
            .select("id,name,price,stock,available,type,category_id")
            .order("name", { ascending: true })
        : productRelationResult;

      if (!mounted) return;

      setData({
        orders: (orders.data ?? []) as unknown as OrderRow[],
        orderItems: (orderItems.data ?? []) as unknown as OrderItemRow[],
        products: (productFallbackResult.data ?? []) as unknown as ProductRow[],
        categories: (categories.data ?? []) as unknown as CategoryRow[],
        recipes: (recipes.data ?? []) as unknown as RecipeRow[],
        recipeIngredients: (recipeIngredients.data ?? []) as unknown as RecipeIngredientRow[],
        inventoryItems: (inventoryItems.data ?? []) as unknown as InventoryItemRow[],
        loading: false,
        error: getErrorMessages([
          orders.error,
          orderItems.error,
          productRelationResult.error ? productFallbackResult.error : null,
          categories.error,
          recipes.error,
          recipeIngredients.error,
          inventoryItems.error,
        ]),
      });
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
