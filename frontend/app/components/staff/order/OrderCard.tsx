"use client";

import { useState } from "react";

interface OrderItem {
	id: string;
	name: string;
	quantity: number;
	price: number;
	served: boolean;
	servedAt?: string;
	variants?: any;
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

interface OrderCardProps {
	order: Order;
	onMarkServed?: (orderId: string, itemIds: string[]) => void;
}

export default function OrderCard({ order, onMarkServed }: OrderCardProps) {
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

	return (
		<div className="perspective-1000 break-inside-avoid mb-4">
			<div
				className={`relative w-full transition-transform duration-500 transform-style-3d ${
					isFlipped ? "rotate-y-180" : ""
				}`}
				style={{ transformStyle: "preserve-3d" }}
			>
				{/* FRONT SIDE */}
				<div
					className={`bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow cursor-pointer backface-hidden ${
						isFlipped ? "invisible" : "visible"
					}`}
					onClick={() => setIsFlipped(true)}
					style={{ backfaceVisibility: "hidden" }}
				>
					<div className="p-4 border-b border-gray-200 bg-gray-50">
						<div className="flex items-center justify-between mb-2">
							<span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${statusConfig.bg} ${statusConfig.text}`}>
								{statusConfig.label}
							</span>
							<p className="text-xs text-gray-500">{order.time}</p>
						</div>
						<p className="text-xs text-gray-500">{order.date}</p>
					</div>

					<div className="p-4 flex-1">
						<div className="mb-3">
							<p className="text-base font-bold text-gray-900">{order.customerName}</p>
							<p className="text-sm text-gray-600">{order.orderNumber}</p>
							<p className="text-xs text-gray-500 mt-1">
								{order.table || 'Takeaway'}
							</p>
							{order.status === 'partially-served' && (
								<p className="text-xs font-semibold text-orange-600 mt-1">
									{servedCount} of {totalCount} items served
								</p>
							)}
						</div>

						<div className="space-y-2">
							<p className="text-xs font-semibold text-gray-700 uppercase mb-2">Items ({order.items.length}):</p>
							{displayItems.map((item, idx) => (
								<div key={idx} className="flex items-center justify-between text-sm">
									<span className="text-gray-700 flex items-center gap-2">
										{item.served && (
											<svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
												<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
											</svg>
										)}
										{item.quantity} × {item.name}
									</span>
									<span className="text-gray-900 font-medium">
										${item.price.toFixed(2)}
									</span>
								</div>
							))}
							
							{hasMore && (
								<p className="text-xs text-blue-600 font-medium mt-2">
									+{order.items.length - 3} more items
								</p>
							)}
						</div>

						<div className="mt-4 pt-3 border-t border-gray-200">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-gray-700">Total</span>
								<span className="text-lg font-bold text-green-600">${order.total.toFixed(2)}</span>
							</div>
						</div>
					</div>
				</div>

				{/* BACK SIDE */}
				<div
					className={`absolute top-0 left-0 w-full bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-xl ${
						isFlipped ? "visible" : "invisible"
					}`}
					style={{
						backfaceVisibility: "hidden",
						transform: "rotateY(180deg)",
					}}
				>
					<div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
						<div>
							<h3 className="text-base font-bold text-gray-900">{order.orderNumber}</h3>
							<p className="text-xs text-gray-600 mt-0.5">
								{order.customerName} • {order.table || "Takeaway"}
							</p>
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								setIsFlipped(false);
								setSelectedItems([]);
							}}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div className="flex-1 overflow-y-auto px-4 py-3 max-h-[400px]">
						{pendingItems.length > 0 && (
							<div className="mb-4">
								<h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
									Pending Items ({pendingItems.length})
								</h4>
								<div className="space-y-1.5">
									{pendingItems.map((item) => (
										<label
											key={item.id}
											className="flex items-center p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
											onClick={(e) => e.stopPropagation()}
										>
											<input
												type="checkbox"
												checked={selectedItems.includes(item.id)}
												onChange={() => handleCheckboxChange(item.id, item.served)}
												className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 focus:ring-2"
											/>
											<div className="ml-2.5 flex-1">
												<p className="text-sm font-medium text-gray-900">
													{item.quantity} × {item.name}
												</p>
												{item.variants && (
													<p className="text-xs text-gray-500 mt-0.5">
														{Object.entries(item.variants)
															.map(([key, value]) => value)
															.join(", ")}
													</p>
												)}
											</div>
											<span className="text-sm font-semibold text-gray-900">
												${item.price.toFixed(2)}
											</span>
										</label>
									))}
								</div>
							</div>
						)}

						{servedItems.length > 0 && (
							<div>
								<h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
									Served Items ({servedItems.length})
								</h4>
								<div className="space-y-1.5">
									{servedItems.map((item) => (
										<div
											key={item.id}
											className="flex items-center p-2.5 bg-green-50 rounded-lg opacity-75"
										>
											<svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
												<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
											</svg>
											<div className="ml-2.5 flex-1">
												<p className="text-sm font-medium text-gray-700">
													{item.quantity} × {item.name}
												</p>
												{item.servedAt && (
													<p className="text-xs text-gray-500 mt-0.5">
														Served at {item.servedAt}
													</p>
												)}
											</div>
											<span className="text-sm font-semibold text-gray-700">
												${item.price.toFixed(2)}
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{pendingItems.length > 0 && (
						<div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
							<div className="text-xs text-gray-600">
								{selectedItems.length > 0 ? (
									<span className="font-semibold text-green-600">
										{selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
									</span>
								) : (
									<span>Select items to mark</span>
								)}
							</div>
							<button
								onClick={(e) => {
									e.stopPropagation();
									handleMarkServed();
								}}
								disabled={selectedItems.length === 0}
								className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all ${
									selectedItems.length > 0
										? "bg-green-600 hover:bg-green-700 shadow-md"
										: "bg-gray-300 cursor-not-allowed"
								}`}
							>
								Mark as Served
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
