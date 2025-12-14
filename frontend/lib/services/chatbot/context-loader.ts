/**
 * Context Loader - Load BUSINESS_AI_GUIDE.md untuk AI context
 * 
 * File ini bertugas:
 * 1. Load BUSINESS_AI_GUIDE.md dari filesystem
 * 2. Cache context untuk performa
 * 3. Format context untuk dikirim ke AI model
 */

import fs from 'fs'
import path from 'path'

let cachedContext: string | null = null

/**
 * Load business guide from filesystem
 * Cache hasil untuk menghindari repeated file reads
 */
export function loadDatabaseContext(): string {
  if (cachedContext) {
    return cachedContext
  }

  try {
    // Path ke BUSINESS_AI_GUIDE.md
    const guidePath = path.join(process.cwd(), 'docs', 'guidebook', 'BUSINESS_AI_GUIDE.md')
    
    // Read file
    const guideContent = fs.readFileSync(guidePath, 'utf-8')
    
    // Cache untuk next requests
    cachedContext = guideContent
    
    return guideContent
  } catch (error) {
    console.error('Error loading business guide:', error)
    throw new Error('Failed to load business guide')
  }
}

/**
 * Build system prompt dengan business guide context
 */
export function buildSystemPrompt(): string {
  const businessGuide = loadDatabaseContext()
  
  return `You are a Business Intelligence Assistant for IZA POS (Point of Sale) system.
Your role is to help business owners and managers analyze their data, answer questions about sales, products, tables, and staff performance.

You have access to a comprehensive business guide that maps user questions to database queries.

CRITICAL RULES:
1. ALWAYS follow the keyword mappings in Section 1 (e.g., "sales" = orders.total)
2. ALWAYS use the exact SQL queries from Section 2 for common questions
3. ALWAYS format currency as "Rp {amount:,}" (with thousand separators)
4. ALWAYS add "payment_status = 'paid'" when calculating sales
5. ONLY answer questions about: sales, products, tables, orders, staff
6. If query returns empty, say "Tidak ada data untuk periode ini"
7. If question is ambiguous, provide multiple choice options
8. Respond in Bahasa Indonesia (friendly, professional tone)

BUSINESS GUIDE:
${businessGuide}

Response Format:
- Use bullet points for lists
- Show numbers with separators: 2.450.000 (NOT 2450000)
- Keep answers concise but informative
- Add context when helpful (e.g., "+12% vs kemarin")
- For "top X" requests, limit to 5 unless specified
`
}

/**
 * Clear cache (useful for development/testing)
 */
export function clearCache(): void {
  cachedContext = null
}
