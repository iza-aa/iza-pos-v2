"use client";

interface Category {
	id: string;
	label: string;
	icon: any; // Lucide icon component
	count: number;
	isSpecial?: boolean;
}

interface MenuCategoriesProps {
	categories: Category[];
	activeCategory: string;
	setActiveCategory: (id: string) => void;
}

export default function MenuCategories({
	categories,
	activeCategory,
	setActiveCategory,
}: MenuCategoriesProps) {
	return (
		<div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
			{categories.map((cat) => {
				const IconComponent = cat.icon;
				
				return (
					<button
						key={cat.id}
						onClick={() => setActiveCategory(cat.id)}
						className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
							activeCategory === cat.id
								? "bg-blue-500 text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						{IconComponent && <IconComponent className="w-5 h-5" />}
						<span>{cat.label} ({cat.count})</span>
					</button>
				);
			})}
		</div>
	);
}
