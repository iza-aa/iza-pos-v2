/**
 * API Route: POST /api/chatbot
 *
 * Main endpoint untuk chatbot queries — powered by Ollama (Qwen 2.5)
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ChatbotQuery, ChatbotResponse } from '@/lib/types/chatbot'
import {
  buildSystemPrompt,
  routeToModel,
  checkRateLimit,
  validateQuery,
  sanitizeQuery
} from '@/lib/services/chatbot'
import { callOllama, isOllamaAvailable } from '@/lib/services/chatbot/ollama'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Parse request body
    const body: ChatbotQuery = await request.json()
    const { query, conversationHistory = [], userId, sessionId } = body

    // 1. Validate query
    const validation = validateQuery(query)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // 2. Rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0] : request.headers.get('x-real-ip') || 'anonymous'
    const identifier = userId || ip
    const rateLimit = checkRateLimit(identifier)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.reason },
        { status: 429 }
      )
    }

    // 3. Sanitize query (remove PII for free tier)
    const sanitizedQuery = sanitizeQuery(query)

    // 4. Route to model
    const { model, complexity } = routeToModel(sanitizedQuery)

    console.log(`[Chatbot] Query routed to ${model} (complexity: ${complexity.complexity}, score: ${complexity.score})`)

    // 5. Cek Ollama tersedia
    const ollamaReady = await isOllamaAvailable()
    if (!ollamaReady) {
      return NextResponse.json(
        { error: 'Ollama tidak berjalan. Pastikan Ollama sudah diinstall dan aktif di localhost:11434' },
        { status: 503 }
      )
    }

    // 6. Load business context
    const systemPrompt = buildSystemPrompt()

    // 7. Call Ollama
    const response = await callOllama(
      model,
      systemPrompt,
      sanitizedQuery,
      conversationHistory
    )

    // 8. Build response
    const processingTime = Date.now() - startTime
    const chatbotResponse: ChatbotResponse = {
      response: response.text,
      model,
      provider: 'ollama',
      complexity: complexity.complexity,
      tokensUsed: response.tokensUsed,
      processingTime
    }

    console.log(`[Chatbot] Success - Model: ${model}, Time: ${processingTime}ms, Tokens: ${response.tokensUsed?.input}+${response.tokensUsed?.output}`)

    return NextResponse.json(chatbotResponse)

  } catch (error) {
    console.error('[Chatbot] Error:', error)
    
    const processingTime = Date.now() - startTime
    return NextResponse.json(
      {
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  const ollamaReady = await isOllamaAvailable()
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b'
  return NextResponse.json({
    status: ollamaReady ? 'ok' : 'ollama_offline',
    service: 'IZA POS Database Chatbot',
    version: '2.0.0',
    provider: 'ollama',
    model,
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    strategy: 'local LLM via Ollama'
  })
}
