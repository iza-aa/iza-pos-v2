"use client";

import { MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface Category {
	id: string;
	label: string;
	icon: string;
	count: number;
	isSpecial?: boolean;
}

interface MenuCategoryTabsProps {
	categories: Category[];
	activeCategory: string;
	setActiveCategory: (id: string) => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	showOrderLine: boolean;
	onToggleOrderLine: () => void;
}

export default function MenuCategoryTabs({
	categories,
	activeCategory,
	setActiveCategory,
	searchQuery,
	onSearchChange,
	showOrderLine,
	onToggleOrderLine,
}: MenuCategoryTabsProps) {
	return (
		<div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
			<div className="flex items-center justify-between gap-4">
				{/* Menu Categories - Left */}
				<div className="flex gap-2 overflow-x-auto flex-1 scrollbar-hide">
					{categories.map((cat) => (
						<button
							key={cat.id}
							onClick={() => setActiveCategory(cat.id)}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
								activeCategory === cat.id
									? "bg-blue-500 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							<span className="text-lg">{cat.icon}</span>
							<span>{cat.label} ({cat.count})</span>
						</button>
					))}
				</div>

				{/* Search Bar - Center */}
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

				{/* Hide Order Line Button - Right */}
				<button 
					onClick={onToggleOrderLine}
					className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex-shrink-0"
					title={showOrderLine ? "Hide Order Line" : "Show Order Line"}
				>
					{showOrderLine ? (
						<EyeSlashIcon className="w-5 h-5 text-gray-600" />
					) : (
						<EyeIcon className="w-5 h-5 text-gray-600" />
					)}
				</button>
			</div>
		</div>
	);
}
