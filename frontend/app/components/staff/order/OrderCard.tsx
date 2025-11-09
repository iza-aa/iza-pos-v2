"use client";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/solid";

interface Order {
	id: string;
	customerName: string;
	orderNumber: string;
	orderType: string;
	itemCount: number;
	total: number;
	date: string;
	time: string;
	status: "in-kitchen" | "wait-list" | "ready" | "in-progress";
	avatar: string;
}

interface OrderCardProps {
	order: Order;
	onClick?: (order: Order) => void;
}

export default function OrderCard({ order, onClick }: OrderCardProps) {
	const statusConfig = {
		"in-kitchen": {
			icon: ClockIcon,
			color: "text-orange-500",
			bg: "bg-orange-50",
			border: "border-orange-200",
			label: "In Kitchen",
		},
		"wait-list": {
			icon: ClockIcon,
			color: "text-blue-500",
			bg: "bg-blue-50",
			border: "border-blue-200",
			label: "Wait List",
		},
		ready: {
			icon: CheckCircleIcon,
			color: "text-green-500",
			bg: "bg-green-50",
			border: "border-green-200",
			label: "Ready",
		},
		"in-progress": {
			icon: ClockIcon,
			color: "text-purple-500",
			bg: "bg-purple-50",
			border: "border-purple-200",
			label: "In Progress",
		},
	};

	const config = statusConfig[order.status];
	const StatusIcon = config.icon;

	return (
		<div
			onClick={() => onClick?.(order)}
			className={`bg-white rounded-2xl p-5 border-2 ${config.border} hover:shadow-md transition cursor-pointer`}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
						{order.avatar}
					</div>
					<div>
						<div className="font-semibold text-gray-800">{order.customerName}</div>
						<div className="text-sm text-gray-500">
							{order.orderNumber} / {order.orderType}
						</div>
					</div>
				</div>
				<div className={`flex items-center gap-1 ${config.color}`}>
					<StatusIcon className="w-5 h-5" />
					<span className="text-sm font-medium">{config.label}</span>
				</div>
			</div>

			{/* Details */}
			<div className="space-y-2 mb-4">
				<div className="flex justify-between text-sm">
					<span className="text-gray-600">{order.itemCount} items</span>
					<span className="text-gray-600">{order.date}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-lg font-bold text-gray-800">Total</span>
					<span className="text-lg font-bold text-gray-800">${order.total.toFixed(2)}</span>
				</div>
			</div>

			{/* Footer */}
			<div className={`${config.bg} rounded-lg px-3 py-2 text-center`}>
				<span className={`text-sm font-medium ${config.color}`}>{order.time}</span>
			</div>
		</div>
	);
}
