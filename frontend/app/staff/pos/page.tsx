"use client";
import { useState, useEffect } from "react";
import { useSessionValidation } from "@/lib/useSessionValidation";
import { getCurrentStaffInfo, getCurrentUser } from '@/lib/authUtils';
import { logActivity } from '@/lib/activityLogger';
import OrderLineTabs from "@/app/components/staff/pos/OrderLineTabs";
import OrderLineCard from "@/app/components/staff/pos/OrderLineCard";
import FoodiesMenuHeader from "@/app/components/staff/pos/FoodiesMenuHeader";
import MenuCategories from "@/app/components/staff/pos/MenuCategories";
import FoodItemCard from "@/app/components/staff/pos/FoodItemCard";
import VariantSidebar from "@/app/components/staff/pos/VariantSidebar";
import OrderSummary from "@/app/components/staff/pos/OrderSummary";
import PaymentModal from "@/app/components/staff/pos/PaymentModal";
import PaymentSummary from "@/app/components/staff/pos/PaymentSummary";
import { ChevronLeftIcon, ChevronRightIcon, PrinterIcon, ShoppingCartIcon, MagnifyingGlassIcon, ChevronDoubleRightIcon, ChevronDoubleLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from '@/lib/numberConstants';
import { LayoutGrid, Coffee, UtensilsCrossed, Cookie, Cake, Milk, Pizza, Sandwich, Soup, Salad, IceCream } from 'lucide-react';
import { showSuccess, showError, showWarning } from '@/lib/errorHandling';
import type { MenuItem, VariantGroup, VariantOption, SelectedVariant } from '@/lib/types';

// Icon mapping for categories
const iconNameToComponent: Record<string, React.ComponentType<any>> = {
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
  '☕': Coffee,
  '🍽️': UtensilsCrossed,
  '🍟': Cookie,
  '🍰': Cake,
  '🍵': Milk,
};

interface Category {
  id: string;
  name: string;
  icon: string;
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

export default function POSPage() {
	useSessionValidation();
	
	const [activeTab, setActiveTab] = useState("all");
	const [activeCategory, setActiveCategory] = useState("all");
	const [categories, setCategories] = useState<Category[]>([]);
	const [foodItems, setFoodItems] = useState<MenuItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [variantSidebarOpen, setVariantSidebarOpen] = useState(false);
	const [paymentModalOpen, setPaymentModalOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
	const [orderDetailsOpen, setOrderDetailsOpen] = useState(true);
	const [cart, setCart] = useState<CartItem[]>([]);

	// Page protection - only for Owner, Cashier, Barista
	useEffect(() => {
		const currentUser = getCurrentUser();
		const staffType = localStorage.getItem('staff_type');
		
		// Allow: Owner OR Cashier/Barista
		if (currentUser?.role !== 'owner' && staffType !== 'cashier' && staffType !== 'barista') {
			window.location.href = '/staff/dashboard';
		}
	}, []);

	// Fetch categories from database
	useEffect(() => {
		async function fetchCategories() {
			const { data, error } = await supabase
				.from('categories')
				.select('*')
				.eq('is_active', true)
				.order('sort_order', { ascending: true })
			
			if (data) {
				// Get product counts for each category
				const categoriesWithCount = await Promise.all(
					data.map(async (cat) => {
						const { count } = await supabase
							.from('products')
							.select('*', { count: 'exact', head: true })
							.eq('category_id', cat.id)
							.eq('available', true)
						
						const IconComponent = iconNameToComponent[cat.icon] || Cookie
						
						return {
							id: cat.id,
							label: cat.name,
							icon: IconComponent,
							count: count || 0
						}
					})
				)
				
				// Get total products count
				const { count: totalCount } = await supabase
					.from('products')
					.select('*', { count: 'exact', head: true })
					.eq('available', true)
				
				setCategories([
					{ id: 'all', label: 'All Menu', icon: LayoutGrid, count: totalCount || 0 },
					...categoriesWithCount
				])
			}
		}
		
		fetchCategories()
	}, [])

	// Fetch products from database
	useEffect(() => {
		async function fetchProducts() {
			setLoading(true)
			
			let query = supabase
				.from('products')
				.select('*, category:categories(name)')
				.eq('available', true)
				.order('name', { ascending: true })
			
			if (activeCategory !== 'all') {
				query = query.eq('category_id', activeCategory)
			}
			
			const { data, error } = await query
			
			if (data) {
			setFoodItems(data.map((p) => ({
				id: p.id,
				name: p.name,
				category: p.category?.name || 'Unknown',
				categoryId: p.category_id,
				price: p.price,
				image: p.image || '/picture/default-food.jpg',
				hasVariants: p.has_variants,
				is_available: p.available,
			} as MenuItem)))
		}
		
		setLoading(false)
	}
	
	fetchProducts()
}, [activeCategory])

const handleQuantityChange = (id: string, delta: number) => {
	const item = foodItems.find(i => i.id === id)
	
	if (item?.hasVariants) {
		if (delta > 0) {
			handleItemClick(item)
			return
		}
		
		// For variant items, decrement the last added item
		if (delta < 0) {
			const variantCartItems = cart.filter(c => c.productId === id)
			if (variantCartItems.length > 0) {
				const lastItem = variantCartItems[variantCartItems.length - 1]
				const newCart = [...cart]
				const lastItemIndex = newCart.findIndex(c => c.id === lastItem.id)
				
				if (lastItemIndex >= 0) {
					newCart[lastItemIndex].quantity = Math.max(0, newCart[lastItemIndex].quantity - 1)
					
					// Remove if quantity is 0
					if (newCart[lastItemIndex].quantity === 0) {
						newCart.splice(lastItemIndex, 1)
					}
					setCart(newCart)
				}
			}
		}
		// For increment, open variant modal
		return
	}
	
	// For non-variant items
	const existingItemIndex = cart.findIndex(item => 
		item.id === id && !item.productId
	)
	
	if (existingItemIndex >= 0) {
		const newCart = [...cart]
		newCart[existingItemIndex].quantity = Math.max(0, newCart[existingItemIndex].quantity + delta)
		
		// Remove if quantity is 0
		if (newCart[existingItemIndex].quantity === 0) {
			newCart.splice(existingItemIndex, 1)
		}
		setCart(newCart)
	} else if (delta > 0) {
		// Add new item to cart
		if (item && !item.hasVariants) {
			setCart([...cart, { ...item, quantity: delta }])
		}
	}
};

	const handleItemClick = (item: MenuItem) => {
		if (item.hasVariants) {
			setSelectedItem(item);
			setVariantSidebarOpen(true);
			setOrderDetailsOpen(true); // Auto-open Order Details to show VariantSidebar
		} else {
			// Add directly to cart for non-variant items
			handleQuantityChange(item.id, 1)
		}
	};

	const handleAddToOrder = (item: MenuItem, selectedVariants: SelectedVariant[], totalPrice: number, quantity: number) => {
		// Add item with variants to cart
		const cartItem = {
			id: `${item.id}-${Date.now()}`, // Unique ID for cart item
			productId: item.id,
			name: item.name,
			price: totalPrice,
			quantity: quantity,
			hasVariants: true,
			variants: selectedVariants,
			image: item.image
		}
		
		setCart([...cart, cartItem])
		
		// Auto-show Order Details after adding item
		setOrderDetailsOpen(true);
	};

	// Handle quantity change from OrderSummary
	const handleOrderQuantityChange = (item: CartItem, newQuantity: number) => {
		if (newQuantity <= 0) {
			// Remove item if quantity is 0 or less
			const newCart = cart.filter(c => c.id !== item.id)
			setCart(newCart)
		} else {
			// Update quantity
			const itemIndex = cart.findIndex(c => c.id === item.id)
			if (itemIndex >= 0) {
				const newCart = [...cart]
				newCart[itemIndex].quantity = newQuantity
				setCart(newCart)
			}
		}
	}

	// Filter items by category and search
	const filteredFoodItems = foodItems.filter(item => {
		const matchesSearch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	// Calculate total
	const calculateTotal = () => {
		return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
	}

	// Handle place order
	const handlePlaceOrder = async (paymentData: { payment_method: string; cash_amount?: number }) => {
		if (cart.length === 0) {
			showError('Keranjang masih kosong!')
			return
		}

		try {
			const staff = getCurrentStaffInfo();
			if (!staff) {
				showError('Anda belum login, silakan login kembali');
				return;
			}
			
			const { id: staffId, name: staffName, staffCode, roleAbbr } = staff;
			const total = calculateTotal()
			
			// Generate order number
		const orderNumber = `ORD-${Date.now()}`

	// 1. Create order with role tracking and staff code
	const { data: orderData, error: orderError } = await supabase
		.from('orders')
		.insert([{
		order_number: orderNumber,
		customer_name: paymentData.customerName || 'Guest',
		table_number: paymentData.tableNumber || null,
		order_type: paymentData.tableNumber ? 'Dine in' : 'Take Away',
		status: 'new',
		subtotal: total,
		tax: 0,
			discount: 0,
			total: total,
			payment_method: 'Cash',
			payment_status: 'paid',
			created_by: staffId,
			created_by_role: roleAbbr,
			created_by_staff_code: staffCode,
		created_by_staff_name: staffName, // Staff name
		created_by_code: staffCode
	}])
		.select()
		.single()
	
	if (orderError) {
			throw orderError
		}		// 2. Fetch products with categories to determine kitchen_status
		const productIds = cart.map(item => item.productId || item.id)
		const { data: productsData, error: productError } = await supabase
			.from('products')
		.select('id, name, category_id, categories!inner(name, type)')
		.in('id', productIds)

	if (productError) {
		throw productError
	}		// 3. Create order items with kitchen_status
		const orderItems = cart.map(item => {
			const productId = item.productId || item.id
			const product = productsData?.find(p => p.id === productId)
			
			// Get category type - categories is a single object when using !inner
			const category = product?.categories as { type?: string }
			const categoryType = category?.type || 'food'
			
			// Determine kitchen_status based on category type
		const isBeverage = categoryType === 'beverage'
		
		return {
			order_id: orderData.id,
			product_id: productId,
			product_name: product?.name || item.name || 'Unknown Item',
			quantity: item.quantity,
			base_price: item.price,
			variants: item.variants || {},
			total_price: item.price * item.quantity,
			kitchen_status: isBeverage ? 'not_required' : 'pending',
			notes: null
		}
	})

	const { error: itemsError } = await supabase
		.from('order_items')
		.insert(orderItems)

	if (itemsError) {
		throw itemsError
	}			// 4. Create payment transaction
			const { error: paymentError } = await supabase
				.from('payment_transactions')
				.insert([{
					order_id: orderData.id,
					payment_method: 'Cash',
					amount_paid: total,
					amount_change: 0,
					status: 'success',
					created_by: staffId
				}])

			if (paymentError) {
				console.error('Error creating payment:', paymentError)
				throw paymentError
			}

			// 5. Log activity
			await logActivity({
				action: 'CREATE',
				category: 'SALES',
				description: `Created order ${orderNumber} with ${cart.length} items`,
				resourceType: 'Order',
				resourceId: orderData.id,
				resourceName: orderNumber,
				newValue: {
					order_number: orderNumber,
					total: total,
					items_count: cart.length,
					payment_method: 'Cash'
				},
				severity: 'info',
				tags: ['order', 'create', 'pos']
			})

			// Success! Clear cart and close modal
			alert(`Order ${orderNumber} placed successfully!`)
			setCart([])
			setPaymentModalOpen(false)

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		alert(`Failed to place order: ${errorMessage}`)
	}
}

return (
	<main className="h-[calc(100vh-55px)] bg-gray-100 flex flex-col lg:flex-row overflow-hidden relative">
		{/* Section 1: Menu - Left scrollable */}
		<section className="flex-1 flex flex-col overflow-hidden">
				{/* Header dengan background putih */}
				<div className="bg-white px-4 md:px-6 py-4 md:py-6 border-b border-gray-200 min-h-[88px] md:min-h-[104px] flex items-center">
					<div className="w-full">
						<FoodiesMenuHeader
							searchQuery={searchQuery}
							onSearchChange={setSearchQuery}
						/>
					</div>
				</div>
				
				{/* Scrollable Items Grid dengan background abu-abu */}
				<div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-20">
					{/* Categories */}
					<div className="mb-4">
						<MenuCategories
							categories={categories}
							activeCategory={activeCategory}
							setActiveCategory={setActiveCategory}
						/>
					</div>
					
					{loading ? (
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
						</div>
					) : (
						<div className={`grid gap-4 transition-all duration-300 ${
							orderDetailsOpen 
								? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
								: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'
						}`}>
							{filteredFoodItems.map((item) => {
								// Calculate total quantity in cart for this product
								let quantity = 0
								
								if (item.hasVariants) {
									// For variant items: sum all cart items with this productId
									const variantCartItems = cart.filter(c => c.productId === item.id)
									quantity = variantCartItems.reduce((sum, c) => sum + c.quantity, 0)
								} else {
									// For non-variant items: find direct match
									const cartItem = cart.find(c => c.id === item.id && !c.productId)
									quantity = cartItem ? cartItem.quantity : 0
								}
								
								return (
									<FoodItemCard 
										key={item.id} 
										item={{...item, quantity}} 
										onItemClick={handleItemClick}
									/>
								)
							})}
						</div>
					)}
				</div>
		</section>
		
		{/* Floating Cart Button - Mobile Only (Left Side) */}
		<button
			onClick={() => setOrderDetailsOpen(true)}
			className="lg:hidden fixed bottom-6 left-6 w-14 h-14 bg-gray-900 hover:bg-black text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-30 transition-all duration-300 hover:scale-110"
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

		{/* Backdrop for mobile - Only show when Order Details open on mobile */}
		{orderDetailsOpen && (
			<div 
				onClick={() => setOrderDetailsOpen(false)}
				className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
			/>
		)}

		{/* Section 2: Order Summary - Responsive */}
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
					// Prevent scroll when dragging down
					e.preventDefault();
				}
			}}
			onTouchEnd={(e) => {
				const target = e.currentTarget as HTMLElement & { touchStartY?: number };
				const startY = target.touchStartY;
				const endY = e.changedTouches[0].clientY;
				if (startY && endY - startY > 100) {
					// Swipe down > 100px, close
					setOrderDetailsOpen(false);
				}
				delete target.touchStartY;
			}}
			className={`
			/* Mobile: Bottom sheet */
			fixed lg:relative
			bottom-0 lg:bottom-auto
			left-0 lg:left-auto
			right-0 lg:right-auto
			w-full
			h-[85vh] lg:h-full
			rounded-t-3xl lg:rounded-none
			z-50 lg:z-auto
			/* Desktop: Sidebar */
			lg:flex-shrink-0
			bg-white flex flex-col overflow-visible
			border-t lg:border-t-0 lg:border-l border-gray-200
			transition-all duration-300
			/* Toggle behavior */
			${orderDetailsOpen 
				? 'translate-y-0 lg:translate-y-0 lg:w-[400px] xl:w-[450px]' 
				: 'translate-y-full lg:translate-y-0 lg:w-0'
			}
		`}>
			{/* Mobile: Drag handle */}
			<div className="lg:hidden flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
				<div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
			</div>
			
			{/* Desktop: Toggle Button */}
			<button
				onClick={() => setOrderDetailsOpen(!orderDetailsOpen)}
				className={`hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-gray-50 transition-all duration-300 z-20 border border-gray-300 shadow-md ${
					!orderDetailsOpen ? 'animate-pulse-horizontal hover:animate-none' : ''
				}`}
				title={orderDetailsOpen ? "Hide Order Details" : "Show Order Details"}
			>
				{orderDetailsOpen ? (
					<ChevronDoubleRightIcon className="w-4 h-4 text-gray-700" />
				) : (
					<ChevronDoubleLeftIcon className="w-4 h-4 text-gray-700" />
				)}
			</button>

			<div className={`flex flex-col h-full transition-opacity duration-300 ${orderDetailsOpen ? 'opacity-100' : 'lg:opacity-0 pointer-events-none lg:pointer-events-auto'}`}>
				{variantSidebarOpen && selectedItem ? (
					/* Variant Sidebar Content */
					<div className="flex flex-col h-full">
						<VariantSidebar
							isOpen={true}
							onClose={() => setVariantSidebarOpen(false)}
							item={selectedItem}
							onAddToOrder={handleAddToOrder}
							isInline={true}
						/>
					</div>
				) : (
					/* Order Details Content */
					<>
						{/* Title Header with close button for mobile */}
						<div className="px-4 md:px-6 py-3 md:py-4 lg:py-6 border-b border-gray-200 min-h-[60px] md:min-h-[88px] lg:min-h-[104px] flex items-center justify-between">
							<h2 className="text-xl md:text-2xl font-bold text-gray-800">Order Details</h2>
							<button
								onClick={() => setOrderDetailsOpen(false)}
								className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition"
							>
								<XMarkIcon className="w-6 h-6 text-gray-600" />
							</button>
						</div>
						
						{/* Order Summary Content - Scrollable */}
						<div className="flex-1 overflow-y-auto">
							<OrderSummary
							tableNumber="Table No #04"
							orderNumber="Order #FO030"
							peopleCount={2}
							items={cart.map(item => ({
								id: item.id,
								name: item.name,
								quantity: item.quantity,
								price: item.price,
								variants: item.variants,
								productId: item.productId
							}))}
						onEditTable={() => {}}
						onDeleteTable={() => {}}
						onQuantityChange={handleOrderQuantityChange}
					/>
						</div>
						
						{/* Payment Summary */}
						<div className="bg-white">
							<PaymentSummary items={cart} />
						</div>
					</>
				)}
				
				{/* Place Order Button - Outside border */}
				<div className="px-4 md:px-6 pb-6 md:pb-6">
					<button 
						onClick={() => setPaymentModalOpen(true)}
						disabled={cart.length === 0}
						className="w-full py-4 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span className="flex items-center justify-center gap-2">
							<ShoppingCartIcon className="w-5 h-5" />
							Place Order
						</span>
					</button>
				</div>
			</div>
		</section>
			{/* Payment Modal */}
			<PaymentModal
				isOpen={paymentModalOpen}
				onClose={() => setPaymentModalOpen(false)}
				onConfirm={handlePlaceOrder}
				totalAmount={calculateTotal()}
			/>
		</main>
	);
}
