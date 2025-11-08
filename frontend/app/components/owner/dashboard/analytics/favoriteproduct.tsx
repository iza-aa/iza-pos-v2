export default function FavoriteProduct() {
  const products = [
    { name: "Nasi Goreng", sales: 234 },
    { name: "Ayam Bakar", sales: 189 },
    { name: "Es Teh Manis", sales: 156 },
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Favorite Products</h3>
      <div className="flex flex-col gap-3">
        {products.map((product, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-500 font-bold text-sm">{idx + 1}</span>
              </div>
              <span className="font-medium text-gray-700">{product.name}</span>
            </div>
            <span className="text-gray-500 text-sm font-semibold">{product.sales} sold</span>
          </div>
        ))}
      </div>
    </div>
  );
}
