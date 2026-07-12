"use client";

import { useState, useEffect } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentStaffInfo, getCurrentUser } from "@/lib/utils";
import { getStaffHomePath, hasStaffPosition } from "@/lib/utils/staffAccess";
import { logActivity } from "@/lib/services/activity/activityLogger";
import { broadcastNewOrder } from "@/lib/services/orders/orderRealtime";
import FoodiesMenuHeader from "@/app/components/staff/pos/FoodiesMenuHeader";
import MenuCategories from "@/app/components/staff/pos/MenuCategories";
import FoodItemCard from "@/app/components/staff/pos/FoodItemCard";
import VariantSidebar from "@/app/components/staff/pos/VariantSidebar";
import OrderSummary from "@/app/components/staff/pos/OrderSummary";
import PaymentModal from "@/app/components/staff/pos/PaymentModal";
import PaymentSummary from "@/app/components/staff/pos/PaymentSummary";
import {
	ShoppingCartIcon,
	ChevronDoubleRightIcon,
	ChevronDoubleLeftIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
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
	type LucideIcon,
} from "lucide-react";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import {
	calculateOrderFinancialTotals,
	defaultFinancialSettings,
} from "@/lib/services/bookkeeping/financialSettings";
import {
	getProductKitchenAvailability,
	recordOrderInventoryUsageWithBatches,
} from "@/lib/services/inventory/inventoryBatchService";
import {
	getKitchenStatusForPreparationStation,
	getProductPreparationStation,
	type PreparationStation,
} from "@/lib/orders/stationRouting";
import type { BookkeepingFinancialSettings } from "@/lib/services/bookkeeping/bookkeepingTypes";
import type { MenuItem, SelectedVariant } from "@/lib/types";

const iconNameToComponent: Record<string, LucideIcon> = {
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
	"☕": Coffee,
	"🍽️": UtensilsCrossed,
	"🍟": Cookie,
	"🍰": Cake,
	"🍵": Milk,
};

interface Category {
	id: string;
	label: string;
	icon: LucideIcon;
	count: number;
}

interface CartItem {
	id: string;
	productId: string;
	name: string;
	price: number;
	quantity: number;
	hasVariants: boolean;
	variants?: SelectedVariant[];
	image?: string;
}

type FulfillmentMethod = "table_service" | "counter_pickup";

type PaymentConfirmData = {
	paymentMethod: string;
	customerName?: string;
	customerPhone?: string;
	customerId?: string;
	notes?: string;
	cashAmount?: number;
	fulfillmentMethod?: FulfillmentMethod;
	tableNumber?: string;
};

type ProductCategoryForOrder = {
	name?: string;
	preparation_station?: PreparationStation | string | null;
};

type ProductWithCategory = {
	id: string;
	name: string;
	category_id?: string | null;
	categories?: ProductCategoryForOrder | ProductCategoryForOrder[] | null;
};

type SupabaseErrorLike = {
	message?: string;
	details?: string;
	hint?: string;
	code?: string;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isSupabaseErrorLike = (error: unknown): error is SupabaseErrorLike => {
	return isObjectRecord(error);
};

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;

	if (isSupabaseErrorLike(error)) {
		return [error.message, error.details, error.hint, error.code]
			.filter(Boolean)
			.join(" | ");
	}

	try {
		return JSON.stringify(error);
	} catch {
		return "Unknown error";
	}
};

const normalizeVariantRecord = (
	variants?: SelectedVariant[]
): Record<string, string[]> => {
	if (!variants || variants.length === 0) return {};

	return variants.reduce<Record<string, string[]>>((acc, variant) => {
		const groupName = variant.group_name || variant.groupName || "Variant";
		const optionName =
			variant.option_name ||
			variant.optionName ||
			variant.name ||
			variant.label ||
			"";

		if (!optionName) return acc;

		if (!acc[groupName]) {
			acc[groupName] = [];
		}

		acc[groupName].push(optionName);
		return acc;
	}, {});
};

const getProductCategory = (product?: ProductWithCategory) => {
	const category = Array.isArray(product?.categories)
		? product?.categories[0]
		: product?.categories;

	return category || null;
};

const toDisplayMenuItem = (item: MenuItem) => ({
	id: item.id,
	name: item.name,
	category: item.category,
	price: item.price,
	image: item.image || item.image_url || "",
	available: item.available !== false,
	unavailableReason: item.unavailableReason,
});

const normalizePaymentMethodForDatabase = (method?: string): string => {
	const paymentMethodMap: Record<string, string> = {
		cash: "Cash",
		qris: "QRIS",
		debit: "Card",
		credit: "Card",
		card: "Card",
		ewallet: "E-Wallet",
		"e-wallet": "E-Wallet",
		Cash: "Cash",
		QRIS: "QRIS",
		Card: "Card",
		"E-Wallet": "E-Wallet",
	};

	return paymentMethodMap[method || "cash"] || "Cash";
};

const normalizePaymentMethodForTransaction = (method?: string): string => {
	const paymentMethodMap: Record<string, string> = {
		cash: "Cash",
		qris: "QRIS",
		scan: "QRIS",
		card: "Card",
		debit: "Card",
		credit: "Card",
		Cash: "Cash",
		QRIS: "QRIS",
		Scan: "QRIS",
		Card: "Card",
	};

	return paymentMethodMap[method || "cash"] || "Cash";
};

export default function POSPage() {
	useSessionValidation();

	const [activeCategory, setActiveCategory] = useState("all");
	const [checkingShift, setCheckingShift] = useState(true);
	const [shiftStatus, setShiftStatus] = useState<string | null>(null);
	const [isOwner, setIsOwner] = useState(false);

	useEffect(() => {
		const user = getCurrentUser();
		setIsOwner(user?.role === "owner");
	}, []);

	useEffect(() => {
		let active = true;
		async function checkActiveShift() {
			try {
				const user = getCurrentUser();
				if (!user) {
					if (active) setShiftStatus("not_opened");
					return;
				}

				const headers: Record<string, string> = {
					"x-user-id": user.id,
					"x-user-name": user.name ?? "Staff",
					"x-user-role": user.role ?? "staff",
				};

				const response = await fetch("/api/staff/bookkeeping/shift-closing", {
					headers,
				});
				const result = await response.json().catch(() => ({}));
				if (!active) return;
				if (result.data) {
					const status = result.data.closing?.status || "not_opened";
					setShiftStatus(status);
				} else {
					setShiftStatus("not_opened");
				}
			} catch (error) {
				console.error("Failed to check shift status:", error);
				if (active) setShiftStatus("error");
			} finally {
				if (active) setCheckingShift(false);
			}
		}
		void checkActiveShift();
		return () => {
			active = false;
		};
	}, []);
	const [categories, setCategories] = useState<Category[]>([]);
	const [foodItems, setFoodItems] = useState<MenuItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [variantSidebarOpen, setVariantSidebarOpen] = useState(false);
	const [paymentModalOpen, setPaymentModalOpen] = useState(false);
	const [placingOrder, setPlacingOrder] = useState(false);
	const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
	const [orderDetailsOpen, setOrderDetailsOpen] = useState(true);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [financialSettings, setFinancialSettings] =
		useState<BookkeepingFinancialSettings>(defaultFinancialSettings);

	useEffect(() => {
		// On mobile the "Order Details" panel renders as a full-screen overlay
		// (see the `lg:hidden` backdrop below), so it must start closed there —
		// only desktop keeps it open by default as a normal sidebar.
		if (window.innerWidth < 1024) {
			setOrderDetailsOpen(false);
		}
	}, []);

	useEffect(() => {
		const currentUser = getCurrentUser();

		if (
			currentUser?.role !== "owner" &&
			!hasStaffPosition({
				position: "cashier",
				positions: currentUser?.positions,
				staffType: currentUser?.staffType,
			})
		) {
			window.location.href = getStaffHomePath(
				currentUser?.positions,
				currentUser?.staffType,
			);
		}
	}, []);

	useEffect(() => {
		async function fetchCategories() {
			const { data, error } = await supabase
				.from("categories")
				.select("*")
				.eq("is_active", true)
				.order("sort_order", { ascending: true });

			if (error) {
				console.warn("Error fetching categories:", {
					message: error.message,
					details: error.details,
					hint: error.hint,
					code: error.code,
				});
				setCategories([
					{ id: "all", label: "All Menu", icon: LayoutGrid, count: 0 },
				]);
				return;
			}

			if (!data) return;

			const categoriesWithCount: Category[] = await Promise.all(
				data.map(async (cat) => {
					const { count } = await supabase
						.from("products")
						.select("*", { count: "exact", head: true })
						.eq("category_id", cat.id)
						.eq("available", true);

					const IconComponent = iconNameToComponent[cat.icon] || Cookie;

					return {
						id: cat.id,
						label: cat.name,
						icon: IconComponent,
						count: count || 0,
					};
				})
			);

			const { count: totalCount } = await supabase
				.from("products")
				.select("*", { count: "exact", head: true })
				.eq("available", true);

			setCategories([
				{ id: "all", label: "All Menu", icon: LayoutGrid, count: totalCount || 0 },
				...categoriesWithCount,
			]);
		}

		fetchCategories();
	}, []);

	useEffect(() => {
		let mounted = true;

		async function fetchFinancialSettings() {
			try {
				const response = await fetch("/api/bookkeeping/financial-settings");
				const result = (await response.json().catch(() => ({}))) as {
					settings?: BookkeepingFinancialSettings;
				};

				if (mounted && result.settings) {
					setFinancialSettings(result.settings);
				}
			} catch (error) {
				console.warn("Failed to load financial settings, using defaults:", error);
			}
		}

		void fetchFinancialSettings();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		async function fetchProducts() {
			setLoading(true);

			let query = supabase
				.from("products")
				.select("*, category:categories(name)")
				.eq("available", true)
				.order("name", { ascending: true });

			if (activeCategory !== "all") {
				query = query.eq("category_id", activeCategory);
			}

			const { data, error } = await query;

			if (error) {
				console.warn("Error fetching products:", {
					message: error.message,
					details: error.details,
					hint: error.hint,
					code: error.code,
				});
				setFoodItems([]);
				setLoading(false);
				return;
			}

			if (data) {
				const kitchenAvailability = await getProductKitchenAvailability(
					data.map((product) => product.id)
				).catch((availabilityError) => {
					console.warn("Failed to load kitchen product availability:", availabilityError);
					return new Map();
				});

				setFoodItems(
					data.map((p) => {
						const availability = kitchenAvailability.get(p.id);
						const isKitchenReady = availability?.available !== false;

						return {
							id: p.id,
							name: p.name,
							category: p.category?.name || "Unknown",
							categoryId: p.category_id,
							price: p.price,
							image: p.image || "",
							image_url: p.image_url || p.image || "",
							hasVariants: Boolean(p.has_variants),
							is_available: Boolean(p.available) && isKitchenReady,
							available: Boolean(p.available) && isKitchenReady,
							unavailableReason: !isKitchenReady ? availability?.reason : undefined,
						} as MenuItem;
					})
				);
			}

			setLoading(false);
		}

		fetchProducts();
	}, [activeCategory]);

	const handleQuantityChange = (id: string, delta: number) => {
		const item = foodItems.find((foodItem) => foodItem.id === id);

		if (delta > 0 && item?.available === false) {
			showError(item.unavailableReason || "Menu item is not ready.");
			return;
		}

		if (item?.hasVariants) {
			if (delta > 0) {
				handleItemClick(item);
				return;
			}

			if (delta < 0) {
				const variantCartItems = cart.filter(
					(cartItem) => cartItem.productId === id && cartItem.hasVariants
				);

				if (variantCartItems.length > 0) {
					const lastItem = variantCartItems[variantCartItems.length - 1];
					const newCart = [...cart];
					const lastItemIndex = newCart.findIndex(
						(cartItem) => cartItem.id === lastItem.id
					);

					if (lastItemIndex >= 0) {
						newCart[lastItemIndex].quantity = Math.max(
							0,
							newCart[lastItemIndex].quantity - 1
						);

						if (newCart[lastItemIndex].quantity === 0) {
							newCart.splice(lastItemIndex, 1);
						}

						setCart(newCart);
					}
				}
			}

			return;
		}

		const existingItemIndex = cart.findIndex(
			(cartItem) => cartItem.productId === id && !cartItem.hasVariants
		);

		if (existingItemIndex >= 0) {
			const newCart = [...cart];
			newCart[existingItemIndex].quantity = Math.max(
				0,
				newCart[existingItemIndex].quantity + delta
			);

			if (newCart[existingItemIndex].quantity === 0) {
				newCart.splice(existingItemIndex, 1);
			}

			setCart(newCart);
		} else if (delta > 0 && item && !item.hasVariants) {
			setCart([
				...cart,
				{
					id: item.id,
					productId: item.id,
					name: item.name,
					price: item.price,
					quantity: delta,
					hasVariants: false,
					image: item.image || item.image_url || "",
				},
			]);
		}
	};

	const handleItemClick = (item: MenuItem) => {
		if (item.available === false) {
			showError(item.unavailableReason || "Menu item is not ready.");
			return;
		}

		if (item.hasVariants) {
			setSelectedItem(item);
			setVariantSidebarOpen(true);
			setOrderDetailsOpen(true);
		} else {
			handleQuantityChange(item.id, 1);
		}
	};

	const handleAddToOrder = (
		item: { id: string; name: string; image?: string },
		selectedVariants: SelectedVariant[],
		totalPrice: number,
		quantity: number
	) => {
		const menuItem = foodItems.find((foodItem) => foodItem.id === item.id);
		if (menuItem?.available === false) {
			showError(menuItem.unavailableReason || "Menu item is not ready.");
			return;
		}

		const cartItem: CartItem = {
			id: `${item.id}-${Date.now()}`,
			productId: item.id,
			name: item.name,
			price: totalPrice,
			quantity,
			hasVariants: true,
			variants: selectedVariants,
			image: item.image || "",
		};

		setCart((prevCart) => [...prevCart, cartItem]);
		setOrderDetailsOpen(true);
		setVariantSidebarOpen(false);
	};

	const handleOrderQuantityChange = (item: { id: string }, newQuantity: number) => {
		if (newQuantity <= 0) {
			setCart((prevCart) => prevCart.filter((cartItem) => cartItem.id !== item.id));
			return;
		}

		setCart((prevCart) =>
			prevCart.map((cartItem) =>
				cartItem.id === item.id ? { ...cartItem, quantity: newQuantity } : cartItem
			)
		);
	};

	const filteredFoodItems = foodItems.filter((item) => {
		const matchesSearch =
			searchQuery === "" ||
			item.name.toLowerCase().includes(searchQuery.toLowerCase());

		return matchesSearch;
	});

	const calculateTotal = () => {
		return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
	};

	const calculateFinancialTotals = (
		fulfillmentMethod: FulfillmentMethod = "table_service",
	) => {
		return calculateOrderFinancialTotals(calculateTotal(), financialSettings, {
			orderType: "Dine in",
			fulfillmentMethod,
		});
	};

	const handlePlaceOrder = async (paymentData: PaymentConfirmData) => {
		if (placingOrder) return;

		if (cart.length === 0) {
			showError("Your cart is empty!");
			return;
		}

		setPlacingOrder(true);

		try {
			const staff = getCurrentStaffInfo();

			if (!staff) {
				showError("You are not logged in, please log in again.");
				return;
			}

			const { id: staffId, name: staffName, staffCode, roleAbbr } = staff;
			const orderNumber = `ORD-${Date.now()}`;
			const fulfillmentMethod: FulfillmentMethod =
				paymentData.fulfillmentMethod || "counter_pickup";
			const orderFinancialTotals = calculateFinancialTotals(fulfillmentMethod);
			const orderType =
				fulfillmentMethod === "table_service" ? "Dine in" : "Take Away";

			const tableNumber =
				fulfillmentMethod === "table_service"
					? paymentData.tableNumber?.trim() || null
					: null;

			if (fulfillmentMethod === "table_service" && !tableNumber) {
				showError("Table number is required for dine-in orders.");
				return;
			}

			const customerName = paymentData.customerName || "Guest";
			const paymentMethod = normalizePaymentMethodForDatabase(
				paymentData.paymentMethod
			);
			const paymentTransactionMethod = normalizePaymentMethodForTransaction(
				paymentData.paymentMethod
			);
			const cashAmount =
				paymentMethod === "Cash" ? Number(paymentData.cashAmount) : undefined;

			if (
				paymentMethod === "Cash" &&
				(!Number.isFinite(cashAmount) ||
					(cashAmount ?? 0) < orderFinancialTotals.total)
			) {
				showError(
					`Cash received must be at least ${orderFinancialTotals.total.toLocaleString("id-ID")}.`
				);
				return;
			}

			const { data: orderData, error: orderError } = await supabase
				.from("orders")
				.insert([
					{
						order_number: orderNumber,
						customer_id: paymentData.customerId || null,
						customer_name: customerName,
						table_number: tableNumber,
						table_id: null,
						order_source: "pos",
						order_type: orderType,
						fulfillment_method: fulfillmentMethod,
						pickup_code: orderNumber,
						status: "new",
						subtotal: orderFinancialTotals.subtotal,
						tax: orderFinancialTotals.tax,
						discount: 0,
						total: orderFinancialTotals.total,
						payment_method: paymentMethod,
						payment_status: "paid",
						created_by: staffId,
						created_by_role: roleAbbr,
						created_by_staff_code: staffCode,
						created_by_staff_name: staffName,
						created_by_code: staffCode,
						notes: paymentData.notes || null,
					},
				])
				.select()
				.single();

			if (orderError) {
				console.warn("Error creating order:", {
					message: orderError.message,
					details: orderError.details,
					hint: orderError.hint,
					code: orderError.code,
				});
				throw orderError;
			}

			const productIds = [...new Set(cart.map((item) => item.productId))];
			const { data: productsData, error: productError } = await supabase
				.from("products")
				.select("id, name, category_id, categories(name, preparation_station)")
				.in("id", productIds);

			if (productError) {
				console.warn("Error fetching products for order:", {
					message: productError.message,
					details: productError.details,
					hint: productError.hint,
					code: productError.code,
				});
				throw productError;
			}

			const products = (productsData || []) as ProductWithCategory[];
			const orderItems = cart.map((item) => {
				const product = products.find(
					(productItem) => productItem.id === item.productId
				);
				const preparationStation = getProductPreparationStation({
					categories: getProductCategory(product),
				});

				return {
					order_id: orderData.id,
					product_id: item.productId,
					product_name: product?.name || item.name || "Unknown Item",
					quantity: item.quantity,
					base_price: item.price,
					variants:
						item.variants && item.variants.length > 0 ? item.variants : null,
					total_price: item.price * item.quantity,
					kitchen_status:
						getKitchenStatusForPreparationStation(preparationStation),
				};
			});

			const { error: itemsError } = await supabase
				.from("order_items")
				.insert(orderItems);

			if (itemsError) {
				console.warn("Error creating order items:", {
					message: itemsError.message,
					details: itemsError.details,
					hint: itemsError.hint,
					code: itemsError.code,
				});
				throw itemsError;
			}

			broadcastNewOrder(orderData.id);

			const { error: paymentError } = await supabase
				.from("payment_transactions")
				.insert([
					{
						order_id: orderData.id,
						payment_method: paymentTransactionMethod,
						amount_paid: cashAmount ?? orderFinancialTotals.total,
						amount_change: Math.max(
							(cashAmount ?? orderFinancialTotals.total) -
								orderFinancialTotals.total,
							0
						),
						status: "success",
						created_by: staffId,
					},
				]);

			if (paymentError) {
				console.warn("Error creating payment:", {
					message: paymentError.message,
					details: paymentError.details,
					hint: paymentError.hint,
					code: paymentError.code,
				});
				throw paymentError;
			}

			let inventoryChangesSummary: string[] = [];

			try {
				const inventoryUsageResult = await recordOrderInventoryUsageWithBatches({
					orderId: orderData.id,
					orderNumber,
					items: cart.map((item) => ({
						productId: item.productId,
						productName: item.name,
						quantity: item.quantity,
						variants: item.variants,
					})),
					performedBy: staffId,
					performedByName: `${staffName} - ${roleAbbr}`,
				});

				inventoryChangesSummary = inventoryUsageResult.usageSummary ?? [];

				if (!inventoryUsageResult.batchEnabled) {
					console.warn("Inventory batch tracking skipped because batch SQL is not enabled.");
				}
			} catch (inventoryError) {
				console.warn("Failed to record inventory usage for order:", inventoryError);
			}


			await logActivity({
				action: "CREATE",
				category: "SALES",
				description: `Created order ${orderNumber} with ${cart.length} items`,
				resourceType: "Order",
				resourceId: orderData.id,
				resourceName: orderNumber,
				newValue: {
					order_number: orderNumber,
					total: orderFinancialTotals.total,
					subtotal: orderFinancialTotals.subtotal,
					service_charge: orderFinancialTotals.serviceCharge,
					tax: orderFinancialTotals.tax,
					items_count: cart.length,
					payment_method: paymentMethod,
					fulfillment_method: fulfillmentMethod,
					table_number: tableNumber,
					pickup_code: orderNumber,
				},
				changesSummary: inventoryChangesSummary,
				severity: "info",
				tags: ["order", "create", "pos"],
			});

			const fulfillmentLabel =
				fulfillmentMethod === "table_service"
					? `Table ${tableNumber}`
					: `Pickup ${orderNumber}`;

			// Award Points
			if (paymentData.customerId) {
				fetch("/api/staff/pos/award-points", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						orderId: orderData.id,
						customerId: paymentData.customerId,
						orderTotal: orderFinancialTotals.total,
					}),
				}).catch((err) => console.warn("Failed to award points:", err));
			}

			showSuccess(`Order ${orderNumber} placed successfully. ${fulfillmentLabel}.`);
			setCart([]);
			setPaymentModalOpen(false);
			setOrderDetailsOpen(true);
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			console.warn("Failed to place order detail:", error);
			showError(`Failed to place order: ${errorMessage || "Unknown error"}`);
		} finally {
			setPlacingOrder(false);
		}
	};

	if (checkingShift && !isOwner) {
		return (
			<div className="flex h-[calc(100vh-55px)] items-center justify-center bg-gray-50">
				<div className="flex flex-col items-center space-y-4">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
					<p className="text-sm font-semibold text-gray-500">Loading cashier shift status...</p>
				</div>
			</div>
		);
	}

	if (shiftStatus !== "open" && !isOwner) {
		return (
			<div className="flex h-[calc(100vh-55px)] items-center justify-center bg-gray-50 px-4">
				<div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center space-y-6">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-amber-700">
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>

					<div className="space-y-2">
						<h2 className="text-xl font-bold text-gray-900">
							{shiftStatus === "not_opened" ? "Cash Drawer Not Opened" : "Your Shift Has Been Closed"}
						</h2>
						<p className="text-sm text-gray-500 leading-relaxed">
							{shiftStatus === "not_opened" 
								? "You must open your shift and confirm the opening cash float before accessing the POS sales page." 
								: "Your cashier shift session for today has been completed and closed. Please switch accounts or contact your manager if this is an error."}
						</p>
					</div>

					<div className="pt-2">
						<a
							href="/staff/attendance"
							className="inline-flex w-full h-11 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white transition hover:bg-gray-800 shadow-sm"
						>
							Open Shift & Attendance Page
						</a>
					</div>
				</div>
			</div>
		);
	}

	const paymentSummaryItems = cart.map((item) => ({
		...item,
		variants: normalizeVariantRecord(item.variants),
	}));
	const financialTotals = calculateFinancialTotals();

	return (
		<main className="h-[calc(100vh-55px)] bg-gray-100 flex flex-col lg:flex-row overflow-hidden relative">
			<section className="flex-1 flex flex-col overflow-hidden">
				<div className="bg-white px-4 md:px-6 py-4 md:py-6 border-b border-gray-200 min-h-22 md:min-h-26 flex items-center">
					<div className="w-full">
						<FoodiesMenuHeader
							searchQuery={searchQuery}
							onSearchChange={setSearchQuery}
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-20">
					<div className="mb-4">
						<MenuCategories
							categories={categories}
							activeCategory={activeCategory}
							setActiveCategory={setActiveCategory}
						/>
					</div>

					{loading ? (
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
						</div>
					) : (
						<div
							className={`grid gap-4 transition-all duration-300 ${
								orderDetailsOpen
									? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
									: "grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
							}`}
						>
							{filteredFoodItems.map((item) => {
								let quantity = 0;

								if (item.hasVariants) {
									const variantCartItems = cart.filter(
										(cartItem) => cartItem.productId === item.id && cartItem.hasVariants
									);
									quantity = variantCartItems.reduce(
										(sum, cartItem) => sum + cartItem.quantity,
										0
									);
								} else {
									const cartItem = cart.find(
										(cartItem) => cartItem.productId === item.id && !cartItem.hasVariants
									);
									quantity = cartItem ? cartItem.quantity : 0;
								}

								return (
									<FoodItemCard
										key={item.id}
										item={{ ...toDisplayMenuItem(item), quantity }}
										onItemClick={() => handleItemClick(item)}
									/>
								);
							})}
						</div>
					)}
				</div>
			</section>

			<button
				onClick={() => setOrderDetailsOpen(true)}
				className="lg:hidden fixed bottom-6 left-6 w-14 h-14 bg-gray-900 hover:bg-black text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-30 transition-all duration-300 hover:scale-110"
				type="button"
			>
				<div className="relative">
					<ShoppingCartIcon className="w-6 h-6" />
					{cart.length > 0 && (
						<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
							{cart.length}
						</span>
					)}
				</div>
			</button>

			{orderDetailsOpen && (
				<div
					onClick={() => setOrderDetailsOpen(false)}
					className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
				/>
			)}

			<section
				onTouchStart={(e) => {
					const touch = e.touches[0];
					const target = e.currentTarget as HTMLElement & { touchStartY?: number };
					target.touchStartY = touch.clientY;
				}}
				onTouchMove={(e) => {
					const touch = e.touches[0];
					const target = e.currentTarget as HTMLElement & { touchStartY?: number };
					const startY = target.touchStartY;

					if (startY && touch.clientY - startY > 10) {
						e.preventDefault();
					}
				}}
				onTouchEnd={(e) => {
					const target = e.currentTarget as HTMLElement & { touchStartY?: number };
					const startY = target.touchStartY;
					const endY = e.changedTouches[0].clientY;

					if (startY && endY - startY > 100) {
						setOrderDetailsOpen(false);
					}

					delete target.touchStartY;
				}}
				className={`
					fixed lg:relative
					bottom-0 lg:bottom-auto
					left-0 lg:left-auto
					right-0 lg:right-auto
					w-full
					h-[85vh] lg:h-full
					rounded-t-3xl lg:rounded-none
					z-50 lg:z-auto
					lg:shrink-0
					bg-white flex flex-col overflow-visible
					border-t lg:border-t-0 lg:border-l border-gray-200
					transition-all duration-300
					${
						orderDetailsOpen
							? "translate-y-0 lg:translate-y-0 lg:w-100 xl:w-112.5"
							: "translate-y-full lg:translate-y-0 lg:w-0"
					}
				`}
			>
				<div className="lg:hidden flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
					<div className="w-12 h-1.5 bg-gray-300 rounded-full" />
				</div>

				<button
					onClick={() => setOrderDetailsOpen(!orderDetailsOpen)}
					className={`hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-gray-50 transition-all duration-300 z-20 border border-gray-300 shadow-md ${
						!orderDetailsOpen ? "animate-pulse-horizontal hover:animate-none" : ""
					}`}
					title={orderDetailsOpen ? "Hide Order Details" : "Show Order Details"}
					type="button"
				>
					{orderDetailsOpen ? (
						<ChevronDoubleRightIcon className="w-4 h-4 text-gray-700" />
					) : (
						<ChevronDoubleLeftIcon className="w-4 h-4 text-gray-700" />
					)}
				</button>

				<div
					className={`flex flex-col h-full transition-opacity duration-300 ${
						orderDetailsOpen ? "opacity-100" : "lg:opacity-0 pointer-events-none lg:pointer-events-auto"
					}`}
				>
					{variantSidebarOpen && selectedItem ? (
						<div className="flex flex-col h-full">
							<VariantSidebar
								isOpen={true}
								onClose={() => setVariantSidebarOpen(false)}
								item={toDisplayMenuItem(selectedItem)}
								onAddToOrder={handleAddToOrder}
								isInline={true}
							/>
						</div>
					) : (
						<>
							<div className="px-4 md:px-6 py-3 md:py-4 lg:py-6 border-b border-gray-200 min-h-15 md:min-h-22 lg:min-h-26 flex items-center justify-between">
								<h2 className="text-xl md:text-2xl font-bold text-gray-800">
									Order Details
								</h2>
								<button
									onClick={() => setOrderDetailsOpen(false)}
									className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition"
									type="button"
								>
									<XMarkIcon className="w-6 h-6 text-gray-600" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto">
								<OrderSummary
									tableNumber="POS Order"
									orderNumber="New Order"
									peopleCount={0}
									items={cart.map((item) => ({
										id: item.id,
										name: item.name,
										quantity: item.quantity,
										price: item.price,
										variants: normalizeVariantRecord(item.variants as SelectedVariant[]),
										productId: item.productId,
									}))}
									onEditTable={() => {}}
									onDeleteTable={() => {}}
									onQuantityChange={handleOrderQuantityChange}
								/>
							</div>

							<div className="bg-white">
								<PaymentSummary
									items={paymentSummaryItems}
									serviceCharge={financialTotals.serviceCharge}
									tax={financialTotals.tax}
									taxLabel={financialSettings.taxLabel}
									total={financialTotals.total}
								/>
							</div>
						</>
					)}

					{!variantSidebarOpen ? (
						<div className="px-4 md:px-6 pb-6 md:pb-6">
							<button
								onClick={() => setPaymentModalOpen(true)}
								disabled={cart.length === 0}
								className="w-full py-4 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
								type="button"
							>
								<span className="flex items-center justify-center gap-2">
									<ShoppingCartIcon className="w-5 h-5" />
									Place Order
								</span>
							</button>
						</div>
					) : null}
				</div>
			</section>

			<PaymentModal
				isOpen={paymentModalOpen}
				onClose={() => {
					if (!placingOrder) setPaymentModalOpen(false);
				}}
				onConfirm={handlePlaceOrder}
				totalAmount={financialTotals.total}
				getTotalAmount={(fulfillmentMethod) =>
					calculateFinancialTotals(fulfillmentMethod).total
				}
				isSubmitting={placingOrder}
			/>
		</main>
	);
}
