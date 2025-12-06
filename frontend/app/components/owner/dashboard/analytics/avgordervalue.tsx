import { ArrowUpRightIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { ReceiptPercentIcon } from "@heroicons/react/24/solid";

export default function AvgOrderValue() {
	return (
		<div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-300 hover:shadow-lg">
			{/* Top Card - White Background */}
			<div className="bg-white rounded-xl p-4 mb-3 border border-gray-300">
				<div className="flex items-center gap-3">
					<div className="bg-gray-100 rounded-xl p-3">
						<ReceiptPercentIcon className="h-6 w-6 text-gray-700" />
					</div>
				<div className="flex-1">
				<div className="flex items-center gap-2 mb-1">
					<p className="text-sm text-gray-500">Avg Order</p>
					<span className="flex items-center gap-1">
						<span className="text-xs font-semibold" style={{ color: '#166534', backgroundColor: '#B2FF5E', padding: '2px 6px', borderRadius: '6px' }}>+5%</span>
					</span>
				</div>
					<span className="text-xl font-bold text-gray-900">Rp 72.500</span>
				</div>
				</div>
			</div>

		{/* Bottom Section - Gray Background */}
		<div className="flex items-center justify-between px-2 pb-2">
			<span className="text-sm text-gray-600"><span className="font-semibold">+Rp 3.500</span> from last year</span>
			<ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
		</div>
		</div>
	);
}
