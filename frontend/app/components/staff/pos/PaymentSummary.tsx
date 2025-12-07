"use client";

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
}

export default function PaymentSummary({ items }: PaymentSummaryProps) {
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const tax = subtotal * 0.1; // 10% tax (PPN)
	const total = subtotal + tax;

	return (
		<div className="p-4 md:p-6">
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
				<div className="flex justify-between text-lg font-bold pt-4 border-t border-gray-200">
					<span style={{ color: '#8FCC4A' }}>Total Payable</span>
					<span style={{ color: '#8FCC4A' }}>Rp {total.toLocaleString('id-ID')}</span>
				</div>
			</div>
		</div>
	);
}
