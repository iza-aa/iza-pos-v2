"use client";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

interface OrderItem {
	id: string;
	name: string;
	quantity: number;
	price: number;
}

interface OrderSummaryProps {
	tableNumber: string;
	orderNumber: string;
	peopleCount: number;
	items: OrderItem[];
	onEditTable: () => void;
	onDeleteTable: () => void;
}

export default function OrderSummary({
	tableNumber,
	orderNumber,
	peopleCount,
	items,
	onEditTable,
	onDeleteTable,
}: OrderSummaryProps) {
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const tax = subtotal * 0.06; // 6% tax
	const donation = 1.0;
	const total = subtotal + tax + donation;

	return (
		<div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
			{/* Header */}
			<div className="flex justify-between items-start mb-6">
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
					<button
						onClick={onDeleteTable}
						className="p-2 hover:bg-red-50 rounded-lg transition"
						title="Delete Table"
					>
						<TrashIcon className="w-5 h-5 text-red-600" />
					</button>
					<div className="text-right">
						<div className="font-semibold text-gray-800">{peopleCount} People</div>
					</div>
				</div>
			</div>

			{/* Ordered Items */}
			<div className="mb-6">
				<div className="flex justify-between items-center mb-4">
					<h3 className="font-semibold text-gray-800">Ordered Items</h3>
					<span className="text-sm text-gray-500">{items.length.toString().padStart(2, "0")}</span>
				</div>
				<div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
					{items.map((item) => (
						<div key={item.id} className="flex justify-between items-center">
							<div className="flex items-center gap-2">
								<span className="text-gray-600">{item.quantity}x</span>
								<span className="text-gray-800">{item.name}</span>
							</div>
							<span className="font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
						</div>
					))}
				</div>
			</div>

			{/* Payment Summary */}
			<div className="border-t border-gray-200 pt-4">
				<h3 className="font-semibold text-gray-800 mb-3">Payment Summary</h3>
				<div className="space-y-2">
					<div className="flex justify-between text-gray-600">
						<span>Subtotal</span>
						<span>${subtotal.toFixed(2)}</span>
					</div>
					<div className="flex justify-between text-gray-600">
						<span>Tax</span>
						<span>${tax.toFixed(2)}</span>
					</div>
					<div className="flex justify-between text-gray-600">
						<span>Donation for Palestine</span>
						<span>${donation.toFixed(2)}</span>
					</div>
					<div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
						<span>Total Payable</span>
						<span>${total.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
