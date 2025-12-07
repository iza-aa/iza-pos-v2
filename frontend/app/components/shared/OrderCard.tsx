"use client";

import { Trash2, CheckCircle } from "lucide-react";
import { ReactNode, useState } from "react";

interface OrderItem {
	id: string;
	name: string;
	quantity: number;
	price: number;
	served: boolean;
	servedAt?: string;
	variants?: any;
	kitchenStatus?: string;
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
	createdByName?: string;
	createdByRole?: string;
	servedByNames?: string[];
	servedByRoles?: string[];
	createdAt?: string;
}

interface OrderCardProps {
	order: Order;
	onDelete?: (orderId: string) => void;
	showDeleteButton?: boolean;
	onServeItem?: (orderId: string, itemId: string) => void;
	onServeAll?: (orderId: string) => void;
	onMarkServed?: (orderId: string, itemIds: string[]) => void;
	showServeButtons?: boolean;
	enableFlipCard?: boolean;
	customActions?: ReactNode;
}

export default function OrderCard({ 
	order, 
	onDelete,
	showDeleteButton = false,
	onServeItem,
	onServeAll,
	onMarkServed,
	showServeButtons = false,
	enableFlipCard = false,
	customActions
}: OrderCardProps) {
	const [isFlipped, setIsFlipped] = useState(false);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	
	const getStatusConfig = (status: string) => {
		switch (status) {
			case 'new':
				return { label: 'NEW ORDER', bg: 'bg-gray-100', text: 'text-gray-900' };
			case 'preparing':
				return { label: 'PREPARING', bg: 'bg-gray-100', text: 'text-gray-900' };
			case 'partially-served':
				return { label: 'PARTIALLY SERVED', bg: 'bg-gray-100', text: 'text-gray-900' };
			case 'served':
				return { label: 'SERVED', bg: 'bg-[#B2FF5E]', text: 'text-gray-900' };
			case 'completed':
				return { label: 'COMPLETED', bg: 'bg-black', text: 'text-white' };
			default:
				return { label: 'UNKNOWN', bg: 'bg-gray-100', text: 'text-gray-900' };
		}
	};

	const getKitchenStatusBadge = (kitchenStatus?: string) => {
		if (!kitchenStatus || kitchenStatus === 'not_required') return null;
		
		const isPending = kitchenStatus === 'pending';
		const isCooking = kitchenStatus === 'cooking';
		const isReady = kitchenStatus === 'ready';
		
		if (isPending) {
			return <span className="text-xs bg-gray-100 text-gray-900 px-2 py-0.5 rounded">⏳ Pending</span>;
		} else if (isCooking) {
			return <span className="text-xs bg-gray-100 text-gray-900 px-2 py-0.5 rounded">🍳 In Cook</span>;
		} else if (isReady) {
			return <span className="text-xs bg-[#B2FF5E] text-gray-900 px-2 py-0.5 rounded">✓ Ready</span>;
		}
		return null;
	};

	const statusConfig = getStatusConfig(order.status);
	const displayItems = order.items.slice(0, 3);
	const hasMore = order.items.length > 3;
	
	const servedCount = order.items.filter(item => item.served).length;
	const totalCount = order.items.length;
	const allServed = servedCount === totalCount && totalCount > 0;

	const pendingItems = order.items.filter((item) => !item.served);
	const servedItems = order.items.filter((item) => item.served);

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onDelete) {
			onDelete(order.id);
		}
	};

	const handleServeItem = (e: React.MouseEvent, itemId: string) => {
		e.stopPropagation();
		if (onServeItem) {
			onServeItem(order.id, itemId);
		}
	};

	const handleServeAll = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onServeAll) {
			onServeAll(order.id);
		}
	};

	const handleCheckboxChange = (itemId: string, isServed: boolean) => {
		if (isServed) return;
		setSelectedItems((prev) =>
			prev.includes(itemId)
				? prev.filter((id) => id !== itemId)
				: [...prev, itemId]
		);
	};

	const handleMarkServedBatch = () => {
		if (selectedItems.length === 0 || !onMarkServed) return;
		onMarkServed(order.id, selectedItems);
		setSelectedItems([]);
		setIsFlipped(false);
	};

	// Flip card version for staff
	if (enableFlipCard) {
		return (
			<div className="perspective-1000 break-inside-avoid">
				<style jsx>{`
					.perspective-1000 {
						perspective: 1000px;
					}
					.rotate-y-180 {
						transform: rotateY(180deg);
					}
					.backface-hidden {
						backface-visibility: hidden;
					}
				`}</style>
				<div
					className={`relative w-full transition-transform duration-500 ${
						isFlipped ? "rotate-y-180" : ""
					}`}
					style={{ transformStyle: "preserve-3d" }}
				>
					{/* FRONT SIDE */}
					<div
						className={`bg-white rounded-xl shadow-md overflow-hidden backface-hidden transition-all duration-300 hover:shadow-xl ${
							isFlipped ? "invisible" : "visible"
						}`}
						onClick={() => setIsFlipped(true)}
						style={{ backfaceVisibility: "hidden", cursor: "pointer" }}
					>
						<div className="p-4">
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
									
									{(order.createdByName || (order.servedByNames && order.servedByNames.length > 0)) && (
										<div className="mt-2 flex flex-wrap items-center gap-2">
											{order.createdByName && order.createdByRole && (
												<div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
													order.createdByRole === 'Owner' ? 'bg-black text-white' : 'bg-[#FFE52A] text-gray-900'
												}`}>
													<span>Created by {order.createdByName}</span>
												</div>
											)}
											
											{order.createdByName && order.servedByNames && order.servedByNames.length > 0 && (
												<span className="text-gray-400 text-sm">→</span>
											)}
											
										{order.servedByNames && order.servedByNames.length > 0 && order.servedByRoles && (
											<>
												{order.servedByNames.map((name, idx) => {
													const role = order.servedByRoles?.[idx];
													console.log(`Served by ${name}, Role: ${role}`);
													return (
														<div
															key={idx}
															className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
																role === 'Owner' ? 'bg-black text-white' : 'bg-[#FFE52A] text-gray-900'
															}`}
														>
															<span>Served by {name}</span>
														</div>
													);
												})}
											</>
										)}
										</div>
									)}
								</div>
							</div>

							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 mb-3 gap-2">
								<div className="flex items-center gap-3">
									<span className="flex items-center gap-1">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										{order.time}
									</span>
									<span>{order.date}</span>
								</div>
								<span className="font-medium text-gray-700">{order.table || order.orderType}</span>
							</div>

							<div className="space-y-2 mb-3">
								{displayItems.map((item, idx) => (
									<div key={idx} className="flex justify-between items-start text-sm gap-2">
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
														<span key={key} className="mr-2">{key}: {value as string}</span>
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
									<p className="text-xs text-gray-900 font-medium">+{order.items.length - 3} more items</p>
								)}
							</div>

							<div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
								<div>
									<p className="text-xs text-gray-500">Total</p>
									<p className="text-lg sm:text-xl font-bold text-[#B2FF5E]">Rp {order.total.toLocaleString()}</p>
								</div>
								<div className="text-sm text-gray-600">Served: {servedCount}/{totalCount}</div>
							</div>
						</div>
					</div>

					{/* BACK SIDE */}
					<div
						className={`absolute top-0 left-0 w-full bg-white rounded-xl shadow-xl overflow-hidden flex flex-col ${
							isFlipped ? "visible" : "invisible"
						}`}
						style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
					>
						<div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
							<div>
								<h3 className="text-base font-bold text-gray-900">{order.orderNumber}</h3>
								<p className="text-xs text-gray-600 mt-0.5">{order.customerName} • {order.table || "Takeaway"}</p>
							</div>
							<button
								onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setSelectedItems([]); }}
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
									<h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Pending Items ({pendingItems.length})</h4>
									<div className="space-y-1.5">
										{pendingItems.map((item) => {
											const isReady = item.kitchenStatus === 'ready' || item.kitchenStatus === 'not_required';
											const isPending = item.kitchenStatus === 'pending';
											const isCooking = item.kitchenStatus === 'cooking';

											return (
												<label
													key={item.id}
													className={`flex items-start p-2.5 rounded-lg transition-colors ${
														isReady ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer' : 'bg-gray-100 cursor-not-allowed'
													}`}
													onClick={(e) => e.stopPropagation()}
												>
													<input
														type="checkbox"
														checked={selectedItems.includes(item.id)}
														onChange={() => handleCheckboxChange(item.id, item.served)}
														disabled={!isReady}
														className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
													/>
													<div className="ml-2.5 flex-1">
														<p className="text-sm font-medium text-gray-900">{item.quantity} × {item.name}</p>
														{item.variants && (
															<p className="text-xs text-gray-500 mt-0.5">
																{Object.entries(item.variants).map(([key, value]) => value).join(", ")}
															</p>
														)}
														{item.kitchenStatus !== 'not_required' && (
															<div className="mt-1">
																{isPending && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pending</span>}
																{isCooking && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">🍳 In Cook</span>}
																{isReady && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">✓ Ready</span>}
															</div>
														)}
													</div>
													<span className="text-sm font-semibold text-gray-900">Rp {item.price.toLocaleString()}</span>
												</label>
											);
										})}
									</div>
								</div>
							)}

							{servedItems.length > 0 && (
								<div>
									<h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Served Items ({servedItems.length})</h4>
									<div className="space-y-1.5">
										{servedItems.map((item) => (
											<div key={item.id} className="flex items-center p-2.5 bg-green-50 rounded-lg opacity-75">
												<svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
												</svg>
												<div className="ml-2.5 flex-1">
													<p className="text-sm font-medium text-gray-700">{item.quantity} × {item.name}</p>
													{item.servedAt && <p className="text-xs text-gray-500 mt-0.5">Served at {item.servedAt}</p>}
												</div>
												<span className="text-sm font-semibold text-gray-700">Rp {item.price.toLocaleString()}</span>
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
										<span className="font-semibold text-green-600">{selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected</span>
									) : (
										<span>Select items to mark</span>
									)}
								</div>
								<button
									onClick={(e) => { e.stopPropagation(); handleMarkServedBatch(); }}
									disabled={selectedItems.length === 0}
									className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all ${
										selectedItems.length > 0 ? "bg-green-600 hover:bg-green-700 shadow-md" : "bg-gray-300 cursor-not-allowed"
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

	// Default card without flip
	return (
		<div className="break-inside-avoid">
			<div className="relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl">
				<div className="p-4">
					<div className="flex items-start justify-between mb-3">
						<div className="flex-1">
							<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
								<span className={`text-xs font-medium px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.text} w-fit`}>{statusConfig.label}</span>
							</div>
							<p className="text-sm text-gray-600">{order.customerName}</p>
							
						{(order.createdByName || (order.servedByNames && order.servedByNames.length > 0)) && (
							<div className="mt-2 flex flex-wrap items-center gap-2">
								{order.createdByName && order.createdByRole && (
									<div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
										order.createdByRole === 'Owner' ? 'bg-black text-white' : 'bg-[#FFE52A] text-gray-900'
									}`}>
										<span>Created by {order.createdByName}</span>
									</div>
								)}									{order.createdByName && order.servedByNames && order.servedByNames.length > 0 && (
										<span className="text-gray-400 text-sm">→</span>
									)}
									
								{order.servedByNames && order.servedByNames.length > 0 && order.servedByRoles && (
									<>
										{order.servedByNames.map((name, idx) => {
											const role = order.servedByRoles?.[idx];
											console.log(`[Default Card] Served by ${name}, Role: ${role}`);
											return (
												<div
													key={idx}
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
														role === 'Owner' ? 'bg-black text-white' : 'bg-[#FFE52A] text-gray-900'
													}`}
												>
													<span>Served by {name}</span>
												</div>
											);
										})}
									</>
								)}
								</div>
							)}
						</div>
						
						<div className="flex items-center gap-2">
							{customActions}
							
							{showDeleteButton && onDelete && (
								<button onClick={handleDelete} className="p-2 text-[#FF6859] hover:bg-red-50 rounded-lg transition-colors" title="Delete Order">
									<Trash2 className="w-4 h-4" />
								</button>
							)}
							
							{showServeButtons && onServeAll && !allServed && (
								<button onClick={handleServeAll} className="px-3 py-1.5 bg-[#B2FF5E] text-gray-900 text-xs font-semibold rounded-lg hover:bg-[#a0e855] transition-colors" title="Serve All Items">
									Serve All
								</button>
							)}
						</div>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 mb-3 gap-2">
						<div className="flex items-center gap-3">
							<span className="flex items-center gap-1">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								{order.time}
							</span>
							<span>{order.date}</span>
						</div>
						<span className="font-medium text-gray-700">{order.table || order.orderType}</span>
					</div>

					<div className="space-y-2 mb-3">
						{displayItems.map((item, idx) => (
							<div key={idx} className="flex justify-between items-start text-sm gap-2">
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
												<span key={key} className="mr-2">{key}: {value as string}</span>
											))}
										</div>
									)}
								</div>
								<div className="flex items-center gap-2">
									<span className={item.served ? "line-through text-gray-400" : "text-gray-600"}>
										Rp {item.price.toLocaleString()}
									</span>
									{showServeButtons && onServeItem && !item.served && (
										<button onClick={(e) => handleServeItem(e, item.id)} className="p-1 text-[#B2FF5E] hover:bg-green-50 rounded transition-colors" title="Mark as Served">
											<CheckCircle className="w-4 h-4" />
										</button>
									)}
								</div>
							</div>
						))}
						{hasMore && <p className="text-xs text-gray-900 font-medium">+{order.items.length - 3} more items</p>}
					</div>

					<div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
						<div>
							<p className="text-xs text-gray-500">Total</p>
							<p className="text-lg sm:text-xl font-bold text-[#B2FF5E]">Rp {order.total.toLocaleString()}</p>
						</div>
						<div className="text-sm text-gray-600">Served: {servedCount}/{totalCount}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
