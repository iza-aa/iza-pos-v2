"use client";

import { MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface FoodiesMenuHeaderProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
}

export default function FoodiesMenuHeader({
	searchQuery,
	onSearchChange,
	}: FoodiesMenuHeaderProps) {
	 return (
	 	<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
	 		{/* Title with description */}
	 		<div>
	 			<h2 className="text-2xl font-bold text-gray-800">Foodies Menu</h2>
	 			<p className="text-sm text-gray-500 mt-1">Browse our delicious menu items</p>
	 		</div>

	 		{/* Search Bar - Below description on mobile, right side on desktop */}
	 		<div className="flex items-center gap-3">
	 			<div className="relative w-full lg:w-64">
	 				<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
	 				<input
	 					type="text"
	 					placeholder="Search items..."
	 					value={searchQuery || ""}
	 					onChange={(e) => onSearchChange(e.target.value)}
	 					className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
	 				/>
	 			</div>
	 		</div>
	 	</div>
	);
}
