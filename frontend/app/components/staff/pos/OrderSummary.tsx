"use client";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

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
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const tax = subtotal * 0.1; // 10% tax (PPN)
	const donation = 1000;
	const total = subtotal + tax + donation;

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
			{/* Header */}
			<div className="flex justify-between items-start p-6 mb-6 rounded-t-xl bg-gray-50 border-b border-gray-200">
				<div>
					<div className="text-xl font-bold text-gray-800">{tableNumber}</div>
					<div className="text-sm text-gray-500">{orderNumber}</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={onEditTable}
						className="p-2 hover:bg-gray-100 rounded-lg transition"
						title="Edit Table"
					>
						<PencilIcon className="w-5 h-5 text-gray-600" />
					</button>
					<div className="text-right">
						<div className="font-semibold text-gray-800">{peopleCount} People</div>
					</div>
				</div>
			</div>

			{/* Ordered Items */}
			<div className="mb-6 px-6">
				<div className="flex justify-between items-center ">
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

			{/* Payment Summary */}
			<div className="border-t border-gray-200 p-6">
				<h3 className="font-semibold text-gray-800 mb-3">Payment Summary</h3>
				<div className="space-y-2">
				<div className="flex justify-between text-gray-600">
					<span>Subtotal</span>
					<span>Rp {subtotal.toLocaleString('id-ID')}</span>
					</div>
				<div className="flex justify-between text-gray-600">
					<span>Tax</span>
					<span>Rp {tax.toLocaleString('id-ID')}</span>
					</div>
				<div className="flex justify-between text-gray-600">
					<span>Donation for Palestine</span>
					<span>Rp {donation.toLocaleString('id-ID')}</span>
					</div>
				<div className="flex justify-between text-lg font-bold text-gray-800 pt-4 border-t border-gray-200">
					<span>Total Payable</span>
					<span>Rp {total.toLocaleString('id-ID')}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
