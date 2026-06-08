import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const CLAUDE_MODEL = 'claude-sonnet-4-6'

/** Strip markdown code fences from a Claude text response. */
export function stripFences(raw: string): string {
  return raw.trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
}

/**
 * Call Claude and parse a JSON object from the response.
 * Throws if the response can't be parsed.
 */
export async function claudeJSON<T = unknown>(opts: {
  system: string
  user: string
  maxTokens?: number
}): Promise<T> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  })
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(stripFences(raw)) as T
}

/** Call Claude and return raw text (e.g. for markdown generation). */
export async function claudeText(opts: {
  system: string
  user: string
  maxTokens?: number
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}
