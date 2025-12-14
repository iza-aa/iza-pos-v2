/**
 * Validation utilities for the POS system
 * 
 * This file contains validation functions to ensure data integrity
 * before database operations.
 */

import type { 
  OrderItem, 
  PaymentData, 
  StockAdjustmentData, 
  NewStaffData, 
  NewMenuItemData,
  NewInventoryItemData,
  Staff
} from '../types'

// ==================== Validation Results ====================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ValidationError {
  field: string
  message: string
}

// ==================== Phone Number Validation ====================

/**
 * Validates Indonesian phone number format
 * Accepts formats: 08xx, +628xx, 628xx
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = []
  
  if (!phone || phone.trim().length === 0) {
    errors.push('Nomor telepon wajib diisi')
    return { isValid: false, errors }
  }
  
  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, '')
  
  // Check format
  const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/
  if (!phoneRegex.test(cleanPhone)) {
    errors.push('Format nomor telepon tidak valid. Gunakan format: 08xxxxxxxxxx')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Formats phone number to standard format (+62xxx)
 */
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[\s-]/g, '')
  
  if (cleanPhone.startsWith('0')) {
    return '+62' + cleanPhone.substring(1)
  } else if (cleanPhone.startsWith('62')) {
    return '+' + cleanPhone
  } else if (cleanPhone.startsWith('+62')) {
    return cleanPhone
  }
  
  return phone
}

// ==================== Order Validation ====================

/**
 * Validates order before submission
 */
export function validateOrder(orderItems: OrderItem[], tableNumber?: string): ValidationResult {
  const errors: string[] = []
  
  // Check if order has items
  if (!orderItems || orderItems.length === 0) {
    errors.push('Order harus memiliki minimal 1 item')
  }
  
  // Check each item
  orderItems.forEach((item, index) => {
    if (!item.menu_item_id) {
      errors.push(`Item ${index + 1}: Menu item tidak valid`)
    }
    
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity harus lebih dari 0`)
    }
    
    if (!item.price || item.price < 0) {
      errors.push(`Item ${index + 1}: Harga tidak valid`)
    }
    
    if (!item.subtotal || item.subtotal < 0) {
      errors.push(`Item ${index + 1}: Subtotal tidak valid`)
    }
  })
  
  // Validate table number if dine-in
  if (tableNumber && !/^[A-Z0-9-]+$/.test(tableNumber)) {
    errors.push('Nomor meja tidak valid')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates payment data
 */
export function validatePayment(payment: PaymentData, totalAmount: number): ValidationResult {
  const errors: string[] = []
  
  // Check payment method
  const validMethods = ['cash', 'qris', 'debit', 'credit']
  if (!payment.method || !validMethods.includes(payment.method)) {
    errors.push('Metode pembayaran tidak valid')
  }
  
  // Check payment amount
  if (!payment.amount || payment.amount <= 0) {
    errors.push('Jumlah pembayaran harus lebih dari 0')
  }
  
  // For cash, validate that payment is sufficient
  if (payment.method === 'cash' && payment.amount < totalAmount) {
    errors.push(`Pembayaran tidak cukup. Total: Rp${totalAmount.toLocaleString('id-ID')}`)
  }
  
  // Validate change calculation
  if (payment.method === 'cash' && payment.change !== undefined) {
    const expectedChange = payment.amount - totalAmount
    if (Math.abs(payment.change - expectedChange) > 0.01) {
      errors.push('Perhitungan kembalian tidak sesuai')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Calculates order total from items
 */
export function calculateOrderTotal(orderItems: OrderItem[]): number {
  return orderItems.reduce((total, item) => total + (item.subtotal || 0), 0)
}

/**
 * Validates order number format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  // Format: ORD-YYYYMMDD-XXXX
  const regex = /^ORD-\d{8}-\d{4}$/
  return regex.test(orderNumber)
}

// ==================== Stock & Inventory Validation ====================

/**
 * Validates stock adjustment
 */
export function validateStockAdjustment(adjustment: StockAdjustmentData): ValidationResult {
  const errors: string[] = []
  
  if (!adjustment.inventory_item_id) {
    errors.push('Item inventory harus dipilih')
  }
  
  if (adjustment.adjustment_quantity === undefined || adjustment.adjustment_quantity === 0) {
    errors.push('Jumlah adjustment tidak boleh 0')
  }
  
  if (!adjustment.transaction_type) {
    errors.push('Tipe transaksi harus dipilih')
  }
  
  if (!adjustment.performed_by) {
    errors.push('Staff yang melakukan adjustment harus teridentifikasi')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates inventory item data
 */
export function validateInventoryItem(item: NewInventoryItemData): ValidationResult {
  const errors: string[] = []
  
  if (!item.name || item.name.trim().length === 0) {
    errors.push('Nama item wajib diisi')
  }
  
  if (!item.category) {
    errors.push('Kategori wajib dipilih')
  }
  
  if (!item.unit) {
    errors.push('Unit wajib dipilih')
  }
  
  if (item.current_stock === undefined || item.current_stock < 0) {
    errors.push('Stok awal tidak valid')
  }
  
  if (item.minimum_stock === undefined || item.minimum_stock < 0) {
    errors.push('Stok minimum tidak valid')
  }
  
  if (item.price_per_unit !== undefined && item.price_per_unit < 0) {
    errors.push('Harga per unit tidak valid')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Checks if stock is below minimum threshold
 */
export function isLowStock(currentStock: number, minimumStock: number): boolean {
  return currentStock <= minimumStock
}

/**
 * Checks if stock is critically low (below 50% of minimum)
 */
export function isCriticalStock(currentStock: number, minimumStock: number): boolean {
  return currentStock <= minimumStock * 0.5
}

// ==================== Staff Validation ====================

/**
 * Validates staff data
 */
export function validateStaffData(staff: NewStaffData): ValidationResult {
  const errors: string[] = []
  
  if (!staff.name || staff.name.trim().length === 0) {
    errors.push('Nama staff wajib diisi')
  }
  
  if (staff.name && staff.name.trim().length < 3) {
    errors.push('Nama staff minimal 3 karakter')
  }
  
  if (!staff.role) {
    errors.push('Role wajib dipilih')
  }
  
  const validRoles = ['owner', 'manager', 'kitchen', 'cashier', 'barista', 'waiter']
  if (staff.role && !validRoles.includes(staff.role)) {
    errors.push('Role tidak valid')
  }
  
  // Validate phone number
  const phoneValidation = validatePhoneNumber(staff.phone)
  if (!phoneValidation.isValid) {
    errors.push(...phoneValidation.errors)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates staff code format
 */
export function validateStaffCode(staffCode: string): boolean {
  // Format: STF001, MGR001, etc.
  const regex = /^[A-Z]{3}\d{3}$/
  return regex.test(staffCode)
}

/**
 * Generates next staff code based on role and existing codes
 */
export function generateStaffCode(role: string, existingStaff: Staff[]): string {
  const prefix = role === 'manager' ? 'MGR' : 'STF'
  
  // Filter staff with same prefix
  const samePrefix = existingStaff
    .filter(s => s.staff_code.startsWith(prefix))
    .map(s => parseInt(s.staff_code.substring(3)))
    .filter(n => !isNaN(n))
  
  const maxNumber = samePrefix.length > 0 ? Math.max(...samePrefix) : 0
  const nextNumber = maxNumber + 1
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

// ==================== Menu Item Validation ====================

/**
 * Validates menu item data
 */
export function validateMenuItem(item: NewMenuItemData): ValidationResult {
  const errors: string[] = []
  
  if (!item.name || item.name.trim().length === 0) {
    errors.push('Nama menu wajib diisi')
  }
  
  if (!item.category) {
    errors.push('Kategori wajib dipilih')
  }
  
  if (item.price === undefined || item.price < 0) {
    errors.push('Harga tidak valid')
  }
  
  if (item.price && item.price < 1000) {
    errors.push('Harga minimal Rp1.000')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// ==================== General Validation ====================

/**
 * Validates required string field
 */
export function validateRequired(value: string | undefined | null, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} wajib diisi`
  }
  return null
}

/**
 * Validates numeric range
 */
export function validateRange(value: number, min: number, max: number, fieldName: string): string | null {
  if (value < min || value > max) {
    return `${fieldName} harus antara ${min} dan ${max}`
  }
  return null
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates date range
 */
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  const errors: string[] = []
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime())) {
    errors.push('Tanggal mulai tidak valid')
  }
  
  if (isNaN(end.getTime())) {
    errors.push('Tanggal selesai tidak valid')
  }
  
  if (start > end) {
    errors.push('Tanggal mulai tidak boleh lebih dari tanggal selesai')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitizes string input (removes dangerous characters)
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .substring(0, 500) // Limit length
}

/**
 * Validates that a value is a positive integer
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/**
 * Validates that a value is a positive number (can be decimal)
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value > 0
}

/**
 * Validates rupiah amount (must be multiples of 1000)
 */
export function validateRupiahAmount(amount: number): ValidationResult {
  const errors: string[] = []
  
  if (amount < 0) {
    errors.push('Jumlah tidak boleh negatif')
  }
  
  if (amount % 1000 !== 0) {
    errors.push('Jumlah harus kelipatan Rp1.000')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
