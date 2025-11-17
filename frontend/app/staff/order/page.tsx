"use client";
import { useState, useEffect } from "react";
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import OrderCard from "@/app/components/staff/order/OrderCard";
import OrderTable from "@/app/components/staff/order/OrderTable";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import { DateFilterDropdown } from "@/app/components/owner/activitylog";
import type { ViewMode } from "@/app/components/ui/ViewModeToggle";
import { supabase } from "@/lib/supabaseClient";
import { parseSupabaseTimestamp, getJakartaNow, formatJakartaDate, formatJakartaTime, getMinutesDifference } from "@/lib/dateUtils";

export default function OrderPage() {
	const [orderList, setOrderList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("card");
	const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
	const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
	const [orderFilter, setOrderFilter] = useState<'all' | 'dine-in' | 'takeaway' | 'new-preparing' | 'partially-served' | 'served'>('all');

	// Fetch orders from database
	useEffect(() => {
		fetchOrders();
		
		// Set up real-time subscription
		const subscription = supabase
			.channel('orders-changes')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
				fetchOrders();
			})
			.on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
				fetchOrders();
			})
			.subscribe();

		// Auto-refresh every minute to check for status updates
		const refreshInterval = setInterval(() => {
			fetchOrders();
		}, 60000); // 60 seconds

		return () => {
			subscription.unsubscribe();
			clearInterval(refreshInterval);
		};
	}, []);

	async function fetchOrders() {
		setLoading(true);
		try {
			// Fetch orders with order items
			const { data: ordersData, error } = await supabase
				.from('orders')
				.select(`
					*,
					order_items (
						id,
						product_id,
						product_name,
						quantity,
						base_price,
						total_price,
						variants,
						served,
						served_at,
						kitchen_status,
						ready_at,
						notes,
						products (name, image)
					)
				`)
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Supabase error:', error);
				throw error;
			}

			// Transform data to match component format
			const transformedOrders = ordersData?.map(order => {
				const servedCount = order.order_items.filter((item: any) => item.served).length;
				const totalCount = order.order_items.length;
				
				// Calculate time difference in minutes (Jakarta timezone)
				const orderCreatedAt = parseSupabaseTimestamp(order.created_at);
				const now = getJakartaNow();
				const minutesSinceCreated = getMinutesDifference(now, orderCreatedAt);
				
				// Debug: Log order status info
				console.log(`Order ${order.order_number}: DB status="${order.status}", minutes=${minutesSinceCreated}, created=${order.created_at}`);
				
				// Determine order status based on database status and time
				let status = order.status;
				
				// Auto-update status from 'new' to 'preparing' after 2 minutes
				if (order.status === 'new' && minutesSinceCreated >= 2) {
					status = 'preparing';
					// Update database in background (fire and forget)
					supabase
						.from('orders')
						.update({ status: 'preparing' })
						.eq('id', order.id)
						.then(() => {})
						.catch(err => console.error('Error auto-updating order status:', err));
				}
				
				// Override with item-based status if applicable
				if (servedCount > 0 && servedCount < totalCount) {
					status = 'partially-served';
				} else if (servedCount === totalCount && totalCount > 0) {
					status = 'served';
				}

				return {
					id: order.id,
					customerName: order.customer_name || 'Guest',
					orderNumber: order.order_number || `#${order.id.substring(0, 8).toUpperCase()}`,
					orderType: order.order_type || 'Dine in',
				items: order.order_items.map((item: any) => ({
					id: item.id,
					name: item.product_name || item.products?.name || 'Unknown Item',
					quantity: item.quantity,
					price: item.base_price,
					served: item.served,
					servedAt: item.served_at ? formatJakartaTime(parseSupabaseTimestamp(item.served_at)) : undefined,
					variants: item.variants,
					kitchenStatus: item.kitchen_status || 'not_required',
					readyAt: item.ready_at,
				})),
				total: order.total || 0,
				date: formatJakartaDate(orderCreatedAt),
				time: formatJakartaTime(orderCreatedAt),
				status,
				table: order.table_number || undefined,
				createdAt: order.created_at, // Keep for countdown
			};
			}) || [];

			setOrderList(transformedOrders);
		} catch (error) {
			console.error('Error fetching orders:', error);
		} finally {
			setLoading(false);
		}
	}

	const handleMarkServed = async (orderId: string, itemIds: string[]) => {
		try {
			const staffId = localStorage.getItem('user_id');
			const now = new Date().toISOString();

			// Update served status for selected items
			const { error } = await supabase
				.from('order_items')
				.update({ 
					served: true, 
					served_at: now,
					served_by: staffId
				})
				.in('id', itemIds);

			if (error) throw error;

			// Refresh orders
			await fetchOrders();

			// Log activity
			await supabase
				.from('activity_logs')
				.insert([{
					staff_id: staffId,
					activity_type: 'items_served',
					description: `Marked ${itemIds.length} items as served`,
					metadata: { order_id: orderId, item_ids: itemIds }
				}]);

		} catch (error) {
			console.error('Error marking items as served:', error);
			alert('Failed to mark items as served');
		}
	}

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
