"use client";
import { useState, useEffect } from "react";
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import ManagerOrderCard from "@/app/components/manager/order/ManagerOrderCard";
import OrderTable from "@/app/components/staff/order/OrderTable";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import { DateFilterDropdown } from "@/app/components/owner/activitylog";
import type { ViewMode } from "@/app/components/ui/ViewModeToggle";
import { supabase } from "@/lib/supabaseClient";
import { parseSupabaseTimestamp, getJakartaNow, formatJakartaDate, formatJakartaTime, getMinutesDifference } from "@/lib/dateUtils";

interface Order {
	id: string;
	customerName: string;
	orderNumber: string;
	orderType: string;
	items: any[];
	total: number;
	date: string;
	time: string;
	status: "new" | "preparing" | "partially-served" | "served" | "completed";
	table?: string;
	createdAt: string;
}

export default function ManagerOrderPage() {
	const [orderList, setOrderList] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("card");
	const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
	const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
	const [orderFilter, setOrderFilter] = useState<'all' | 'dine-in' | 'takeaway' | 'new-preparing' | 'partially-served' | 'served'>('all');

	useEffect(() => {
		fetchOrders();

		// Set up real-time subscription
		const channel = supabase
			.channel('manager-orders-changes')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
				fetchOrders();
			})
			.on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
				fetchOrders();
			})
			.subscribe();

		// Auto-refresh every 60 seconds
		const interval = setInterval(fetchOrders, 60000);

		return () => {
			supabase.removeChannel(channel);
			clearInterval(interval);
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
				console.error('Error fetching orders:', error);
				return;
			}

			// Transform data to match component format
			const transformedOrders = ordersData?.map(order => {
				const servedCount = order.order_items.filter((item: any) => item.served).length;
				const totalCount = order.order_items.length;
				
				// Calculate time difference in minutes (Jakarta timezone)
				const orderCreatedAt = parseSupabaseTimestamp(order.created_at);
				const now = getJakartaNow();
				const minutesSinceCreated = getMinutesDifference(now, orderCreatedAt);
				
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
					createdByRole: order.created_by_role || undefined,
					servedByRoles: order.served_by_roles || [],
					createdAt: order.created_at,
				};
			}) || [];

			setOrderList(transformedOrders);
		} catch (error) {
			console.error('Error fetching orders:', error);
		} finally {
			setLoading(false);
		}
	}

	async function handleDeleteOrder(orderId: string) {
		if (!confirm('Apakah Anda yakin ingin menghapus order ini? Aksi ini tidak dapat dibatalkan.')) {
			return;
		}

		try {
			// Step 1: Delete payment_transactions first (has FK to orders)
			const { error: paymentError } = await supabase
				.from('payment_transactions')
				.delete()
				.eq('order_id', orderId);

			if (paymentError) {
				console.error('Error deleting payment transactions:', paymentError);
				alert(`Gagal menghapus payment transactions: ${paymentError.message}`);
				return;
			}

			// Step 2: Delete order_items
			const { error: itemsError } = await supabase
				.from('order_items')
				.delete()
				.eq('order_id', orderId);

			if (itemsError) {
				console.error('Error deleting order items:', itemsError);
				alert(`Gagal menghapus order items: ${itemsError.message}`);
				return;
			}

			// Step 3: Update tables if order is dine-in (remove current_order_id reference)
			const { error: tableUpdateError } = await supabase
				.from('tables')
				.update({ current_order_id: null, status: 'available' })
				.eq('current_order_id', orderId);

			if (tableUpdateError) {
				console.error('Error updating tables:', tableUpdateError);
				// Continue anyway, this is not critical
			}

			// Step 4: Finally delete the order
			const { error: orderError } = await supabase
				.from('orders')
				.delete()
				.eq('id', orderId);

			if (orderError) {
				console.error('Error deleting order:', orderError);
				alert(`Gagal menghapus order: ${orderError.message}`);
				return;
			}

			// Update local state
			setOrderList(prev => prev.filter(order => order.id !== orderId));
			alert('Order berhasil dihapus.');
		} catch (error) {
			console.error('Error deleting order:', error);
			alert('Gagal menghapus order. Silakan coba lagi.');
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
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
						</div>
					) : viewMode === "card" ? (
						<div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
							{filteredOrders.map((order) => (
								<ManagerOrderCard 
									key={order.id} 
									order={order} 
									onDelete={handleDeleteOrder}
								/>
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
