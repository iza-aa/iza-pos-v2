import { ProductImagePlaceholder } from '@/app/components/ui';

interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: number;
  image: string | null;
  available: boolean;
  unavailableReason?: string;
  hasVariants: boolean;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isDisabled = !product.available;

  return (
    <div className={`bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 ${isDisabled ? 'opacity-60' : ''}`}>
      <div className="aspect-square relative bg-gray-100">
        <ProductImagePlaceholder
          name={product.name}
          imageUrl={product.image}
          className="w-full h-full"
        />
        {isDisabled ? (
          <div className="absolute inset-x-2 bottom-2 rounded-lg bg-gray-900/90 px-2 py-1 text-center text-[11px] font-semibold text-white">
            Unavailable
          </div>
        ) : null}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2">{product.category}</p>
        {isDisabled ? (
          <p className="mb-2 line-clamp-2 text-xs font-medium text-red-600">
            Currently unavailable
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">
            Rp {product.price.toLocaleString('id-ID')}
          </span>
          <button
            disabled={isDisabled}
            onClick={() => onAddToCart(product)}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
