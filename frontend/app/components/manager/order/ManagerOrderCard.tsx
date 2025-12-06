"use client";

import { Trash2 } from "lucide-react";

interface OrderItem {
	id: string;
	name: string;
	quantity: number;
	price: number;
	served: boolean;
	servedAt?: string;
	variants?: any;
	kitchenStatus?: string; // 'pending', 'cooking', 'ready', 'not_required'
	readyAt?: string;
}

interface Order {
	id: string;
	customerName: string;
	orderNumber: string;
	orderType: string;
	items: OrderItem[];
	total: number;
	date: string;
	time: string;
	status: "new" | "preparing" | "partially-served" | "served" | "completed";
	table?: string;
	createdByRole?: string;
	servedByRoles?: string[];
}

interface ManagerOrderCardProps {
	order: Order;
	onDelete?: (orderId: string) => void;
}

export default function ManagerOrderCard({ order, onDelete }: ManagerOrderCardProps) {
	const getStatusConfig = (status: string) => {
		switch (status) {
			case 'new':
				return { label: 'NEW ORDER', bg: 'bg-purple-100', text: 'text-purple-800' };
			case 'preparing':
				return { label: 'PREPARING', bg: 'bg-blue-100', text: 'text-blue-800' };
			case 'partially-served':
				return { label: 'PARTIALLY SERVED', bg: 'bg-orange-100', text: 'text-orange-800' };
			case 'served':
				return { label: 'SERVED', bg: 'bg-green-100', text: 'text-green-800' };
			case 'completed':
				return { label: 'COMPLETED', bg: 'bg-gray-100', text: 'text-gray-800' };
			default:
				return { label: 'UNKNOWN', bg: 'bg-gray-100', text: 'text-gray-800' };
		}
	};

	const getKitchenStatusBadge = (kitchenStatus?: string) => {
		if (!kitchenStatus || kitchenStatus === 'not_required') return null;
		
		const isPending = kitchenStatus === 'pending';
		const isCooking = kitchenStatus === 'cooking';
		const isReady = kitchenStatus === 'ready';
		
		if (isPending) {
			return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">⏳ Pending</span>;
		} else if (isCooking) {
			return <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">🍳 In Cook</span>;
		} else if (isReady) {
			return <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">✓ Ready</span>;
		}
		return null;
	};

	const statusConfig = getStatusConfig(order.status);
	const displayItems = order.items.slice(0, 3);
	const hasMore = order.items.length > 3;
	
	const servedCount = order.items.filter(item => item.served).length;
	const totalCount = order.items.length;

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onDelete) {
			onDelete(order.id);
		}
	};

	return (
		<div className="break-inside-avoid">
			<div className="relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl">
				<div className="p-4">
					{/* Header with Delete Button */}
					<div className="flex items-start justify-between mb-3">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<h3 className="text-base font-semibold text-gray-900">
									{order.orderNumber}
								</h3>
								<span className={`text-xs font-medium px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.text}`}>
									{statusConfig.label}
								</span>
							</div>
							<p className="text-sm text-gray-600">{order.customerName}</p>
							{/* Show who created the order */}
							{order.createdByRole && (
								<div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
									<span>Created by</span>
									<span>{order.createdByRole}</span>
								</div>
							)}
							{/* Show who served (if multiple roles) */}
							{order.servedByRoles && order.servedByRoles.length > 0 && (
								<div className="mt-1 flex flex-wrap gap-1">
									{order.servedByRoles.map((role, idx) => (
										<span
											key={idx}
											className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-semibold"
										>
											<span>Served by</span>
											<span>{role}</span>
										</span>
									))}
								</div>
							)}
						</div>
						<button
							onClick={handleDelete}
							className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
							title="Delete Order"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					</div>

					{/* Order Details */}
					<div className="flex items-center justify-between text-xs text-gray-500 mb-3">
						<div className="flex items-center gap-3">
							<span className="flex items-center gap-1">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								{order.time}
							</span>
							<span>{order.date}</span>
						</div>
						<span className="font-medium text-gray-700">
							{order.table || order.orderType}
						</span>
					</div>

					{/* Items List */}
					<div className="space-y-2 mb-3">
						{displayItems.map((item, idx) => (
							<div key={idx} className="flex justify-between text-sm">
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className={item.served ? "line-through text-gray-400" : "text-gray-700"}>
											{item.quantity}x {item.name}
										</span>
										{getKitchenStatusBadge(item.kitchenStatus)}
									</div>
									{item.variants && Object.keys(item.variants).length > 0 && (
										<div className="text-xs text-gray-500 ml-6">
											{Object.entries(item.variants).map(([key, value]) => (
												<span key={key} className="mr-2">
													{key}: {value as string}
												</span>
											))}
										</div>
									)}
								</div>
								<span className={item.served ? "line-through text-gray-400" : "text-gray-600"}>
									Rp {item.price.toLocaleString()}
								</span>
							</div>
						))}
						{hasMore && (
							<p className="text-xs text-blue-600 font-medium">
								+{order.items.length - 3} more items
							</p>
						)}
					</div>

					{/* Total & Served Status */}
					<div className="pt-3 border-t border-gray-200 flex justify-between items-center">
						<div>
							<p className="text-xs text-gray-500">Total</p>
							<p className="text-lg font-bold text-gray-900">
								Rp {order.total.toLocaleString()}
							</p>
						</div>
						<div className="text-sm text-gray-600">
							Served: {servedCount}/{totalCount}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
