"use client";

interface PaymentMethodSelectorProps {
	selectedMethod: string;
	onMethodChange: (method: string) => void;
}

export default function PaymentMethodSelector({ selectedMethod, onMethodChange }: PaymentMethodSelectorProps) {
	const methods = [
		{ id: "cash", label: "Cash", icon: "💵" },
		{ id: "card", label: "Card", icon: "💳" },
		{ id: "scan", label: "Scan", icon: "📱" },
	];

	return (
		<div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
			<h3 className="font-semibold text-gray-800 mb-3">Payment Method</h3>
			<div className="flex gap-2">
				{methods.map((method) => (
					<button
						key={method.id}
						onClick={() => onMethodChange(method.id)}
						className={`flex-1 py-2.5 rounded-lg border-2 transition text-sm font-medium ${
							selectedMethod === method.id
								? "border-teal-300 bg-teal-50 text-teal-700"
								: "border-gray-200 text-gray-600 hover:border-gray-300"
						}`}
					>
						{method.icon} {method.label}
					</button>
				))}
			</div>
		</div>
	);
}
