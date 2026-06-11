// POST /api/exam/analyze — analyze a real university exam, apply mastery gains
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { applyMasteryGain, gradeToScore } from '@/lib/mastery'

type ExamAnalysis = {
  topicMasteryGains: { skillNodeId: string; gain: number; reasoning: string }[]
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

  // PART 4: grade-scaled gain guidance
  const gradeBand = examScore >= 95 ? 'A/A+ → suggest gains 1.5-2.0'
    : examScore >= 80 ? 'B+/B → suggest gains 1.0-1.5'
    : examScore >= 70 ? 'C → suggest gains 0.5-1.0'
    : 'D/F → warning only, gains 0'

  const system = `You analyze a real university exam and estimate per-topic mastery gains.
Grade band: ${gradeBand}.
Return ONLY JSON: { "topicMasteryGains": [{ "skillNodeId": string (from the list), "gain": number (0.5-2.0 by grade & notes; 0 for D/F), "reasoning": string }], "insight": string, "reviewTopics": string[] (topic names to revisit if weak) }`

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

  // Persist the exam record
  const exam = await prisma.realExam.create({
    data: {
      examName, subject, grade,
      skillNodeIds: skillNodeIds as Prisma.InputJsonValue,
      performanceNotes: trimNotes(notes),
      masteryImpact: masteryImpact as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({ exam, analysis, applied })
}
