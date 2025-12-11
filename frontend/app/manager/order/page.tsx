"use client";
import { useState, useEffect } from "react";
import { useSessionValidation } from "@/lib/useSessionValidation";
import { POLLING_INTERVALS, getWeeksAgo, getMonthsAgo } from "@/lib/timeConstants";
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import { OrderCard } from "@/app/components/shared";
import OrderTable from "@/app/components/staff/order/OrderTable";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import { DateFilterDropdown } from "@/app/components/owner/activitylog";
import type { ViewMode } from "@/app/components/ui/Form/ViewModeToggle";
import { supabase } from "@/lib/supabaseClient";
import { parseSupabaseTimestamp, getJakartaNow, formatJakartaDate, formatJakartaTime, getMinutesDifference } from "@/lib/dateUtils";
import { showSuccess, showError } from '@/lib/errorHandling';

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
	createdByName?: string;
	createdByRole?: string;
	servedByNames?: string[];
	servedByRoles?: string[];
}

export default function ManagerOrderPage() {
	useSessionValidation();
	
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

		// Auto-refresh every 1 minute
		const interval = setInterval(fetchOrders, POLLING_INTERVALS.SLOW);

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
					served_by,
					kitchen_status,
					ready_at,
					notes,
					products (name, image)
				)
			`)
			.order('created_at', { ascending: false });		if (error) {
			return;
		}

		if (!ordersData) {
			return;
		}

		// Get unique created_by IDs to fetch staff names
		const createdByIds = [...new Set(ordersData?.map(o => o.created_by).filter(Boolean))];
		
		// Get unique served_by IDs from all order_items
		const servedByIds = [...new Set(
			ordersData?.flatMap(o => 
				o.order_items?.map((item: any) => item.served_by).filter(Boolean) || []
			) || []
		)];
		
		// Combine all staff IDs we need to fetch
		const allStaffIds = [...new Set([...createdByIds, ...servedByIds])];
		
		// Fetch staff names if there are any created_by IDs
		let staffMap = new Map();
		if (allStaffIds.length > 0) {
		// Fetch all staff and filter on client side to avoid RLS issues
		const { data: staffData, error: staffError } = await supabase
			.from('staff')
			.select('id, name, staff_type, role');			if (staffError) {
				// Error fetching staff
			}
			
		if (staffData) {
			// Filter only the staff we need (both created_by and served_by)
			staffData
				.filter(staff => allStaffIds.includes(staff.id))
				.forEach(staff => {
					// Normalize type to Owner/Manager/Staff for badge colors
					let roleCategory = 'Staff'; // Default
					
					// Convert role to lowercase for comparison (database stores lowercase)
					const roleLower = staff.role?.toLowerCase();
					
					if (roleLower === 'owner') {
						roleCategory = 'Owner';
					} else if (roleLower === 'manager') {
						roleCategory = 'Manager';
					} else if (staff.staff_type) {
						// cashier, waiter, barista all become "Staff"
						roleCategory = 'Staff';
					}
					
					staffMap.set(staff.id, { name: staff.name, type: roleCategory });
					console.log(`Staff: ${staff.name}, staff_type: ${staff.staff_type}, role: ${staff.role}, Final: ${roleCategory}`); // Debug
				});
		}
	}
	console.log('Staff map:', staffMap);		// Transform data to match component format
		const transformedOrders = ordersData?.map(order => {
			const servedCount = order.order_items.filter((item: any) => item.served).length;
			const totalCount = order.order_items.length;
				
		// Calculate time difference in minutes (Jakarta timezone)
		const orderCreatedAt = parseSupabaseTimestamp(order.created_at);
		const now = getJakartaNow();
		const minutesSinceCreated = getMinutesDifference(now, orderCreatedAt);
		
		// Determine order status based on database status and time
		let status = order.status;
		
		// Auto-update status from 'new' to 'preparing' after 5 minutes
		if (order.status === 'new' && minutesSinceCreated >= 5) {
			status = 'preparing';
			// Update database in background (fire and forget)
			void supabase
				.from('orders')
				.update({ status: 'preparing' })
				.eq('id', order.id);
		}
		
		// Override with item-based status if applicable
		if (servedCount > 0 && servedCount < totalCount) {
			status = 'partially-served';
			// Update database to reflect current state
			if (order.status !== 'partially-served') {
				void supabase
					.from('orders')
					.update({ status: 'partially-served' })
					.eq('id', order.id);
			}
		} else if (servedCount === totalCount && totalCount > 0) {
			status = 'served';
			// Update database to served if not already
			if (order.status !== 'served' && order.status !== 'completed') {
				void supabase
					.from('orders')
					.update({ status: 'served', updated_at: new Date().toISOString() })
					.eq('id', order.id);
			}
			
			// Auto-complete after 5 minutes of being served
			// Check if order is fully served and 5 minutes have passed since last update
			const orderUpdatedAt = parseSupabaseTimestamp(order.updated_at || order.created_at);
			const minutesSinceServed = getMinutesDifference(now, orderUpdatedAt);
			
			if (order.status === 'served' && minutesSinceServed >= 5) {
				status = 'completed';
				void supabase
					.from('orders')
					.update({ 
						status: 'completed',
						completed_at: new Date().toISOString()
					})
					.eq('id', order.id);
			}
		}				// Get unique served_by staff from order_items
				const servedByStaffIds = [...new Set(
					order.order_items
						?.filter((item: any) => item.served && item.served_by)
						.map((item: any) => item.served_by) || []
				)];
				
				const servedByNames = servedByStaffIds
					.map(id => staffMap.get(id)?.name)
					.filter(Boolean);
				
				const servedByTypes = servedByStaffIds
					.map(id => staffMap.get(id)?.type)
					.filter(Boolean);

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
				createdByName: order.created_by ? staffMap.get(order.created_by)?.name : undefined,
				createdByRole: order.created_by ? staffMap.get(order.created_by)?.type : order.created_by_role,
				servedByNames: servedByNames,
				servedByRoles: servedByTypes,
				createdAt: order.created_at,
			};
		}) || [];

		setOrderList(transformedOrders);
		} catch (error) {
			// Error fetching orders
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
				showError(`Gagal menghapus payment transactions: ${paymentError.message}`);
				return;
			}

			// Step 2: Delete order_items
			const { error: itemsError } = await supabase
				.from('order_items')
				.delete()
				.eq('order_id', orderId);

			if (itemsError) {
				showError(`Gagal menghapus order items: ${itemsError.message}`);
				return;
			}

			// Step 3: Update tables if order is dine-in (remove current_order_id reference)
			const { error: tableUpdateError } = await supabase
				.from('tables')
				.update({ current_order_id: null, status: 'available' })
				.eq('current_order_id', orderId);

			if (tableUpdateError) {
				// Continue anyway, this is not critical
			}

			// Step 4: Finally delete the order
			const { error: orderError } = await supabase
				.from('orders')
				.delete()
				.eq('id', orderId);

			if (orderError) {
				showError(`Gagal menghapus order: ${orderError.message}`);
				return;
			}

			// Update local state
			setOrderList(prev => prev.filter(order => order.id !== orderId));
			showSuccess('Order berhasil dihapus');
		} catch (error) {
			showError('Gagal menghapus order. Silakan coba lagi.');
		}
	}

	// Get current date for filtering
	const now = new Date();
	const today = now.toDateString();
	const weekAgo = getWeeksAgo(1);
	const monthAgo = getMonthsAgo(1);

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
					searchBar={
						<SearchBar 
							value={searchQuery}
							onChange={setSearchQuery}
							placeholder="Search orders..."
						/>
					}
				>
					<div className="flex items-center gap-3">
						<DateFilterDropdown
							dateFilter={dateFilter}
							onDateFilterChange={setDateFilter}
							customDateRange={customDateRange}
							onCustomDateRangeChange={setCustomDateRange}
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
									? 'bg-gray-900 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							All Items
						</button>
						<button
							onClick={() => setOrderFilter('dine-in')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'dine-in'
									? 'bg-gray-900 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							Dine In
						</button>
						<button
							onClick={() => setOrderFilter('takeaway')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'takeaway'
									? 'bg-gray-900 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							Takeaway
						</button>

						<button
							onClick={() => setOrderFilter('new-preparing')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'new-preparing'
									? 'bg-gray-900 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							New Order
						</button>
						<button
							onClick={() => setOrderFilter('partially-served')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'partially-served'
									? 'bg-gray-900 text-white shadow-md'
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							Partially Served
						</button>
						<button
							onClick={() => setOrderFilter('served')}
							className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
								orderFilter === 'served'
									? 'bg-gray-900 text-white shadow-md'
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
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
					</div>
					) : viewMode === "card" ? (
						<div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
						{filteredOrders.map((order) => (
							<OrderCard 
								key={order.id} 
								order={order}
								showDeleteButton={true}
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
