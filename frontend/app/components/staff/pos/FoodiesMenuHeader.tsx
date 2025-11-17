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
	 	<div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
	 		<div className="flex items-center justify-between gap-4">
	 			{/* Title - Left */}
	 			<h2 className="text-2xl font-bold text-gray-800">Foodies Menu</h2>

	 			{/* Right Section: Search Bar */}
	 			<div className="flex items-center gap-3">
	 				{/* Search Bar */}
	 				<div className="relative">
	 					<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
	 					<input
	 						type="text"
	 						placeholder="Search items..."
	 						value={searchQuery || ""}
	 						onChange={(e) => onSearchChange(e.target.value)}
	 						className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
	 					/>
	 				</div>
	 			</div>
	 		</div>
	 	</div>
	);
}
