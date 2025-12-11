"use client";

import { ProductImagePlaceholder } from "@/app/components/ui";
import { formatCurrency } from '@/lib/numberConstants';
import { COLORS } from '@/lib/themeConstants';

interface FoodItem {
	id: string;
	name: string;
	category: string;
	price: number;
	image: string;
	quantity: number;
	hasVariants?: boolean;
}

interface FoodItemCardProps {
	item: FoodItem;
	onItemClick: (item: FoodItem) => void;
}

export default function FoodItemCard({ item, onItemClick }: FoodItemCardProps) {
	const handleCardClick = () => {
		onItemClick(item);
	};

	return (
		<div
			onClick={handleCardClick}
			className={`rounded-2xl transition cursor-pointer ${
				item.quantity > 0
					? "border-[1.5px] border-gray-700 bg-gray-50"
					: "border border-gray-300 bg-gray-100 hover:border-gray-400"
			}`}
		>
			<div className="relative p-[3px]">
				<div className="w-full h-24 bg-gray-200 rounded-xl overflow-hidden">
					<ProductImagePlaceholder 
						name={item.name}
						imageUrl={item.image}
						className="w-full h-full"
					/>
				</div>
				{/* Quantity Badge */}
				{item.quantity > 0 && (
					<div className="absolute top-2 right-2 w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
						{item.quantity}
					</div>
				)}
			</div>
			<div className="p-4">	
				<div className="text-xs text-gray-500 mb-[2.5px]">{item.category}</div>
				<div className="font-semibold text-gray-800 mb-[2.5px] truncate">{item.name}</div>
				<div className="font-bold text-sm" style={{ color: COLORS.PRIMARY }}>
					{formatCurrency(item.price)}
				</div>
			</div>
		</div>
	);
}
