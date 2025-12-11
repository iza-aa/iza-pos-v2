"use client";

import { Trash2 } from "lucide-react";
import { getOrderStatusConfig, getKitchenStatusBadge } from "@/lib/orderConstants";
import { formatCurrency } from "@/lib/numberConstants";
import type { Order, OrderItem } from "@/lib/types";

interface ManagerOrderCardProps {
	order: Order;
	onDelete?: (orderId: string) => void;
}

export default function ManagerOrderCard({ order, onDelete }: ManagerOrderCardProps) {
	const statusConfig = getOrderStatusConfig(order.status);
	
	const renderKitchenBadge = (kitchenStatus?: string) => {
		const badge = getKitchenStatusBadge(kitchenStatus);
		if (!badge) return null;
		
		return (
			<span className={`text-xs ${badge.bgColor} ${badge.textColor} px-2 py-0.5 rounded`}>
				{badge.icon} {badge.label}
			</span>
		);
	};
	const displayItems = (order.items || []).slice(0, 3);
	const hasMore = (order.items || []).length > 3;
	
	const servedCount = (order.items || []).filter(item => item.served).length;
	const totalCount = (order.items || []).length;

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
						<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
							<h3 className="text-base sm:text-lg font-semibold text-gray-900">
								{order.orderNumber}
							</h3>
							<span className={`text-xs font-medium px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.text} w-fit`}>
								{statusConfig.label}
							</span>
						</div>
						<p className="text-sm text-gray-600">{order.customerName}</p>
						
						{/* Created by and Served by badges in one row with arrow */}
						{(order.createdByName || (order.servedByNames && order.servedByNames.length > 0)) && (
							<div className="mt-2 flex flex-wrap items-center gap-2">
								{/* Created by badge */}
								{order.createdByName && order.createdByRole && (
									<div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
										order.createdByRole === 'Owner' ? 'bg-black text-white' :
										'bg-[#FFE52A] text-gray-900'
									}`}>
										<span>Created by {order.createdByName}</span>
									</div>
								)}
								
								{/* Arrow separator if both exist */}
								{order.createdByName && order.servedByNames && order.servedByNames.length > 0 && (
									<span className="text-gray-400 text-sm">→</span>
								)}
								
								{/* Served by badges */}
								{order.servedByNames && order.servedByNames.length > 0 && order.servedByRoles && (
									<>
										{order.servedByNames.map((name, idx) => (
											<div
												key={idx}
												className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
													order.servedByRoles?.[idx] === 'Owner' ? 'bg-black text-white' :
													'bg-[#FFE52A] text-gray-900'
												}`}
											>
												<span>Served by {name}</span>
											</div>
										))}
									</>
								)}
							</div>
						)}
						</div>
						<button
							onClick={handleDelete}
							className="p-2 text-[#FF6859] hover:bg-red-50 rounded-lg transition-colors"
							title="Delete Order"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					</div>

					{/* Order Details */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 mb-3 gap-2">
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
										{renderKitchenBadge(item.kitchenStatus)}
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
									{formatCurrency(item.price)}
								</span>
							</div>
						))}
						{hasMore && (
							<p className="text-xs text-gray-900 font-medium">
								+{(order.items || []).length - 3} more items
							</p>
						)}
					</div>

					{/* Total & Served Status */}
					<div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
						<div>
							<p className="text-xs text-gray-500">Total</p>
							<p className="text-lg sm:text-xl font-bold text-[#B2FF5E]">
								{formatCurrency(order.total || 0)}
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
