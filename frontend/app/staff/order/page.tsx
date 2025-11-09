"use client";
import { useState } from "react";
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import OrderCard from "@/app/components/staff/order/OrderCard";
import { orders } from "@/app/lib/mockData";

// Transform orders for display
const mockOrders = orders.map(order => ({
	id: order.id,
	customerName: order.customerName,
	orderNumber: order.orderNumber,
	orderType: order.orderType,
	itemCount: order.itemCount,
	total: order.total,
	date: order.date,
	time: order.time,
	status: order.status,
	avatar: order.table,
}));

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
