// POST /api/quiz/generate — generate a quiz (template-first, else Haiku)
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { checkRateLimit, checkMonthlyCap } from '@/lib/rateLimit'

type Question = { id: string; type: string; question: string; options?: string[]; correctAnswer: string; explanation: string }

// Fix 2: static system prompt (identical across requests → cacheable)
// Cost saver: no "explanation" field (never shown); compact options.
const QUIZ_SYSTEM = `You are an expert tutor generating quizzes.
Return ONLY compact JSON, no preamble:
{ "questions": [
  { "id":"q1","type":"multiple_choice","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A) ..." },
  { "id":"q6","type":"short_answer","question":"...","correctAnswer":"<concise model answer>" }
] }
Rules: vary difficulty within the requested tier (Basic=recall, Intermediate=application, Advanced=synthesis). MC options plausible, exactly one correct. Keep questions and answers concise.`

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, subject, quizType = 'practice', questionCount, forceNew } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Fix 9: rate limit + monthly cap (only when we'd actually call Claude)
  // ── Fix 5: serve a pre-generated template when possible (no API call) ───────
  if (quizType === 'practice' && !forceNew) {
    const templates = await prisma.quizTemplate.findMany({ where: { skillNodeId } })
    if (templates.length > 0) {
      const chosen = templates[Math.floor(Math.random() * templates.length)]
      const questions = shuffle(chosen.questions as Question[])
      const quiz = await prisma.quiz.create({
        data: { skillNodeId, topicName, subject, questions: questions as unknown as Prisma.InputJsonValue, quizType },
      })
      return NextResponse.json({ quiz, difficulty: chosen.difficulty, fromTemplate: true })
    }
  }

  // No template (or forceNew) → call Claude. Apply rate limit + cap first.
  const cap = await checkMonthlyCap()
  if (cap.overCap) {
    return NextResponse.json({ error: 'Monthly budget reached. Quiz generation paused until next month.', overCap: true }, { status: 429 })
  }
  const rl = await checkRateLimit('quiz/generate')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit reached (20/hour). Try again later.', resetAt: rl.resetAt }, { status: 429 })
  }

  // Fix 3: trimmed context — recent scores only
  const recent = await prisma.quizResult.findMany({
    where: { skillNodeId }, orderBy: { takenAt: 'desc' }, take: 3, select: { score: true },
  })
  const recentScores = recent.map(r => r.score)
  const avg = recentScores.length ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : null
  const difficulty = avg === null ? 'Intermediate' : avg >= 85 ? 'Advanced' : avg >= 70 ? 'Intermediate' : 'Basic'

  // Cost saver: 6-question practice quiz (was 8); exam stays comprehensive
  const numQuestions = questionCount ?? (quizType === 'exam' ? 20 : 6)
  const mcCount = quizType === 'exam' ? 14 : Math.ceil(numQuestions * 0.66)
  const saCount = numQuestions - mcCount

  // Dynamic context goes in the user message (keeps system prompt cacheable)
  const userMsg = `Topic: "${topicName}" (${subject}). Difficulty tier: ${difficulty}.
Generate ${numQuestions} questions: ${mcCount} multiple choice and ${saCount} short answer. quizType="${quizType}".`

  let questions: Question[]
  try {
    const parsed = await claudeJSON<{ questions: Question[] }>({
      system: QUIZ_SYSTEM,
      user: userMsg,
      model: HAIKU,            // Fix 1
      cacheSystem: true,       // Fix 2
      route: 'quiz/generate',  // Fix 10
      maxTokens: quizType === 'exam' ? 2600 : 1100,  // right-sized to question count
    })
    questions = parsed.questions ?? []
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('No questions')
  } catch (err) {
    console.error('Quiz generation error:', err)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }

  // Fix 5: persist this fresh generation as a reusable template (practice only,
  // capped at 3 per node) so future quizzes need no API call.
  if (quizType === 'practice') {
    const existing = await prisma.quizTemplate.count({ where: { skillNodeId } })
    if (existing < 3) {
      await prisma.quizTemplate.create({
        data: { skillNodeId, questions: questions as unknown as Prisma.InputJsonValue, difficulty },
      }).catch(() => {})
    }
  }

  const quiz = await prisma.quiz.create({
    data: { skillNodeId, topicName, subject, questions: questions as unknown as Prisma.InputJsonValue, quizType },
  })
  return NextResponse.json({ quiz, difficulty, fromTemplate: false })
}
