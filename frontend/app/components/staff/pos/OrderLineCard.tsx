"use client";

interface Order {
	id: string;
	orderNumber: string;
	table: string;
	itemCount: number;
	timeAgo: string;
	status: "new" | "preparing" | "partially-served" | "served";
}

interface OrderLineCardProps {
	order: Order;
	onClick: (order: Order) => void;
}

export default function OrderLineCard({ order, onClick }: OrderLineCardProps) {
	const statusConfig = {
		"new": { bg: "bg-gray-100", text: "text-gray-900", label: "New Order" },
		"preparing": { bg: "bg-gray-200", text: "text-gray-900", label: "Preparing" },
		"partially-served": { bg: "bg-gray-100", text: "text-gray-900", label: "Partially Served" },
		"served": { bg: "bg-gray-100", text: "text-gray-900", label: "Served" },
	};

	const config = statusConfig[order.status];

	return (
		<div
			onClick={() => onClick(order)}
			className={`${config.bg} rounded-2xl p-4 cursor-pointer hover:shadow-md transition`}
		>
			<div className="flex justify-between items-start mb-2">
				<div>
					<div className="font-semibold text-gray-800">{order.orderNumber}</div>
					<div className="text-sm text-gray-600">{order.table}</div>
				</div>
			</div>
			<div className="text-sm font-medium text-gray-800 mb-2">Item: {order.itemCount}X</div>
			<div className="flex justify-between items-center">
				<div className="text-xs text-gray-600">{order.timeAgo}</div>
				<span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-semibold`}>
					{config.label}
				</span>
			</div>
		</div>
	);
}
