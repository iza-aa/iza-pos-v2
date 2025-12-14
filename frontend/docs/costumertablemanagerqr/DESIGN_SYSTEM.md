# 🎨 Design System Summary - Monochrome + Heroicons

## Overview
Customer app menggunakan **monochrome design** dengan **Heroicons** untuk tampilan yang clean, professional, dan modern.

---

## 🎯 Core Principles

1. **Monochrome First** - 95% grayscale, 5% accent
2. **Heroicons Only** - Consistent icon system
3. **Content Focus** - Design tidak mengalihkan dari konten
4. **Accessibility** - High contrast ratios
5. **Simplicity** - Easy to implement & maintain

---

## 🎨 Color Palette

### Grayscale (Primary)
```css
gray-50:  #f9fafb  /* Page background */
gray-100: #f3f4f6  /* Card hover */
gray-200: #e5e7eb  /* Borders */
gray-300: #d1d5db  /* Subtle borders */
gray-400: #9ca3af  /* Inactive icons */
gray-500: #6b7280  /* Secondary text */
gray-600: #4b5563  /* Icon default */
gray-700: #374151  /* Body text */
gray-800: #1f2937  /* Button hover */
gray-900: #111827  /* Headers, active */
```

### Accent Colors (Minimal)
```css
green-600:  #16a34a  /* Success only */
amber-600:  #d97706  /* Warning only */
red-600:    #dc2626  /* Error only */
blue-600:   #2563eb  /* Links only */
```

**Rule:** Gunakan accent colors HANYA untuk status badges!

---

## 🎭 Heroicons

### Installation
```bash
npm install @heroicons/react
```

### Usage
```jsx
// Import outline (default)
import { HomeIcon } from '@heroicons/react/24/outline';

// Import solid (active state)
import { HomeIcon as HomeIconSolid } from '@heroicons/react/24/solid';

// Render
<HomeIcon className="w-6 h-6 text-gray-600" />
```

### Common Icons
| Icon | Import | Use Case |
|------|--------|----------|
| HomeIcon | `@heroicons/react/24/outline` | Dashboard |
| ShoppingBagIcon | `@heroicons/react/24/outline` | Order/Cart |
| ClockIcon | `@heroicons/react/24/outline` | Track/History |
| Cog6ToothIcon | `@heroicons/react/24/outline` | Settings |
| QrCodeIcon | `@heroicons/react/24/outline` | QR Scanner |
| PlusIcon | `@heroicons/react/24/outline` | Add item |
| MinusIcon | `@heroicons/react/24/outline` | Remove quantity |
| TrashIcon | `@heroicons/react/24/outline` | Delete |
| XMarkIcon | `@heroicons/react/24/outline` | Close |
| PhoneIcon | `@heroicons/react/24/outline` | Call waiter |
| CheckCircleIcon | `@heroicons/react/24/solid` | Success |
| ExclamationCircleIcon | `@heroicons/react/24/solid` | Warning |

### Icon Sizes
```jsx
<Icon className="w-4 h-4" />  // 16px - Small
<Icon className="w-5 h-5" />  // 20px - Default
<Icon className="w-6 h-6" />  // 24px - Large
<Icon className="w-8 h-8" />  // 32px - Extra Large
```

### Icon States
```jsx
// Default
<Icon className="text-gray-600" />

// Active
<Icon className="text-gray-900" />

// Inactive
<Icon className="text-gray-400" />

// Hover
<Icon className="text-gray-600 hover:text-gray-900 transition-colors" />
```

---

## 🎨 Component Styles

### Buttons

**Primary (Black)**
```jsx
<button className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
  Place Order
</button>
```

**Secondary (Gray)**
```jsx
<button className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
  Cancel
</button>
```

**Outline**
```jsx
<button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-gray-400 transition-colors">
  Call Waiter
</button>
```

**Icon Button**
```jsx
<button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
  <Icon className="w-5 h-5" />
</button>
```

### Cards

**Default**
```jsx
<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
  Content
</div>
```

**Interactive**
```jsx
<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
  Content
</div>
```

**Active**
```jsx
<div className="bg-gray-50 border-2 border-gray-900 rounded-lg p-4">
  Content
</div>
```

### Status Badges

**Success**
```jsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  <CheckCircleIcon className="w-4 h-4 mr-1" />
  Ready
</span>
```

**Warning**
```jsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
  <ClockIcon className="w-4 h-4 mr-1" />
  Preparing
</span>
```

**Default (Gray)**
```jsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
  New
</span>
```

### Typography

```jsx
// H1 - Page titles
<h1 className="text-2xl font-bold text-gray-900">

// H2 - Section headers
<h2 className="text-lg font-semibold text-gray-900">

// Body - Normal text
<p className="text-base text-gray-700">

// Small - Secondary info
<p className="text-sm text-gray-600">

// Caption - Meta text
<span className="text-xs text-gray-500">
```

---

## 🎯 Bottom Navigation

```jsx
import { HomeIcon, ShoppingBagIcon, ClockIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, ShoppingBagIcon as ShoppingBagIconSolid, ClockIcon as ClockIconSolid, Cog6ToothIcon as Cog6ToothIconSolid } from '@heroicons/react/24/solid';

export function BottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/customer/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid, label: 'Home' },
    { href: '/customer/order', icon: ShoppingBagIcon, iconSolid: ShoppingBagIconSolid, label: 'Order' },
    { href: '/customer/track', icon: ClockIcon, iconSolid: ClockIconSolid, label: 'Track' },
    { href: '/customer/settings', icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-md mx-auto flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = isActive ? item.iconSolid : item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-3 px-4 transition-colors
                ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Key Points:**
- Outline icons for inactive
- Solid icons for active
- gray-900 for active text
- gray-400 for inactive text
- w-6 h-6 for icon size

---

## 📐 Spacing

```jsx
// Padding
p-2   // 8px
p-3   // 12px
p-4   // 16px
p-6   // 24px

// Margin
mt-2  // 8px
mt-4  // 16px
mt-6  // 24px

// Space between
space-y-2  // 8px
space-y-4  // 16px
space-y-6  // 24px
space-x-2  // horizontal 8px
```

---

## 🎨 Transitions

```jsx
// Color
transition-colors

// All properties
transition-all

// Shadow
transition-shadow

// Duration (default 200ms)
duration-150  // 150ms
duration-200  // 200ms
duration-300  // 300ms
```

---

## ✅ Design Checklist

**Colors:**
- [ ] Use grayscale for 95% of UI
- [ ] Accent colors only for status badges
- [ ] No blue, green, red unless status
- [ ] Text contrast ratio minimum 4.5:1

**Icons:**
- [ ] Use Heroicons only
- [ ] Outline for inactive
- [ ] Solid for active
- [ ] Consistent sizing (w-5 h-5 or w-6 h-6)
- [ ] Always grayscale colors

**Components:**
- [ ] Cards: white bg, gray-200 border
- [ ] Buttons: gray-900 primary
- [ ] Text: gray-900 headers, gray-700 body
- [ ] Hover states on all interactive elements

**Spacing:**
- [ ] Consistent padding (p-4, p-6)
- [ ] Proper spacing between sections (space-y-4, space-y-6)
- [ ] Touch targets min 44x44px

**Accessibility:**
- [ ] High contrast text
- [ ] Icon + text labels
- [ ] Focus states visible
- [ ] Screen reader friendly

---

## 📚 Quick Reference

```jsx
// Primary button
<button className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
  Action
</button>

// Card
<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
  Content
</div>

// Icon with text
<div className="flex items-center text-gray-700">
  <Icon className="w-5 h-5 mr-2 text-gray-600" />
  <span>Label</span>
</div>

// Status badge
<span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
  Success
</span>
```

---

**Design Benefits:**
✅ Clean, professional look  
✅ Easy to implement  
✅ Better performance (fewer colors to load)  
✅ Timeless design  
✅ Better accessibility  
✅ Consistent brand feel  
✅ Focus on content, not decoration

**Start implementing:** Check [VISUAL_MOCKUPS.md](./VISUAL_MOCKUPS.md) for detailed UI examples!
