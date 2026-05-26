interface OrderSummaryProps {
  subtotal: number;
  tax?: number;
  taxLabel?: string;
  total?: number;
}

export default function OrderSummary({
  subtotal,
  tax = 0,
  taxLabel = "Tax",
  total,
}: OrderSummaryProps) {
  const totalPayable = total ?? subtotal + tax;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">Order Summary</h2>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold text-gray-900">
            Rp {subtotal.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{taxLabel}</span>
          <span className="font-semibold text-gray-900">Rp {tax.toLocaleString('id-ID')}</span>
        </div>
        <div className="h-px bg-gray-200 my-2"></div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-gray-900">
            Rp {totalPayable.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
}
