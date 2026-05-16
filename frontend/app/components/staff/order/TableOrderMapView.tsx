'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/config/supabaseClient';
import type { Order } from '@/lib/types';

type FulfillmentMethod = 'table_service' | 'pager' | 'counter_pickup';

type OrderWithFulfillment = Order & {
  fulfillmentMethod?: FulfillmentMethod | null;
  pagerNumber?: string | null;
  pickupCode?: string | null;

  fulfillment_method?: FulfillmentMethod | null;
  pager_number?: string | null;
  pickup_code?: string | null;

  tableId?: string | null;
  table_id?: string | null;
};

interface Floor {
  id: string;
  name: string;
  floor_number: number;
}

interface RestaurantTable {
  id: string;
  table_number: string;
  floor_id: string | null;
  capacity: number;
  shape: string | null;
  position_x: number | null;
  position_y: number | null;
  is_active: boolean | null;
}

interface TableOrderMapViewProps {
  orders: Order[];
}

const ACTIVE_ORDER_STATUSES = ['new', 'preparing', 'partially-served', 'served'];

export default function TableOrderMapView({ orders }: TableOrderMapViewProps) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLayout = async () => {
      setLoading(true);

      try {
        const { data: floorData, error: floorError } = await supabase
          .from('floors')
          .select('id, name, floor_number')
          .eq('is_active', true)
          .order('floor_number', { ascending: true });

        if (floorError) {
          throw floorError;
        }

        const { data: tableData, error: tableError } = await supabase
          .from('tables')
          .select(
            'id, table_number, floor_id, capacity, shape, position_x, position_y, is_active'
          )
          .eq('is_active', true)
          .order('table_number', { ascending: true });

        if (tableError) {
          throw tableError;
        }

        const activeFloors = floorData ?? [];
        const activeTables = tableData ?? [];

        setFloors(activeFloors);
        setTables(activeTables);

        setSelectedFloorId((currentFloorId) => {
          const stillExists = activeFloors.some(
            (floor) => floor.id === currentFloorId
          );

          if (stillExists) {
            return currentFloorId;
          }

          return activeFloors.length > 0 ? activeFloors[0].id : null;
        });
      } catch (error) {
        console.error('Failed to fetch table layout:', error);
        setFloors([]);
        setTables([]);
        setSelectedFloorId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLayout();
  }, []);

  const tableServiceOrders = useMemo(() => {
    return (orders as OrderWithFulfillment[]).filter((order) => {
      const fulfillmentMethod =
        order.fulfillmentMethod ?? order.fulfillment_method ?? null;

      const isTableService =
        fulfillmentMethod === 'table_service' ||
        Boolean(order.tableNumber || order.table || order.tableId || order.table_id);

      const isActive = ACTIVE_ORDER_STATUSES.includes(order.status);

      return isTableService && isActive;
    });
  }, [orders]);

  const ordersByTableNumber = useMemo(() => {
    const groupedOrders = new Map<string, OrderWithFulfillment[]>();

    tableServiceOrders.forEach((order) => {
      const tableNumber = order.tableNumber || order.table;

      if (!tableNumber) {
        return;
      }

      const normalizedTableNumber = tableNumber.trim().toLowerCase();

      if (!groupedOrders.has(normalizedTableNumber)) {
        groupedOrders.set(normalizedTableNumber, []);
      }

      groupedOrders.get(normalizedTableNumber)?.push(order);
    });

    return groupedOrders;
  }, [tableServiceOrders]);

  const selectedFloorTables = useMemo(() => {
    return tables.filter((table) => table.floor_id === selectedFloorId);
  }, [tables, selectedFloorId]);

  const getTableShapeClass = (shape: string | null) => {
    const normalizedShape = shape?.toLowerCase() ?? 'round';

    const shapeClass: Record<string, string> = {
      round: 'rounded-full',
      square: 'rounded-2xl',
      rectangular: 'rounded-2xl w-36',
    };

    return shapeClass[normalizedShape] ?? shapeClass.round;
  };

  const getHighestPriorityStatus = (tableOrders: OrderWithFulfillment[]) => {
    if (tableOrders.some((order) => order.status === 'new')) {
      return 'New';
    }

    if (tableOrders.some((order) => order.status === 'preparing')) {
      return 'Preparing';
    }

    if (tableOrders.some((order) => order.status === 'partially-served')) {
      return 'Partially Served';
    }

    if (tableOrders.some((order) => order.status === 'served')) {
      return 'Served';
    }

    return 'Active';
  };

  const getTableCardClass = (hasActiveOrder: boolean) => {
    if (hasActiveOrder) {
      return 'border-orange-300 bg-orange-50 text-orange-900 shadow-md';
    }

    return 'border-gray-300 bg-white text-gray-900 shadow-sm';
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        <p className="mt-4 text-sm text-gray-500">Loading table map...</p>
      </div>
    );
  }

  if (floors.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-3 text-lg font-semibold text-gray-900">
          No active floors
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Create active floors and tables in Table Management first.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm mt-6">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Table Order Map
            </h2>
            <p className="text-sm text-gray-500">
              Read-only map for active table service orders. Pager and counter
              pickup orders are handled in Kanban/List View.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {floors.map((floor) => {
              const isSelected = selectedFloorId === floor.id;

              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => setSelectedFloorId(floor.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {floor.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Tables on floor
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {selectedFloorTables.length}
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              Active table orders
            </p>
            <p className="mt-1 text-xl font-bold text-orange-900">
              {tableServiceOrders.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Fulfillment
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              Table Service Only
            </p>
          </div>
        </div>
      </div>

      <div className="relative h-[600px] overflow-hidden bg-gray-50">
        {selectedFloorTables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <ClipboardDocumentListIcon className="mx-auto h-14 w-14 text-gray-300" />
              <h3 className="mt-3 text-base font-semibold text-gray-900">
                No tables on this floor
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Add tables in Table Management to show them here.
              </p>
            </div>
          </div>
        ) : (
          selectedFloorTables.map((table) => {
            const tableOrders =
              ordersByTableNumber.get(table.table_number.trim().toLowerCase()) ??
              [];

            const hasActiveOrder = tableOrders.length > 0;
            const positionX = table.position_x ?? 0;
            const positionY = table.position_y ?? 0;

            return (
              <div
                key={table.id}
                className="absolute select-none"
                style={{
                  left: `${positionX}px`,
                  top: `${positionY}px`,
                }}
              >
                <div
                  className={`flex h-28 w-28 flex-col items-center justify-center border-2 transition ${getTableShapeClass(
                    table.shape
                  )} ${getTableCardClass(hasActiveOrder)}`}
                >
                  <span className="text-lg font-bold">
                    {table.table_number}
                  </span>

                  <div className="mt-1 flex items-center text-xs text-gray-600">
                    <UserGroupIcon className="mr-1 h-3 w-3" />
                    <span>{table.capacity}</span>
                  </div>

                  {hasActiveOrder ? (
                    <div className="mt-2 text-center">
                      <div className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {tableOrders.length} Order
                        {tableOrders.length > 1 ? 's' : ''}
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-orange-800">
                        {getHighestPriorityStatus(tableOrders)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] text-gray-400">
                      No Order
                    </div>
                  )}
                </div>

                {hasActiveOrder ? (
                  <div className="mt-2 w-44 rounded-xl border border-orange-200 bg-white p-3 shadow-lg">
                    <p className="mb-2 text-xs font-semibold text-gray-900">
                      Active Orders
                    </p>

                    <div className="space-y-2">
                      {tableOrders.slice(0, 3).map((order) => (
                        <div
                          key={order.id}
                          className="rounded-lg bg-orange-50 px-2 py-1.5"
                        >
                          <p className="truncate text-xs font-semibold text-orange-900">
                            {order.orderNumber}
                          </p>
                          <p className="truncate text-[11px] text-orange-700">
                            {order.customerName} · {order.status}
                          </p>
                        </div>
                      ))}

                      {tableOrders.length > 3 ? (
                        <p className="text-[11px] font-medium text-orange-700">
                          +{tableOrders.length - 3} more orders
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}