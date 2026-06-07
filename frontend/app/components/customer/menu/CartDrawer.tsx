import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  variants?: unknown[];
}

interface CartDrawerProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, change: number) => void;
  onCheckout: () => void;
}

function getVariantLabel(variant: unknown): string | null {
  if (typeof variant === "string") {
    return variant.trim() || null;
  }

  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    return null;
  }

  const record = variant as Record<string, unknown>;
  const value = record.optionName ?? record.name ?? record.label ?? record.option_name;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default function CartDrawer({ cart, isOpen, onClose, onUpdateQuantity, onCheckout }: CartDrawerProps) {
  if (!isOpen) return null;

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cart Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 last:border-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xs font-medium">
                  {item.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                  {item.name}
                </h3>
                {item.variants?.length ? (
                  <p className="mb-1 truncate text-xs text-gray-500">
                    {item.variants.map(getVariantLabel).filter(Boolean).join(", ")}
                  </p>
                ) : null}
                <p className="text-sm font-bold text-gray-900">
                  Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <MinusIcon className="w-4 h-4 text-gray-600" />
                </button>
                <span className="w-8 text-center font-semibold text-gray-900">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <PlusIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t border-gray-200 bg-white pb-24">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 font-medium">Total</span>
            <span className="text-xl font-bold text-gray-900">
              Rp {calculateTotal().toLocaleString('id-ID')}
            </span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            Checkout ({cart.length} items)
          </button>
        </div>
      </div>
    </div>
  );
}
