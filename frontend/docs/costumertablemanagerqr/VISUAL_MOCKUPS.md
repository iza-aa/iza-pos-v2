# Visual Mockups - Monochrome Design with Heroicons

## 🎨 Design Philosophy

**Monochrome First:**
- Clean, professional appearance
- Focus on content, not colors
- Better accessibility
- Timeless design
- Easy to maintain

**Color Usage:**
- 95% Grayscale (gray-50 to gray-900)
- 5% Accent colors (status badges only)

---

## 📱 Bottom Navigation (Monochrome)

### Inactive State
```
┌─────────────────────────────────────┐
│                                     │
│         Content Area                │
│                                     │
├─────────────────────────────────────┤
│  ┌────┐   ┌────┐   ┌────┐   ┌────┐│
│  │ ⌂  │   │ 🛍  │   │ ⏱  │   │ ⚙ │ │ ← Outline icons
│  │Home│   │Order│   │Track│   │Set││ ← gray-400
│  └────┘   └────┘   └────┘   └────┘│
│  gray-400 gray-400 gray-400 gray-400│
└─────────────────────────────────────┘
```

### Active State (Home selected)
```
┌─────────────────────────────────────┐
│                                     │
│         Content Area                │
│                                     │
├─────────────────────────────────────┤
│  ┌────┐   ┌────┐   ┌────┐   ┌────┐│
│  │ ⌂  │   │ 🛍  │   │ ⏱  │   │ ⚙ │ │
│  │Home│   │Order│   │Track│   │Set││
│  └────┘   └────┘   └────┘   └────┘│
│  gray-900 gray-400 gray-400 gray-400│
│  (solid)  (outline)(outline)(outline)│
└─────────────────────────────────────┘
     ↑
  Active: Solid icon + gray-900
```

**Implementation:**
```jsx
import { HomeIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid } from '@heroicons/react/24/solid';

const Icon = isActive ? HomeIconSolid : HomeIcon;

<Icon className={isActive ? 'text-gray-900' : 'text-gray-400'} />
```

---

## 🏠 Dashboard Page

```
┌─────────────────────────────────────┐
│ ☰               🔔   👤             │ ← Header (gray-900)
├─────────────────────────────────────┤
│                                     │
│  Welcome, John! 👋                  │ ← gray-900, bold
│  Ready to order?                    │ ← gray-600
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Scan QR Code               │   │
│  │  ┌───────────────────────┐  │   │
│  │  │     [QR ICON]         │  │   │ ← QrCodeIcon
│  │  │     w-12 h-12         │  │   │   gray-700
│  │  │     Tap to scan       │  │   │
│  │  └───────────────────────┘  │   │
│  │  bg-white, border-gray-200  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Quick Actions                      │ ← gray-900, semibold
│  ┌───────────┐  ┌───────────┐     │
│  │  [🍕]     │  │  [📦]     │     │
│  │  Browse   │  │  Orders   │     │ ← gray-700
│  │  Menu     │  │  History  │     │
│  └───────────┘  └───────────┘     │
│  bg-gray-50, text-gray-700         │
│                                     │
├─────────────────────────────────────┤
│  ⌂     🛍    ⏱    ⚙               │ ← Bottom Nav
│ Home  Order Track  Set              │   gray-900 active
└─────────────────────────────────────┘   gray-400 inactive
```

**Card Style:**
```jsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <QrCodeIcon className="w-12 h-12 text-gray-700 mx-auto" />
  <p className="text-sm text-gray-600 text-center mt-2">Tap to scan</p>
</div>
```

---

## 🍽️ Order Page (Menu)

```
┌─────────────────────────────────────┐
│ ← Order              🛒 (2)          │ ← gray-900
│                                     │
├─────────────────────────────────────┤
│ Table 5 | 4 seats | ● Available     │ ← gray-700
├─────────────────────────────────────┤
│ All  Main  Drinks  Dessert  →      │ ← Tabs (gray-600)
│ ━━━                                 │   Active: gray-900
├─────────────────────────────────────┤
│                                     │
│  ┌───────────┐  ┌───────────┐     │
│  │  [IMAGE]  │  │  [IMAGE]  │     │
│  │           │  │           │     │
│  │  Pizza    │  │  Burger   │     │ ← gray-900
│  │  Large... │  │  Deluxe...│     │ ← gray-600
│  │  $12  [+] │  │  $15  [+] │     │
│  └───────────┘  └───────────┘     │
│                                     │
│  ┌───────────┐  ┌───────────┐     │
│  │  [IMAGE]  │  │  [IMAGE]  │     │
│  │  Pasta    │  │  Salad    │     │
│  │  $18  [+] │  │  $10  [+] │     │
│  └───────────┘  └───────────┘     │
│                                     │
│         ┌──────────────┐            │
│         │ 🛒 2 | $27   │            │ ← Floating cart
│         └──────────────┘            │   bg-gray-900, text-white
├─────────────────────────────────────┤
│  ⌂     🛍    ⏱    ⚙               │
└─────────────────────────────────────┘
```

**Menu Item Card:**
```jsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <img src={item.image} className="w-full h-32 object-cover" />
  <div className="p-3">
    <h3 className="font-semibold text-gray-900">{item.name}</h3>
    <p className="text-sm text-gray-600 truncate">{item.description}</p>
    <div className="flex items-center justify-between mt-2">
      <span className="text-lg font-bold text-gray-900">${item.price}</span>
      <button className="p-1.5 bg-gray-900 rounded-lg hover:bg-gray-800">
        <PlusIcon className="w-5 h-5 text-white" />
      </button>
    </div>
  </div>
</div>
```

**Plus Button (Add to Cart):**
```jsx
<button className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
  <PlusIcon className="w-5 h-5" />
</button>
```

---

## 🛒 Cart Drawer

```
┌─────────────────────────────────────┐
│  Your Cart                     [✕]  │ ← gray-900
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Pizza (Large)               │   │ ← gray-900
│  │ Extra cheese                │   │ ← gray-600
│  │ [−] 1 [+]            $14    │   │
│  │                        [🗑]  │   │ ← TrashIcon
│  └─────────────────────────────┘   │   gray-600
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Burger Deluxe               │   │
│  │ No onions                   │   │
│  │ [−] 2 [+]            $30    │   │
│  │                        [🗑]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Subtotal:            $44    │   │ ← gray-700
│  │ Tax:                 $4     │   │
│  │ Total:               $48    │   │ ← gray-900, bold
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      PLACE ORDER            │   │ ← bg-gray-900
│  └─────────────────────────────┘   │   text-white
│                                     │
└─────────────────────────────────────┘
```

**Quantity Controls:**
```jsx
<div className="flex items-center space-x-2">
  <button className="p-1 border border-gray-300 rounded hover:border-gray-400">
    <MinusIcon className="w-4 h-4 text-gray-600" />
  </button>
  <span className="w-8 text-center text-gray-900 font-medium">1</span>
  <button className="p-1 border border-gray-300 rounded hover:border-gray-400">
    <PlusIcon className="w-4 h-4 text-gray-600" />
  </button>
  <button className="ml-auto p-1 text-gray-400 hover:text-red-600">
    <TrashIcon className="w-5 h-5" />
  </button>
</div>
```

---

## 📦 Track Order Page

```
┌─────────────────────────────────────┐
│  Track Orders                       │ ← gray-900
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Order #123                  │   │ ← gray-900, bold
│  │ Table 5 | $48               │   │ ← gray-600
│  │                             │   │
│  │ Timeline:                   │   │
│  │ ● Ordered      2:30pm       │   │ ← CheckCircleIcon
│  │ │ gray-400 (completed)      │   │   (solid, gray-400)
│  │ ● Preparing    2:32pm       │   │
│  │ │ gray-400 (completed)      │   │
│  │ ● Ready        ~5 min       │   │ ← ClockIcon
│  │ │ gray-900 (current)        │   │   (solid, gray-900)
│  │   Pulsing...                │   │
│  │ ○ Served                    │   │ ← Circle
│  │   gray-300 (upcoming)       │   │   (outline, gray-300)
│  │                             │   │
│  │ Items:                      │   │
│  │ • Pizza x1                  │   │ ← gray-700
│  │ • Burger x2                 │   │
│  │                             │   │
│  │ ┌───────────────────────┐   │   │
│  │ │  📞 Call Waiter       │   │   │ ← PhoneIcon
│  │ └───────────────────────┘   │   │   gray-700
│  └─────────────────────────────┘   │   border-gray-300
│                                     │
├─────────────────────────────────────┤
│  ⌂     🛍    ⏱    ⚙               │
└─────────────────────────────────────┘
```

**Timeline Status:**
```jsx
// Completed
<div className="flex items-center">
  <CheckCircleIcon className="w-6 h-6 text-gray-400" /> {/* Solid */}
  <div className="ml-3">
    <p className="text-sm font-medium text-gray-700">Ordered</p>
    <p className="text-xs text-gray-500">2:30pm</p>
  </div>
</div>

// Current (Active)
<div className="flex items-center">
  <ClockIcon className="w-6 h-6 text-gray-900 animate-pulse" /> {/* Solid */}
  <div className="ml-3">
    <p className="text-sm font-medium text-gray-900">Ready</p>
    <p className="text-xs text-gray-600">~5 min</p>
  </div>
</div>

// Upcoming
<div className="flex items-center">
  <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
  <div className="ml-3">
    <p className="text-sm font-medium text-gray-500">Served</p>
  </div>
</div>
```

**Call Waiter Button:**
```jsx
<button className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors">
  <PhoneIcon className="w-5 h-5 mr-2" />
  Call Waiter
</button>
```

---

## ⚙️ Settings Page

```
┌─────────────────────────────────────┐
│  Settings                           │ ← gray-900
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │      [👤]                   │   │ ← UserIcon
│  │    John Doe                 │   │   gray-700, w-16 h-16
│  │  john@email.com             │   │   gray-600
│  │  [Edit Profile] →           │   │   gray-700
│  └─────────────────────────────┘   │
│                                     │
│  Order History                      │ ← gray-900, semibold
│  ┌─────────────────────────────┐   │
│  │ #123 | $48 | ✓              │   │ ← gray-700
│  │ Today, 2:30pm               │   │   gray-500
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ #122 | $32 | ✓              │   │
│  │ Yesterday                   │   │
│  └─────────────────────────────┘   │
│  [View All] →                       │ ← gray-700
│                                     │
│  Preferences                        │
│  ┌─────────────────────────────┐   │
│  │ 🔔 Notifications    [●─────]│   │ ← Toggle
│  │ 🌙 Dark Mode        [─────○]│   │   gray-600
│  │ 🌐 Language         English →│   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      LOGOUT                 │   │ ← bg-gray-900
│  └─────────────────────────────┘   │   text-white
│                                     │
├─────────────────────────────────────┤
│  ⌂     🛍    ⏱    ⚙               │
└─────────────────────────────────────┘
```

**Settings Item:**
```jsx
<button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
  <div className="flex items-center">
    <BellIcon className="w-5 h-5 text-gray-600" />
    <span className="ml-3 text-gray-700">Notifications</span>
  </div>
  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
</button>
```

---

## 🎨 Color Usage Examples

### Card Styles
```jsx
// Default card
<div className="bg-white border border-gray-200 rounded-lg shadow-sm">

// Hover card
<div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 transition-all">

// Active/Selected card
<div className="bg-gray-50 border-2 border-gray-900 rounded-lg">
```

### Text Hierarchy
```jsx
// Primary heading
<h1 className="text-2xl font-bold text-gray-900">

// Secondary heading
<h2 className="text-lg font-semibold text-gray-900">

// Body text
<p className="text-base text-gray-700">

// Secondary text
<p className="text-sm text-gray-600">

// Meta/Caption
<span className="text-xs text-gray-500">

// Disabled
<span className="text-gray-400">
```

### Status Badges (Only colored elements)
```jsx
// Success - Green
<span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
  <CheckCircleIcon className="w-4 h-4 inline mr-1" />
  Completed
</span>

// Warning - Amber
<span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">
  <ClockIcon className="w-4 h-4 inline mr-1" />
  Preparing
</span>

// Error - Red
<span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
  <ExclamationCircleIcon className="w-4 h-4 inline mr-1" />
  Failed
</span>

// Default - Gray
<span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
  New
</span>
```

---

## ✅ Monochrome Design Checklist

**Grayscale Usage:**
- [x] All icons use gray colors (400, 600, 900)
- [x] Active state: gray-900
- [x] Inactive state: gray-400
- [x] Body text: gray-700
- [x] Secondary text: gray-600
- [x] Borders: gray-200, gray-300
- [x] Background: gray-50, white
- [x] Buttons: gray-900 background

**Color Accent (Minimal):**
- [x] Only use for status badges
- [x] Green: Success/Complete
- [x] Amber: In-progress/Warning
- [x] Red: Error only
- [x] Blue: Links only (rare)

**Heroicons:**
- [x] Use outline for default/inactive
- [x] Use solid for active/selected
- [x] Consistent sizing (w-5 h-5 default)
- [x] Grayscale colors only

**Visual Hierarchy:**
- [x] Size: 2xl > lg > base > sm > xs
- [x] Weight: bold > semibold > medium > normal
- [x] Color: gray-900 > gray-700 > gray-600 > gray-500

---

**Design Benefits:**
✅ Clean, professional look  
✅ Better focus on content  
✅ Timeless design  
✅ Easy to maintain  
✅ Better accessibility  
✅ Faster to implement  
✅ Consistent brand feel
