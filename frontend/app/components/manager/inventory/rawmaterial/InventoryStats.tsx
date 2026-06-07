interface InventoryStatsProps {
  totalItems: number
  inStock: number
  lowStock: number
  outOfStock: number
}

export default function InventoryStats({ totalItems, inStock, lowStock, outOfStock }: InventoryStatsProps) {
  const cards = [
    { label: 'Total Items', value: totalItems, helper: 'Tracked inventory items', className: 'border-gray-200 bg-white' },
    { label: 'In Stock', value: inStock, helper: 'Above reorder level', className: 'border-[#BFEF75] bg-[#F6FFE8]' },
    { label: 'Low Stock', value: lowStock, helper: 'At or below reorder level', className: 'border-[#FFE58A] bg-[#FFF9D7]' },
    { label: 'Critical', value: outOfStock, helper: 'Out of stock items', className: 'border-[#FFC9C9] bg-[#FFF1F1]' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <section key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.className}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
          <p className="mt-3 text-2xl font-bold text-gray-950">{card.value}</p>
          <p className="mt-2 text-sm leading-5 text-gray-600">{card.helper}</p>
        </section>
      ))}
    </div>
  )
}
