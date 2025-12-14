/**
 * Smart Router - Route queries ke model yang tepat berdasarkan complexity
 * 
 * Strategy:
 * - Tier 1 (85%): gemini-2.5-flash-lite - Simple queries (SELECT, info)
 * - Tier 2 (12%): gemini-2.5-flash - Medium (JOINs, reports)
 * - Tier 3 (3%):  gemini-2.5-pro - Complex (debugging, architecture)
 */

import type { ChatbotModel, ComplexityScore } from '@/lib/types/chatbot'

/**
 * Analyze query complexity
 * Returns score 0-10 and recommended model
 */
export function analyzeQueryComplexity(query: string): ComplexityScore {
  const lowercaseQuery = query.toLowerCase()
  let score = 0
  const reasons: string[] = []

  // Length factor (longer queries often more complex)
  if (query.length > 200) {
    score += 2
    reasons.push('Long query (>200 chars)')
  } else if (query.length > 100) {
    score += 1
    reasons.push('Medium query (>100 chars)')
  }

  // Multiple questions
  const questionMarks = (query.match(/\?/g) || []).length
  if (questionMarks > 2) {
    score += 2
    reasons.push('Multiple questions')
  }

  // SQL complexity keywords
  const complexKeywords = [
    'join', 'left join', 'inner join', 'outer join',
    'subquery', 'nested', 'recursive',
    'trigger', 'function', 'procedure',
    'optimize', 'performance', 'index',
    'transaction', 'acid', 'isolation',
    'debug', 'error', 'fix', 'why not working'
  ]

  complexKeywords.forEach(keyword => {
    if (lowercaseQuery.includes(keyword)) {
      score += 1
      reasons.push(`Contains: ${keyword}`)
    }
  })

  // Simple query indicators (reduce score)
  const simpleKeywords = [
    'what is', 'show me', 'list', 'get',
    'how many columns', 'table name', 'column name'
  ]

  simpleKeywords.forEach(keyword => {
    if (lowercaseQuery.includes(keyword)) {
      score -= 1
      reasons.push(`Simple pattern: ${keyword}`)
    }
  })

  // Architecture/design questions
  if (
    lowercaseQuery.includes('architecture') ||
    lowercaseQuery.includes('design pattern') ||
    lowercaseQuery.includes('best practice') ||
    lowercaseQuery.includes('refactor')
  ) {
    score += 3
    reasons.push('Architecture/design question')
  }

  // Clamp score between 0-10
  score = Math.max(0, Math.min(10, score))

  // Determine complexity
  let complexity: 'simple' | 'medium' | 'complex'
  if (score <= 3) {
    complexity = 'simple'
  } else if (score <= 6) {
    complexity = 'medium'
  } else {
    complexity = 'complex'
  }

  return {
    score,
    complexity,
    reasons
  }
}

/**
 * Route query to appropriate model
 */
export function routeToModel(query: string): { model: ChatbotModel; complexity: ComplexityScore } {
  const complexity = analyzeQueryComplexity(query)

  let model: ChatbotModel

  switch (complexity.complexity) {
    case 'simple':
      model = 'gemini-2.5-flash-lite'
      break
    case 'medium':
      model = 'gemini-2.5-flash'
      break
    case 'complex':
      model = 'gemini-2.5-pro'
      break
  }

  return { model, complexity }
}

/**
 * Fallback strategy if model fails
 */
export function getFallbackModel(currentModel: ChatbotModel): ChatbotModel | null {
  switch (currentModel) {
    case 'gemini-2.5-flash-lite':
      return 'gemini-2.5-flash' // Upgrade to Flash
    case 'gemini-2.5-flash':
      return 'gemini-2.5-pro' // Upgrade to Pro
    case 'gemini-2.5-pro':
      return null // Already at highest tier
    default:
      return null
  }
}
