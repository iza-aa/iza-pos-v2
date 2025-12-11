"use client";
import { PencilIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { formatCurrency } from '@/lib/numberConstants';
import { COLORS } from '@/lib/themeConstants';

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
	onQuantityChange?: (item: OrderItem, newQuantity: number) => void;
}

export default function OrderSummary({
	tableNumber,
	orderNumber,
	peopleCount,
	items,
	onEditTable,
	onDeleteTable,
	onQuantityChange,
}: OrderSummaryProps) {
	return (
		<div className="px-4 md:px-6 pt-4 md:pt-6 flex flex-col h-full">
			{/* Header */}
			<div className="p-6 rounded-xl bg-gray-50 border border-gray-300 flex flex-col flex-1 min-h-0">
				<div className="flex justify-between items-start mb-6">
					<div>
						<div className="text-lg font-bold text-gray-800">{tableNumber}</div>
						<div className="text-sm text-gray-500">{orderNumber}</div>
					</div>
				</div>

				{/* Ordered Items */}
				<div className="flex flex-col flex-1 min-h-0">
					<div className="flex justify-between items-center mb-3">
						<h3 className="font-semibold text-gray-800">Ordered Items</h3>
						<span className="text-sm text-gray-500">{items.length.toString().padStart(2, "0")}</span>
					</div>
					<div className="space-y-3 overflow-y-auto pr-2 flex-1">
						{items.map((item) => (
						<div key={item.id} className="group">
							<div className="flex justify-between items-start gap-3">
								<div className="flex-1">
									<div className="flex items-start gap-2">
										<div className="flex-1">
											<span className="text-gray-800">{item.name}</span>
											{/* Show variant details if available */}
											{item.variants && Object.keys(item.variants).length > 0 && (
												<div className="mt-1 space-y-0.5">
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
									</div>
								</div>
								<div className="flex items-center gap-2">
							{/* Quantity Controls */}
							{onQuantityChange && (
								<div className="flex items-center gap-1.5 mr-2">
									<button
										onClick={() => onQuantityChange(item, item.quantity - 1)}
										className="w-8 h-8 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition"
									>
										<MinusIcon className="w-4 h-4 text-gray-700" />
									</button>
									<span className="text-gray-800 font-medium min-w-[24px] text-center">{item.quantity}x</span>
									<button
										onClick={() => onQuantityChange(item, item.quantity + 1)}
										className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-black flex items-center justify-center transition"
									>
										<PlusIcon className="w-4 h-4 text-white" />
									</button>
							</div>
						)}
								<span className="font-semibold min-w-[90px] text-right" style={{ color: COLORS.PRIMARY }}>
									{formatCurrency(item.price * item.quantity)}
								</span>
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