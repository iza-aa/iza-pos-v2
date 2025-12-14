/**
 * Toast Notification Component
 * 
 * Displays toast notifications with different types (success, error, warning, info)
 * Automatically dismisses after duration or manually via close button
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'
import { subscribeToToasts, type ToastOptions } from '@/lib/services/errorHandling'

interface Toast extends ToastOptions {
  id: number
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  useEffect(() => {
    const unsubscribe = subscribeToToasts((options) => {
      const toast: Toast = {
        ...options,
        id: nextId++
      }
      
      setToasts(prev => [...prev, toast])
      
      // Auto dismiss after duration
      if (options.duration !== undefined && options.duration > 0) {
        setTimeout(() => {
          dismissToast(toast.id)
        }, options.duration)
      }
    })
    
    return unsubscribe
  }, [])

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const getIcon = (type: ToastOptions['type']) => {
    const iconClass = 'w-5 h-5 flex-shrink-0'
    
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={`${iconClass} text-green-500`} />
      case 'error':
        return <XCircleIcon className={`${iconClass} text-red-500`} />
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClass} text-yellow-500`} />
      case 'info':
        return <InformationCircleIcon className={`${iconClass} text-blue-500`} />
    }
  }

  const getColorClasses = (type: ToastOptions['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getPositionClasses = (position: ToastOptions['position']) => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <div className="fixed z-[100] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            fixed ${getPositionClasses(toast.position)} 
            animate-slide-in pointer-events-auto
          `}
        >
          <div
            className={`
              ${getColorClasses(toast.type)}
              border rounded-lg shadow-lg p-4 mb-3
              max-w-sm w-full flex items-start gap-3
              transition-all duration-300
            `}
          >
            {getIcon(toast.type)}
            
            <p className="flex-1 text-sm text-gray-800 whitespace-pre-line">
              {toast.message}
            </p>
            
            {toast.dismissible && (
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
