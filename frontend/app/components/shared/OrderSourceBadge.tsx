import React from 'react';
import { ComputerDesktopIcon, QrCodeIcon } from '@heroicons/react/24/outline';

type OrderSource = 'pos' | 'qr';

interface OrderSourceBadgeProps {
  source: OrderSource;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

/**
 * Badge component to display order source (POS or QR)
 * Follows monochrome design system with grayscale colors
 */
export default function OrderSourceBadge({ 
  source, 
  size = 'md',
  showLabel = true 
}: OrderSourceBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  if (source === 'pos') {
    return (
      <span className={`inline-flex items-center gap-1 ${sizeClasses[size]} rounded-md bg-gray-200 text-gray-800 font-medium border border-gray-300`}>
        <ComputerDesktopIcon className={iconSize} />
        {showLabel && <span>POS</span>}
      </span>
    );
  }

  if (source === 'qr') {
    return (
      <span className={`inline-flex items-center gap-1 ${sizeClasses[size]} rounded-md bg-gray-800 text-white font-medium`}>
        <QrCodeIcon className={iconSize} />
        {showLabel && <span>QR</span>}
      </span>
    );
  }

  return null;
}
