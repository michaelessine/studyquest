// POST /api/quiz/generate-batch — generate quizzes for multiple topics in ONE call
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { checkRateLimit, checkMonthlyCap } from '@/lib/rateLimit'

type Question = { id: string; type: string; question: string; options?: string[]; correctAnswer: string; explanation: string }

const BATCH_SYSTEM = `You are an expert tutor generating quizzes for multiple topics at once.
Return ONLY JSON: { "quizzes": [ { "topicId": string, "questions": [ {"id","type":"multiple_choice"|"short_answer","question","options"?,"correctAnswer","explanation"} ] } ] }
For each topic generate 6 questions (4 multiple choice, 2 short answer). Vary difficulty. Use the exact topicId given.`

export async function POST(req: NextRequest) {
  const { topics, subject } = await req.json()
  // topics: [{ skillNodeId, topicName }]
  if (!Array.isArray(topics) || topics.length === 0) return NextResponse.json({ error: 'No topics' }, { status: 400 })

  // Fix 9: one batch counts as one quiz/generate call
  const cap = await checkMonthlyCap()
  if (cap.overCap) return NextResponse.json({ error: 'Monthly budget reached.', overCap: true }, { status: 429 })
  const rl = await checkRateLimit('quiz/generate')
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached (20/hour).', resetAt: rl.resetAt }, { status: 429 })

  const list = (topics as { skillNodeId: string; topicName: string }[])
    .slice(0, 5)
    .map(t => `- topicId:${t.skillNodeId} | ${t.topicName}`).join('\n')

  let result: { quizzes: { topicId: string; questions: Question[] }[] }
  try {
    result = await claudeJSON({
      system: BATCH_SYSTEM,
      user: `Subject: ${subject}. Generate quizzes for these topics:\n${list}`,
      model: HAIKU,                  // Fix 1
      cacheSystem: true,             // Fix 2
      route: 'quiz/generate-batch',  // Fix 10
      maxTokens: 4000,
    })
  } catch (err) {
    console.error('Batch quiz error:', err)
    return NextResponse.json({ error: 'Failed to generate quizzes' }, { status: 500 })
  }

  // Save each generated set as a QuizTemplate (Fix 5) for reuse
  const saved: { topicId: string; count: number }[] = []
  for (const q of result.quizzes ?? []) {
    if (!q.topicId || !Array.isArray(q.questions)) continue
    const existing = await prisma.quizTemplate.count({ where: { skillNodeId: q.topicId } })
    if (existing < 3) {
      await prisma.quizTemplate.create({
        data: { skillNodeId: q.topicId, questions: q.questions as unknown as Prisma.InputJsonValue, difficulty: 'Intermediate' },
      }).catch(() => {})
    }
    saved.push({ topicId: q.topicId, count: q.questions.length })
  }

  return NextResponse.json({ generated: saved.length, topics: saved })
}
