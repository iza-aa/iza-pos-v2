"use client";

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
}

export default function MenuCategoryTabs({
	categories,
	activeCategory,
	setActiveCategory,
}: MenuCategoryTabsProps) {
	return (
		<div className="flex gap-2 mb-4 overflow-x-auto pb-2">
			{categories.map((cat) => (
				<button
					key={cat.id}
					onClick={() => setActiveCategory(cat.id)}
					className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition border-2 ${
						activeCategory === cat.id
							? cat.isSpecial
								? "bg-red-50 border-red-300 text-red-700"
								: "bg-teal-50 border-teal-300 text-teal-700"
							: "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
					}`}
				>
					<span className="text-xl">{cat.icon}</span>
					<div className="flex flex-col items-start">
						<span>{cat.label}</span>
						<span className="text-xs text-gray-500">{cat.count} items</span>
					</div>
				</button>
			))}
		</div>
	);
}
