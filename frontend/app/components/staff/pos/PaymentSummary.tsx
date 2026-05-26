"use client";
import { formatCurrency } from '@/lib/constants';
import { COLORS } from '@/lib/constants';

interface CartItem {
	id: string;
	name: string;
	quantity: number;
	price: number;
	variants: Record<string, string[]>;
	productId: string;
}

interface PaymentSummaryProps {
	items: CartItem[];
	tax?: number;
	taxLabel?: string;
	total?: number;
}

export default function PaymentSummary({
	items,
	tax = 0,
	taxLabel = "Tax",
	total,
}: PaymentSummaryProps) {
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const totalPayable = total ?? subtotal + tax;

	return (
		<div className="p-4 md:p-6 space-y-4">
			{/* Payment Summary Card */}
			<div className="bg-gray-50 border border-gray-300 rounded-2xl p-4">
				<h3 className="font-semibold text-gray-800 mb-3">Payment Summary</h3>
				<div className="space-y-3">
					<div className="flex justify-between text-gray-600">
						<span>Subtotal</span>
						<span>{formatCurrency(subtotal)}</span>
					</div>
					<div className="flex justify-between text-gray-600">
						<span>{taxLabel}</span>
						<span>{formatCurrency(tax)}</span>
					</div>
					<div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
						<span style={{ color: COLORS.PRIMARY }}>Total Payable</span>
						<span style={{ color: COLORS.PRIMARY }}>{formatCurrency(totalPayable)}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
