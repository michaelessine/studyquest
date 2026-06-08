import prisma from './prisma'

export interface RateLimitConfig {
  route: string
  max: number
  windowMs: number
}

// Fix 9: per-route limits
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'quiz/generate':         { route: 'quiz/generate',         max: 20, windowMs: 60 * 60 * 1000 },        // 20/hour
  'learning-path/generate':{ route: 'learning-path/generate',max: 5,  windowMs: 24 * 60 * 60 * 1000 },   // 5/day
  'debate/start':          { route: 'debate/start',          max: 10, windowMs: 24 * 60 * 60 * 1000 },   // 10/day
  'textbook/generate':     { route: 'textbook/generate',     max: 3,  windowMs: 24 * 60 * 60 * 1000 },   // 3/day
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Check + increment the rate limit for a route. Returns allowed=false when over.
 */
export async function checkRateLimit(routeKey: string, userId = 'default'): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[routeKey]
  if (!cfg) return { allowed: true, remaining: Infinity, resetAt: new Date() }

  const now = new Date()
  const existing = await prisma.rateLimitLog.findUnique({
    where: { userId_routeName: { userId, routeName: routeKey } },
  })

  // No window yet, or window expired → start fresh
  if (!existing || existing.resetAt < now) {
    const resetAt = new Date(now.getTime() + cfg.windowMs)
    await prisma.rateLimitLog.upsert({
      where: { userId_routeName: { userId, routeName: routeKey } },
      update: { callCount: 1, resetAt },
      create: { userId, routeName: routeKey, callCount: 1, resetAt },
    })
    return { allowed: true, remaining: cfg.max - 1, resetAt }
  }

  // Within window
  if (existing.callCount >= cfg.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  await prisma.rateLimitLog.update({
    where: { userId_routeName: { userId, routeName: routeKey } },
    data: { callCount: { increment: 1 } },
  })
  return { allowed: true, remaining: cfg.max - existing.callCount - 1, resetAt: existing.resetAt }
}

/**
 * Fix 9: monthly spend cap. Returns whether expensive features should be paused.
 */
export async function checkMonthlyCap(): Promise<{ overCap: boolean; spend: number; cap: number; pctUsed: number }> {
  const setting = await prisma.appSetting.findUnique({ where: { id: 'singleton' } })
  const cap = setting?.monthlyCapUsd ?? 5

  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const agg = await prisma.aPICall.aggregate({
    where: { createdAt: { gte: monthStart } },
    _sum: { costUsd: true },
  })
  const spend = agg._sum.costUsd ?? 0
  return { overCap: spend >= cap, spend, cap, pctUsed: cap > 0 ? Math.round((spend / cap) * 100) : 0 }
}
