"use client";

interface OrderLineTabsProps {
	activeTab: string;
	setActiveTab: (tab: string) => void;
	showOrderLine: boolean;
	counts: {
		all: number;
		dineIn: number;
		waitList: number;
		takeAway: number;
		served: number;
	};
}

export default function OrderLineTabs({ activeTab, setActiveTab, showOrderLine, counts }: OrderLineTabsProps) {
	const tabs = [
		{ id: "all", label: "All", count: counts.all, color: "blue" },
		{ id: "dineIn", label: "Dine in", count: counts.dineIn, color: "blue" },
		{ id: "waitList", label: "Wait List", count: counts.waitList, color: "orange" },
		{ id: "takeAway", label: "Take Away", count: counts.takeAway, color: "purple" },
		{ id: "served", label: "Served", count: counts.served, color: "green" },
	];

	if (!showOrderLine) return null;

	return (
		<div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
			<div className="flex items-center justify-between">
				{/* Title - Left */}
				<h3 className="text-2xl font-bold text-gray-800">Order Line</h3>

				{/* Tabs - Right */}
				<div className="flex gap-2 overflow-x-auto scrollbar-hide">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
							activeTab === tab.id
								? `bg-${tab.color}-500 text-white`
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						{tab.label}
						<span
							className={`px-2 py-0.5 rounded-full text-xs font-bold ${
								activeTab === tab.id ? "bg-white/20" : `bg-${tab.color}-100 text-${tab.color}-700`
							}`}
						>
							{tab.count}
						</span>
					</button>
				))}
				</div>
			</div>
		</div>
	);
}
