import { Coffee, UtensilsCrossed, Cookie, Cake, Milk, Pizza, Sandwich, Soup, Salad, IceCream, LayoutGrid } from 'lucide-react';

const iconNameToComponent: Record<string, any> = {
  'All': LayoutGrid,
  'Coffee': Coffee,
  'UtensilsCrossed': UtensilsCrossed,
  'Cookie': Cookie,
  'Cake': Cake,
  'Milk': Milk,
  'Pizza': Pizza,
  'Sandwich': Sandwich,
  'Soup': Soup,
  'Salad': Salad,
  'IceCream': IceCream,
};

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export default function CategoryTabs({ categories, selectedCategory, onSelectCategory }: CategoryTabsProps) {
  return (
    <div className="px-4 pb-3 overflow-x-auto">
      <div className="flex gap-2">
        {categories.map(cat => {
          const IconComponent = iconNameToComponent[cat.icon] || Cookie;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
