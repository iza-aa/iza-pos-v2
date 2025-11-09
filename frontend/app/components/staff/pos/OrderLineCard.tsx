"use client";

interface Order {
	id: string;
	orderNumber: string;
	table: string;
	itemCount: number;
	timeAgo: string;
	status: "in-kitchen" | "wait-list" | "ready" | "in-progress";
}

interface OrderLineCardProps {
	order: Order;
	onClick: (order: Order) => void;
}

export default function OrderLineCard({ order, onClick }: OrderLineCardProps) {
	const statusConfig = {
		"in-kitchen": { bg: "bg-blue-100", text: "text-blue-700", label: "In Kitchen" },
		"wait-list": { bg: "bg-orange-100", text: "text-orange-700", label: "Wait List" },
		"in-progress": { bg: "bg-purple-100", text: "text-purple-700", label: "In Progress" },
		ready: { bg: "bg-green-100", text: "text-green-700", label: "Ready" },
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
