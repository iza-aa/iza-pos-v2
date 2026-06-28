"use client";

import { ProductImagePlaceholder } from "@/app/components/ui";
import { formatCurrency } from '@/lib/constants';
import { COLORS } from '@/lib/constants';

interface FoodItem {
	id: string;
	name: string;
	category: string;
	price: number;
	image: string;
	quantity: number;
	available?: boolean;
	unavailableReason?: string;
	hasVariants?: boolean;
}

interface FoodItemCardProps {
	item: FoodItem;
	onItemClick: (item: FoodItem) => void;
}

export default function FoodItemCard({ item, onItemClick }: FoodItemCardProps) {
	const isDisabled = item.available === false;
	const handleCardClick = () => {
		if (isDisabled) return;
		onItemClick(item);
	};

	return (
		<div
			onClick={handleCardClick}
			className={`rounded-2xl transition ${
				isDisabled
					? "cursor-not-allowed border border-gray-200 bg-gray-100 opacity-60"
					: item.quantity > 0
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
				{isDisabled && (
					<div className="absolute inset-x-2 bottom-2 rounded-lg bg-gray-900/90 px-2 py-1 text-center text-[11px] font-semibold text-white">
						Not ready
					</div>
				)}
			</div>
			<div className="p-4">	
				<div className="text-xs text-gray-500 mb-[2.5px]">{item.category}</div>
				<div className="font-semibold text-gray-800 mb-[2.5px] truncate">{item.name}</div>
				{isDisabled && item.unavailableReason ? (
					<div className="mb-[2.5px] line-clamp-2 text-xs font-medium text-red-600">
						{item.unavailableReason}
					</div>
				) : null}
				<div className="font-bold text-sm text-primary">
					{formatCurrency(item.price)}
				</div>
			</div>
		</div>
	);
}
