// POST /api/quiz/generate-batch — generate quizzes for multiple topics in ONE call
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { checkRateLimit, checkMonthlyCap } from '@/lib/rateLimit'

type Question = { id: string; type: string; question: string; options?: string[]; correctAnswer: string; explanation: string }

// Cost saver: compact schema (no explanation), 5 questions/topic.
// Topics referenced by [index] — never echo UUIDs (LLMs mangle them).
const BATCH_SYSTEM = `You generate quizzes for multiple topics at once.
Return ONLY compact JSON: { "quizzes":[ {"i":<topic index number>,"questions":[ {"id","type":"multiple_choice"|"short_answer","question","options"?,"correctAnswer"} ]} ] }
Per topic: 5 questions (3 MC, 2 short answer). Concise. Use the exact [index] number shown for each topic.`

export async function POST(req: NextRequest) {
  try {
    const { topics, subject } = await req.json()
    // topics: [{ skillNodeId, topicName }]
    if (!Array.isArray(topics) || topics.length === 0) return NextResponse.json({ error: 'No topics' }, { status: 400 })

    // One batch counts as one quiz/generate call
    const cap = await checkMonthlyCap()
    if (cap.overCap) return NextResponse.json({ error: 'Monthly budget reached.', overCap: true }, { status: 429 })
    const rl = await checkRateLimit('quiz/generate')
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached (20/hour).', resetAt: rl.resetAt }, { status: 429 })

    const picked = (topics as { skillNodeId: string; topicName: string }[]).slice(0, 5)
    const list = picked.map((t, i) => `[${i}] ${t.topicName}`).join('\n')

    let result: { quizzes: { i: number; questions: Question[] }[] }
    try {
      result = await claudeJSON({
        system: BATCH_SYSTEM,
        user: `Subject: ${subject}. Generate quizzes for these topics (by index):\n${list}`,
        model: HAIKU,
        cacheSystem: true,
        route: 'quiz/generate-batch',
        maxTokens: 3200,   // 5 topics × 5 compact questions
      })
    } catch (err) {
      console.error('Batch quiz error:', err)
      return NextResponse.json({ error: 'Failed to generate quizzes' }, { status: 500 })
    }

    // Map each quiz back to its topic by index, save as a QuizTemplate for reuse.
    const saved: { topicId: string; count: number }[] = []
    for (const q of result.quizzes ?? []) {
      const topic = typeof q.i === 'number' ? picked[q.i] : undefined
      if (!topic || !Array.isArray(q.questions) || q.questions.length === 0) continue
      const existing = await prisma.quizTemplate.count({ where: { skillNodeId: topic.skillNodeId } })
      if (existing < 3) {
        await prisma.quizTemplate.create({
          data: { skillNodeId: topic.skillNodeId, questions: q.questions as unknown as Prisma.InputJsonValue, difficulty: 'Intermediate' },
        }).catch(() => {})
      }
      saved.push({ topicId: topic.skillNodeId, count: q.questions.length })
    }

    return NextResponse.json({ generated: saved.length, topics: saved })
  } catch (err) {
    console.error('Batch quiz route error:', err)
    return NextResponse.json({ error: 'Failed to generate quizzes' }, { status: 500 })
  }
}
