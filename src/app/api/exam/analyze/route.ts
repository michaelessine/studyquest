// POST /api/exam/analyze — analyze a real university exam, apply mastery gains
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { applyMasteryGain, gradeToScore } from '@/lib/mastery'

type ExamAnalysis = {
  topicMasteryGains: { skillNodeId: string; gain: number; estimatedScore: number; reasoning: string }[]
  insight: string
  reviewTopics: string[]
}

// Trim notes (PART 4: keep input small)
function trimNotes(s: string): string {
  return (s ?? '').slice(0, 500)
}

export async function POST(req: NextRequest) {
  const { examName, subject, skillNodeIds, grade, notes } = await req.json()
  if (!examName || !subject || !Array.isArray(skillNodeIds) || skillNodeIds.length === 0 || !grade) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const nodes = await prisma.skillNode.findMany({
    where: { id: { in: skillNodeIds } },
    select: { id: true, name: true, masteryLevel: true },
  })
  if (nodes.length === 0) return NextResponse.json({ error: 'No valid topics' }, { status: 400 })

  const topicList = nodes.map(n => `id:${n.id} | ${n.name} (current mastery ${n.masteryLevel}/5)`).join('\n')
  const examScore = gradeToScore(grade)

  // PART 4: grade-scaled gain guidance (1–5 scale: 90+→5, 80-89→4, 70-79→3, 60-69→2, 50-59→1, <50 Fail)
  const gradeBand = examScore >= 90 ? 'grade 5 (excellent) → suggest gains 1.5-2.0'
    : examScore >= 80 ? 'grade 4 (very good) → suggest gains 1.0-1.5'
    : examScore >= 70 ? 'grade 3 (good) → suggest gains 0.75-1.25'
    : examScore >= 60 ? 'grade 2 (satisfactory) → suggest gains 0.5-1.0'
    : examScore >= 50 ? 'grade 1 (pass) → suggest gains 0.25-0.5'
    : 'Fail → warning only, gains 0'

  const system = `You analyze a real university exam and estimate, per covered topic, (a) a likely performance score 0-100 and (b) a mastery gain.
Overall grade band: ${gradeBand}. Use the notes to vary estimates between topics (some stronger, some weaker than the overall grade).
Return ONLY JSON: { "topicMasteryGains": [{ "skillNodeId": string (from the list), "estimatedScore": number (0-100), "gain": number (0-2; 0 for a Fail), "reasoning": "≤12 words" }], "insight": string, "reviewTopics": string[] (topic names to revisit if weak) }`

  const userMsg = `University exam: "${examName}" in ${subject}. Grade: ${grade}.
Topics covered:\n${topicList}\nNotes: "${trimNotes(notes)}"`

  let analysis: ExamAnalysis
  try {
    analysis = await claudeJSON<ExamAnalysis>({
      system, user: userMsg,
      model: HAIKU,             // Fix 9: extraction/analysis → Haiku
      cacheSystem: true,
      route: 'exam/analyze',
      maxTokens: 1100,
    })
  } catch (err) {
    console.error('Exam analyze error:', err)
    return NextResponse.json({ error: 'Failed to analyze exam' }, { status: 500 })
  }

  // Apply mastery gains via the strict progression system (real_exam events).
  const validIds = new Set(nodes.map(n => n.id))
  const applied: { skillNodeId: string; newMasteryLevel: number; capped: boolean }[] = []
  const masteryImpact: Record<string, number> = {}

  for (const g of analysis.topicMasteryGains ?? []) {
    if (!validIds.has(g.skillNodeId)) continue
    const gain = Math.max(0, Math.min(2, g.gain ?? 0))
    if (gain <= 0) continue
    const res = await applyMasteryGain({ skillNodeId: g.skillNodeId, eventType: 'real_exam', score: examScore, delta: gain })
    applied.push({ skillNodeId: g.skillNodeId, newMasteryLevel: res.newMasteryLevel, capped: res.capped })
    masteryImpact[g.skillNodeId] = res.gain
  }

  // ── Post-exam consolidation path (topics scored < 80%) ──────────────────────
  const nodeName = new Map(nodes.map(n => [n.id, n.name]))
  const weakTopics = (analysis.topicMasteryGains ?? [])
    .filter(g => validIds.has(g.skillNodeId) && (g.estimatedScore ?? 100) < 80)
    .map(g => ({ id: g.skillNodeId, score: Math.round(g.estimatedScore ?? 0) }))

  let consolidation: { pathId: string; headline: string; topics: { id: string; name: string; reason: string }[] } | null = null

  if (weakTopics.length > 0) {
    const weakIds = weakTopics.map(w => w.id)

    // Pull shaky prerequisites (mastery < 3) of the weak topics — drill these first
    const prereqLinks = await prisma.skillDependency.findMany({
      where: { dependentId: { in: weakIds } },
      select: { prerequisiteId: true },
    })
    const prereqNodes = await prisma.skillNode.findMany({
      where: { id: { in: prereqLinks.map(p => p.prerequisiteId) }, masteryLevel: { lt: 3 } },
      select: { id: true, name: true, tier: true },
    })

    // Order: weak prerequisites (tier asc) first, then the weak exam topics
    const orderedIds = [
      ...prereqNodes.sort((a, b) => a.tier - b.tier).map(p => p.id),
      ...weakIds,
    ].filter((id, i, arr) => arr.indexOf(id) === i)

    const estimatedHours: Record<string, number> = {}
    for (const id of orderedIds) estimatedHours[id] = 3

    // Unpin any existing pinned path, then create + pin the consolidation path
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

    const lowest = weakTopics.sort((a, b) => a.score - b.score)[0]
    const lowestName = nodeName.get(lowest.id) ?? 'a topic'
    consolidation = {
      pathId: path.id,
      headline: `You scored about ${lowest.score}% on ${lowestName} in "${examName}". Here's what to drill before you move on.`,
      topics: [
        ...prereqNodes.map(p => ({ id: p.id, name: p.name, reason: 'shaky prerequisite' })),
        ...weakTopics.map(w => ({ id: w.id, name: nodeName.get(w.id) ?? w.id, reason: `~${w.score}% on the exam` })),
      ],
    }
  }

  // Persist the exam record
  const exam = await prisma.realExam.create({
    data: {
      examName, subject, grade,
      skillNodeIds: skillNodeIds as Prisma.InputJsonValue,
      performanceNotes: trimNotes(notes),
      masteryImpact: masteryImpact as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({ exam, analysis, applied, consolidation })
}
