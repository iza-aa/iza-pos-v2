/**
 * Table Card Component
 * Visual representation of a table in the restaurant map
 */

'use client';

import { PencilIcon, TrashIcon, QrCodeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface TableCardProps {
  table: {
    id: string;
    table_number: string;
    capacity: number;
    shape: string;
    status: string;
    qr_code_url?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export default function TableCard({
  table,
  onEdit,
  onDelete,
  isDragging = false,
}: TableCardProps) {
  const statusColors = {
    free: 'bg-green-100 border-green-300 text-green-800',
    occupied: 'bg-red-100 border-red-300 text-red-800',
    reserved: 'bg-amber-100 border-amber-300 text-amber-800',
    cleaning: 'bg-blue-100 border-blue-300 text-blue-800',
  };

  const shapeClass = {
    round: 'rounded-full',
    square: 'rounded-lg',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`relative group ${
        isDragging ? 'opacity-70 scale-105' : ''
      } transition-all`}
    >
      {/* Table Visual */}
      <div
        className={`
          h-24 w-24 border-2 flex flex-col items-center justify-center
          ${statusColors[table.status as keyof typeof statusColors] || statusColors.free}
          ${shapeClass[table.shape as keyof typeof shapeClass] || shapeClass.round}
          shadow-md hover:shadow-lg transition-shadow
        `}
      >
        <span className="text-lg font-bold">{table.table_number}</span>
        <div className="flex items-center text-xs mt-1">
          <UserGroupIcon className="h-3 w-3 mr-1" />
          <span>{table.capacity}</span>
        </div>
      </div>

      {/* Action Buttons (Show on Hover) */}
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 shadow-lg"
          title="Edit table"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        
        {table.qr_code_url && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(table.qr_code_url, '_blank');
            }}
            className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-lg"
            title="View QR code"
          >
            <QrCodeIcon className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-lg"
          title="Delete table"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-300 shadow-sm capitalize whitespace-nowrap">
          {table.status}
        </span>
      </div>
    </div>
  );
}
