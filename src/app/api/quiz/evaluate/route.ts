// POST /api/quiz/evaluate — evaluate answers, update mastery, cascade unlock
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { applyMasteryGain, quizDelta } from '@/lib/mastery'

type Q = { id: string; type: string; question: string; options?: string[]; correctAnswer: string; explanation?: string }
type QR = { id: string; correct: boolean; userAnswer: string; feedback: string }

// Cost saver: only short-answers are sent to Claude. MC is graded in code.
const EVAL_SYSTEM = `You grade SHORT-ANSWER quiz responses. For each, judge whether the answer demonstrates understanding of the key concept — be generous but accurate.
Return ONLY JSON: { "results": [ { "id": "q6", "correct": boolean, "feedback": "≤12 words" } ] }`

// Normalise an MC answer for exact-ish matching ("A) Foo" ≈ "a foo" ≈ "A").
function norm(s: string): string {
  return (s ?? '').trim().toLowerCase().replace(/^[a-d][).:]\s*/i, '').replace(/\s+/g, ' ').replace(/[.)]$/, '')
}
function mcCorrect(correct: string, user: string): boolean {
  const c = norm(correct), u = norm(user)
  if (!u) return false
  if (c === u) return true
  // also accept matching just the option letter (e.g. "A")
  const cl = (correct.trim().match(/^([a-d])[).:]/i) ?? [])[1]?.toLowerCase()
  const ul = (user.trim().match(/^([a-d])[).:]?$/i) ?? [])[1]?.toLowerCase()
  return !!cl && cl === ul
}

export async function POST(req: NextRequest) {
  const { quizId, skillNodeId, answers } = await req.json()
  if (!quizId || !skillNodeId || !answers) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  const questions = quiz.questions as Q[]
  const answerOf = (id: string) => (answers as Array<{ id: string; answer: string }>).find(a => a.id === id)?.answer ?? ''

  // 1) Grade multiple-choice in code (zero API cost)
  const mcResults: QR[] = []
  const shortAnswers: Q[] = []
  for (const q of questions) {
    const ua = answerOf(q.id)
    if (q.type === 'multiple_choice') {
      const correct = mcCorrect(q.correctAnswer, ua)
      mcResults.push({ id: q.id, correct, userAnswer: ua, feedback: correct ? 'Correct' : `Answer: ${q.correctAnswer}` })
    } else {
      shortAnswers.push(q)
    }
  }

  // 2) Only call Claude for short-answers (skip entirely if none)
  let saResults: QR[] = []
  if (shortAnswers.length > 0) {
    const userMsg = shortAnswers.map(q =>
      `Q(${q.id}): ${q.question}\nModel answer: ${q.correctAnswer}\nUser: ${answerOf(q.id)}`
    ).join('\n\n')
    try {
      const out = await claudeJSON<{ results: { id: string; correct: boolean; feedback: string }[] }>({
        system: EVAL_SYSTEM,
        user: userMsg,
        model: HAIKU,
        cacheSystem: true,
        route: 'quiz/evaluate',
        maxTokens: 600,   // short-answers only → small output
      })
      saResults = (out.results ?? []).map(r => ({ id: r.id, correct: r.correct, userAnswer: answerOf(r.id), feedback: r.feedback }))
    } catch (err) {
      console.error('Evaluation error:', err)
      // Fallback: mark short-answers correct if non-empty (lenient) rather than fail the whole quiz
      saResults = shortAnswers.map(q => ({ id: q.id, correct: answerOf(q.id).trim().length > 10, userAnswer: answerOf(q.id), feedback: 'Auto-graded (grader unavailable)' }))
    }
  }

  // 3) Combine + score in code
  const questionResults: QR[] = questions.map(q => mcResults.find(r => r.id === q.id) ?? saResults.find(r => r.id === q.id)!).filter(Boolean)
  const correctCount = questionResults.filter(r => r.correct).length
  const score = Math.round((correctCount / questions.length) * 100)
  const passed = score >= 70
  const feedback = score >= 90 ? 'Excellent — strong command of this topic.'
    : score >= 70 ? 'Good work — you passed. Review the misses to solidify.'
    : 'Not passed yet — revisit the topic and try again.'
  const evalResult = { score, passed, feedback, questionResults }

  // Store result
  const result = await prisma.quizResult.create({
    data: { quizId, skillNodeId, score: evalResult.score, passed: evalResult.passed, answers },
  })

  // PART 3: strict mastery progression (quiz deltas, 4.0 cap, MasteryEvent log)
  let newMasteryLevel: number | null = null
  let capped = false
  if (evalResult.passed) {
    const delta = quizDelta(evalResult.score)
    if (delta > 0) {
      const res = await applyMasteryGain({ skillNodeId, eventType: 'quiz', score: evalResult.score, delta })
      newMasteryLevel = res.newMasteryLevel
      capped = res.capped
    }
  }

  return NextResponse.json({ result, evaluation: evalResult, newMasteryLevel, capped })
}
