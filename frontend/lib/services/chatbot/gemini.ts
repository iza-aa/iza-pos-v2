/**
 * Gemini API Wrapper
 * 
 * Integration dengan Google Gemini 2.5 models
 * Supports: flash-lite, flash, pro
 */

import type { ChatbotModel, ChatMessage } from '@/lib/types/chatbot'

export interface GeminiResponse {
  text: string
  tokensUsed?: {
    input: number
    output: number
  }
  finishReason?: string
}

/**
 * Call Gemini API dengan model yang dipilih
 */
export async function callGemini(
  model: ChatbotModel,
  systemPrompt: string,
  userQuery: string,
  conversationHistory: ChatMessage[] = []
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  // Map internal model names to Gemini API model names
  const modelMapping: Record<ChatbotModel, string> = {
    'gemini-2.5-flash-lite': 'gemini-2.0-flash-lite',
    'gemini-2.5-flash': 'gemini-2.0-flash',
    'gemini-2.5-pro': 'gemini-2.0-pro'
  }

  const geminiModel = modelMapping[model]

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      content: msg.content
    })),
    { role: 'user', content: userQuery }
  ]

  try {
    // Call Gemini API
    // NOTE: Adjust endpoint based on actual Gemini API docs
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages.slice(1).map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role,
            parts: [{ text: msg.content }]
          })),
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.2, // Lower for more factual responses
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 10
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Extract response text
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const finishReason = data.candidates?.[0]?.finishReason

    // Extract token usage if available
    const tokensUsed = data.usageMetadata ? {
      input: data.usageMetadata.promptTokenCount || 0,
      output: data.usageMetadata.candidatesTokenCount || 0
    } : undefined

    return {
      text,
      tokensUsed,
      finishReason
    }
  } catch (error) {
    console.error(`Error calling Gemini ${model}:`, error)
    throw error
  }
}

/**
 * Test connection ke Gemini API
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const response = await callGemini(
      'gemini-2.5-flash-lite',
      'You are a test assistant.',
      'Hello, respond with "OK" if you receive this.'
    )
    return response.text.toLowerCase().includes('ok')
  } catch (error) {
    console.error('Gemini connection test failed:', error)
    return false
  }
}
