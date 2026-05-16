// ==================== Chatbot Types ====================

export type OllamaModel = 'qwen2.5:1.5b' | 'qwen2.5:7b' | 'qwen2.5:14b' | 'qwen2.5:72b'

export type ChatbotModel = OllamaModel

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
  provider: 'ollama'
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
