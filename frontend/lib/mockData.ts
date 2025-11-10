// ============================================
// CENTRALIZED MOCK DATA FOR ENTIRE SYSTEM
// ============================================

// Variant Groups & Options
export const variantGroups = [
  {
    id: 'vg1',
    name: 'Size',
    type: 'single' as const,
    required: true,
    options: [
      { id: 'size-small', name: 'Small', priceModifier: -1.5 },
      { id: 'size-regular', name: 'Regular', priceModifier: 0 },
      { id: 'size-large', name: 'Large', priceModifier: 2 },
    ]
  },
  {
    id: 'vg2',
    name: 'Sugar Level',
    type: 'single' as const,
    required: true,
    options: [
      { id: 'sugar-none', name: 'No Sugar', priceModifier: 0 },
      { id: 'sugar-less', name: 'Less Sugar', priceModifier: 0 },
      { id: 'sugar-normal', name: 'Normal Sugar', priceModifier: 0 },
      { id: 'sugar-extra', name: 'Extra Sugar', priceModifier: 0.5 },
    ]
  },
  {
    id: 'vg3',
    name: 'Temperature',
    type: 'single' as const,
    required: true,
    options: [
      { id: 'temp-hot', name: 'Hot', priceModifier: 0 },
      { id: 'temp-iced', name: 'Iced', priceModifier: 0.5 },
    ]
  },
  {
    id: 'vg4',
    name: 'Add-ons',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'addon-extra-shot', name: 'Extra Shot', priceModifier: 2 },
      { id: 'addon-whipped-cream', name: 'Whipped Cream', priceModifier: 1 },
      { id: 'addon-caramel-drizzle', name: 'Caramel Drizzle', priceModifier: 1.5 },
      { id: 'addon-vanilla-syrup', name: 'Vanilla Syrup', priceModifier: 1 },
      { id: 'addon-chocolate-syrup', name: 'Chocolate Syrup', priceModifier: 1 },
    ]
  },
  {
    id: 'vg5',
    name: 'Milk Type',
    type: 'single' as const,
    required: false,
    options: [
      { id: 'milk-regular', name: 'Regular Milk', priceModifier: 0 },
      { id: 'milk-soy', name: 'Soy Milk', priceModifier: 1 },
      { id: 'milk-almond', name: 'Almond Milk', priceModifier: 1.5 },
      { id: 'milk-oat', name: 'Oat Milk', priceModifier: 1.5 },
    ]
  },
  {
    id: 'vg6',
    name: 'Portion Size',
    type: 'single' as const,
    required: true,
    options: [
      { id: 'portion-regular', name: 'Regular', priceModifier: 0 },
      { id: 'portion-large', name: 'Large', priceModifier: 3 },
      { id: 'portion-jumbo', name: 'Jumbo', priceModifier: 5 },
    ]
  },
  {
    id: 'vg7',
    name: 'Toppings',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'topping-cheese', name: 'Extra Cheese', priceModifier: 2 },
      { id: 'topping-bacon', name: 'Bacon Bits', priceModifier: 3 },
      { id: 'topping-mushroom', name: 'Sautéed Mushroom', priceModifier: 2.5 },
      { id: 'topping-onion-rings', name: 'Onion Rings', priceModifier: 2 },
    ]
  },
  {
    id: 'vg8',
    name: 'Sauce Selection',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'sauce-bbq', name: 'BBQ Sauce', priceModifier: 0.5 },
      { id: 'sauce-mayo', name: 'Mayonnaise', priceModifier: 0.5 },
      { id: 'sauce-chili', name: 'Chili Sauce', priceModifier: 0.5 },
      { id: 'sauce-garlic', name: 'Garlic Aioli', priceModifier: 1 },
    ]
  },
  {
    id: 'vg9',
    name: 'Frosting Type',
    type: 'single' as const,
    required: true,
    options: [
      { id: 'frost-vanilla', name: 'Vanilla Frosting', priceModifier: 0 },
      { id: 'frost-chocolate', name: 'Chocolate Frosting', priceModifier: 0 },
      { id: 'frost-cream-cheese', name: 'Cream Cheese Frosting', priceModifier: 1 },
      { id: 'frost-strawberry', name: 'Strawberry Frosting', priceModifier: 0.5 },
    ]
  },
  {
    id: 'vg10',
    name: 'Sprinkles',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'sprinkle-rainbow', name: 'Rainbow Sprinkles', priceModifier: 0.5 },
      { id: 'sprinkle-chocolate', name: 'Chocolate Chips', priceModifier: 1 },
      { id: 'sprinkle-nuts', name: 'Crushed Nuts', priceModifier: 1.5 },
    ]
  },
];

// Products/Menu Items
export const products = [
  // ===== COFFEE =====
  {
    id: 'p1',
    name: 'Americano',
    category: 'Coffee',
    categoryId: 'cat-coffee',
    price: 4.5,
    image: '/products/americano.jpg',
    description: 'Classic espresso with hot water',
    stock: 100,
    available: true,
    hasVariants: true,
    variantGroups: ['vg1', 'vg2', 'vg3', 'vg4'], // Size, Sugar, Temp, Add-ons
  },
  {
    id: 'p2',
    name: 'Caramel Macchiato',
    category: 'Coffee',
    categoryId: 'cat-coffee',
    price: 6.5,
    image: '/products/caramel-macchiato.jpg',
    description: 'Espresso with vanilla and caramel',
    stock: 85,
    available: true,
    hasVariants: true,
    variantGroups: ['vg1', 'vg2', 'vg3', 'vg4', 'vg5'], // Size, Sugar, Temp, Add-ons, Milk
  },
  
  // ===== FOOD =====
  {
    id: 'p3',
    name: 'Nasi Goreng',
    category: 'Food',
    categoryId: 'cat-food',
    price: 8.0,
    image: '/products/nasi-goreng.jpg',
    description: 'Indonesian fried rice with chicken',
    stock: 50,
    available: true,
    hasVariants: false,
    variantGroups: [],
  },
  {
    id: 'p4',
    name: 'Mie Goreng',
    category: 'Food',
    categoryId: 'cat-food',
    price: 7.5,
    image: '/products/mie-goreng.jpg',
    description: 'Indonesian fried noodles',
    stock: 45,
    available: true,
    hasVariants: false,
    variantGroups: [],
  },
  
  // ===== SNACK =====
  {
    id: 'p5',
    name: 'French Fries',
    category: 'Snack',
    categoryId: 'cat-snack',
    price: 5.0,
    image: '/products/french-fries.jpg',
    description: 'Crispy golden french fries',
    stock: 120,
    available: true,
    hasVariants: true,
    variantGroups: ['vg6', 'vg7', 'vg8'], // Portion, Toppings, Sauce
  },
  {
    id: 'p6',
    name: 'Mix Platter',
    category: 'Snack',
    categoryId: 'cat-snack',
    price: 12.0,
    image: '/products/mix-platter.jpg',
    description: 'Assorted snacks platter',
    stock: 35,
    available: true,
    hasVariants: true,
    variantGroups: ['vg6', 'vg8'], // Portion, Sauce
  },
  
  // ===== DESSERT =====
  {
    id: 'p7',
    name: 'Donut',
    category: 'Dessert',
    categoryId: 'cat-dessert',
    price: 3.5,
    image: '/products/donut.jpg',
    description: 'Fresh glazed donut',
    stock: 80,
    available: true,
    hasVariants: true,
    variantGroups: ['vg9', 'vg10'], // Frosting, Sprinkles
  },
  {
    id: 'p8',
    name: 'Cake',
    category: 'Dessert',
    categoryId: 'cat-dessert',
    price: 6.0,
    image: '/products/cake.jpg',
    description: 'Slice of homemade cake',
    stock: 40,
    available: true,
    hasVariants: true,
    variantGroups: ['vg6', 'vg9', 'vg10'], // Portion, Frosting, Sprinkles
  },
  
  // ===== NON COFFEE =====
  {
    id: 'p9',
    name: 'Matcha',
    category: 'Non Coffee',
    categoryId: 'cat-non-coffee',
    price: 5.5,
    image: '/products/matcha.jpg',
    description: 'Premium Japanese matcha latte',
    stock: 70,
    available: true,
    hasVariants: true,
    variantGroups: ['vg1', 'vg2', 'vg3', 'vg5'], // Size, Sugar, Temp, Milk
  },
  {
    id: 'p10',
    name: 'Red Velvet',
    category: 'Non Coffee',
    categoryId: 'cat-non-coffee',
    price: 6.0,
    image: '/products/red-velvet.jpg',
    description: 'Red velvet latte with cream',
    stock: 65,
    available: true,
    hasVariants: true,
    variantGroups: ['vg1', 'vg2', 'vg3', 'vg5'], // Size, Sugar, Temp, Milk
  },
];

// Categories
export const categories = [
  { id: 'cat-coffee', name: 'Coffee', icon: '☕', count: 2 },
  { id: 'cat-food', name: 'Food', icon: '🍽️', count: 2 },
  { id: 'cat-snack', name: 'Snack', icon: '🍟', count: 2 },
  { id: 'cat-dessert', name: 'Dessert', icon: '🍰', count: 2 },
  { id: 'cat-non-coffee', name: 'Non Coffee', icon: '🍵', count: 2 },
];

// Inventory Items
export const inventoryItems = [
  // Coffee Ingredients
  { id: 'inv1', name: 'Coffee Beans', category: 'Ingredients', currentStock: 5000, reorderLevel: 1000, unit: 'gram', supplier: 'PT Kopi Nusantara', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  { id: 'inv2', name: 'Water', category: 'Ingredients', currentStock: 50000, reorderLevel: 10000, unit: 'ml', supplier: 'Aqua', lastRestocked: '2025-11-07', status: 'in-stock' as const },
  { id: 'inv3', name: 'Ice Cubes', category: 'Ingredients', currentStock: 8000, reorderLevel: 2000, unit: 'gram', supplier: 'Ice Factory', lastRestocked: '2025-11-08', status: 'in-stock' as const },
  { id: 'inv4', name: 'Milk', category: 'Ingredients', currentStock: 8000, reorderLevel: 3000, unit: 'ml', supplier: 'Dairy Farm Ltd', lastRestocked: '2025-11-07', status: 'in-stock' as const },
  { id: 'inv5', name: 'Sugar', category: 'Ingredients', currentStock: 5000, reorderLevel: 1000, unit: 'gram', supplier: 'Sweet Supply Co', lastRestocked: '2025-11-01', status: 'in-stock' as const },
  { id: 'inv6', name: 'Vanilla Syrup', category: 'Ingredients', currentStock: 2000, reorderLevel: 500, unit: 'ml', supplier: 'Flavor World', lastRestocked: '2025-11-02', status: 'in-stock' as const },
  { id: 'inv7', name: 'Chocolate Syrup', category: 'Ingredients', currentStock: 1500, reorderLevel: 500, unit: 'ml', supplier: 'Flavor World', lastRestocked: '2025-11-03', status: 'in-stock' as const },
  { id: 'inv8', name: 'Caramel Syrup', category: 'Ingredients', currentStock: 500, reorderLevel: 300, unit: 'ml', supplier: 'Flavor World', lastRestocked: '2025-11-04', status: 'low-stock' as const },
  { id: 'inv9', name: 'Whipped Cream', category: 'Ingredients', currentStock: 1000, reorderLevel: 500, unit: 'gram', supplier: 'Dairy Farm Ltd', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  
  // Cups/Packaging
  { id: 'inv10', name: 'Cup Small', category: 'Packaging', currentStock: 500, reorderLevel: 100, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-11-06', status: 'in-stock' as const },
  { id: 'inv11', name: 'Cup Medium', category: 'Packaging', currentStock: 200, reorderLevel: 150, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-11-06', status: 'low-stock' as const },
  { id: 'inv12', name: 'Cup Large', category: 'Packaging', currentStock: 300, reorderLevel: 100, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-11-06', status: 'in-stock' as const },
  
  // Food Ingredients
  { id: 'inv13', name: 'Rice', category: 'Ingredients', currentStock: 10000, reorderLevel: 3000, unit: 'gram', supplier: 'Local Farm', lastRestocked: '2025-11-06', status: 'in-stock' as const },
  { id: 'inv14', name: 'Chicken', category: 'Ingredients', currentStock: 5000, reorderLevel: 2000, unit: 'gram', supplier: 'Fresh Meat Ltd', lastRestocked: '2025-11-07', status: 'in-stock' as const },
  { id: 'inv15', name: 'Vegetables', category: 'Ingredients', currentStock: 3000, reorderLevel: 1000, unit: 'gram', supplier: 'Veggie Mart', lastRestocked: '2025-11-06', status: 'in-stock' as const },
  { id: 'inv16', name: 'Cooking Oil', category: 'Ingredients', currentStock: 5000, reorderLevel: 1000, unit: 'ml', supplier: 'Oil Co', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  { id: 'inv17', name: 'Spices', category: 'Ingredients', currentStock: 500, reorderLevel: 100, unit: 'gram', supplier: 'Spice Market', lastRestocked: '2025-11-04', status: 'in-stock' as const },
  
  // Others
  { id: 'inv18', name: 'Matcha Powder', category: 'Ingredients', currentStock: 800, reorderLevel: 200, unit: 'gram', supplier: 'Japanese Import Co', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  { id: 'inv19', name: 'Cocoa Powder', category: 'Ingredients', currentStock: 1500, reorderLevel: 500, unit: 'gram', supplier: 'Bakery Supply Co', lastRestocked: '2025-11-04', status: 'in-stock' as const },
  { id: 'inv20', name: 'Plastic Lids', category: 'Packaging', currentStock: 150, reorderLevel: 300, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-10-28', status: 'low-stock' as const },
];

// Orders - untuk Order page
export const orders = [
  {
    id: 'ord1',
    orderNumber: '#FO027',
    table: 'Table 03',
    customerName: 'Fajar Kim',
    itemCount: 3,
    items: [
      { id: 'p1', name: 'Americano', quantity: 2, price: 4.5, variants: { size: 'Regular', sugar: 'Normal', temp: 'Hot' } },
      { id: 'p7', name: 'Donut', quantity: 1, price: 3.5, variants: { frosting: 'Chocolate' } },
    ],
    total: 12.5,
    subtotal: 11.5,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '09:50',
    timeAgo: '2 mins ago',
    status: 'in-kitchen' as const,
    orderType: 'Dine in',
    paymentMethod: 'Cash',
  },
  {
    id: 'ord2',
    orderNumber: '#FO028',
    table: 'Table 07',
    customerName: 'Andin',
    itemCount: 4,
    items: [
      { id: 'p2', name: 'Caramel Macchiato', quantity: 1, price: 6.5, variants: { size: 'Large', sugar: 'Less', temp: 'Iced' } },
      { id: 'p5', name: 'French Fries', quantity: 1, price: 5.0, variants: { portion: 'Regular' } },
      { id: 'p3', name: 'Nasi Goreng', quantity: 2, price: 8.0, variants: null },
    ],
    total: 28.5,
    subtotal: 27.5,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '10:05',
    timeAgo: 'Just Now',
    status: 'wait-list' as const,
    orderType: 'Dine in',
    paymentMethod: 'Card',
  },
  {
    id: 'ord3',
    orderNumber: '#FO019',
    table: 'Table 09',
    customerName: 'Anton',
    itemCount: 2,
    items: [
      { id: 'p9', name: 'Matcha', quantity: 1, price: 5.5, variants: { size: 'Large', sugar: 'Normal', temp: 'Iced' } },
      { id: 'p8', name: 'Cake', quantity: 1, price: 6.0, variants: { portion: 'Regular', frosting: 'Vanilla' } },
    ],
    total: 12.5,
    subtotal: 11.5,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '09:30',
    timeAgo: '25 mins ago',
    status: 'ready' as const,
    orderType: 'Dine in',
    paymentMethod: 'Card',
  },
  {
    id: 'ord4',
    orderNumber: '#FO020',
    table: 'Table 05',
    customerName: 'Siti',
    itemCount: 3,
    items: [
      { id: 'p4', name: 'Mie Goreng', quantity: 2, price: 7.5, variants: null },
      { id: 'p10', name: 'Red Velvet', quantity: 1, price: 6.0, variants: { size: 'Regular', temp: 'Hot' } },
    ],
    total: 22.0,
    subtotal: 21.0,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '10:15',
    timeAgo: '5 mins ago',
    status: 'in-progress' as const,
    orderType: 'Take Away',
    paymentMethod: 'Cash',
  },
  {
    id: 'ord5',
    orderNumber: '#FO021',
    table: 'Counter',
    customerName: 'Budi',
    itemCount: 5,
    items: [
      { id: 'p6', name: 'Mix Platter', quantity: 1, price: 12.0, variants: { portion: 'Large' } },
      { id: 'p1', name: 'Americano', quantity: 2, price: 4.5, variants: { size: 'Regular' } },
      { id: 'p7', name: 'Donut', quantity: 2, price: 3.5, variants: { frosting: 'Strawberry' } },
    ],
    total: 28.0,
    subtotal: 27.0,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '10:20',
    timeAgo: '1 min ago',
    status: 'ready' as const,
    orderType: 'Take Away',
    paymentMethod: 'Card',
  },
];

// Dashboard Analytics Data
export const dashboardAnalytics = {
  totalSales: {
    today: 1250.50,
    thisWeek: 8750.25,
    thisMonth: 32500.75,
    growth: 12.5, // percentage
  },
  totalOrders: {
    today: 45,
    thisWeek: 315,
    thisMonth: 1340,
    growth: 8.3,
  },
  totalCustomers: {
    today: 38,
    thisWeek: 275,
    thisMonth: 1150,
    growth: 5.7,
  },
  favoriteProducts: [
    { id: 'p1', name: 'Americano', category: 'Coffee', orderCount: 156, revenue: 702.0 },
    { id: 'p2', name: 'Caramel Macchiato', category: 'Coffee', orderCount: 134, revenue: 871.0 },
    { id: 'p3', name: 'Nasi Goreng', category: 'Food', orderCount: 98, revenue: 784.0 },
    { id: 'p5', name: 'French Fries', category: 'Snack', orderCount: 89, revenue: 445.0 },
    { id: 'p9', name: 'Matcha', category: 'Non Coffee', orderCount: 76, revenue: 418.0 },
  ],
  peakHours: [
    { hour: '08:00', orders: 12, revenue: 145.5 },
    { hour: '09:00', orders: 18, revenue: 225.0 },
    { hour: '10:00', orders: 24, revenue: 310.5 },
    { hour: '11:00', orders: 15, revenue: 198.0 },
    { hour: '12:00', orders: 28, revenue: 385.5 },
    { hour: '13:00', orders: 22, revenue: 290.0 },
    { hour: '14:00', orders: 16, revenue: 210.5 },
    { hour: '15:00', orders: 20, revenue: 255.0 },
  ],
  paymentMethods: [
    { method: 'Cash', count: 145, percentage: 48.3, amount: 3625.50 },
    { method: 'Card', count: 125, percentage: 41.7, amount: 4125.75 },
    { method: 'E-Wallet', count: 30, percentage: 10.0, amount: 749.50 },
  ],
  categorySales: [
    { category: 'Coffee', revenue: 4250.0, percentage: 35.4, orderCount: 290 },
    { category: 'Food', revenue: 3120.0, percentage: 26.0, orderCount: 198 },
    { category: 'Snack', revenue: 2145.5, percentage: 17.9, orderCount: 189 },
    { category: 'Dessert', revenue: 1485.25, percentage: 12.4, orderCount: 156 },
    { category: 'Non Coffee', revenue: 999.0, percentage: 8.3, orderCount: 112 },
  ],
};

// Helper function to get variant groups for a product
export const getProductVariantGroups = (productId: string) => {
  const product = products.find(p => p.id === productId);
  if (!product || !product.hasVariants) return [];
  
  return variantGroups.filter(vg => product.variantGroups.includes(vg.id));
};

// Helper function to calculate price with variants
export const calculatePriceWithVariants = (basePrice: number, selectedVariants: Record<string, string[]>) => {
  let total = basePrice;
  
  Object.entries(selectedVariants).forEach(([groupId, optionIds]) => {
    const group = variantGroups.find(vg => vg.id === groupId);
    if (!group) return;
    
    optionIds.forEach(optionId => {
      const option = group.options.find(opt => opt.id === optionId);
      if (option) {
        total += option.priceModifier;
      }
    });
  });
  
  return total;
};

// ============================================
// RECIPE SYSTEM & INVENTORY TRACKING
// ============================================

// Recipe Types
export interface RecipeIngredient {
  inventoryItemId: string
  ingredientName: string
  quantityNeeded: number
  unit: string
}

export interface Recipe {
  id: string
  productId: string
  productName: string
  recipeType: 'base' | 'variant-specific'
  variantCombination?: Record<string, string> // { 'vg1': 'size-large', 'vg3': 'temp-iced' }
  ingredients: RecipeIngredient[]
  createdAt: string
  updatedAt: string
}

export interface UsedIngredient {
  inventoryItemId: string
  ingredientName: string
  quantityUsed: number
  unit: string
  previousStock: number
  newStock: number
}

export interface UsageTransaction {
  id: string
  timestamp: string
  type: 'sale' | 'restock' | 'adjustment' | 'waste'
  productId?: string
  productName?: string
  quantitySold?: number
  ingredients: UsedIngredient[]
  performedBy: string
  notes?: string
}

// Recipes Data
export const recipes: Recipe[] = [
  // Americano - Base Recipe
  {
    id: 'recipe-americano-base',
    productId: 'p1',
    productName: 'Americano',
    recipeType: 'base',
    ingredients: [
      { inventoryItemId: 'inv1', ingredientName: 'Coffee Beans', quantityNeeded: 18, unit: 'gram' },
      { inventoryItemId: 'inv2', ingredientName: 'Water', quantityNeeded: 200, unit: 'ml' },
      { inventoryItemId: 'inv11', ingredientName: 'Cup Medium', quantityNeeded: 1, unit: 'pcs' }
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  // Americano - Iced Large
  {
    id: 'recipe-americano-iced-large',
    productId: 'p1',
    productName: 'Americano (Iced Large)',
    recipeType: 'variant-specific',
    variantCombination: { 'vg1': 'size-large', 'vg3': 'temp-iced' },
    ingredients: [
      { inventoryItemId: 'inv1', ingredientName: 'Coffee Beans', quantityNeeded: 22, unit: 'gram' },
      { inventoryItemId: 'inv2', ingredientName: 'Water', quantityNeeded: 150, unit: 'ml' },
      { inventoryItemId: 'inv3', ingredientName: 'Ice Cubes', quantityNeeded: 100, unit: 'gram' },
      { inventoryItemId: 'inv12', ingredientName: 'Cup Large', quantityNeeded: 1, unit: 'pcs' }
    ],
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z'
  },
  // Americano - Hot Small
  {
    id: 'recipe-americano-hot-small',
    productId: 'p1',
    productName: 'Americano (Hot Small)',
    recipeType: 'variant-specific',
    variantCombination: { 'vg1': 'size-small', 'vg3': 'temp-hot' },
    ingredients: [
      { inventoryItemId: 'inv1', ingredientName: 'Coffee Beans', quantityNeeded: 14, unit: 'gram' },
      { inventoryItemId: 'inv2', ingredientName: 'Water', quantityNeeded: 150, unit: 'ml' },
      { inventoryItemId: 'inv10', ingredientName: 'Cup Small', quantityNeeded: 1, unit: 'pcs' }
    ],
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z'
  },
  // Caramel Macchiato - Base Recipe
  {
    id: 'recipe-macchiato-base',
    productId: 'p2',
    productName: 'Caramel Macchiato',
    recipeType: 'base',
    ingredients: [
      { inventoryItemId: 'inv1', ingredientName: 'Coffee Beans', quantityNeeded: 18, unit: 'gram' },
      { inventoryItemId: 'inv4', ingredientName: 'Milk', quantityNeeded: 150, unit: 'ml' },
      { inventoryItemId: 'inv8', ingredientName: 'Caramel Syrup', quantityNeeded: 20, unit: 'ml' },
      { inventoryItemId: 'inv11', ingredientName: 'Cup Medium', quantityNeeded: 1, unit: 'pcs' }
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  // Nasi Goreng - Base Recipe
  {
    id: 'recipe-nasigoreng-base',
    productId: 'p3',
    productName: 'Nasi Goreng',
    recipeType: 'base',
    ingredients: [
      { inventoryItemId: 'inv13', ingredientName: 'Rice', quantityNeeded: 200, unit: 'gram' },
      { inventoryItemId: 'inv14', ingredientName: 'Chicken', quantityNeeded: 100, unit: 'gram' },
      { inventoryItemId: 'inv15', ingredientName: 'Vegetables', quantityNeeded: 50, unit: 'gram' },
      { inventoryItemId: 'inv16', ingredientName: 'Cooking Oil', quantityNeeded: 20, unit: 'ml' },
      { inventoryItemId: 'inv17', ingredientName: 'Spices', quantityNeeded: 10, unit: 'gram' }
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

// Usage Transactions (History)
export const usageTransactions: UsageTransaction[] = [
  {
    id: 'usage-1',
    timestamp: '2025-11-10T14:23:00Z',
    type: 'sale',
    productId: 'p1',
    productName: 'Americano',
    quantitySold: 3,
    ingredients: [
      {
        inventoryItemId: 'inv1',
        ingredientName: 'Coffee Beans',
        quantityUsed: 54,
        unit: 'gram',
        previousStock: 5000,
        newStock: 4946
      },
      {
        inventoryItemId: 'inv2',
        ingredientName: 'Water',
        quantityUsed: 600,
        unit: 'ml',
        previousStock: 50000,
        newStock: 49400
      },
      {
        inventoryItemId: 'inv11',
        ingredientName: 'Cup Medium',
        quantityUsed: 3,
        unit: 'pcs',
        previousStock: 200,
        newStock: 197
      }
    ],
    performedBy: 'staff-1',
    notes: 'Regular order'
  },
  {
    id: 'usage-2',
    timestamp: '2025-11-10T13:45:00Z',
    type: 'restock',
    ingredients: [
      {
        inventoryItemId: 'inv1',
        ingredientName: 'Coffee Beans',
        quantityUsed: -2000,
        unit: 'gram',
        previousStock: 3000,
        newStock: 5000
      }
    ],
    performedBy: 'manager-1',
    notes: 'Weekly restock'
  },
  {
    id: 'usage-3',
    timestamp: '2025-11-10T12:15:00Z',
    type: 'sale',
    productId: 'p2',
    productName: 'Caramel Macchiato',
    quantitySold: 1,
    ingredients: [
      {
        inventoryItemId: 'inv1',
        ingredientName: 'Coffee Beans',
        quantityUsed: 18,
        unit: 'gram',
        previousStock: 3018,
        newStock: 3000
      },
      {
        inventoryItemId: 'inv4',
        ingredientName: 'Milk',
        quantityUsed: 150,
        unit: 'ml',
        previousStock: 3500,
        newStock: 3350
      },
      {
        inventoryItemId: 'inv8',
        ingredientName: 'Caramel Syrup',
        quantityUsed: 20,
        unit: 'ml',
        previousStock: 500,
        newStock: 480
      },
      {
        inventoryItemId: 'inv11',
        ingredientName: 'Cup Medium',
        quantityUsed: 1,
        unit: 'pcs',
        previousStock: 201,
        newStock: 200
      }
    ],
    performedBy: 'staff-2',
    notes: 'Morning rush'
  }
];

// Helper: Find matching recipe for product + variants
export const findMatchingRecipe = (productId: string, variantCombination?: Record<string, string>): Recipe | null => {
  // 1. Try to find variant-specific recipe
  if (variantCombination) {
    const variantRecipe = recipes.find(r =>
      r.productId === productId &&
      r.recipeType === 'variant-specific' &&
      JSON.stringify(r.variantCombination) === JSON.stringify(variantCombination)
    );
    if (variantRecipe) return variantRecipe;
  }

  // 2. Fallback to base recipe
  const baseRecipe = recipes.find(r =>
    r.productId === productId &&
    r.recipeType === 'base'
  );
  
  return baseRecipe || null;
};

// Helper: Calculate how many servings can be made
export const calculateCanMake = (recipe: Recipe, inventoryItems: Array<{id: string, currentStock: number}>): number => {
  let minServings = Infinity;

  for (const ingredient of recipe.ingredients) {
    const inventoryItem = inventoryItems.find((i: {id: string, currentStock: number}) => i.id === ingredient.inventoryItemId);
    if (!inventoryItem) return 0;

    const possibleServings = Math.floor(inventoryItem.currentStock / ingredient.quantityNeeded);
    minServings = Math.min(minServings, possibleServings);
  }

  return minServings === Infinity ? 0 : minServings;
};
