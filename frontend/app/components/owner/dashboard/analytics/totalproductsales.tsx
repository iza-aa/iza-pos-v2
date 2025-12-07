import { ArrowUpRightIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { ShoppingBagIcon } from "@heroicons/react/24/solid";

export default function TotalProductSales() {
	return (
		<div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-300 hover:shadow-lg transition-shadow">
			{/* Top Card - White Background */}
			<div className="bg-white rounded-xl p-3 md:p-4 mb-3 border border-gray-300">
				<div className="flex items-center gap-2 md:gap-3">
					<div className="bg-gray-100 rounded-xl p-2 md:p-3">
						<ShoppingBagIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
					</div>
				<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<p className="text-xs md:text-sm text-gray-500">Product Sales</p>
					<span className="flex items-center gap-1">
						<span className="text-[10px] md:text-xs font-semibold" style={{ color: '#166534', backgroundColor: '#B2FF5E', padding: '2px 6px', borderRadius: '6px' }}>+8%</span>
					</span>
				</div>
					<span className="text-lg md:text-xl font-bold text-gray-900">2,456</span>
				</div>
				</div>
			</div>

		{/* Bottom Section - Gray Background */}
		<div className="flex items-center justify-between px-2 pb-2">
			<span className="text-xs md:text-sm text-gray-600 truncate"><span className="font-semibold">+156</span> from last year</span>
			<ArrowUpRightIcon className="h-3 md:h-4 w-3 md:w-4 text-gray-400 flex-shrink-0" />
		</div>
		</div>
	);
}
