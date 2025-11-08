"use client";
import { CalendarIcon } from "@heroicons/react/24/outline";

interface OrderHeaderProps {
	totalOrders: number;
	date: string;
	onAddOrder: () => void;
}

export default function OrderHeader({ totalOrders, date, onAddOrder }: OrderHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-6">
			<h1 className="text-2xl font-bold text-gray-800">Order ({totalOrders})</h1>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2 text-gray-600">
					<CalendarIcon className="w-5 h-5" />
					<span className="text-sm">{date}</span>
				</div>
				<button
					onClick={onAddOrder}
					className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition"
				>
					+ Add New
				</button>
			</div>
		</div>
	);
}
