// SM-2 spaced repetition intervals
const INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }

export function getNextReviewDate(masteryLevel: number): Date {
  const days = INTERVAL_DAYS[masteryLevel] ?? 1
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export function getReviewIntervalDays(masteryLevel: number): number {
  return INTERVAL_DAYS[masteryLevel] ?? 1
}

/** Called when user clicks "Review done" — grows interval by 1.5×, capped at 60 days */
export function advanceInterval(currentIntervalDays: number): { nextReviewAt: Date; reviewIntervalDays: number } {
  const newInterval = Math.min(Math.round(currentIntervalDays * 1.5), 60)
  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)
  return { nextReviewAt, reviewIntervalDays: newInterval }
}
