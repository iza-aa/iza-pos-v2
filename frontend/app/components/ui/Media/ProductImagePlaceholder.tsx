"use client";

import { useState } from "react";
import { getInitials } from "@/lib/avatarUtils";

interface ProductImagePlaceholderProps {
  name: string;
  imageUrl?: string | null;
  className?: string;
}

export default function ProductImagePlaceholder({ 
  name, 
  imageUrl, 
  className = "w-full h-full" 
}: ProductImagePlaceholderProps) {
  const [imageError, setImageError] = useState(false);

  // Generate consistent color based on name
  const getColor = (productName: string): string => {
    const colors = [
      'bg-gray-400',
      'bg-gray-500',
      'bg-gray-600',
      'bg-slate-400',
      'bg-slate-500',
      'bg-zinc-400',
      'bg-zinc-500',
      'bg-neutral-400',
      'bg-neutral-500',
    ];
    
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Check if image exists and is valid
  const hasValidImage = imageUrl && imageUrl.trim() !== '' && imageUrl !== '/placeholder.jpg' && !imageError;

  if (hasValidImage) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${className} object-cover`}
        onError={() => setImageError(true)}
      />
    );
  }

  // Show initials placeholder
  return (
    <div className={`${className} ${getColor(name)} flex items-center justify-center`}>
      <span className="text-white font-bold text-2xl">
        {getInitials(name)}
      </span>
    </div>
  );
}
