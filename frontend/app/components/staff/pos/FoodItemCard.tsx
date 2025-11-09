"use client";

interface FoodItem {
	id: string;
	name: string;
	category: string;
	price: number;
	image: string;
	quantity: number;
}

interface FoodItemCardProps {
	item: FoodItem;
	onQuantityChange: (id: string, delta: number) => void;
}

export default function FoodItemCard({ item, onQuantityChange }: FoodItemCardProps) {
	return (
		<div
			className={`rounded-2xl transition cursor-pointer ${
				item.quantity > 0
					? "border-2 border-blue-400 bg-blue-50"
					: "border-2 border-gray-200 bg-white hover:border-gray-300"
			}`}
		>
			<div className="relative p-[3px]">
				<div className="w-full h-24 bg-gray-200 rounded-xl overflow-hidden">
					<img
						src={item.image || "/placeholder.jpg"}
						alt={item.name}
						className="w-full h-full object-cover"
					/>
				</div>
			</div>
		<div className="p-4">	
			<div className="text-xs text-gray-500 mb-1">{item.category}</div>
			<div className="font-semibold text-gray-800 mb-2 truncate">{item.name}</div>
			<div className="flex items-center justify-between">
				<div className="font-bold text-gray-900">${item.price.toFixed(2)}</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => onQuantityChange(item.id, -1)}
						disabled={item.quantity === 0}
						className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
							item.quantity > 0
								? "bg-gray-200 hover:bg-gray-300 text-gray-700"
								: "bg-gray-100 text-gray-400 cursor-not-allowed"
						}`}
					>
						−
					</button>
					<span className="w-6 text-center font-semibold text-blue-600">{item.quantity}</span>
					<button
						onClick={() => onQuantityChange(item.id, 1)}
						className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition"
					>
						+
					</button>
				</div>
			</div>
		</div>
		</div>
	);
}
