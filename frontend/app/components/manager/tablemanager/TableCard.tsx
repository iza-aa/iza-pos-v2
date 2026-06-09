/**
 * Table Card Component
 * Visual representation of a table in the restaurant map
 *
 * Table Management is for layout/configuration.
 * Operational table status is shown only as read-only indicator.
 */

'use client';

import {
  PencilIcon,
  QrCodeIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/app/components/shared/i18n';

interface TableCardTable {
  id: string;
  table_number: string;
  capacity: number;
  shape: string | null;
  status: string | null;
  qr_code_url?: string | null;
  qr_code_image?: string | null;
  current_order_id?: string | null;
  occupied_by_customer?: string | null;
}

interface TableCardProps {
  table: TableCardTable;
  onEdit: () => void;
  onDelete: () => void;
  onShowQR: () => void;
  isDragging?: boolean;
}

export default function TableCard({
  table,
  onEdit,
  onDelete,
  onShowQR,
  isDragging = false,
}: TableCardProps) {
  const { t } = useLanguage();
  const normalizedStatus = table.status?.toLowerCase() ?? 'free';
  const normalizedShape = table.shape?.toLowerCase() ?? 'round';

  const isBusy =
    normalizedStatus === 'occupied' || Boolean(table.current_order_id);

  const hasQR = Boolean(table.qr_code_url || table.qr_code_image);

  const cardStatusClass: Record<string, string> = {
    free: 'bg-white border-gray-300 text-gray-900',
    occupied: 'bg-red-50 border-red-300 text-red-800',
    reserved: 'bg-amber-50 border-amber-300 text-amber-800',
    cleaning: 'bg-blue-50 border-blue-300 text-blue-800',
    maintenance: 'bg-gray-100 border-gray-400 text-gray-800',
  };

  const badgeStatusClass: Record<string, string> = {
    occupied: 'border-red-200 bg-red-50 text-red-700',
    reserved: 'border-amber-200 bg-amber-50 text-amber-700',
    cleaning: 'border-blue-200 bg-blue-50 text-blue-700',
    maintenance: 'border-gray-300 bg-gray-100 text-gray-700',
  };

  const shapeClass: Record<string, string> = {
    round: 'rounded-full',
    square: 'rounded-xl',
    rectangular: 'rounded-xl w-32',
  };

  const shouldShowStatusBadge = normalizedStatus !== 'free';
  const statusLabel: Record<string, string> = {
    free: t('manager.table.statusFree'),
    occupied: t('manager.table.statusOccupied'),
    reserved: t('manager.table.statusReserved'),
    cleaning: t('manager.table.statusCleaning'),
    maintenance: t('manager.table.statusMaintenance'),
  };

  const stopButtonMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`relative group transition-all ${
        isDragging ? 'scale-105 opacity-70' : ''
      }`}
    >
      <div
        className={`
          flex h-24 w-24 flex-col items-center justify-center border-2 shadow-sm transition-shadow hover:shadow-md
          ${cardStatusClass[normalizedStatus] || cardStatusClass.free}
          ${shapeClass[normalizedShape] || shapeClass.round}
        `}
      >
        <span className="text-lg font-bold">{table.table_number}</span>

        <div className="mt-1 flex items-center text-xs text-gray-600">
          <UserGroupIcon className="mr-1 h-3 w-3" />
          <span>{table.capacity}</span>
        </div>

        {isBusy && table.occupied_by_customer ? (
          <span className="mt-1 max-w-20 truncate text-[10px] font-medium">
            {table.occupied_by_customer}
          </span>
        ) : null}
      </div>

      <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onMouseDown={stopButtonMouseDown}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-800"
          title={t('manager.table.editTableTitle')}
          aria-label={t('manager.table.editTableAria', { table: table.table_number })}
        >
          <PencilIcon className="h-4 w-4" />
        </button>

        {hasQR ? (
          <button
            type="button"
            onMouseDown={stopButtonMouseDown}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onShowQR();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
            title={t('manager.table.viewQrTitle')}
            aria-label={t('manager.table.viewQrAria', { table: table.table_number })}
          >
            <QrCodeIcon className="h-4 w-4" />
          </button>
        ) : null}

        <button
          type="button"
          onMouseDown={stopButtonMouseDown}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-lg ${
            isBusy
              ? 'cursor-not-allowed bg-gray-400'
              : 'bg-red-600 hover:bg-red-700'
          }`}
          title={
            isBusy
              ? t('manager.table.deleteOccupiedTitle')
              : t('manager.table.deleteTitle', { table: table.table_number })
          }
          aria-label={t('manager.table.deleteTitle', { table: table.table_number })}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {shouldShowStatusBadge ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <span
            className={`
              whitespace-nowrap rounded-full border px-2 py-0.5 text-xs capitalize shadow-sm
              ${badgeStatusClass[normalizedStatus] || badgeStatusClass.maintenance}
            `}
          >
            {statusLabel[normalizedStatus] ?? normalizedStatus}
          </span>
        </div>
      ) : null}
    </div>
  );
}
