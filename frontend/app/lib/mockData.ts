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
  { id: 'inv1', name: 'Coffee Beans (Arabica)', category: 'Ingredients', currentStock: 25, reorderLevel: 10, unit: 'kg', supplier: 'PT Kopi Nusantara', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  { id: 'inv2', name: 'Fresh Milk', category: 'Ingredients', currentStock: 8, reorderLevel: 15, unit: 'liters', supplier: 'Dairy Farm Ltd', lastRestocked: '2025-11-07', status: 'low-stock' as const },
  { id: 'inv3', name: 'Sugar', category: 'Ingredients', currentStock: 50, reorderLevel: 20, unit: 'kg', supplier: 'Sweet Supply Co', lastRestocked: '2025-11-01', status: 'in-stock' as const },
  { id: 'inv4', name: 'Caramel Syrup', category: 'Ingredients', currentStock: 12, reorderLevel: 8, unit: 'bottles', supplier: 'Flavor World', lastRestocked: '2025-11-04', status: 'in-stock' as const },
  { id: 'inv5', name: 'Vanilla Syrup', category: 'Ingredients', currentStock: 3, reorderLevel: 5, unit: 'bottles', supplier: 'Flavor World', lastRestocked: '2025-11-02', status: 'low-stock' as const },
  
  // Food Ingredients
  { id: 'inv6', name: 'Rice', category: 'Ingredients', currentStock: 100, reorderLevel: 30, unit: 'kg', supplier: 'Local Farm', lastRestocked: '2025-11-06', status: 'in-stock' as const },
  { id: 'inv7', name: 'Noodles', category: 'Ingredients', currentStock: 45, reorderLevel: 20, unit: 'kg', supplier: 'Asian Food Co', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  { id: 'inv8', name: 'Chicken Breast', category: 'Ingredients', currentStock: 20, reorderLevel: 15, unit: 'kg', supplier: 'Fresh Meat Ltd', lastRestocked: '2025-11-07', status: 'in-stock' as const },
  
  // Snack Ingredients
  { id: 'inv9', name: 'Potatoes', category: 'Ingredients', currentStock: 35, reorderLevel: 25, unit: 'kg', supplier: 'Veggie Mart', lastRestocked: '2025-11-06', status: 'in-stock' as const },
  { id: 'inv10', name: 'Cheese', category: 'Ingredients', currentStock: 5, reorderLevel: 10, unit: 'kg', supplier: 'Dairy Farm Ltd', lastRestocked: '2025-10-28', status: 'low-stock' as const },
  
  // Dessert Ingredients
  { id: 'inv11', name: 'Flour', category: 'Ingredients', currentStock: 60, reorderLevel: 30, unit: 'kg', supplier: 'Bakery Supply Co', lastRestocked: '2025-11-03', status: 'in-stock' as const },
  { id: 'inv12', name: 'Eggs', category: 'Ingredients', currentStock: 200, reorderLevel: 100, unit: 'pcs', supplier: 'Farm Fresh', lastRestocked: '2025-11-07', status: 'in-stock' as const },
  { id: 'inv13', name: 'Chocolate Chips', category: 'Ingredients', currentStock: 0, reorderLevel: 5, unit: 'kg', supplier: 'Sweet Supply Co', lastRestocked: '2025-10-20', status: 'out-of-stock' as const },
  
  // Non-Coffee Ingredients
  { id: 'inv14', name: 'Matcha Powder', category: 'Ingredients', currentStock: 8, reorderLevel: 5, unit: 'kg', supplier: 'Japanese Import Co', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  { id: 'inv15', name: 'Cocoa Powder', category: 'Ingredients', currentStock: 15, reorderLevel: 8, unit: 'kg', supplier: 'Bakery Supply Co', lastRestocked: '2025-11-04', status: 'in-stock' as const },
  
  // Packaging
  { id: 'inv16', name: 'Paper Cups (12oz)', category: 'Packaging', currentStock: 500, reorderLevel: 200, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-11-06', status: 'in-stock' as const },
  { id: 'inv17', name: 'Plastic Lids', category: 'Packaging', currentStock: 150, reorderLevel: 300, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-10-28', status: 'low-stock' as const },
  { id: 'inv18', name: 'Food Containers', category: 'Packaging', currentStock: 250, reorderLevel: 150, unit: 'pcs', supplier: 'Package Pro', lastRestocked: '2025-11-05', status: 'in-stock' as const },
  
  // Cleaning
  { id: 'inv19', name: 'Dish Soap', category: 'Cleaning', currentStock: 10, reorderLevel: 5, unit: 'bottles', supplier: 'Clean Tech', lastRestocked: '2025-11-03', status: 'in-stock' as const },
  { id: 'inv20', name: 'Sanitizer', category: 'Cleaning', currentStock: 0, reorderLevel: 8, unit: 'bottles', supplier: 'Clean Tech', lastRestocked: '2025-10-15', status: 'out-of-stock' as const },
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
