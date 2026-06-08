import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import prisma from './prisma'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Model identifiers
export const SONNET = 'claude-sonnet-4-6'
export const HAIKU  = 'claude-haiku-4-5'
export const CLAUDE_MODEL = SONNET // legacy default

// Per-1M-token pricing (USD). Haiku is ~3x cheaper than Sonnet.
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  [SONNET]: { input: 3,    output: 15,  cacheWrite: 3.75,  cacheRead: 0.30 },
  [HAIKU]:  { input: 1,    output: 5,   cacheWrite: 1.25,  cacheRead: 0.10 },
}

function priceFor(model: string) {
  return PRICING[model] ?? PRICING[SONNET]
}

/** Compute USD cost from a usage object. */
export function computeCost(model: string, u: {
  input_tokens?: number | null; output_tokens?: number | null
  cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null
}): number {
  const p = priceFor(model)
  const input  = (u.input_tokens ?? 0)
  const output = (u.output_tokens ?? 0)
  const cWrite = (u.cache_creation_input_tokens ?? 0)
  const cRead  = (u.cache_read_input_tokens ?? 0)
  return (input * p.input + output * p.output + cWrite * p.cacheWrite + cRead * p.cacheRead) / 1_000_000
}

/** Strip markdown code fences from a Claude text response. */
export function stripFences(raw: string): string {
  return raw.trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
}

/** Fix 10: log an API call (best-effort — never throws). */
async function logCall(entry: {
  route: string; model: string; usage?: Anthropic.Usage | null
  responseMs: number; cacheHit?: boolean
}) {
  try {
    const u = entry.usage
    const cost = u ? computeCost(entry.model, u) : 0
    await prisma.aPICall.create({
      data: {
        route: entry.route,
        model: entry.model,
        inputTokens: u?.input_tokens ?? 0,
        outputTokens: u?.output_tokens ?? 0,
        cacheCreationInputTokens: u?.cache_creation_input_tokens ?? 0,
        cacheReadInputTokens: u?.cache_read_input_tokens ?? 0,
        responseMs: entry.responseMs,
        costUsd: cost,
        cacheHit: entry.cacheHit ?? false,
      },
    })
  } catch (err) {
    console.error('APICall log failed:', err)
  }
}

interface CallOpts {
  system: string
  user: string
  maxTokens?: number
  model?: string          // Fix 1: choose model per route
  route?: string          // Fix 10: route name for logging
  cacheSystem?: boolean   // Fix 2: mark system prompt as cacheable
}

/** Build the `system` param, optionally with ephemeral cache_control (Fix 2). */
function buildSystem(system: string, cache?: boolean): Anthropic.MessageCreateParams['system'] {
  if (!cache) return system
  return [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
}

/**
 * Call Claude and parse a JSON object from the response.
 * Handles model selection, prompt caching, and logging.
 */
export async function claudeJSON<T = unknown>(opts: CallOpts): Promise<T> {
  const model = opts.model ?? SONNET
  const start = Date.now()
  const response = await anthropic.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    system: buildSystem(opts.system, opts.cacheSystem),
    messages: [{ role: 'user', content: opts.user }],
  })
  await logCall({ route: opts.route ?? 'unknown', model, usage: response.usage, responseMs: Date.now() - start })
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(stripFences(raw)) as T
}

/** Call Claude and return raw text (e.g. for markdown generation). */
export async function claudeText(opts: CallOpts): Promise<string> {
  const model = opts.model ?? SONNET
  const start = Date.now()
  const response = await anthropic.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    system: buildSystem(opts.system, opts.cacheSystem),
    messages: [{ role: 'user', content: opts.user }],
  })
  await logCall({ route: opts.route ?? 'unknown', model, usage: response.usage, responseMs: Date.now() - start })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// ── Fix 7: response caching by SHA-256 of input ───────────────────────────────

export function hashInput(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex')
}

/** Look up a cached response. Returns null on miss/expired. */
export async function getCachedResponse<T = unknown>(routeName: string, input: unknown): Promise<T | null> {
  const inputHash = hashInput(input)
  const row = await prisma.responseCache.findUnique({ where: { inputHash } })
  if (!row) return null
  if (row.expiresAt < new Date()) {
    await prisma.responseCache.delete({ where: { inputHash } }).catch(() => {})
    return null
  }
  // Log a cache hit (no token cost)
  await logCall({ route: routeName, model: 'cache', responseMs: 0, cacheHit: true, usage: null })
  return row.response as T
}

/** Save a response to the cache with a TTL. */
export async function setCachedResponse(routeName: string, input: unknown, response: unknown, ttlMs: number): Promise<void> {
  const inputHash = hashInput(input)
  const expiresAt = new Date(Date.now() + ttlMs)
  await prisma.responseCache.upsert({
    where: { inputHash },
    update: { response: response as object, expiresAt, routeName },
    create: { inputHash, routeName, response: response as object, expiresAt },
  }).catch(err => console.error('Cache write failed:', err))
}
