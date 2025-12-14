/**
 * API Route: POST /api/chatbot
 * 
 * Main endpoint untuk chatbot queries
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ChatbotQuery, ChatbotResponse } from '@/lib/types/chatbot'
import {
  buildSystemPrompt,
  callGemini,
  routeToModel,
  getFallbackModel,
  checkRateLimit,
  validateQuery,
  sanitizeQuery
} from '@/lib/services/chatbot'

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

    // 4. Route to appropriate model
    const { model, complexity } = routeToModel(sanitizedQuery)

    console.log(`[Chatbot] Query routed to ${model} (complexity: ${complexity.complexity}, score: ${complexity.score})`)

    // 5. Load database context
    const systemPrompt = buildSystemPrompt()

    // 6. Call Gemini with retry logic
    let response
    let currentModel = model
    let attempt = 0
    const maxAttempts = 3

    while (attempt < maxAttempts) {
      try {
        response = await callGemini(
          currentModel,
          systemPrompt,
          sanitizedQuery,
          conversationHistory
        )
        break // Success
      } catch (error) {
        attempt++
        console.error(`[Chatbot] Attempt ${attempt} failed with ${currentModel}:`, error)

        // Try fallback model
        const fallback = getFallbackModel(currentModel)
        if (fallback && attempt < maxAttempts) {
          console.log(`[Chatbot] Falling back to ${fallback}`)
          currentModel = fallback
        } else {
          throw error // No more fallbacks
        }
      }
    }

    if (!response) {
      throw new Error('All model attempts failed')
    }

    // 7. Build response
    const processingTime = Date.now() - startTime
    const chatbotResponse: ChatbotResponse = {
      response: response.text,
      model: currentModel,
      complexity: complexity.complexity,
      tokensUsed: response.tokensUsed,
      processingTime
    }

    // 8. Log usage (optional)
    console.log(`[Chatbot] Success - Model: ${currentModel}, Time: ${processingTime}ms, Tokens: ${response.tokensUsed?.input}+${response.tokensUsed?.output}`)

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
  return NextResponse.json({
    status: 'ok',
    service: 'IZA POS Database Chatbot',
    version: '1.0.0',
    models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    strategy: '3-tier smart routing'
  })
}
