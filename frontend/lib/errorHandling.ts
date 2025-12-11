/**
 * Error handling and toast notification utilities
 * 
 * Provides centralized error handling, toast notifications, and
 * error parsing for consistent UX across the application.
 */

import type { SupabaseError } from './types'

// ==================== Toast Types ====================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  type: ToastType
  message: string
  duration?: number // milliseconds
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'
  dismissible?: boolean
}

// ==================== Toast State Management ====================

type ToastListener = (options: ToastOptions) => void
const toastListeners: ToastListener[] = []

/**
 * Subscribe to toast notifications
 * Returns an unsubscribe function
 */
export function subscribeToToasts(listener: ToastListener): () => void {
  toastListeners.push(listener)
  
  return () => {
    const index = toastListeners.indexOf(listener)
    if (index > -1) {
      toastListeners.splice(index, 1)
    }
  }
}

/**
 * Emit a toast notification to all listeners
 */
function emitToast(options: ToastOptions): void {
  toastListeners.forEach(listener => listener(options))
}

// ==================== Toast Functions ====================

/**
 * Show a success toast notification
 */
export function showSuccess(message: string, duration?: number): void {
  emitToast({
    type: 'success',
    message,
    duration: duration || 3000,
    position: 'top-right',
    dismissible: true
  })
}

/**
 * Show an error toast notification
 */
export function showError(message: string, duration?: number): void {
  emitToast({
    type: 'error',
    message,
    duration: duration || 5000,
    position: 'top-right',
    dismissible: true
  })
}

/**
 * Show a warning toast notification
 */
export function showWarning(message: string, duration?: number): void {
  emitToast({
    type: 'warning',
    message,
    duration: duration || 4000,
    position: 'top-right',
    dismissible: true
  })
}

/**
 * Show an info toast notification
 */
export function showInfo(message: string, duration?: number): void {
  emitToast({
    type: 'info',
    message,
    duration: duration || 3000,
    position: 'top-right',
    dismissible: true
  })
}

/**
 * Show a custom toast notification
 */
export function showToast(options: ToastOptions): void {
  emitToast({
    duration: 3000,
    position: 'top-right',
    dismissible: true,
    ...options
  })
}

// ==================== Error Parsing ====================

/**
 * Parse Supabase error and return user-friendly message
 */
export function parseSupabaseError(error: any): string {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui'
  
  // Check if it's a Supabase error
  if (error.message) {
    const message = error.message.toLowerCase()
    
    // Authentication errors
    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return 'Kode login tidak valid atau sudah kadaluarsa'
    }
    
    if (message.includes('expired')) {
      return 'Sesi Anda telah berakhir, silakan login kembali'
    }
    
    // Permission errors
    if (message.includes('permission denied') || message.includes('not authorized')) {
      return 'Anda tidak memiliki izin untuk melakukan aksi ini'
    }
    
    // Duplicate errors
    if (message.includes('duplicate') || message.includes('unique')) {
      return 'Data sudah ada, tidak dapat membuat duplikat'
    }
    
    // Foreign key errors
    if (message.includes('foreign key') || message.includes('violates')) {
      return 'Tidak dapat menghapus karena data masih digunakan'
    }
    
    // Connection errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Koneksi terputus, periksa internet Anda'
    }
    
    // Default to original message if no match
    return error.message
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error
  }
  
  return 'Terjadi kesalahan, silakan coba lagi'
}

/**
 * Parse API error response
 */
export function parseApiError(response: Response, data?: any): string {
  // Check response status
  switch (response.status) {
    case 400:
      return data?.error || 'Permintaan tidak valid'
    case 401:
      return 'Anda tidak memiliki akses, silakan login kembali'
    case 403:
      return 'Akses ditolak'
    case 404:
      return 'Data tidak ditemukan'
    case 409:
      return 'Konflik data, kemungkinan data sudah ada'
    case 422:
      return data?.error || 'Data tidak valid'
    case 500:
      return 'Terjadi kesalahan pada server'
    case 503:
      return 'Layanan sedang tidak tersedia'
    default:
      return data?.error || 'Terjadi kesalahan, silakan coba lagi'
  }
}

/**
 * Parse validation errors into readable format
 */
export function parseValidationErrors(errors: string[]): string {
  if (errors.length === 0) return ''
  if (errors.length === 1) return errors[0]
  
  return 'Terdapat beberapa kesalahan:\n' + errors.map((e, i) => `${i + 1}. ${e}`).join('\n')
}

// ==================== Error Handling Wrappers ====================

/**
 * Wrap async function with error handling
 * Automatically shows error toast on failure
 */
export async function handleAsync<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await fn()
  } catch (error: any) {
    const message = errorMessage || parseSupabaseError(error)
    showError(message)
    console.error('Error:', error)
    return null
  }
}

/**
 * Wrap async function with loading state management
 */
export async function withLoading<T>(
  fn: () => Promise<T>,
  setLoading: (loading: boolean) => void,
  errorMessage?: string
): Promise<T | null> {
  try {
    setLoading(true)
    return await fn()
  } catch (error: any) {
    const message = errorMessage || parseSupabaseError(error)
    showError(message)
    console.error('Error:', error)
    return null
  } finally {
    setLoading(false)
  }
}

/**
 * Handle Supabase query with automatic error handling
 */
export async function handleSupabaseQuery<T>(
  query: Promise<{ data: T | null; error: any }>,
  errorMessage?: string
): Promise<T | null> {
  try {
    const { data, error } = await query
    
    if (error) {
      const message = errorMessage || parseSupabaseError(error)
      showError(message)
      console.error('Supabase error:', error)
      return null
    }
    
    return data
  } catch (error: any) {
    const message = errorMessage || parseSupabaseError(error)
    showError(message)
    console.error('Error:', error)
    return null
  }
}

/**
 * Handle API fetch with automatic error handling
 */
export async function handleApiFetch<T>(
  url: string,
  options?: RequestInit,
  errorMessage?: string
): Promise<T | null> {
  try {
    const response = await fetch(url, options)
    const data = await response.json().catch(() => ({}))
    
    if (!response.ok) {
      const message = errorMessage || parseApiError(response, data)
      showError(message)
      return null
    }
    
    return data as T
  } catch (error: any) {
    const message = errorMessage || 'Gagal menghubungi server'
    showError(message)
    console.error('API error:', error)
    return null
  }
}

// ==================== Confirmation Dialogs ====================

/**
 * Show confirmation dialog
 * Returns true if confirmed, false if cancelled
 */
export async function showConfirmation(message: string, title?: string): Promise<boolean> {
  // For now, use native confirm
  // TODO: Replace with custom modal in future
  return window.confirm(title ? `${title}\n\n${message}` : message)
}

/**
 * Show delete confirmation
 */
export async function confirmDelete(itemName: string): Promise<boolean> {
  return showConfirmation(
    `Yakin ingin menghapus "${itemName}"?\n\nTindakan ini tidak dapat dibatalkan.`,
    'Konfirmasi Hapus'
  )
}

/**
 * Show discard changes confirmation
 */
export async function confirmDiscardChanges(): Promise<boolean> {
  return showConfirmation(
    'Ada perubahan yang belum disimpan.\n\nYakin ingin meninggalkan halaman?',
    'Perubahan Belum Disimpan'
  )
}

// ==================== Error Logging ====================

interface ErrorLog {
  timestamp: string
  error: any
  context?: string
  userId?: string
  userRole?: string
}

const errorLogs: ErrorLog[] = []

/**
 * Log error for debugging
 * In production, this should send to error tracking service
 */
export function logError(error: any, context?: string, userId?: string, userRole?: string): void {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    context,
    userId,
    userRole
  }
  
  errorLogs.push(log)
  
  // Keep only last 100 errors
  if (errorLogs.length > 100) {
    errorLogs.shift()
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', log)
  }
  
  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
}

/**
 * Get recent error logs
 */
export function getErrorLogs(limit: number = 10): ErrorLog[] {
  return errorLogs.slice(-limit)
}

/**
 * Clear error logs
 */
export function clearErrorLogs(): void {
  errorLogs.length = 0
}

// ==================== Network Error Detection ====================

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const message = (error.message || error.toString()).toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('offline')
  )
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Show offline warning
 */
export function showOfflineWarning(): void {
  showWarning('Koneksi internet terputus. Beberapa fitur mungkin tidak tersedia.')
}

/**
 * Show online notification
 */
export function showOnlineNotification(): void {
  showSuccess('Koneksi internet kembali normal')
}

// ==================== Setup Network Monitoring ====================

let networkListenerSetup = false

/**
 * Setup automatic network monitoring
 * Call this once in your app root component
 */
export function setupNetworkMonitoring(): void {
  if (networkListenerSetup) return
  
  window.addEventListener('online', () => {
    showOnlineNotification()
  })
  
  window.addEventListener('offline', () => {
    showOfflineWarning()
  })
  
  networkListenerSetup = true
}
