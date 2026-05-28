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
	serviceCharge?: number;
	serviceChargeLabel?: string;
	tax?: number;
	taxLabel?: string;
	total?: number;
}

export default function PaymentSummary({
	items,
	serviceCharge = 0,
	serviceChargeLabel = "Service Charge",
	tax = 0,
	taxLabel = "Tax",
	total,
}: PaymentSummaryProps) {
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const totalPayable = total ?? subtotal + serviceCharge + tax;

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
					{serviceCharge > 0 ? (
						<div className="flex justify-between text-gray-600">
							<span>{serviceChargeLabel}</span>
							<span>{formatCurrency(serviceCharge)}</span>
						</div>
					) : null}
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
