import { ArrowUpRightIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { UsersIcon } from "@heroicons/react/24/solid";

export default function TotalCustomer() {
	return (
		<div className="bg-gray-100 rounded-2xl p-[3px] w-full border border-gray-200">
			{/* Top Card - White Background */}
			<div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
				<div className="flex items-center gap-3">
					<div className="bg-green-100 rounded-xl p-3">
						<UsersIcon className="h-6 w-6 text-green-500" />
					</div>
				<div className="flex-1">
				<div className="flex items-center gap-2 mb-1">
					<p className="text-sm text-gray-500">Customer</p>
					<span className="flex items-center gap-1">
						<ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
						<span className="text-xs font-semibold text-green-600">15%</span>
					</span>
				</div>
					<span className="text-2xl font-bold text-gray-900">1,234</span>
				</div>
				</div>
			</div>

		{/* Bottom Section - Gray Background */}
		<div className="flex items-center justify-between px-1">
			<span className="text-sm text-gray-600"><span className="font-semibold">+89</span> from last year</span>
			<ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
		</div>
		</div>
	);
}
