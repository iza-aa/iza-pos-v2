"use client";
import { useState } from "react";
import OrderLineTabs from "@/app/components/staff/pos/OrderLineTabs";
import OrderLineCard from "@/app/components/staff/pos/OrderLineCard";
import FoodiesMenuHeader from "@/app/components/staff/pos/FoodiesMenuHeader";
import MenuCategories from "@/app/components/staff/pos/MenuCategories";
import FoodItemCard from "@/app/components/staff/pos/FoodItemCard";
import VariantSidebar from "@/app/components/staff/pos/VariantSidebar";
import OrderSummary from "@/app/components/staff/pos/OrderSummary";
import PaymentMethodSelector from "@/app/components/staff/pos/PaymentMethodSelector";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { products, categories, orders } from "@/app/lib/mockData";

// Transform orders for display
const mockOrders = orders.slice(0, 3).map(order => ({
	id: order.id,
	orderNumber: order.orderNumber,
	table: order.table,
	itemCount: order.itemCount,
	timeAgo: order.timeAgo,
	status: order.status,
}));

// Transform categories for menu
const mockCategories = [
	{ id: 'all', label: 'All Menu', icon: '🍽️', count: products.length },
	...categories.map(cat => ({
		id: cat.id,
		label: cat.name,
		icon: cat.icon,
		count: cat.count,
	}))
];

// Transform products for food items with quantity state
const mockFoodItems = products.map(p => ({
	id: p.id,
	name: p.name,
	category: p.category,
	price: p.price,
	image: p.image,
	quantity: 0,
	hasVariants: p.hasVariants,
}));

export default function POSPage() {
	const [activeTab, setActiveTab] = useState("all");
	const [activeCategory, setActiveCategory] = useState("all");
	const [foodItems, setFoodItems] = useState(mockFoodItems);
	const [selectedOrder, setSelectedOrder] = useState<any>(null);
	const [paymentMethod, setPaymentMethod] = useState("card");
	const [showOrderLine, setShowOrderLine] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [variantSidebarOpen, setVariantSidebarOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<any>(null);

	const handleQuantityChange = (id: string, delta: number) => {
		setFoodItems((items) =>
			items.map((item) =>
				item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
			)
		);
	};

	const handleItemClick = (item: any) => {
		setSelectedItem(item);
		setVariantSidebarOpen(true);
	};

	const handleAddToOrder = (item: any, selectedVariants: any, totalPrice: number) => {
		// Add item dengan variants ke order
		setFoodItems((items) =>
			items.map((i) =>
				i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
			)
		);
		console.log('Added to order:', { item, selectedVariants, totalPrice });
	};

	// Filter items by category and search
	const filteredFoodItems = foodItems.filter(item => {
		const matchesCategory = activeCategory === 'all' || item.category === categories.find(c => c.id === activeCategory)?.name;
		const matchesSearch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	const orderedItems = foodItems
		.filter((item) => item.quantity > 0)
		.map((item) => ({
			id: item.id,
			name: item.name,
			quantity: item.quantity,
			price: item.price,
		}));

	const counts = {
		all: mockOrders.length,
		dineIn: mockOrders.filter((o) => o.status === "in-kitchen").length,
		waitList: mockOrders.filter((o) => o.status === "wait-list").length,
		takeAway: 0,
		served: mockOrders.filter((o) => o.status === "ready").length,
	};

	return (
		<main className="h-[calc(100vh-64px)] bg-gray-50 flex overflow-hidden">
			{/* Section 1: Order Line & Menu - Left scrollable */}
			<section className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
				{/* Order Line */}
				<div>
					<OrderLineTabs 
						activeTab={activeTab} 
						setActiveTab={setActiveTab} 
						showOrderLine={showOrderLine}
						counts={counts} 
					/>
					
					{showOrderLine && (
						<div className="flex items-center gap-4 mb-6">
							<button className="p-2 rounded-full hover:bg-gray-200 transition">
								<ChevronLeftIcon className="w-5 h-5 text-gray-600" />
							</button>
							<div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
								{mockOrders.map((order) => (
									<OrderLineCard key={order.id} order={order} onClick={setSelectedOrder} />
								))}
							</div>
							<button className="p-2 rounded-full hover:bg-gray-200 transition">
								<ChevronRightIcon className="w-5 h-5 text-gray-600" />
							</button>
						</div>
					)}
				</div>

				{/* Foodies Menu */}
				<div>
					{/* Foodies Menu Card: Title + Search + Hide Button */}
					<FoodiesMenuHeader
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						showOrderLine={showOrderLine}
						onToggleOrderLine={() => setShowOrderLine(!showOrderLine)}
					/>

					{/* Menu Categories - Outside Card */}
					<MenuCategories
						categories={mockCategories}
						activeCategory={activeCategory}
						setActiveCategory={setActiveCategory}
					/>

					{/* Food Items Grid */}
					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
						{filteredFoodItems.map((item) => (
							<FoodItemCard 
								key={item.id} 
								item={item} 
								onQuantityChange={handleQuantityChange}
								onItemClick={handleItemClick}
							/>
						))}
					</div>
				</div>
			</section>

			{/* Section 2: Order Summary - Fixed Right Sidebar */}
			<section className="w-[450px] flex-shrink-0 flex flex-col gap-2 py-6 pr-6 overflow-hidden">
				<OrderSummary
					tableNumber="Table No #04"
					orderNumber="Order #FO030"
					peopleCount={2}
					items={orderedItems}
					onEditTable={() => console.log("Edit table")}
					onDeleteTable={() => console.log("Delete table")}
				/>
				
				<PaymentMethodSelector
					selectedMethod={paymentMethod}
					onMethodChange={setPaymentMethod}
				/>

				{/* Action Buttons */}
				<div className="flex gap-3 mt-auto">
					<button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition font-medium shadow-sm">
						🖨️ Print
					</button>
					<button className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition shadow-md">
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
		</main>
	);
}
