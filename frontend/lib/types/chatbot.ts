// ==================== Chatbot Types ====================

export type ChatbotModel = 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro'

export type QueryComplexity = 'simple' | 'medium' | 'complex'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: ChatbotModel
}

export interface ChatbotQuery {
  query: string
  conversationHistory?: ChatMessage[]
  userId?: string
  sessionId?: string
}

export interface ChatbotResponse {
  response: string
  model: ChatbotModel
  complexity: QueryComplexity
  tokensUsed?: {
    input: number
    output: number
  }
  processingTime: number
  error?: string
}

export interface ComplexityScore {
  score: number // 0-10
  complexity: QueryComplexity
  reasons: string[]
}

export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: Date
  reason?: string
}

export interface ChatbotConfig {
  apiKey: string
  maxHistoryLength: number
  maxTokensPerRequest: number
  rateLimitPerUser: number
  rateLimitWindow: number // in seconds
  enableLogging: boolean
}
