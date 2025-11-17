"use client";

import { useState } from "react";
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
}

interface ManagerOrderCardProps {
	order: Order;
	onMarkServed?: (orderId: string, itemIds: string[]) => void;
	onDelete?: (orderId: string) => void;
}

export default function ManagerOrderCard({ order, onMarkServed, onDelete }: ManagerOrderCardProps) {
	const [isFlipped, setIsFlipped] = useState(false);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);

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

	const pendingItems = order.items.filter((item) => !item.served);
	const servedItems = order.items.filter((item) => item.served);

	const handleCheckboxChange = (itemId: string, isServed: boolean) => {
		if (isServed) return;
		setSelectedItems((prev) =>
			prev.includes(itemId)
				? prev.filter((id) => id !== itemId)
				: [...prev, itemId]
		);
	};

	const handleMarkServed = () => {
		if (selectedItems.length === 0 || !onMarkServed) return;
		onMarkServed(order.id, selectedItems);
		setSelectedItems([]);
		setIsFlipped(false);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onDelete) {
			onDelete(order.id);
		}
	};

	return (
		<div className="break-inside-avoid">
			<div
				className={`relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl ${
					isFlipped ? "min-h-[400px]" : ""
				}`}
			>
				{/* Front Side */}
				{!isFlipped && (
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

						{/* Total & Action */}
						<div className="pt-3 border-t border-gray-200 flex justify-between items-center">
							<div>
								<p className="text-xs text-gray-500">Total</p>
								<p className="text-lg font-bold text-gray-900">
									Rp {order.total.toLocaleString()}
								</p>
							</div>
							{pendingItems.length > 0 && (
								<button
									onClick={() => setIsFlipped(true)}
									className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
								>
									Mark Served ({servedCount}/{totalCount})
								</button>
							)}
						</div>
					</div>
				)}

				{/* Back Side - Mark as Served */}
				{isFlipped && (
					<div className="p-4">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-900">Mark as Served</h3>
							<button
								onClick={() => {
									setIsFlipped(false);
									setSelectedItems([]);
								}}
								className="text-gray-500 hover:text-gray-700"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						{/* Pending Items */}
						{pendingItems.length > 0 && (
							<div className="mb-4">
								<h4 className="text-sm font-medium text-gray-700 mb-2">Pending Items</h4>
								<div className="space-y-2">
									{pendingItems.map((item) => {
										const isReady = item.kitchenStatus === 'ready' || item.kitchenStatus === 'not_required';
										return (
											<label
												key={item.id}
												className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition ${
													selectedItems.includes(item.id)
														? "bg-blue-50 border-blue-300"
														: "bg-white border-gray-200 hover:bg-gray-50"
												} ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
											>
												<input
													type="checkbox"
													checked={selectedItems.includes(item.id)}
													onChange={() => handleCheckboxChange(item.id, item.served)}
													disabled={!isReady}
													className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
												/>
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<p className="text-sm font-medium text-gray-900">
															{item.quantity}x {item.name}
														</p>
														{getKitchenStatusBadge(item.kitchenStatus)}
													</div>
													{item.variants && Object.keys(item.variants).length > 0 && (
														<div className="text-xs text-gray-500 mt-1">
															{Object.entries(item.variants).map(([key, value]) => (
																<span key={key} className="mr-2">
																	{key}: {value as string}
																</span>
															))}
														</div>
													)}
													<p className="text-xs text-gray-500">Rp {item.price.toLocaleString()}</p>
												</div>
											</label>
										);
									})}
								</div>
							</div>
						)}

						{/* Served Items */}
						{servedItems.length > 0 && (
							<div className="mb-4">
								<h4 className="text-sm font-medium text-gray-700 mb-2">Served Items</h4>
								<div className="space-y-2">
									{servedItems.map((item) => (
										<div
											key={item.id}
											className="flex items-start gap-3 p-2 rounded-lg bg-green-50 border border-green-200"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-5 w-5 text-green-600 mt-0.5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
											<div className="flex-1">
												<p className="text-sm font-medium text-gray-900">
													{item.quantity}x {item.name}
												</p>
												{item.variants && Object.keys(item.variants).length > 0 && (
													<div className="text-xs text-gray-500 mt-1">
														{Object.entries(item.variants).map(([key, value]) => (
															<span key={key} className="mr-2">
																{key}: {value as string}
															</span>
														))}
													</div>
												)}
												<p className="text-xs text-gray-500">
													Served at {item.servedAt}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex gap-2">
							<button
								onClick={() => {
									setIsFlipped(false);
									setSelectedItems([]);
								}}
								className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
							>
								Cancel
							</button>
							<button
								onClick={handleMarkServed}
								disabled={selectedItems.length === 0}
								className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								Confirm ({selectedItems.length})
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
