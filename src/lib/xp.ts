// XP calculation utilities
// XP sources: completed topics (80 base), completed deadlines (xpValue), session logs (xpEarned)
// Level formula: floor(totalXP / 1000) + 1
import prisma from './prisma'

export async function getTotalXP(): Promise<number> {
  const [topicCount, deadlineAgg, sessionAgg] = await Promise.all([
    prisma.topic.count({ where: { status: 'done' } }),
    prisma.deadline.aggregate({ where: { completed: true }, _sum: { xpValue: true } }),
    prisma.sessionLog.aggregate({ _sum: { xpEarned: true } }),
  ])

  return topicCount * 80 + (deadlineAgg._sum.xpValue ?? 0) + (sessionAgg._sum.xpEarned ?? 0)
}

export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / 1000) + 1
}

/** XP accumulated within the current level (0–999) */
export function getLevelProgress(totalXP: number): { current: number; needed: number; percent: number } {
  const level = getLevel(totalXP)
  const current = totalXP - (level - 1) * 1000
  const needed = 1000
  return { current, needed, percent: Math.round((current / needed) * 100) }
}

/** Consecutive days with at least one session log, counting from today. */
export async function getStreak(): Promise<number> {
  const sessions = await prisma.sessionLog.findMany({ select: { loggedAt: true } })
  if (sessions.length === 0) return 0

  const sessionDates = new Set(
    sessions.map(s => new Date(s.loggedAt).toISOString().split('T')[0])
  )

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Allow today's streak to show even if user hasn't studied yet today
  const startOffset = sessionDates.has(todayStr) ? 0 : sessionDates.has(yesterdayStr) ? 1 : null
  if (startOffset === null) return 0

  let streak = 0
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (sessionDates.has(d.toISOString().split('T')[0])) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export const SUBJECTS = [
  'Mathematics',
  'ComputerScience',
  'Finance',
  'Economics',
  'QuantumMechanics',
  'Others',
] as const

export type Subject = typeof SUBJECTS[number]

export const SUBJECT_LABEL: Record<Subject, string> = {
  Mathematics:      'Mathematics',
  ComputerScience:  'Computer Science',
  Finance:          'Finance',
  Economics:        'Economics',
  QuantumMechanics: 'Quantum Mechanics',
  Others:           'Other Topics',
}
