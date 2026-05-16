/**
 * Ollama API Wrapper
 *
 * Integrasi dengan Ollama (Qwen 2.5) — LLM lokal via OpenAI-compatible API
 * Supported models: qwen2.5:1.5b | qwen2.5:7b | qwen2.5:14b
 *
 * Pastikan Ollama berjalan: http://localhost:11434
 */

import type { ChatMessage } from '@/lib/types/chatbot'
import type { OllamaModel } from '@/lib/types/chatbot'

export interface OllamaResponse {
  text: string
  tokensUsed?: {
    input: number
    output: number
  }
  finishReason?: string
}

/**
 * Call Ollama API menggunakan OpenAI-compatible endpoint
 */
export async function callOllama(
  model: OllamaModel,
  systemPrompt: string,
  userQuery: string,
  conversationHistory: ChatMessage[] = []
): Promise<OllamaResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

  // Build messages array (OpenAI format)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    })),
    { role: 'user', content: userQuery }
  ]

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2048,
      stream: false
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  const text = data.choices?.[0]?.message?.content || ''
  const finishReason = data.choices?.[0]?.finish_reason

  const tokensUsed = data.usage ? {
    input: data.usage.prompt_tokens || 0,
    output: data.usage.completion_tokens || 0
  } : undefined

  return { text, tokensUsed, finishReason }
}

/**
 * Check apakah Ollama sedang berjalan
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Ambil daftar model yang sudah di-pull di Ollama
 */
export async function getOllamaModels(): Promise<string[]> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  try {
    const response = await fetch(`${baseUrl}/api/tags`)
    if (!response.ok) return []
    const data = await response.json()
    return (data.models || []).map((m: { name: string }) => m.name)
  } catch {
    return []
  }
}
