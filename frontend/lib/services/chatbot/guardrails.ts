/**
 * Guardrails - Rate limiting, validation, sanitization
 * 
 * Protects against:
 * 1. Rate limit abuse
 * 2. Malicious queries
 * 3. PII leakage (for free tier)
 * 4. Excessive token usage
 */

import type { RateLimitStatus } from '@/lib/types/chatbot'

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: Date }>()

/**
 * Check rate limit for user/IP
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 20, // 20 requests
  windowSeconds: number = 3600 // per hour
): RateLimitStatus {
  const now = new Date()
  const existing = rateLimitStore.get(identifier)

  // Reset if window expired
  if (existing && existing.resetAt < now) {
    rateLimitStore.delete(identifier)
  }

  const current = rateLimitStore.get(identifier)

  if (!current) {
    // First request
    const resetAt = new Date(now.getTime() + windowSeconds * 1000)
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt
    }
  }

  if (current.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      reason: `Rate limit exceeded. Try again after ${current.resetAt.toLocaleTimeString()}`
    }
  }

  // Increment count
  current.count++
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetAt: current.resetAt
  }
}

/**
 * Sanitize query - Remove potential PII for free tier
 */
export function sanitizeQuery(query: string): string {
  let sanitized = query

  // Remove email patterns
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')

  // Remove phone numbers (ID format)
  sanitized = sanitized.replace(/(\+62|62|0)[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/g, '[PHONE]')

  // Remove potential credit card numbers
  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')

  // Remove potential passwords (common patterns)
  const passwordPatterns = [
    /password[:\s=]+[^\s]+/gi,
    /pwd[:\s=]+[^\s]+/gi,
    /pass[:\s=]+[^\s]+/gi
  ]
  passwordPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, 'password: [REDACTED]')
  })

  return sanitized
}

/**
 * Validate query before processing
 */
export function validateQuery(query: string): { valid: boolean; error?: string } {
  // Check length
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' }
  }

  if (query.length > 2000) {
    return { valid: false, error: 'Query too long (max 2000 characters)' }
  }

  // Check for SQL injection attempts in user query
  const dangerousPatterns = [
    /;\s*drop\s+table/i,
    /;\s*delete\s+from/i,
    /;\s*truncate\s+table/i,
    /union\s+select.*from\s+information_schema/i,
    /exec\s*\(/i,
    /execute\s*\(/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return { valid: false, error: 'Query contains potentially dangerous patterns' }
    }
  }

  return { valid: true }
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = new Date()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Auto cleanup every 10 minutes
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(cleanupRateLimitStore, 10 * 60 * 1000)
}
