// POST /api/import — restore data from a StudyQuest JSON backup.
// Upserts by id so it merges into the current DB without wiping anything.
// Resilient: bad/orphaned rows are skipped, not fatal. Order respects FKs.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>
const toDate = (row: Row, fields: string[]) => {
  for (const f of fields) if (row[f]) row[f] = new Date(row[f] as string)
  return row
}

// Restore a table by id, per-row try/catch. Returns count restored.
async function restoreById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any, rows: Row[] | undefined, dateFields: string[] = [], omit: string[] = [],
): Promise<number> {
  if (!Array.isArray(rows)) return 0
  let ok = 0
  for (const raw of rows) {
    const data = toDate({ ...raw }, dateFields)
    for (const f of omit) delete data[f]
    const id = data.id
    if (!id) continue
    try {
      await model.upsert({ where: { id }, create: data, update: data })
      ok++
    } catch { /* skip orphaned / invalid row */ }
  }
  return ok
}

export async function POST(req: NextRequest) {
  let payload: { data?: Record<string, Row[]> }
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const d = payload?.data
  if (!d || typeof d !== 'object') return NextResponse.json({ error: 'Not a StudyQuest backup (missing data)' }, { status: 400 })

  const restored: Record<string, number> = {}

  // Order matters for foreign keys: courses → skillNodes → dependencies → rest.
  restored.courses = await restoreById(prisma.course, d.courses, ['createdAt'])
  restored.skillNodes = await restoreById(prisma.skillNode, d.skillNodes, ['nextReviewAt', 'masteryUpdatedAt'])

  // Skill dependencies use a composite key, not id.
  let deps = 0
  for (const raw of d.skillDependencies ?? []) {
    try {
      await prisma.skillDependency.upsert({
        where: { prerequisiteId_dependentId: { prerequisiteId: raw.prerequisiteId as string, dependentId: raw.dependentId as string } },
        create: { prerequisiteId: raw.prerequisiteId as string, dependentId: raw.dependentId as string },
        update: {},
      }); deps++
    } catch { /* skip */ }
  }
  restored.skillDependencies = deps

  restored.topics = await restoreById(prisma.topic, d.topics)
  restored.deadlines = await restoreById(prisma.deadline, d.deadlines, ['dueDate'])
  restored.studySessions = await restoreById(prisma.studySession, d.studySessions, ['startTime', 'endTime'])
  restored.masteryEvents = await restoreById(prisma.masteryEvent, d.masteryEvents, ['timestamp'])
  restored.realExams = await restoreById(prisma.realExam, d.realExams, ['date', 'createdAt'])
  restored.exerciseSets = await restoreById(prisma.exerciseSet, d.exerciseSets, ['uploadedAt', 'analyzedAt'])
  restored.quizResults = await restoreById(prisma.quizResult, d.quizResults, ['takenAt'])
  restored.learningPaths = await restoreById(prisma.learningPath, d.learningPaths, ['createdAt'])
  restored.achievements = await restoreById(prisma.achievement, d.achievements, ['unlockedAt'])
  restored.phaseLogs = await restoreById(prisma.phaseLog, d.phaseLogs, ['timestamp'])
  restored.failedProblems = await restoreById(prisma.failedProblem, d.failedProblems, ['createdAt', 'resolvedAt'])
  restored.upcomingExams = await restoreById(prisma.upcomingExam, d.upcomingExams, ['examDate', 'createdAt'])

  // Singletons keyed by userId (omit auto-managed timestamps)
  for (const row of d.learningAbility ?? []) {
    try { await prisma.learningAbility.upsert({ where: { userId: (row.userId as string) ?? 'default' }, create: row, update: row }) } catch { /* skip */ }
  }
  for (const row of d.selfImprovementGoals ?? []) {
    const r = { ...row }; delete r.updatedAt
    try { await prisma.selfImprovementGoals.upsert({ where: { userId: (r.userId as string) ?? 'default' }, create: r, update: r }) } catch { /* skip */ }
  }
  for (const row of d.careerPathProgress ?? []) {
    const r = { ...row }; delete r.lastUpdated
    try { await prisma.careerPathProgress.upsert({ where: { userId: (r.userId as string) ?? 'default' }, create: r, update: r }) } catch { /* skip */ }
  }

  const total = Object.values(restored).reduce((a, b) => a + b, 0)
  return NextResponse.json({ ok: true, restored, total })
}
