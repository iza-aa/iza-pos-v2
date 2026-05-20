import Image from 'next/image';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { generateAvatarProps } from '@/lib/utils/avatar';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  variants?: unknown[];
}

interface CheckoutCartItemProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, change: number) => void;
  disabled?: boolean;
}

function getImageSrc(image?: string | null): string | null {
  const trimmedImage = image?.trim();

  return trimmedImage && trimmedImage.length > 0 ? trimmedImage : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringField(value: Record<string, unknown>, key: string): string | null {
  const fieldValue = value[key];

  if (typeof fieldValue !== 'string') {
    return null;
  }

  const trimmedValue = fieldValue.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function getVariantLabel(variant: unknown): string | null {
  if (typeof variant === 'string') {
    const trimmedVariant = variant.trim();
    return trimmedVariant.length > 0 ? trimmedVariant : null;
  }

  if (!isRecord(variant)) {
    return null;
  }

  return (
    getStringField(variant, 'optionName') ??
    getStringField(variant, 'name') ??
    getStringField(variant, 'label') ??
    getStringField(variant, 'value') ??
    getStringField(variant, 'option_name') ??
    getStringField(variant, 'variant_name')
  );
}

function ProductAvatar({ name }: { name: string }) {
  const avatar = generateAvatarProps(name);

  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg ${avatar.color}`}
      aria-label={name}
      title={name}
    >
      <span className="text-sm font-bold text-white">{avatar.initials}</span>
    </div>
  );
}

export default function CheckoutCartItem({
  item,
  onUpdateQuantity,
  disabled = false,
}: CheckoutCartItemProps) {
  const imageSrc = getImageSrc(item.image);
  const variantLabels =
    item.variants
      ?.map(getVariantLabel)
      .filter((label): label is string => Boolean(label)) ?? [];

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 pb-3 last:border-0">
      {imageSrc ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={imageSrc}
            alt={item.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
      ) : (
        <ProductAvatar name={item.name} />
      )}

      <div className="min-w-0 flex-1">
        <h3 className="mb-1 truncate text-sm font-semibold text-gray-900">
          {item.name}
        </h3>

        {variantLabels.length > 0 ? (
          <div className="mb-1 text-xs text-gray-500">
            {variantLabels.join(', ')}
          </div>
        ) : null}

        <p className="text-sm text-gray-600">
          Rp {item.price.toLocaleString('id-ID')} × {item.quantity}
        </p>

        <p className="mt-1 text-sm font-bold text-gray-900">
          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, -1)}
          disabled={disabled}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Decrease ${item.name} quantity`}
        >
          <MinusIcon className="h-4 w-4 text-gray-600" />
        </button>

        <span className="w-8 text-center font-semibold text-gray-900">
          {item.quantity}
        </span>

        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, 1)}
          disabled={disabled}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Increase ${item.name} quantity`}
        >
          <PlusIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}