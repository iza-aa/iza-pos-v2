"use client";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

interface OrderItem {
	id: string;
	name: string;
	quantity: number;
	price: number;
	variants?: any; // Variant selections for variant items
	productId?: string; // For variant items
}

interface OrderSummaryProps {
	tableNumber: string;
	orderNumber: string;
	peopleCount: number;
	items: OrderItem[];
	onEditTable: () => void;
	onDeleteTable: () => void;
	onDeleteItem?: (item: OrderItem) => void; // New callback for delete item
}

export default function OrderSummary({
	tableNumber,
	orderNumber,
	peopleCount,
	items,
	onEditTable,
	onDeleteTable,
	onDeleteItem,
}: OrderSummaryProps) {
	return (
		<div className="px-4 md:px-6 py-4 md:py-6">
			{/* Header */}
			<div className="p-6 mb-6 rounded-xl bg-gray-50 border border-gray-300">
				<div className="flex justify-between items-start mb-6">
					<div>
						<div className="text-xl font-bold text-gray-800">{tableNumber}</div>
						<div className="text-sm text-gray-500">{orderNumber}</div>
						<div className="text-xs text-gray-400 mt-1">
							Waktu Pemesanan: {new Date().toLocaleString('id-ID', { 
								hour: '2-digit', 
								minute: '2-digit',
								day: 'numeric',
								month: 'long',
								year: 'numeric',
								timeZone: 'Asia/Jakarta'
							})} WIB
						</div>
					</div>
				</div>

				{/* Ordered Items */}
				<div>
					<div className="flex justify-between items-center mb-3">
						<h3 className="font-semibold text-gray-800">Ordered Items</h3>
						<span className="text-sm text-gray-500">{items.length.toString().padStart(2, "0")}</span>
					</div>
					<div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
						{items.map((item) => (
						<div key={item.id} className="group">
							<div className="flex justify-between items-start">
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="text-gray-600">{item.quantity}x</span>
										<span className="text-gray-800">{item.name}</span>
									</div>
									{/* Show variant details if available */}
									{item.variants && Object.keys(item.variants).length > 0 && (
										<div className="ml-8 mt-1 space-y-0.5">
											{Object.entries(item.variants).map(([groupId, optionIds]: [string, any]) => {
												if (!Array.isArray(optionIds) || optionIds.length === 0) return null
												
												return (
													<div key={groupId} className="text-xs text-gray-500 italic">
														• {optionIds.join(', ')}
													</div>
												)
											})}
										</div>
									)}
								</div>
								<div className="flex items-center gap-2">
									<span className="font-semibold text-gray-800">
										Rp {(item.price * item.quantity).toLocaleString('id-ID')}
									</span>
									{onDeleteItem && (
										<button
											onClick={() => onDeleteItem(item)}
											className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition"
											title="Remove item"
										>
											<TrashIcon className="w-4 h-4 text-red-600" />
										</button>
									)}
								</div>
							</div>
						</div>
					))}
					</div>
				</div>
			</div>
		</div>
	);
}