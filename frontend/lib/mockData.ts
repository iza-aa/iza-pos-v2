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
      { id: 'size-small', name: 'Small', priceModifier: -5000 },
      { id: 'size-regular', name: 'Regular', priceModifier: 0 },
      { id: 'size-large', name: 'Large', priceModifier: 8000 },
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
      { id: 'sugar-extra', name: 'Extra Sugar', priceModifier: 2000 },
    ]
  },
  {
    id: 'vg3',
    name: 'Temperature',
    type: 'single' as const,
    required: true,
    options: [
      { id: 'temp-hot', name: 'Hot', priceModifier: 0 },
      { id: 'temp-iced', name: 'Iced', priceModifier: 3000 },
    ]
  },
  {
    id: 'vg4',
    name: 'Add-ons',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'addon-extra-shot', name: 'Extra Shot', priceModifier: 8000 },
      { id: 'addon-whipped-cream', name: 'Whipped Cream', priceModifier: 5000 },
      { id: 'addon-caramel-drizzle', name: 'Caramel Drizzle', priceModifier: 6000 },
      { id: 'addon-vanilla-syrup', name: 'Vanilla Syrup', priceModifier: 5000 },
      { id: 'addon-chocolate-syrup', name: 'Chocolate Syrup', priceModifier: 5000 },
    ]
  },
  {
    id: 'vg5',
    name: 'Milk Type',
    type: 'single' as const,
    required: false,
    options: [
      { id: 'milk-regular', name: 'Regular Milk', priceModifier: 0 },
      { id: 'milk-soy', name: 'Soy Milk', priceModifier: 5000 },
      { id: 'milk-almond', name: 'Almond Milk', priceModifier: 8000 },
      { id: 'milk-oat', name: 'Oat Milk', priceModifier: 8000 },
    ]
  },
  {
    id: 'vg6',
    name: 'Portion Size',
    type: 'single' as const,
    required: true,
    options: [
      { id: 'portion-regular', name: 'Regular', priceModifier: 0 },
      { id: 'portion-large', name: 'Large', priceModifier: 10000 },
      { id: 'portion-jumbo', name: 'Jumbo', priceModifier: 20000 },
    ]
  },
  {
    id: 'vg7',
    name: 'Toppings',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'topping-cheese', name: 'Extra Cheese', priceModifier: 8000 },
      { id: 'topping-bacon', name: 'Bacon Bits', priceModifier: 12000 },
      { id: 'topping-mushroom', name: 'Sautéed Mushroom', priceModifier: 10000 },
      { id: 'topping-onion-rings', name: 'Onion Rings', priceModifier: 8000 },
    ]
  },
  {
    id: 'vg8',
    name: 'Sauce Selection',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'sauce-bbq', name: 'BBQ Sauce', priceModifier: 2000 },
      { id: 'sauce-mayo', name: 'Mayonnaise', priceModifier: 2000 },
      { id: 'sauce-chili', name: 'Chili Sauce', priceModifier: 2000 },
      { id: 'sauce-garlic', name: 'Garlic Aioli', priceModifier: 3000 },
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
      { id: 'frost-cream-cheese', name: 'Cream Cheese Frosting', priceModifier: 5000 },
      { id: 'frost-strawberry', name: 'Strawberry Frosting', priceModifier: 3000 },
    ]
  },
  {
    id: 'vg10',
    name: 'Sprinkles',
    type: 'multiple' as const,
    required: false,
    options: [
      { id: 'sprinkle-rainbow', name: 'Rainbow Sprinkles', priceModifier: 2000 },
      { id: 'sprinkle-chocolate', name: 'Chocolate Chips', priceModifier: 4000 },
      { id: 'sprinkle-nuts', name: 'Crushed Nuts', priceModifier: 5000 },
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
    price: 25000,
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
    price: 35000,
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
    price: 30000,
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
    price: 28000,
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
    price: 20000,
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
    price: 45000,
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
    price: 15000,
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
    price: 35000,
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
    price: 30000,
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
    price: 32000,
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
      { id: 'p1', name: 'Americano', quantity: 2, price: 4.5, variants: { size: 'Regular', sugar: 'Normal', temp: 'Hot' }, served: false },
      { id: 'p7', name: 'Donut', quantity: 1, price: 3.5, variants: { frosting: 'Chocolate' }, served: false },
    ],
    total: 12.5,
    subtotal: 11.5,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '09:50',
    timeAgo: '2 mins ago',
    status: 'new' as const,
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
      { id: 'p2', name: 'Caramel Macchiato', quantity: 1, price: 6.5, variants: { size: 'Large', sugar: 'Less', temp: 'Iced' }, served: false },
      { id: 'p5', name: 'French Fries', quantity: 1, price: 5.0, variants: { portion: 'Regular' }, served: false },
      { id: 'p3', name: 'Nasi Goreng', quantity: 2, price: 8.0, variants: null, served: false },
    ],
    total: 28.5,
    subtotal: 27.5,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '10:05',
    timeAgo: 'Just Now',
    status: 'preparing' as const,
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
      { id: 'p9', name: 'Matcha', quantity: 1, price: 5.5, variants: { size: 'Large', sugar: 'Normal', temp: 'Iced' }, served: true, servedAt: '09:45 AM' },
      { id: 'p8', name: 'Cake', quantity: 1, price: 6.0, variants: { portion: 'Regular', frosting: 'Vanilla' }, served: false },
    ],
    total: 12.5,
    subtotal: 11.5,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '09:30',
    timeAgo: '25 mins ago',
    status: 'partially-served' as const,
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
      { id: 'p4', name: 'Mie Goreng', quantity: 2, price: 7.5, variants: null, served: true, servedAt: '10:10 AM' },
      { id: 'p10', name: 'Red Velvet', quantity: 1, price: 6.0, variants: { size: 'Regular', temp: 'Hot' }, served: true, servedAt: '10:12 AM' },
    ],
    total: 22.0,
    subtotal: 21.0,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '10:15',
    timeAgo: '5 mins ago',
    status: 'served' as const,
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
      { id: 'p6', name: 'Mix Platter', quantity: 1, price: 12.0, variants: { portion: 'Large' }, served: true, servedAt: '10:18 AM' },
      { id: 'p1', name: 'Americano', quantity: 2, price: 4.5, variants: { size: 'Regular' }, served: true, servedAt: '10:19 AM' },
      { id: 'p7', name: 'Donut', quantity: 2, price: 3.5, variants: { frosting: 'Strawberry' }, served: true, servedAt: '10:19 AM' },
    ],
    total: 28.0,
    subtotal: 27.0,
    tax: 1.0,
    date: 'Friday, 9 Nov 2025',
    time: '10:20',
    timeAgo: '1 min ago',
    status: 'served' as const,
    orderType: 'Take Away',
    paymentMethod: 'Card',
  },
  {
    id: 'ord6',
    orderNumber: '#044',
    table: 'Table 03',
    customerName: 'Robert Fox',
    itemCount: 2,
    items: [
      { id: 'p3', name: 'Cheese Burger', quantity: 1, price: 12.0, variants: null, served: false },
      { id: 'p10', name: 'Lemonade', quantity: 1, price: 4.0, variants: null, served: false },
    ],
    total: 16.0,
    subtotal: 16.0,
    tax: 0,
    date: '7 Apr, 11:30 AM',
    time: '11:30 AM',
    timeAgo: '5 mins ago',
    status: 'new' as const,
    orderType: 'Dine in',
    paymentMethod: 'Cash',
  },
  {
    id: 'ord7',
    orderNumber: '#043',
    table: 'Table 05',
    customerName: 'Jenny Wilson',
    itemCount: 3,
    items: [
      { id: 'p3', name: 'Cheese Burger', quantity: 1, price: 12.0, variants: null, served: false },
      { id: 'p5', name: 'Salad with Sesame', quantity: 1, price: 16.0, variants: null, served: false },
      { id: 'p9', name: 'Noodles with Chicken', quantity: 1, price: 18.0, variants: null, served: false },
    ],
    total: 46.2,
    subtotal: 46.0,
    tax: 0.2,
    date: '7 Apr, 11:25 AM',
    time: '11:25 AM',
    timeAgo: '10 mins ago',
    status: 'preparing' as const,
    orderType: 'Dine in',
    paymentMethod: 'Card',
  },
  {
    id: 'ord8',
    orderNumber: '#042',
    table: 'Counter',
    customerName: 'Cameron William',
    itemCount: 2,
    items: [
      { id: 'p4', name: 'Special Sandwich Grill', quantity: 1, price: 14.0, variants: null, served: true, servedAt: '11:05 AM' },
      { id: 'p10', name: 'Sparkling Water', quantity: 1, price: 4.0, variants: null, served: true, servedAt: '11:05 AM' },
    ],
    total: 14.0,
    subtotal: 18.0,
    tax: 0,
    date: '7 Apr, 11:10 AM',
    time: '11:10 AM',
    timeAgo: '25 mins ago',
    status: 'served' as const,
    orderType: 'Take Away',
    paymentMethod: 'Card',
  },
  {
    id: 'ord9',
    orderNumber: '#041',
    table: 'Table 06',
    customerName: 'Olivia Hart',
    itemCount: 4,
    items: [
      { id: 'p5', name: 'Salad with Sesame', quantity: 2, price: 16.0, variants: null, served: false },
      { id: 'p9', name: 'Noodles with Chicken', quantity: 1, price: 12.0, variants: null, served: false },
      { id: 'p7', name: 'Fried Rice Special', quantity: 1, price: 14.0, variants: null, served: false },
    ],
    total: 32.0,
    subtotal: 32.0,
    tax: 0,
    date: '7 Apr, 11:09 AM',
    time: '11:09 AM',
    timeAgo: '26 mins ago',
    status: 'preparing' as const,
    orderType: 'Dine in',
    paymentMethod: 'Cash',
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

// ============================================
// ACTIVITY LOGS
// ============================================

import { ActivityLog } from './activityTypes';

export const activityLogs: ActivityLog[] = [
  // Critical - Delete Menu Item
  {
    id: 'log-001',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(), // 2 mins ago
    userId: 'manager-1',
    userName: 'John Doe',
    userRole: 'manager',
    userEmail: 'john@foodies.com',
    action: 'DELETE',
    actionCategory: 'MENU',
    actionDescription: 'Deleted menu item "Nasi Goreng Special"',
    resourceType: 'menu',
    resourceId: 'menu-123',
    resourceName: 'Nasi Goreng Special',
    previousValue: {
      name: 'Nasi Goreng Special',
      price: 25000,
      category: 'Main Course',
      available: true
    },
    changesSummary: ['Item permanently deleted'],
    ipAddress: '192.168.1.15',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-abc123',
    severity: 'critical',
    tags: ['menu', 'deletion', 'permanent'],
    isReversible: false,
    notes: 'Item discontinued due to ingredient shortage'
  },
  
  // Warning - Price Change
  {
    id: 'log-002',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
    userId: 'manager-1',
    userName: 'John Doe',
    userRole: 'manager',
    action: 'UPDATE',
    actionCategory: 'MENU',
    actionDescription: 'Updated menu item price',
    resourceType: 'menu',
    resourceId: 'menu-456',
    resourceName: 'Cappuccino',
    previousValue: { price: 15000 },
    newValue: { price: 18000 },
    changesSummary: ['price: Rp 15,000 → Rp 18,000'],
    ipAddress: '192.168.1.15',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-abc123',
    severity: 'warning',
    tags: ['menu', 'price-change', 'financial'],
    isReversible: true,
    notes: 'Price adjustment due to inflation'
  },
  
  // Warning - Large Stock Adjustment
  {
    id: 'log-003',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
    userId: 'staff-2',
    userName: 'Sarah Wilson',
    userRole: 'staff',
    action: 'ADJUST',
    actionCategory: 'INVENTORY',
    actionDescription: 'Manual stock adjustment for Beef',
    resourceType: 'inventory',
    resourceId: 'inv-5',
    resourceName: 'Beef',
    previousValue: { stock: 100, unit: 'kg' },
    newValue: { stock: 50, unit: 'kg' },
    changesSummary: ['stock: 100kg → 50kg (-50kg)'],
    ipAddress: '192.168.1.22',
    deviceInfo: 'Firefox 119 / macOS',
    sessionId: 'sess-xyz789',
    severity: 'warning',
    tags: ['inventory', 'adjustment', 'large-change'],
    isReversible: true,
    notes: 'Found expired stock during inventory check'
  },
  
  // Info - Order Created
  {
    id: 'log-004',
    timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), // 1 hour ago
    userId: 'staff-3',
    userName: 'Mike Chen',
    userRole: 'cashier',
    action: 'CREATE',
    actionCategory: 'SALES',
    actionDescription: 'Created new order #4521',
    resourceType: 'order',
    resourceId: 'order-4521',
    resourceName: 'Order #4521',
    newValue: {
      orderId: 'order-4521',
      total: 150000,
      items: 5,
      table: 12,
      status: 'pending'
    },
    changesSummary: ['Total: Rp 150,000', '5 items', 'Table 12'],
    ipAddress: '192.168.1.30',
    deviceInfo: 'Chrome 120 / Android 13',
    sessionId: 'sess-mobile-001',
    severity: 'info',
    tags: ['sales', 'order', 'pos'],
    isReversible: false
  },
  
  // Critical - Void Transaction
  {
    id: 'log-005',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    userId: 'manager-1',
    userName: 'John Doe',
    userRole: 'manager',
    action: 'VOID',
    actionCategory: 'FINANCIAL',
    actionDescription: 'Voided transaction #4515',
    resourceType: 'order',
    resourceId: 'order-4515',
    resourceName: 'Order #4515',
    previousValue: {
      total: 275000,
      status: 'completed',
      paymentMethod: 'cash'
    },
    newValue: {
      total: 275000,
      status: 'voided',
      voidReason: 'customer_complaint'
    },
    changesSummary: ['Status: completed → voided', 'Amount: Rp 275,000'],
    ipAddress: '192.168.1.15',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-abc123',
    severity: 'critical',
    tags: ['financial', 'void', 'manager-override'],
    isReversible: false,
    notes: 'Customer complaint about food quality'
  },
  
  // Critical - Failed Login Attempt
  {
    id: 'log-006',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    userId: 'unknown',
    userName: 'Unknown User',
    userRole: 'staff',
    action: 'LOGIN',
    actionCategory: 'AUTH',
    actionDescription: 'Failed login attempt',
    resourceType: 'user',
    resourceId: 'staff-5',
    resourceName: 'admin@foodies.com',
    changesSummary: ['Failed authentication', 'Invalid password'],
    ipAddress: '203.45.67.89',
    deviceInfo: 'Chrome 120 / Windows 10',
    sessionId: 'sess-failed-001',
    severity: 'critical',
    tags: ['auth', 'security', 'failed-login'],
    isReversible: false,
    notes: '3rd failed attempt in 10 minutes'
  },
  
  // Info - Successful Login
  {
    id: 'log-007',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
    userId: 'staff-2',
    userName: 'Sarah Wilson',
    userRole: 'staff',
    action: 'LOGIN',
    actionCategory: 'AUTH',
    actionDescription: 'User logged in successfully',
    resourceType: 'user',
    resourceId: 'staff-2',
    resourceName: 'sarah@foodies.com',
    changesSummary: ['Session started'],
    ipAddress: '192.168.1.22',
    deviceInfo: 'Firefox 119 / macOS',
    sessionId: 'sess-xyz789',
    severity: 'info',
    tags: ['auth', 'login'],
    isReversible: false
  },
  
  // Warning - Recipe Modified
  {
    id: 'log-008',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    userId: 'manager-1',
    userName: 'John Doe',
    userRole: 'manager',
    action: 'UPDATE',
    actionCategory: 'INVENTORY',
    actionDescription: 'Modified recipe for Latte',
    resourceType: 'recipe',
    resourceId: 'recipe-789',
    resourceName: 'Latte Recipe',
    previousValue: {
      ingredients: [
        { name: 'Coffee Beans', quantity: 18, unit: 'g' },
        { name: 'Milk', quantity: 200, unit: 'ml' }
      ]
    },
    newValue: {
      ingredients: [
        { name: 'Coffee Beans', quantity: 20, unit: 'g' },
        { name: 'Milk', quantity: 250, unit: 'ml' }
      ]
    },
    changesSummary: [
      'Coffee Beans: 18g → 20g',
      'Milk: 200ml → 250ml'
    ],
    ipAddress: '192.168.1.15',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-abc123',
    severity: 'warning',
    tags: ['recipe', 'inventory', 'modification'],
    isReversible: true,
    notes: 'Recipe improvement based on customer feedback'
  },
  
  // Info - Staff Created
  {
    id: 'log-009',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    userId: 'owner-1',
    userName: 'Owner Admin',
    userRole: 'owner',
    action: 'CREATE',
    actionCategory: 'STAFF',
    actionDescription: 'Created new staff account',
    resourceType: 'user',
    resourceId: 'staff-10',
    resourceName: 'Emily Brown',
    newValue: {
      name: 'Emily Brown',
      email: 'emily@foodies.com',
      role: 'cashier',
      status: 'active'
    },
    changesSummary: ['New staff member added', 'Role: Cashier'],
    ipAddress: '192.168.1.10',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-owner-001',
    severity: 'info',
    tags: ['staff', 'onboarding', 'hr'],
    isReversible: false
  },
  
  // Critical - Permission Changed
  {
    id: 'log-010',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    userId: 'owner-1',
    userName: 'Owner Admin',
    userRole: 'owner',
    action: 'UPDATE',
    actionCategory: 'STAFF',
    actionDescription: 'Updated staff permissions',
    resourceType: 'user',
    resourceId: 'staff-2',
    resourceName: 'Sarah Wilson',
    previousValue: { role: 'staff', permissions: ['pos', 'inventory_view'] },
    newValue: { role: 'manager', permissions: ['pos', 'inventory_view', 'inventory_edit', 'menu_edit'] },
    changesSummary: [
      'Role: staff → manager',
      'Added: inventory_edit, menu_edit'
    ],
    ipAddress: '192.168.1.10',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-owner-001',
    severity: 'critical',
    tags: ['staff', 'permissions', 'promotion'],
    isReversible: true,
    notes: 'Promoted to manager position'
  },
  
  // Info - Report Exported
  {
    id: 'log-011',
    timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
    userId: 'owner-1',
    userName: 'Owner Admin',
    userRole: 'owner',
    action: 'EXPORT',
    actionCategory: 'REPORT',
    actionDescription: 'Exported sales report',
    resourceType: 'report',
    resourceId: 'report-sales-nov',
    resourceName: 'Sales Report November 2025',
    newValue: {
      reportType: 'sales',
      period: 'November 2025',
      format: 'PDF',
      recordCount: 1547
    },
    changesSummary: ['1,547 transactions exported', 'Format: PDF'],
    ipAddress: '192.168.1.10',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-owner-001',
    severity: 'info',
    tags: ['report', 'export', 'sales'],
    isReversible: false
  },
  
  // Warning - Bulk Menu Update
  {
    id: 'log-012',
    timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), // 3 days ago
    userId: 'manager-1',
    userName: 'John Doe',
    userRole: 'manager',
    action: 'UPDATE',
    actionCategory: 'MENU',
    actionDescription: 'Bulk menu availability update',
    resourceType: 'menu',
    resourceId: 'bulk-001',
    resourceName: 'Multiple items (15)',
    changesSummary: ['15 items set to unavailable', 'Reason: Out of ingredients'],
    ipAddress: '192.168.1.15',
    deviceInfo: 'Chrome 120 / Windows 11',
    sessionId: 'sess-abc123',
    severity: 'warning',
    tags: ['menu', 'bulk-update', 'availability'],
    isReversible: true,
    notes: 'Temporary unavailability due to supply chain issues'
  },
  
  // Info - System Backup
  {
    id: 'log-013',
    timestamp: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), // 1 week ago
    userId: 'system',
    userName: 'System',
    userRole: 'owner',
    action: 'CREATE',
    actionCategory: 'SYSTEM',
    actionDescription: 'Automatic database backup',
    resourceType: 'backup',
    resourceId: 'backup-20251105',
    resourceName: 'Database Backup 2025-11-05',
    newValue: {
      size: '2.4GB',
      tables: 25,
      records: 156789
    },
    changesSummary: ['Backup completed successfully', 'Size: 2.4GB'],
    ipAddress: '127.0.0.1',
    deviceInfo: 'System Process',
    sessionId: 'system-cron',
    severity: 'info',
    tags: ['system', 'backup', 'automated'],
    isReversible: false
  }
];
