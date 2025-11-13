"use client";
import { useState } from "react";
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import OrderCard from "@/app/components/staff/order/OrderCard";
import OrderTable from "@/app/components/staff/order/OrderTable";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import { DateFilterDropdown } from "@/app/components/owner/activitylog";
import type { ViewMode } from "@/app/components/ui/ViewModeToggle";
import { orders } from "@/lib/mockData";

// Transform orders for display
const mockOrders = orders.map(order => ({
	id: order.id,
	customerName: order.customerName,
	orderNumber: order.orderNumber,
	orderType: order.orderType,
	items: order.items.map(item => ({
		id: item.id,
		name: item.name,
		quantity: item.quantity,
		price: item.price,
		served: item.served,
		servedAt: 'servedAt' in item ? item.servedAt : undefined,
		variants: item.variants,
	})),
	total: order.total,
	date: order.date,
	time: order.time,
	status: order.status,
	table: order.table !== 'Counter' ? order.table : undefined,
}));

export default function ManagerOrderPage() {
	const [orderList, setOrderList] = useState(mockOrders);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("card");
	const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
	const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
	const [orderFilter, setOrderFilter] = useState<'all' | 'dine-in' | 'takeaway' | 'new-preparing' | 'partially-served' | 'served'>('all');

	const handleMarkServed = (orderId: string, itemIds: string[]) => {
		const now = new Date();
		const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

		setOrderList(prevOrders => prevOrders.map(order => {
			if (order.id === orderId) {
				// Update served status for selected items
				const updatedItems = order.items.map(item => {
					if (itemIds.includes(item.id)) {
						return { ...item, served: true, servedAt: currentTime };
					}
					return item;
				});

				// Calculate new order status
				const servedCount = updatedItems.filter(item => item.served).length;
				const totalCount = updatedItems.length;
				
				let newStatus: any = order.status;
				if (servedCount === totalCount) {
					newStatus = 'served';
				} else if (servedCount > 0 && servedCount < totalCount) {
					newStatus = 'partially-served';
				}

				return { ...order, items: updatedItems, status: newStatus };
			}
			return order;
		}));
	};

	// Get current date for filtering
	const now = new Date();
	const today = now.toDateString();
	const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	// Filter orders
	const filteredOrders = orderList.filter(order => {
		// Search filter
		const matchesSearch = order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
		
		// Combined order filter
		let matchesFilter = true;
		if (orderFilter === 'dine-in') {
			matchesFilter = !!order.table;
		} else if (orderFilter === 'takeaway') {
			matchesFilter = !order.table;
		} else if (orderFilter === 'new-preparing') {
			matchesFilter = order.status === 'new' || order.status === 'preparing';
		} else if (orderFilter === 'partially-served') {
			matchesFilter = order.status === 'partially-served';
		} else if (orderFilter === 'served') {
			matchesFilter = order.status === 'served';
		}

		// Date filter
		let matchesDate = true;
		if (dateFilter !== 'all') {
			const orderDate = new Date(order.date);
			
			if (dateFilter === 'today') {
				matchesDate = orderDate.toDateString() === today;
			} else if (dateFilter === 'week') {
				matchesDate = orderDate >= weekAgo;
			} else if (dateFilter === 'month') {
				matchesDate = orderDate >= monthAgo;
			} else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
				const startDate = new Date(customDateRange.start);
				const endDate = new Date(customDateRange.end);
				matchesDate = orderDate >= startDate && orderDate <= endDate;
			}
		}

		return matchesSearch && matchesFilter && matchesDate;
	});

	return (
		<div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
			<div className="flex-shrink-0">
				<OrderHeader
					description="Track and manage all customer orders in real-time"
				>
					<div className="flex items-center gap-3">
						<DateFilterDropdown
							dateFilter={dateFilter}
							onDateFilterChange={setDateFilter}
							customDateRange={customDateRange}
							onCustomDateRangeChange={setCustomDateRange}
						/>
						<SearchBar 
							value={searchQuery}
							onChange={setSearchQuery}
							placeholder="Search orders..."
						/>
						<ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
					</div>
				</OrderHeader>
			</div>

			<div className="flex-1 overflow-y-auto bg-gray-100">
				{/* Filter Tabs - Inside gray area, above cards */}
				<div className="sticky top-0 z-10 bg-gray-100 px-6 pt-6 pb-4">
					<div className="flex items-center gap-2 flex-wrap">
						<button
							onClick={() => setOrderFilter('all')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'all'
									? 'bg-blue-500 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							All Items
						</button>
						<button
							onClick={() => setOrderFilter('dine-in')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'dine-in'
									? 'bg-blue-500 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							Dine In
						</button>
						<button
							onClick={() => setOrderFilter('takeaway')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'takeaway'
									? 'bg-blue-500 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							Takeaway
						</button>

						<button
							onClick={() => setOrderFilter('new-preparing')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'new-preparing'
									? 'bg-blue-500 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							New Order
						</button>
						<button
							onClick={() => setOrderFilter('partially-served')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'partially-served'
									? 'bg-blue-500 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							Partially Served
						</button>
						<button
							onClick={() => setOrderFilter('served')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'served'
									? 'bg-blue-500 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							Served
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="px-6 pb-6">
					{viewMode === "card" ? (
						<div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
							{filteredOrders.map((order) => (
								<OrderCard key={order.id} order={order} onMarkServed={handleMarkServed} />
							))}
						</div>
					) : (
						<OrderTable orders={filteredOrders} onOrderClick={() => {}} />
					)}
				</div>
			</div>
		</div>
	);
}
