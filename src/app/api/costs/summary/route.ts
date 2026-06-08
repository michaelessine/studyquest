// GET /api/costs/summary — cost breakdown by route, cache hit rate, monthly spend
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkMonthlyCap } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const calls = await prisma.aPICall.findMany({ where: { createdAt: { gte: last30 } } })

  // Aggregate per route
  const byRoute = new Map<string, { calls: number; inputTokens: number; outputTokens: number; cost: number; cacheHits: number; apiCalls: number }>()
  let totalCost = 0, totalCacheHits = 0, totalCacheReadTokens = 0, totalInputTokens = 0

  for (const c of calls) {
    const r = byRoute.get(c.route) ?? { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0, cacheHits: 0, apiCalls: 0 }
    r.calls += 1
    r.inputTokens += c.inputTokens
    r.outputTokens += c.outputTokens
    r.cost += c.costUsd
    if (c.cacheHit) r.cacheHits += 1
    else r.apiCalls += 1
    byRoute.set(c.route, r)

    totalCost += c.costUsd
    if (c.cacheHit) totalCacheHits += 1
    totalCacheReadTokens += c.cacheReadInputTokens
    totalInputTokens += c.inputTokens + c.cacheReadInputTokens
  }

  const routes = Array.from(byRoute.entries())
    .map(([route, v]) => ({
      route,
      calls: v.calls,
      apiCalls: v.apiCalls,
      cacheHits: v.cacheHits,
      inputTokens: v.inputTokens,
      outputTokens: v.outputTokens,
      cost: Math.round(v.cost * 10000) / 10000,
    }))
    .sort((a, b) => b.cost - a.cost)

  // Project monthly spend from last-30-day spend
  const estimatedMonthly = Math.round(totalCost * 10000) / 10000

  // Cache hit rate (response-cache hits vs total calls)
  const cacheHitRate = calls.length > 0 ? Math.round((totalCacheHits / calls.length) * 100) : 0
  // Prompt-cache read ratio (cached input tokens / all input tokens)
  const promptCacheRatio = totalInputTokens > 0 ? Math.round((totalCacheReadTokens / totalInputTokens) * 100) : 0

  const cap = await checkMonthlyCap()

  return NextResponse.json({
    estimatedMonthly,
    totalCalls: calls.length,
    cacheHitRate,
    promptCacheRatio,
    routes,
    cap: { spend: Math.round(cap.spend * 10000) / 10000, cap: cap.cap, pctUsed: cap.pctUsed, overCap: cap.overCap },
  })
}
