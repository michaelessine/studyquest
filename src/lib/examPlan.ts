// Pure back-planning for upcoming exams — no AI, just spreads the weak covered
// topics (and their shaky prerequisites) across the days you have left.

export type PlanNode = { id: string; name: string; subject: string; masteryLevel: number; tier: number }
export type DrillItem = { id: string; name: string; mastery: number; reason: string }
export type PlanDay = { date: string; kind: 'drill' | 'review'; topics: DrillItem[] }

export type ExamPlan = {
  daysRemaining: number
  overdue: boolean
  coveredCount: number
  weakCount: number
  readyCount: number   // covered topics already at/above target
  drillList: DrillItem[]
  schedule: PlanDay[]
}

const WEAK_THRESHOLD = 3 // below 3★ = needs drilling before the exam
const DAY = 86_400_000

export function computeExamPlan(
  examDate: Date,
  skillNodeIds: string[],
  nodesById: Map<string, PlanNode>,
  prereqsOf: Map<string, string[]>,
): ExamPlan {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfExam = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate())
  const daysRemaining = Math.round((startOfExam.getTime() - startOfToday.getTime()) / DAY)
  const overdue = daysRemaining < 0

  const covered = skillNodeIds.map(id => nodesById.get(id)).filter((n): n is PlanNode => !!n)
  const weak = covered.filter(n => n.masteryLevel < WEAK_THRESHOLD).sort((a, b) => a.masteryLevel - b.masteryLevel)
  const readyCount = covered.length - weak.length

  // Shaky prerequisites of weak topics (mastery < threshold), earliest tier first.
  const coveredIds = new Set(covered.map(n => n.id))
  const prereqMap = new Map<string, PlanNode>()
  for (const w of weak) {
    for (const pid of prereqsOf.get(w.id) ?? []) {
      if (coveredIds.has(pid)) continue // already in the covered list
      const p = nodesById.get(pid)
      if (p && p.masteryLevel < WEAK_THRESHOLD) prereqMap.set(pid, p)
    }
  }
  const shakyPrereqs = Array.from(prereqMap.values()).sort((a, b) => a.tier - b.tier)

  const drillList: DrillItem[] = [
    ...shakyPrereqs.map(p => ({ id: p.id, name: p.name, mastery: p.masteryLevel, reason: 'shaky prerequisite' })),
    ...weak.map(w => ({ id: w.id, name: w.name, mastery: w.masteryLevel, reason: `covered topic · ${w.masteryLevel}★` })),
  ]

  // Build the day-by-day schedule.
  const schedule: PlanDay[] = []
  if (!overdue && daysRemaining >= 0) {
    const totalDays = Math.max(1, daysRemaining + 1) // include today through exam day
    // Reserve the final day for a full review if there's more than one day.
    const reviewDay = totalDays >= 2
    const drillDays = reviewDay ? totalDays - 1 : totalDays
    const perDay = drillList.length > 0 ? Math.ceil(drillList.length / drillDays) : 0

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(startOfToday.getTime() + d * DAY).toISOString()
      const isReviewDay = reviewDay && d === totalDays - 1
      if (isReviewDay) {
        schedule.push({ date, kind: 'review', topics: [] })
      } else {
        const slice = perDay > 0 ? drillList.slice(d * perDay, d * perDay + perDay) : []
        schedule.push({ date, kind: 'drill', topics: slice })
      }
    }
  }

  return { daysRemaining, overdue, coveredCount: covered.length, weakCount: weak.length, readyCount, drillList, schedule }
}
