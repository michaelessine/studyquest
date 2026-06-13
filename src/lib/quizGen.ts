// Shared quiz-generation logic. Called directly by /api/quiz/generate and
// /api/quiz/exam — no internal HTTP hop (which broke on Vercel where there is
// no localhost:3000 to fetch).
import { Prisma } from '@prisma/client'
import prisma from './prisma'
import { claudeJSON, HAIKU } from './claude'
import { checkRateLimit, checkMonthlyCap } from './rateLimit'

export type Question = { id: string; type: string; question: string; options?: string[]; correctAnswer: string; explanation: string }

export type GenQuizResult =
  | { ok: true; quiz: { id: string }; difficulty: string; fromTemplate: boolean }
  | { ok: false; error: string; status: number; overCap?: boolean; resetAt?: Date }

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

export async function generateQuiz(opts: {
  skillNodeId: string
  topicName: string
  subject: string
  quizType?: string
  questionCount?: number
  forceNew?: boolean
}): Promise<GenQuizResult> {
  const { skillNodeId, topicName, subject, quizType = 'practice', questionCount, forceNew } = opts
  if (!skillNodeId || !topicName) return { ok: false, error: 'Missing fields', status: 400 }

  // Serve a pre-generated template when possible (no API call).
  if (quizType === 'practice' && !forceNew) {
    const templates = await prisma.quizTemplate.findMany({ where: { skillNodeId } })
    if (templates.length > 0) {
      const chosen = templates[Math.floor(Math.random() * templates.length)]
      const questions = shuffle(chosen.questions as Question[])
      const quiz = await prisma.quiz.create({
        data: { skillNodeId, topicName, subject, questions: questions as unknown as Prisma.InputJsonValue, quizType },
      })
      return { ok: true, quiz, difficulty: chosen.difficulty, fromTemplate: true }
    }
  }

  // No template (or forceNew) → call Claude. Apply rate limit + cap first.
  const cap = await checkMonthlyCap()
  if (cap.overCap) return { ok: false, error: 'Monthly budget reached. Quiz generation paused until next month.', status: 429, overCap: true }
  const rl = await checkRateLimit('quiz/generate')
  if (!rl.allowed) return { ok: false, error: 'Rate limit reached (20/hour). Try again later.', status: 429, resetAt: rl.resetAt }

  // Trimmed context — recent scores only
  const recent = await prisma.quizResult.findMany({
    where: { skillNodeId }, orderBy: { takenAt: 'desc' }, take: 3, select: { score: true },
  })
  const recentScores = recent.map(r => r.score)
  const avg = recentScores.length ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : null
  const difficulty = avg === null ? 'Intermediate' : avg >= 85 ? 'Advanced' : avg >= 70 ? 'Intermediate' : 'Basic'

  const numQuestions = questionCount ?? (quizType === 'exam' ? 20 : 6)
  const mcCount = quizType === 'exam' ? 14 : Math.ceil(numQuestions * 0.66)
  const saCount = numQuestions - mcCount

  const userMsg = `Topic: "${topicName}" (${subject}). Difficulty tier: ${difficulty}.
Generate ${numQuestions} questions: ${mcCount} multiple choice and ${saCount} short answer. quizType="${quizType}".`

  let questions: Question[]
  try {
    const parsed = await claudeJSON<{ questions: Question[] }>({
      system: QUIZ_SYSTEM,
      user: userMsg,
      model: HAIKU,
      cacheSystem: true,
      route: 'quiz/generate',
      maxTokens: quizType === 'exam' ? 2600 : 1100,
    })
    questions = parsed.questions ?? []
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('No questions')
  } catch (err) {
    console.error('Quiz generation error:', err)
    return { ok: false, error: 'Failed to generate quiz', status: 500 }
  }

  // Persist practice generations as reusable templates (capped at 3 per node).
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
  return { ok: true, quiz, difficulty, fromTemplate: false }
}
