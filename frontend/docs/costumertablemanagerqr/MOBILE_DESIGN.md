# Mobile-First Design - Customer App

## 📱 Overview

Customer app didesain **mobile-first** dengan **bottom navigation** untuk pengalaman PWA yang optimal.

**Design System:**
- Max Width: 448px (md breakpoint)
- Bottom Nav Height: 64px
- Header Height: 56px
- Touch Target: min 44x44px
- **Icons:** Heroicons (outline & solid)
- **Color Scheme:** Monochrome (gray scale)
- **Style:** Clean, minimal, professional

---

## 🎨 Bottom Navigation

### Layout
```
┌─────────────────────────┐
│                         │
│   Content Area          │
│                         │
│                         │
│                         │
│                         │
├─────────────────────────┤
│  🏠    🍽️    📦    ⚙️  │ ← Bottom Nav (Fixed)
│ Home  Order Track Settings│
└─────────────────────────┘
```

### Navigation Items
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| HomeIcon | Home | `/customer/dashboard` | Dashboard & QR scanner |
| ShoppingBagIcon | Order | `/customer/order` | Browse menu & place order |
| ClockIcon | Track | `/customer/track` | Track active orders |
| Cog6ToothIcon | Settings | `/customer/settings` | Profile & preferences |

**Icon States:**
- **Active:** Solid variant, gray-900, font-medium
- **Inactive:** Outline variant, gray-400
- **Size:** 24x24px (w-6 h-6)
- **Transition:** Smooth 200ms

```jsx
import { HomeIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid } from '@heroicons/react/24/solid';

const Icon = isActive ? HomeIconSolid : HomeIcon;
<Icon className="w-6 h-6" />
```

---

## 📄 Page Designs

### 1. Login Page
```
┌─────────────────────────┐
│                         │
│         LOGO            │
│                         │
│      Welcome Back!      │
│                         │
│  ┌───────────────────┐  │
│  │ Phone Number      │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Password          │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │     LOGIN         │  │
│  └───────────────────┘  │
│                         │
│   Don't have account?   │
│      [Register]         │
│                         │
└─────────────────────────┘
```

**Features:**
- No bottom nav (login screen)
- Large touch-friendly inputs
- Auto-focus on phone field
- Show/hide password toggle
- Remember me checkbox
- OTP option (future)

---

### 2. Dashboard Page
```
┌─────────────────────────┐
│  🔔                 👤  │ ← Header
├─────────────────────────┤
│                         │
│  Welcome, John! 👋      │
│  Ready to order?        │
│                         │
│  ┌───────────────────┐  │
│  │  Scan QR Code     │  │
│  │  ┌────────────┐   │  │
│  │  │  QR CAMERA │   │  │ ← QR Scanner
│  │  └────────────┘   │  │
│  └───────────────────┘  │
│                         │
│  Quick Actions          │
│  ┌─────┐ ┌─────┐       │
│  │ 🍕  │ │ 🍔  │       │
│  │Menu │ │Order│       │
│  └─────┘ └─────┘       │
│                         │
│  Recent Orders          │
│  ┌───────────────────┐  │
│  │ #123 | $25 | ✅   │  │
│  │ Pizza, Burger      │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│  🏠  🍽️  📦  ⚙️       │ ← Bottom Nav
└─────────────────────────┘
```

**Sections:**
1. **Welcome Card** - Personalized greeting
2. **QR Scanner** - Main CTA, camera access
3. **Quick Actions** - Shortcuts to common tasks
4. **Recent Orders** - Last 3 orders with status

---

### 3. Order Page (Menu Browsing)
```
┌─────────────────────────┐
│  ← Order        🛒 (2)  │ ← Header with cart
├─────────────────────────┤
│ Table 5 | 4 seats | 🟢  │ ← Table info (if selected)
├─────────────────────────┤
│ All Main Drinks Dessert │ ← Category tabs (scrollable)
├─────────────────────────┤
│  ┌────────┐ ┌────────┐  │
│  │   🍕   │ │   🍔   │  │
│  │ Pizza  │ │ Burger │  │
│  │ $12    │ │ $15    │  │
│  │  [+]   │ │  [+]   │  │
│  └────────┘ └────────┘  │
│                         │
│  ┌────────┐ ┌────────┐  │
│  │   🍝   │ │   🥗   │  │
│  │ Pasta  │ │ Salad  │  │
│  │ $18    │ │ $10    │  │
│  │  [+]   │ │  [+]   │  │
│  └────────┘ └────────┘  │
│                         │
│         ...more         │
│                         │
│         ┌─────────────┐ │ ← Floating cart button
│         │ 🛒 2 | $27  │ │
│         └─────────────┘ │
├─────────────────────────┤
│  🏠  🍽️  📦  ⚙️       │
└─────────────────────────┘
```

**Features:**
- Sticky category tabs
- 2-column grid for items
- Image-first product cards
- Quick add (+) button
- Floating cart button shows count & total
- Pull to refresh

**Menu Item Card:**
```
┌─────────────┐
│   IMAGE     │ ← Product photo
├─────────────┤
│ Pizza       │ ← Name
│ Large, Ched │ ← Short desc
│ $12   [+]   │ ← Price & add button
└─────────────┘
```

---

### 4. Cart Drawer
```
┌─────────────────────────┐
│  Your Cart         [X]  │ ← Drawer header
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ 🍕 Pizza (Large)  │  │
│  │ Extra cheese      │  │
│  │ [-] 1 [+]    $14  │  │ ← Quantity controls
│  │              [🗑️]│  │ ← Remove
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ 🍔 Burger Deluxe  │  │
│  │ No onions         │  │
│  │ [-] 2 [+]    $30  │  │
│  │              [🗑️]│  │
│  └───────────────────┘  │
│                         │
│  ┌─────────────────┐    │
│  │ Subtotal:  $44  │    │
│  │ Tax:       $4   │    │
│  │ Total:     $48  │    │
│  └─────────────────┘    │
│                         │
│  ┌───────────────────┐  │
│  │  PLACE ORDER      │  │ ← CTA button
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

**Interactions:**
- Swipe down to close
- Tap outside to close
- Smooth slide-up animation
- Haptic feedback on add/remove

---

### 5. Track Order Page
```
┌─────────────────────────┐
│  Track Orders           │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ Order #123        │  │
│  │ Table 5 | $48     │  │
│  │                   │  │
│  │ ✅ Ordered 2:30pm │  │
│  │ ✅ Preparing...   │  │ ← Timeline
│  │ 🔵 Ready (5min)   │  │
│  │ ⚪ Served         │  │
│  │                   │  │
│  │ Items:            │  │
│  │ • Pizza x1        │  │
│  │ • Burger x2       │  │
│  │                   │  │
│  │ [📞 Call Waiter]  │  │ ← Action button
│  └───────────────────┘  │
│                         │
│  No other active orders │
│                         │
├─────────────────────────┤
│  🏠  🍽️  📦  ⚙️       │
└─────────────────────────┘
```

**Features:**
- Real-time status updates
- Visual timeline with icons
- Estimated time remaining
- Call waiter button
- Push notifications on status change

**Status Timeline:**
```
✅ Ordered     (completed)
✅ Preparing   (completed)
🔵 Ready       (current - pulsing)
⚪ Served      (upcoming)
```

---

### 6. Settings Page
```
┌─────────────────────────┐
│  Settings               │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │     👤            │  │
│  │   John Doe        │  │ ← Profile section
│  │ john@example.com  │  │
│  │ [Edit Profile]    │  │
│  └───────────────────┘  │
│                         │
│  Order History          │
│  ┌───────────────────┐  │
│  │ #123 | $48 | ✅  │  │
│  │ Today, 2:30pm     │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ #122 | $32 | ✅  │  │
│  │ Yesterday         │  │
│  └───────────────────┘  │
│  [View All]           │  │
│                         │
│  Preferences            │
│  ┌───────────────────┐  │
│  │ 🔔 Notifications  │  │ ← Toggle
│  │ 🌙 Dark Mode      │  │ ← Toggle
│  │ 🌐 Language       │  │ ← Selector
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │     LOGOUT        │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│  🏠  🍽️  📦  ⚙️       │
└─────────────────────────┘
```

**Sections:**
1. **Profile Card** - Name, email, photo
2. **Order History** - Recent orders, view all
3. **Preferences** - App settings
4. **Logout** - Sign out action

---

## 🎯 Mobile UX Patterns

### Pull to Refresh
- Dashboard: Refresh recent orders
- Order page: Refresh menu items
- Track page: Refresh order status

### Swipe Gestures
- Cart drawer: Swipe down to close
- Order history: Swipe left to view details

### Loading States
```
┌─────────────┐
│   ⏳        │
│ Loading...  │
└─────────────┘
```

### Empty States
```
┌─────────────────────────┐
│         📦              │
│  No Active Orders       │
│                         │
│  [Start Ordering]       │
└─────────────────────────┘
```

### Error States
```
┌─────────────────────────┐
│         ⚠️              │
│  Connection Error       │
│                         │
│  [Try Again]            │
└─────────────────────────┘
```

---

## 📐 Spacing & Typography

### Spacing Scale (Tailwind)
- `space-y-2` - 8px (tight)
- `space-y-4` - 16px (normal)
- `space-y-6` - 24px (comfortable)
- `p-4` - 16px (card padding)
- `p-6` - 24px (section padding)

### Typography
- **H1:** `text-2xl font-bold` (24px) - Page titles
- **H2:** `text-lg font-semibold` (18px) - Section headers
- **Body:** `text-base` (16px) - Normal text
- **Small:** `text-sm text-gray-600` (14px) - Meta info
- **Caption:** `text-xs` (12px) - Labels

### Colors (Monochrome Palette)

**Grayscale Primary:**
- **Black:** gray-900 (#111827) - Headers, active icons
- **Dark:** gray-700 (#374151) - Body text
- **Medium:** gray-500 (#6b7280) - Secondary text
- **Light:** gray-400 (#9ca3af) - Inactive icons
- **Subtle:** gray-300 (#d1d5db) - Borders
- **Background:** gray-50 (#f9fafb) - Page background
- **White:** #ffffff - Cards, surfaces

**Accent Colors (Minimal use):**
- **Success:** green-600 (#16a34a) - Order complete
- **Warning:** amber-600 (#d97706) - Preparing
- **Error:** red-600 (#dc2626) - Errors only
- **Info:** blue-600 (#2563eb) - Links only

**Usage Rules:**
- Use grayscale for 95% of UI
- Only use accent colors for status badges
- Icons always grayscale
- Buttons use gray-900 background

---

## 🔔 PWA Features

### Install Prompt
```
┌─────────────────────────┐
│  📱 Install App         │
│                         │
│  Add to home screen     │
│  for quick access       │
│                         │
│  [Install] [Later]      │
└─────────────────────────┘
```

### Offline Support
- Cache menu items
- Queue orders when offline
- Show offline indicator
- Sync when back online

### Push Notifications
- Order status updates
- Special offers
- Table ready notification

### App-like Experience
- No browser chrome
- Splash screen
- Smooth transitions
- Native-like navigation

---

## 📱 Responsive Breakpoints

```css
/* Mobile (default) */
@media (max-width: 640px) {
  /* 2-column grid for menu items */
  grid-template-columns: repeat(2, 1fr);
}

/* Tablet */
@media (min-width: 640px) and (max-width: 1024px) {
  /* 3-column grid, wider layout */
  max-width: 768px;
  grid-template-columns: repeat(3, 1fr);
}

/* Desktop (fallback) */
@media (min-width: 1024px) {
  /* Show message: "Please use mobile" */
  /* Or redirect to staff/manager interface */
}
```

---

## 🎨 Component Library

### Button Variants (Monochrome)
```jsx
// Primary - Black button
<button className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
  Place Order
</button>

// Secondary - Gray button
<button className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
  Cancel
</button>

// Outline - Border only
<button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-gray-400 hover:text-gray-900 transition-colors">
  Call Waiter
</button>

// Icon Button
<button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
  <Icon className="w-5 h-5" />
</button>

// Text Button
<button className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
  View All
</button>
```

### Card Variants
```jsx
// Default
<Card>Content</Card>

// With Shadow
<Card shadow="md">Content</Card>

// Interactive (clickable)
<Card interactive>Content</Card>
```

### Badge (Status Only - Minimal Color)
```jsx
// Success - Green accent
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  <CheckCircleIcon className="w-4 h-4 mr-1" />
  Ready
</span>

// Warning - Amber accent
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
  <ClockIcon className="w-4 h-4 mr-1" />
  Preparing
</span>

// Info - Gray (monochrome default)
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
  New
</span>
```

---

## 🎨 Heroicons Usage

### Icon Variants
Heroicons provides 3 variants:
- **Outline:** Default, for inactive states (24x24)
- **Solid:** For active/selected states (24x24)
- **Mini:** Smaller icons (20x20)

### Common Icons
```jsx
import {
  HomeIcon,           // Dashboard
  ShoppingBagIcon,    // Order/Cart
  ClockIcon,          // Track/History
  Cog6ToothIcon,      // Settings
  QrCodeIcon,         // QR Scanner
  PlusIcon,           // Add to cart
  MinusIcon,          // Remove quantity
  TrashIcon,          // Delete item
  XMarkIcon,          // Close
  ChevronRightIcon,   // Navigation
  MagnifyingGlassIcon, // Search
  BellIcon,           // Notifications
  UserIcon,           // Profile
  PhoneIcon,          // Call waiter
  CheckCircleIcon,    // Success
  ExclamationCircleIcon, // Warning
} from '@heroicons/react/24/outline';
```

### Icon Sizing
```jsx
// Small
<Icon className="w-4 h-4" />  // 16x16px

// Medium (default)
<Icon className="w-5 h-5" />  // 20x20px

// Large
<Icon className="w-6 h-6" />  // 24x24px

// Extra Large
<Icon className="w-8 h-8" />  // 32x32px
```

### Icon Colors (Monochrome)
```jsx
// Default
<Icon className="text-gray-600" />

// Active/Selected
<Icon className="text-gray-900" />

// Inactive/Disabled
<Icon className="text-gray-400" />

// Hover state
<Icon className="text-gray-600 hover:text-gray-900 transition-colors" />
```

---

## ✅ Mobile Design Checklist

- [ ] All touch targets minimum 44x44px
- [ ] Bottom nav fixed and always visible
- [ ] Header sticky on scroll
- [ ] Safe area insets for notch/home bar
- [ ] Horizontal scroll for categories
- [ ] Smooth animations (spring physics)
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Haptic feedback
- [ ] Pull to refresh
- [ ] Swipe gestures
- [ ] iOS Safari address bar handling
- [ ] Android back button handling
- [ ] Landscape mode optimization
- [ ] Dark mode support (future)

---

**Design Tools:**
- Figma prototype (if available)
- Component Storybook
- Design tokens in Tailwind config
