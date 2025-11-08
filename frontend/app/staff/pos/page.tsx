"use client";
import { useState } from "react";
import OrderLineTabs from "@/app/components/staff/pos/OrderLineTabs";
import OrderLineCard from "@/app/components/staff/pos/OrderLineCard";
import MenuCategoryTabs from "@/app/components/staff/pos/MenuCategoryTabs";
import FoodItemCard from "@/app/components/staff/pos/FoodItemCard";
import OrderSummary from "@/app/components/staff/pos/OrderSummary";
import PaymentMethodSelector from "@/app/components/staff/pos/PaymentMethodSelector";
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

// Mock data
const mockOrders = [
	{ id: "1", orderNumber: "Order #FO027", table: "Table 03", itemCount: 8, timeAgo: "2 mins ago", status: "in-kitchen" as const },
	{ id: "2", orderNumber: "Order #FO028", table: "Table 07", itemCount: 3, timeAgo: "Just Now", status: "wait-list" as const },
	{ id: "3", orderNumber: "Order #FO019", table: "Table 09", itemCount: 2, timeAgo: "25 mins ago", status: "ready" as const },
];

const mockCategories = [
	{ id: "all", label: "All Menu", icon: "🍽️", count: 154 },
	{ id: "special", label: "Special", icon: "⭐", count: 19, isSpecial: true },
	{ id: "soups", label: "Soups", icon: "🍜", count: 3 },
	{ id: "desserts", label: "Desserts", icon: "🍰", count: 19 },
	{ id: "chickens", label: "Chickens", icon: "🍗", count: 10 },
];

const mockFoodItems = [
	{ id: "1", name: "Grilled Salmon Steak", category: "Lunch", price: 15.0, image: "", quantity: 0 },
	{ id: "2", name: "Tofu Poke Bowl", category: "Salad", price: 7.0, image: "", quantity: 0 },
	{ id: "3", name: "Pasta with Roast Beef", category: "Pasta", price: 10.0, image: "", quantity: 2 },
	{ id: "4", name: "Beef Steak", category: "Beef", price: 30.0, image: "", quantity: 0 },
	{ id: "5", name: "Shrimp Rice Bowl", category: "Rice", price: 6.0, image: "", quantity: 2 },
	{ id: "6", name: "Apple Stuffed Pancake", category: "Dessert", price: 35.0, image: "", quantity: 1 },
	{ id: "7", name: "Chicken Quinoa & Herbs", category: "Chicken", price: 12.0, image: "", quantity: 0 },
	{ id: "8", name: "Vegetable Shrimp", category: "Salad", price: 10.0, image: "", quantity: 1 },
];

export default function POSPage() {
	const [activeTab, setActiveTab] = useState("all");
	const [activeCategory, setActiveCategory] = useState("all");
	const [foodItems, setFoodItems] = useState(mockFoodItems);
	const [selectedOrder, setSelectedOrder] = useState<any>(null);
	const [paymentMethod, setPaymentMethod] = useState("card");
	const [showOrderLine, setShowOrderLine] = useState(true);

	const handleQuantityChange = (id: string, delta: number) => {
		setFoodItems((items) =>
			items.map((item) =>
				item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
			)
		);
	};

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
		<main className="min-h-screen bg-gray-50 p-2 px-6 pt-6 flex gap-6 relative">
			{/* Section 1: Order Line & Menu - Left scrollable */}
			<section className="w-full pr-[36%] flex flex-col ">
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
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-2xl font-bold text-gray-800">Foodies Menu</h2>
						<button 
							onClick={() => setShowOrderLine(!showOrderLine)}
							className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
							title={showOrderLine ? "Hide Order Line" : "Show Order Line"}
						>
							{showOrderLine ? (
								<EyeSlashIcon className="w-5 h-5 text-gray-600" />
							) : (
								<EyeIcon className="w-5 h-5 text-gray-600" />
							)}
						</button>
					</div>
					
					<MenuCategoryTabs
						categories={mockCategories}
						activeCategory={activeCategory}
						setActiveCategory={setActiveCategory}
					/>

					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
						{foodItems.map((item) => (
							<FoodItemCard key={item.id} item={item} onQuantityChange={handleQuantityChange} />
						))}
					</div>
				</div>
			</section>

			{/* Section 2: Order Summary - Fixed Right Sidebar */}
			<section className="w-2/6 flex flex-col fixed top-20 right-6 bottom-6 gap-2">
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
					<button className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold transition shadow-md">
						📦 Place Order
					</button>
				</div>
			</section>
		</main>
	);
}
