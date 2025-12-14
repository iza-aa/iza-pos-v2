"use client";
import { useState, useEffect } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentStaffInfo, getCurrentUser } from '@/lib/utils';
import { ORDER_TIMINGS, TABLES } from '@/lib/constants';
import { POLLING_INTERVALS, TIME_UNITS, getWeeksAgo, getMonthsAgo } from '@/lib/constants';
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import { OrderCard } from "@/app/components/shared";
import OrderTable from "@/app/components/staff/order/OrderTable";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import { DateFilterDropdown } from "@/app/components/owner/activitylog";
import type { ViewMode } from "@/app/components/ui/Form/ViewModeToggle";
import type { OrderItem } from "@/lib/types";
import { supabase } from "@/lib/config/supabaseClient";
import { parseSupabaseTimestamp, getJakartaNow, formatJakartaDate, formatJakartaTime, getMinutesDifference } from "@/lib/utils";

interface OrderDisplay {
	id: string
	customerName: string
	orderNumber: string
	orderType: string
	items: OrderItem[]
	total: number
	date: string
	time: string
	status: "new" | "preparing" | "partially-served" | "served" | "completed"
	table?: string
	orderSource?: 'pos' | 'qr'
	createdAt: string
	timeDiff?: string
}

export default function OrderPage() {
	useSessionValidation();
	
	const [orderList, setOrderList] = useState<OrderDisplay[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("card");
	const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
	const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
	const [orderFilter, setOrderFilter] = useState<'all' | 'dine-in' | 'takeaway' | 'new-preparing' | 'partially-served' | 'served' | 'pos' | 'qr'>('all');

	// Page protection - only for Owner, Waiter
	useEffect(() => {
		const userRole = localStorage.getItem('user_role');
		const staffType = localStorage.getItem('staff_type');
		
		// Allow: Owner OR Waiter
		if (userRole !== 'owner' && staffType !== 'waiter') {
			window.location.href = '/staff/dashboard';
		}
	}, []);

	// Fetch orders from database
	useEffect(() => {
		fetchOrders();
		
		// Set up real-time subscription
		const subscription = supabase
			.channel('orders-changes')
			.on('postgres_changes', { event: '*', schema: 'public', table: TABLES.ORDERS }, () => {
				fetchOrders();
			})
			.on('postgres_changes', { event: '*', schema: 'public', table: TABLES.ORDER_ITEMS }, () => {
				fetchOrders();
			})
			.subscribe();

		// Auto-refresh every minute to check for status updates
		const refreshInterval = setInterval(() => {
			fetchOrders();
		}, ORDER_TIMINGS.AUTO_REFRESH_INTERVAL);

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
				throw error;
			}

			// Transform data to match component format
			const transformedOrders = ordersData?.map(order => {
				const servedCount = order.order_items.filter((item) => item.served).length;
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
				supabase
					.from('orders')
					.update({ status: 'preparing' })
					.eq('id', order.id)
					.then(() => {})
					.catch(err => {});
			}
			
			// Override with item-based status if applicable
			if (servedCount > 0 && servedCount < totalCount) {
				status = 'partially-served';
				// Update database to reflect current state
				if (order.status !== 'partially-served') {
					supabase
						.from('orders')
						.update({ status: 'partially-served' })
						.eq('id', order.id)
						.then(() => {})
						.catch(err => console.error('Error updating to partially-served:', err));
				}
			} else if (servedCount === totalCount && totalCount > 0) {
				status = 'served';
				// Update database to served if not already
				if (order.status !== 'served' && order.status !== 'completed') {
					supabase
						.from('orders')
						.update({ status: 'served', updated_at: new Date().toISOString() })
						.eq('id', order.id)
						.then(() => {})
						.catch(err => console.error('Error updating to served:', err));
				}
				
				// Auto-complete after 5 minutes of being served
				// Check if order is fully served and 5 minutes have passed since last update
				const orderUpdatedAt = parseSupabaseTimestamp(order.updated_at || order.created_at);
				const minutesSinceServed = Math.floor((now - orderUpdatedAt) / TIME_UNITS.MINUTE);
				
				if (order.status === 'served' && minutesSinceServed >= 5) {
					status = 'completed';
					supabase
						.from('orders')
						.update({ 
							status: 'completed',
							completed_at: new Date().toISOString()
						})
						.eq('id', order.id)
						.then(() => {})
						.catch(err => console.error('Error auto-completing order:', err));
				}
			}				return {
					id: order.id,
					customerName: order.customer_name || 'Guest',
					orderNumber: order.order_number || `#${order.id.substring(0, 8).toUpperCase()}`,
					orderType: order.order_type || 'Dine in',
				items: order.order_items.map((item) => ({
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
				orderSource: order.order_source || undefined,
				createdByRole: order.created_by_role || undefined,
				createdByStaffCode: order.created_by_staff_code || undefined,
				createdByStaffName: order.created_by_staff_name || undefined,
				servedByRoles: order.served_by_roles || [],
				servedByStaffCodes: order.served_by_staff_codes || [],
				createdAt: order.created_at, // Keep for countdown
			};
			}) || [];

			setOrderList(transformedOrders);
		} catch (error) {
			// Error fetching orders
		} finally {
			setLoading(false);
		}
	}

	const handleMarkServed = async (orderId: string, itemIds: string[]) => {
		try {
		const staff = getCurrentStaffInfo();
		if (!staff) {
			showError('Anda belum login, silakan login kembali');
			return;
		}			const { id: staffId, name: staffName, staffCode, roleAbbr } = staff;
			const now = new Date().toISOString();

			// Get existing served_by data from order
			const { data: orderData } = await supabase
				.from('orders')
				.select('served_by_roles, served_by_staff_codes')
				.eq('id', orderId)
				.single();

			const existingRoles = orderData?.served_by_roles || [];
			const existingStaffCodes = orderData?.served_by_staff_codes || [];
			
			const updatedRoles = existingRoles.includes(roleAbbr) 
				? existingRoles 
				: [...existingRoles, roleAbbr];
			
			const updatedStaffCodes = existingStaffCodes.includes(staffCode)
				? existingStaffCodes
				: [...existingStaffCodes, staffCode];

			// Update served status for selected items
			const { error } = await supabase
				.from('order_items')
				.update({ 
					served: true, 
					served_at: now,
					served_by: staffId,
					served_by_role: roleAbbr,
					served_by_code: staffCode
				})
				.in('id', itemIds);

			if (error) throw error;

			// Update order's served_by arrays
			await supabase
				.from('orders')
				.update({ 
					served_by_roles: updatedRoles,
					served_by_staff_codes: updatedStaffCodes
				})
				.eq('id', orderId);

			// Refresh orders
			await fetchOrders();

			// Log activity
			await supabase
				.from('activity_logs')
				.insert([{
					staff_id: staffId,
					activity_type: 'items_served',
					description: `Marked ${itemIds.length} items as served by ${staffCode} (${roleAbbr})`,
					metadata: { order_id: orderId, item_ids: itemIds, role: roleAbbr }
				}]);

		} catch (error) {
			showError('Gagal menandai item sebagai served');
		}
	}

	// Handler for serving single item
	const handleServeItem = async (orderId: string, itemId: string) => {
		await handleMarkServed(orderId, [itemId]);
	};

	// Handler for serving all items in order
	const handleServeAll = async (orderId: string) => {
		const order = orderList.find(o => o.id === orderId);
		if (!order) return;
		
		const unservedItemIds = order.items
			.filter((item) => !item.served)
			.map((item) => item.id);
		
		if (unservedItemIds.length > 0) {
			await handleMarkServed(orderId, unservedItemIds);
		}
	};

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
		} else if (orderFilter === 'pos') {
			matchesFilter = order.orderSource === 'pos';
		} else if (orderFilter === 'qr') {
			matchesFilter = order.orderSource === 'qr';
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
				<div className="flex items-center gap-2 overflow-x-auto pb-2">
					<button
						onClick={() => setOrderFilter('all')}
						className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
							orderFilter === 'all'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
						}`}
					>
						All Items
					</button>
					<button
						onClick={() => setOrderFilter('dine-in')}
						className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
							orderFilter === 'dine-in'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
						}`}
					>
						Dine In
					</button>
				<button
					onClick={() => setOrderFilter('takeaway')}
					className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
						orderFilter === 'takeaway'
							? 'bg-gray-900 text-white shadow-md'
							: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
					}`}
				>
					Takeaway
				</button>						<button
						onClick={() => setOrderFilter('new-preparing')}
						className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
							orderFilter === 'new-preparing'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
						}`}
					>
						New Order
					</button>
					<button
						onClick={() => setOrderFilter('partially-served')}
						className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
							orderFilter === 'partially-served'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
						}`}
					>
						Partially Served
					</button>
					<button
						onClick={() => setOrderFilter('served')}
						className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
							orderFilter === 'served'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
						}`}
					>
						Served
					</button>
					<button
						onClick={() => setOrderFilter('pos')}
						className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
							orderFilter === 'pos'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
						}`}
					>
						POS Only
					</button>
					<button
						onClick={() => setOrderFilter('qr')}
						className={`px-6 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
							orderFilter === 'qr'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
						}`}
					>
						QR Only
					</button>
				</div>
			</div>				{/* Content */}
				<div className="px-6 pb-6">
					{viewMode === "card" ? (
					<div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
						{filteredOrders.map((order) => (
							<OrderCard 
								key={order.id} 
								order={order}
								enableFlipCard={true}
								onMarkServed={handleMarkServed}
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
