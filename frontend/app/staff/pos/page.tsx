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
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
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
		<main className="h-[calc(100vh-55px)] bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
			{/* Section 1: Menu - Left scrollable */}
			<section className="flex-1 px-4 md:px-6 py-4 md:py-6 scrollbar-hide flex flex-col overflow-hidden">
				{/* Sticky Header & Filter */}
				<div className="sticky top-0 z-10 bg-gray-50 pb-2">
					<FoodiesMenuHeader
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
					/>
					<MenuCategories
						categories={categories}
						activeCategory={activeCategory}
						setActiveCategory={setActiveCategory}
					/>
				</div>
				{/* Scrollable Items Grid */}
				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
						</div>
					) : (
						<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
			{/* Section 2: Order Summary - Responsive Right Sidebar */}
			<section className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col gap-2 py-4 md:py-6 md:pr-6 overflow-hidden border-t lg:border-t-0">
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
				{/* Action Buttons */}
				<div className="flex gap-3 mt-auto">
					<button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition font-medium shadow-sm">
						🖨️ Print
					</button>
					<button 
						onClick={() => setPaymentModalOpen(true)}
						disabled={cart.length === 0}
						className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
					>
						📦 Place Order
					</button>
				</div>
			</section>
			{/* Variant Sidebar */}
			{selectedItem && (
				<VariantSidebar
					isOpen={variantSidebarOpen}
					onClose={() => setVariantSidebarOpen(false)}
					item={selectedItem}
					onAddToOrder={handleAddToOrder}
				/>
			)}
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
