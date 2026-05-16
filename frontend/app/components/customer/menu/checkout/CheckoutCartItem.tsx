import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variants?: any[];
}

interface CheckoutCartItemProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, change: number) => void;
  disabled?: boolean;
}

export default function CheckoutCartItem({ item, onUpdateQuantity, disabled = false }: CheckoutCartItemProps) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-gray-200 last:border-0">
      <img
        src={item.image}
        alt={item.name}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
          {item.name}
        </h3>
        {item.variants && item.variants.length > 0 && (
          <div className="text-xs text-gray-500 mb-1">
            {item.variants.map((v: any, idx: number) => (
              <span key={idx}>
                {v.optionName}{item.variants && idx < item.variants.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-600">
          Rp {item.price.toLocaleString('id-ID')} × {item.quantity}
        </p>
        <p className="text-sm font-bold text-gray-900 mt-1">
          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(item.id, -1)}
          disabled={disabled}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
        >
          <MinusIcon className="w-4 h-4 text-gray-600" />
        </button>
        <span className="w-8 text-center font-semibold text-gray-900">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(item.id, 1)}
          disabled={disabled}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
        >
          <PlusIcon className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
