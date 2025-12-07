"use client";
import { useState, useEffect } from "react";
import OrderLineTabs from "@/app/components/staff/pos/OrderLineTabs";
import OrderLineCard from "@/app/components/staff/pos/OrderLineCard";
import FoodiesMenuHeader from "@/app/components/staff/pos/FoodiesMenuHeader";
import MenuCategories from "@/app/components/staff/pos/MenuCategories";
import FoodItemCard from "@/app/components/staff/pos/FoodItemCard";
import VariantSidebar from "@/app/components/staff/pos/VariantSidebar";
import OrderSummary from "@/app/components/staff/pos/OrderSummary";
import PaymentModal from "@/app/components/staff/pos/PaymentModal";
import DeleteItemModal from "@/app/components/staff/pos/DeleteItemModal";
import PaymentSummary from "@/app/components/staff/pos/PaymentSummary";
import { ChevronLeftIcon, ChevronRightIcon, PrinterIcon, ShoppingCartIcon, MagnifyingGlassIcon, ChevronDoubleRightIcon, ChevronDoubleLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { LayoutGrid, Coffee, UtensilsCrossed, Cookie, Cake, Milk, Pizza, Sandwich, Soup, Salad, IceCream } from 'lucide-react';

// Icon mapping for categories
const iconNameToComponent: Record<string, any> = {
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

export default function POSPage() {
	const [activeTab, setActiveTab] = useState("all");
	const [activeCategory, setActiveCategory] = useState("all");
	const [categories, setCategories] = useState<any[]>([]);
	const [foodItems, setFoodItems] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [variantSidebarOpen, setVariantSidebarOpen] = useState(false);
	const [paymentModalOpen, setPaymentModalOpen] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<any>(null);
	const [orderDetailsOpen, setOrderDetailsOpen] = useState(true);
	const [itemToDelete, setItemToDelete] = useState<any>(null);
	const [cart, setCart] = useState<any[]>([]);

	// Page protection - only for Owner, Cashier, Barista
	useEffect(() => {
		const userRole = localStorage.getItem('user_role');
		const staffType = localStorage.getItem('staff_type');
		
		// Allow: Owner OR Cashier/Barista
		if (userRole !== 'owner' && staffType !== 'cashier' && staffType !== 'barista') {
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
				setFoodItems(data.map((p: any) => ({
					id: p.id,
					name: p.name,
					category: p.category?.name || 'Unknown',
					categoryId: p.category_id,
					price: p.price,
					image: p.image || '/picture/default-food.jpg',
					hasVariants: p.has_variants,
				})))
			}
			
			setLoading(false)
		}
		
		fetchProducts()
	}, [activeCategory])

	const handleQuantityChange = (id: string, delta: number) => {
		const item = foodItems.find(i => i.id === id)
		
		if (item?.hasVariants) {
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

	const handleItemClick = (item: any) => {
		if (item.hasVariants) {
			setSelectedItem(item);
			setVariantSidebarOpen(true);
			setOrderDetailsOpen(true); // Auto-open Order Details to show VariantSidebar
		} else {
			// Add directly to cart for non-variant items
			handleQuantityChange(item.id, 1)
		}
	};

	const handleAddToOrder = (item: any, selectedVariants: any, totalPrice: number, quantity: number) => {
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
		console.log('Added to cart:', cartItem);
		
		// Auto-show Order Details after adding item
		setOrderDetailsOpen(true);
	};

	// Handle delete item from cart
	const handleDeleteItem = (item: any) => {
		// Check if quantity > 1, show modal to select how many to delete
		if (item.quantity > 1) {
			setItemToDelete(item)
			setDeleteModalOpen(true)
		} else {
			// For single quantity, delete directly
			const newCart = cart.filter(c => c.id !== item.id)
			setCart(newCart)
		}
	}

	const confirmDeleteItem = (quantityToDelete: number) => {
		if (itemToDelete) {
			const itemIndex = cart.findIndex(c => c.id === itemToDelete.id)
			if (itemIndex >= 0) {
				const newCart = [...cart]
				
				if (quantityToDelete >= itemToDelete.quantity) {
					// Remove completely
					newCart.splice(itemIndex, 1)
				} else {
					// Reduce quantity
					newCart[itemIndex].quantity -= quantityToDelete
				}
				
				setCart(newCart)
			}
		}
		setItemToDelete(null)
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
	const handlePlaceOrder = async (paymentData: any) => {
		if (cart.length === 0) {
			alert('Cart is empty!')
			return
		}

		try {
			const staffId = localStorage.getItem('user_id')
		const userRole = localStorage.getItem('user_role') || 'staff'
		const staffCode = localStorage.getItem('staff_code') || 'UNKNOWN'
		const staffName = localStorage.getItem('user_name') || 'Unknown Staff'
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
			created_by_role: userRole.toUpperCase().substring(0, 3), // 'STA', 'MAN', 'OWN'
		created_by_staff_code: staffCode, // STF001, MAN001, etc.
		created_by_staff_name: staffName, // Staff name
		created_by_code: staffCode
	}])
	.select()
	.single()
	
	if (orderError) {
			console.error('Error creating order:', orderError)
			throw orderError
		}
		
		// 2. Fetch products with categories to determine kitchen_status
		const productIds = cart.map(item => item.productId || item.id)
		const { data: productsData, error: productError } = await supabase
			.from('products')
			.select('id, name, category_id, categories!inner(name, type)')
			.in('id', productIds)

		if (productError) {
			console.error('Error fetching products:', productError)
			throw productError
		}

		console.log('Products with categories:', productsData) // Debug log

		// 3. Create order items with kitchen_status
		const orderItems = cart.map(item => {
			const productId = item.productId || item.id
			const product = productsData?.find(p => p.id === productId)
			
			// Get category type - categories is a single object when using !inner
			const category = product?.categories as any
			const categoryType = category?.type || 'food'
			
			console.log(`Product: ${product?.name}, Category Type: ${categoryType}`) // Debug log
			
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
		console.error('Error inserting order items:', itemsError)
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
			await supabase
				.from('activity_logs')
				.insert([{
					staff_id: staffId,
					activity_type: 'order_created',
					description: `Created order ${orderNumber} - ${cart.length} items - Rp ${total.toLocaleString('id-ID')}`,
					metadata: {
						order_id: orderData.id,
						order_number: orderNumber,
						total: total,
						payment_method: 'Cash'
					}
				}])

			// Success! Clear cart and close modal
			alert(`Order ${orderNumber} placed successfully!`)
			setCart([])
			setPaymentModalOpen(false)

		} catch (error: any) {
			console.error('Error placing order:', error)
			console.error('Error details:', {
				message: error?.message,
				details: error?.details,
				hint: error?.hint,
				code: error?.code
			})
			alert(`Failed to place order: ${error?.message || 'Unknown error'}`)
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
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
										onQuantityChange={handleQuantityChange}
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
				(e.currentTarget as any).touchStartY = touch.clientY;
			}}
			onTouchMove={(e) => {
				const touch = e.touches[0];
				const startY = (e.currentTarget as any).touchStartY;
				if (startY && touch.clientY - startY > 10) {
					// Prevent scroll when dragging down
					e.preventDefault();
				}
			}}
			onTouchEnd={(e) => {
				const startY = (e.currentTarget as any).touchStartY;
				const endY = e.changedTouches[0].clientY;
				if (endY - startY > 100) {
					// Swipe down > 100px, close
					setOrderDetailsOpen(false);
				}
				delete (e.currentTarget as any).touchStartY;
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
							onEditTable={() => console.log("Edit table")}
							onDeleteTable={() => console.log("Delete table")}
							onDeleteItem={handleDeleteItem}
						/>
						</div>
						
						{/* Payment Summary - Sticky Bottom */}
						<div className="border-t border-gray-200 bg-white">
							<PaymentSummary items={cart} />
						</div>
					</>
				)}
				
				{/* Action Buttons with safe area */}
				<div className="flex gap-3 px-4 md:px-6 pb-6 md:pb-6 pt-4">
					<button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition font-medium">
						<PrinterIcon className="w-5 h-5" />
						Print
					</button>
					<button 
						onClick={() => setPaymentModalOpen(true)}
						disabled={cart.length === 0}
						className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
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
			{/* Delete Item Modal */}
			{itemToDelete && (
				<DeleteItemModal
					isOpen={deleteModalOpen}
					onClose={() => {
						setDeleteModalOpen(false)
						setItemToDelete(null)
					}}
					onConfirm={confirmDeleteItem}
					itemName={itemToDelete.name}
					currentQuantity={itemToDelete.quantity}
					price={itemToDelete.price}
				/>
			)}
		</main>
	);
}
