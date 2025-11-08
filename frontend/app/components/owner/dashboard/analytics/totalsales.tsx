import { ArrowUpRightIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { CurrencyDollarIcon } from "@heroicons/react/24/solid";

export default function TotalSales() {
	return (
		<div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-200">
			{/* Top Card - White Background */}
			<div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
				<div className="flex items-center gap-3">
					<div className="bg-blue-100 rounded-xl p-3">
						<CurrencyDollarIcon className="h-6 w-6 text-blue-500" />
					</div>
					<div className="flex-1">
						<p className="text-sm text-gray-500 mb-1">Total Sales</p>
						<div className="flex items-center gap-2">
							<span className="text-2xl font-bold text-gray-900">$17,879</span>
							<span className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-md">
								<ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
								<span className="text-xs font-semibold text-green-600">12%</span>
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Section - Gray Background */}
			<div className="flex items-center justify-between px-1 pb-2">
				<span className="text-sm text-gray-600">+$459 from last year</span>
				<ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
			</div>
		</div>
	);
}
