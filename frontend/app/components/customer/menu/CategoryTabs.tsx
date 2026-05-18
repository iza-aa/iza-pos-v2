import {
  Cake,
  Coffee,
  Cookie,
  GlassWater,
  LayoutGrid,
  LucideIcon,
  Milk,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
} from "lucide-react";

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

const iconNameToComponent: Record<string, LucideIcon> = {
  All: LayoutGrid,
  Coffee,
  UtensilsCrossed,
  Cookie,
  Cake,
  Milk,
  Pizza,
  Sandwich,
  Soup,
  Salad,
  Food: UtensilsCrossed,
  Snack: Sandwich,
  Dessert: Cake,
  "Non Coffee": GlassWater,
  Drink: GlassWater,
  Drinks: GlassWater,
  Beverage: GlassWater,
  "☕": Coffee,
  "🥤": GlassWater,
  "🍟": Sandwich,
  "🍰": Cake,
  "🍽️": UtensilsCrossed,
};

function normalizeIconKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveCategoryIcon(category: Category): LucideIcon {
  const directIcon = iconNameToComponent[category.icon];

  if (directIcon) {
    return directIcon;
  }

  const directName = iconNameToComponent[category.name];

  if (directName) {
    return directName;
  }

  const iconKey = normalizeIconKey(category.icon);
  const nameKey = normalizeIconKey(category.name);
  const typeKey = normalizeIconKey(category.type);

  if (
    nameKey.includes("non") &&
    nameKey.includes("coffee")
  ) {
    return GlassWater;
  }

  if (
    iconKey.includes("coffee") ||
    nameKey.includes("coffee")
  ) {
    return Coffee;
  }

  if (
    iconKey.includes("snack") ||
    nameKey.includes("snack")
  ) {
    return Sandwich;
  }

  if (
    iconKey.includes("dessert") ||
    nameKey.includes("dessert") ||
    nameKey.includes("cake")
  ) {
    return Cake;
  }

  if (
    iconKey.includes("drink") ||
    nameKey.includes("drink") ||
    typeKey.includes("drink") ||
    nameKey.includes("beverage")
  ) {
    return GlassWater;
  }

  if (
    iconKey.includes("food") ||
    nameKey.includes("food") ||
    typeKey.includes("food")
  ) {
    return UtensilsCrossed;
  }

  return Cookie;
}

export default function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <div className="px-4 pb-3 overflow-x-auto">
      <div className="flex gap-2">
        {categories.map((category) => {
          const IconComponent = resolveCategoryIcon(category);

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition flex items-center gap-2 ${
                selectedCategory === category.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}