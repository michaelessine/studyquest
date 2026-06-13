// POST /api/exam/analyze — analyze a real university exam, apply mastery gains.
// Gains are applied DETERMINISTICALLY to the selected topics (no LLM id-echoing).
// Claude only adds per-topic estimated scores (by index) + insight for the
// consolidation path. Resilient: works even if the Claude call fails.
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { applyMasteryGain, gradeToScore } from '@/lib/mastery'

const round25 = (n: number) => Math.round(n * 4) / 4
function trimNotes(s: string): string { return (s ?? '').slice(0, 500) }

// Deterministic gain from overall grade (1–5 scale), ~50% tuned-down.
function baseGainFor(examScore: number): number {
  if (examScore >= 90) return 0.75   // grade 5
  if (examScore >= 70) return 0.5    // grade 3-4
  if (examScore >= 50) return 0.25   // grade 1-2
  return 0                           // fail
}

type Indexed = { topics?: { i: number; estimatedScore: number }[]; insight?: string; reviewTopics?: string[] }

export async function POST(req: NextRequest) {
  const { examName, subject, skillNodeIds, grade, notes } = await req.json()
  if (!examName || !subject || !Array.isArray(skillNodeIds) || skillNodeIds.length === 0 || !grade) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Preserve selection order
  const found = await prisma.skillNode.findMany({
    where: { id: { in: skillNodeIds } },
    select: { id: true, name: true, masteryLevel: true },
  })
  const byId = new Map(found.map(n => [n.id, n]))
  const nodes = (skillNodeIds as string[]).map(id => byId.get(id)).filter(Boolean) as { id: string; name: string; masteryLevel: number }[]
  if (nodes.length === 0) return NextResponse.json({ error: 'No valid topics' }, { status: 400 })

  const examScore = gradeToScore(grade)
  const baseGain = baseGainFor(examScore)

  // ── Claude: indexed estimated scores + insight (best-effort, never blocks) ──
  const indexedList = nodes.map((n, i) => `[${i}] ${n.name} (current mastery ${n.masteryLevel}/5)`).join('\n')
  const system = `You analyze a real university exam. For each topic (referenced by its [index]), estimate the student's likely performance 0-100, varying with the notes.
Return ONLY JSON: { "topics": [{ "i": number, "estimatedScore": number }], "insight": "2 sentences", "reviewTopics": string[] (topic names that looked weak) }`
  const userMsg = `Exam: "${examName}" in ${subject}. Overall grade: ${grade}/5 (~${examScore}%).
Topics (by index):\n${indexedList}\nNotes: "${trimNotes(notes)}"`

  const estByIndex = new Map<number, number>()
  let insight = ''
  let reviewTopics: string[] = []
  try {
    const a = await claudeJSON<Indexed>({ system, user: userMsg, model: HAIKU, cacheSystem: true, route: 'exam/analyze', maxTokens: 800 })
    for (const t of a.topics ?? []) if (typeof t.i === 'number' && typeof t.estimatedScore === 'number') estByIndex.set(t.i, t.estimatedScore)
    insight = a.insight ?? ''
    reviewTopics = a.reviewTopics ?? []
  } catch (err) {
    console.error('Exam analyze (Claude) failed, using deterministic gains:', err)
  }
  if (!insight) insight = `Logged grade ${grade}/5 on "${examName}". Mastery was updated for the covered topics.`

  // ── Apply gains deterministically to every selected topic ───────────────────
  const applied: { skillNodeId: string; newMasteryLevel: number; capped: boolean }[] = []
  const masteryImpact: Record<string, number> = {}
  if (baseGain > 0) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const est = estByIndex.get(i) ?? examScore
      // Weaker-than-passing topics get half the gain; everything passing still moves.
      const gain = est < 50 ? round25(baseGain / 2) : baseGain
      if (gain <= 0) continue
      const res = await applyMasteryGain({ skillNodeId: n.id, eventType: 'real_exam', score: examScore, delta: gain })
      applied.push({ skillNodeId: n.id, newMasteryLevel: res.newMasteryLevel, capped: res.capped })
      masteryImpact[n.id] = res.gain
    }
  }

  // ── Post-exam consolidation path (topics estimated < 80%) ───────────────────
  const nodeName = new Map(nodes.map(n => [n.id, n.name]))
  const weakTopics = nodes
    .map((n, i) => ({ id: n.id, score: Math.round(estByIndex.get(i) ?? examScore) }))
    .filter(t => t.score < 80)

  let consolidation: { pathId: string; headline: string; topics: { id: string; name: string; reason: string }[] } | null = null

  if (weakTopics.length > 0) {
    const weakIds = weakTopics.map(w => w.id)
    const prereqLinks = await prisma.skillDependency.findMany({ where: { dependentId: { in: weakIds } }, select: { prerequisiteId: true } })
    const prereqNodes = await prisma.skillNode.findMany({
      where: { id: { in: prereqLinks.map(p => p.prerequisiteId) }, masteryLevel: { lt: 3 } },
      select: { id: true, name: true, tier: true },
    })
    const orderedIds = [...prereqNodes.sort((a, b) => a.tier - b.tier).map(p => p.id), ...weakIds]
      .filter((id, i, arr) => arr.indexOf(id) === i)
    const estimatedHours: Record<string, number> = {}
    for (const id of orderedIds) estimatedHours[id] = 3

    await prisma.learningPath.updateMany({ where: { pinned: true }, data: { pinned: false } })
    const path = await prisma.learningPath.create({
      data: {
        name: `Post-exam consolidation: ${examName}`,
        subject,
        goalDescription: `Drill the topics you scored below 80% on in "${examName}" before moving on.`,
        topics: orderedIds as Prisma.InputJsonValue,
        estimatedHours: estimatedHours as Prisma.InputJsonValue,
        pinned: true,
      },
    })
    const lowest = [...weakTopics].sort((a, b) => a.score - b.score)[0]
    consolidation = {
      pathId: path.id,
      headline: `You scored about ${lowest.score}% on ${nodeName.get(lowest.id) ?? 'a topic'} in "${examName}". Here's what to drill before you move on.`,
      topics: [
        ...prereqNodes.map(p => ({ id: p.id, name: p.name, reason: 'shaky prerequisite' })),
        ...weakTopics.map(w => ({ id: w.id, name: nodeName.get(w.id) ?? w.id, reason: `~${w.score}% on the exam` })),
      ],
    }
  }

  const exam = await prisma.realExam.create({
    data: {
      examName, subject, grade,
      skillNodeIds: skillNodeIds as Prisma.InputJsonValue,
      performanceNotes: trimNotes(notes),
      masteryImpact: masteryImpact as Prisma.InputJsonValue,
    },
  })

  // Retrospective: surface problems you'd previously logged on these topics.
  const openMistakes = await prisma.failedProblem.findMany({
    where: { resolved: false, skillNodeId: { in: nodes.map(n => n.id) } },
    select: { id: true, title: true, skillNodeId: true }, orderBy: { createdAt: 'desc' },
  })
  const loggedMistakes = openMistakes.map(m => ({
    id: m.id, title: m.title, topicName: m.skillNodeId ? nodeName.get(m.skillNodeId) ?? null : null,
  }))

  return NextResponse.json({ exam, analysis: { insight, reviewTopics }, applied, consolidation, loggedMistakes })
}
