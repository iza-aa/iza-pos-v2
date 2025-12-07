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
						className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${
							activeCategory === cat.id
								? "bg-gray-900 text-white border-gray-900"
								: "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
						}`}
					>
						{IconComponent && <IconComponent className="w-4 h-4" />}
						<span>{cat.label}</span>
					</button>
				);
			})}
		</div>
	);
}
