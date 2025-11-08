"use client";
import { useState } from "react";
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import OrderCard from "@/app/components/staff/order/OrderCard";

// Mock data
const mockOrders = [
	{
		id: "1",
		customerName: "Fajar Kim",
		orderNumber: "#007",
		orderType: "Dine in",
		itemCount: 3,
		total: 13.45,
		date: "Friday, 9 Oct 2024",
		time: "09:50",
		status: "ready" as const,
		avatar: "T12",
	},
	{
		id: "2",
		customerName: "Andin",
		orderNumber: "#007",
		orderType: "Dine in",
		itemCount: 3,
		total: 13.45,
		date: "Friday, 9 Oct 2024",
		time: "09:50",
		status: "ready" as const,
		avatar: "T11",
	},
	{
		id: "3",
		customerName: "Anton",
		orderNumber: "#007",
		orderType: "Dine in",
		itemCount: 3,
		total: 13.45,
		date: "Friday, 9 Oct 2024",
		time: "09:50",
		status: "ready" as const,
		avatar: "T10",
	},
	{
		id: "4",
		customerName: "Siti",
		orderNumber: "#008",
		orderType: "Dine in",
		itemCount: 2,
		total: 8.5,
		date: "Friday, 9 Oct 2024",
		time: "10:15",
		status: "ready" as const,
		avatar: "T9",
	},
	{
		id: "5",
		customerName: "Budi",
		orderNumber: "#009",
		orderType: "Take Away",
		itemCount: 5,
		total: 25.0,
		date: "Friday, 9 Oct 2024",
		time: "10:30",
		status: "in-progress" as const,
		avatar: "T8",
	},
	{
		id: "6",
		customerName: "Naya",
		orderNumber: "#010",
		orderType: "Dine in",
		itemCount: 4,
		total: 18.75,
		date: "Friday, 9 Oct 2024",
		time: "11:00",
		status: "in-progress" as const,
		avatar: "T7",
	},
];

export default function OrderPage() {
	const [orders, setOrders] = useState(mockOrders);

	const handleAddOrder = () => {
		console.log("Add new order");
		// TODO: Open modal or navigate to order creation
	};

	const handleOrderClick = (order: any) => {
		console.log("Order clicked:", order);
		// TODO: Open order details modal or navigate to order detail page
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-[1800px] mx-auto">
				<OrderHeader
					totalOrders={orders.length}
					date="Friday, 9 Oct 2024 - 09:50"
					onAddOrder={handleAddOrder}
				/>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{orders.map((order) => (
						<OrderCard key={order.id} order={order} onClick={handleOrderClick} />
					))}
				</div>
			</div>
		</div>
	);
}
