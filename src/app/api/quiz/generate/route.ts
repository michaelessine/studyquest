// POST /api/quiz/generate — generate a quiz (template-first, else Haiku)
import { NextRequest, NextResponse } from 'next/server'
import { generateQuiz } from '@/lib/quizGen'

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, subject, quizType = 'practice', questionCount, forceNew } = await req.json()
  const result = await generateQuiz({ skillNodeId, topicName, subject, quizType, questionCount, forceNew })
  if (!result.ok) {
    const { error, status, overCap, resetAt } = result
    return NextResponse.json({ error, ...(overCap ? { overCap } : {}), ...(resetAt ? { resetAt } : {}) }, { status })
  }
  return NextResponse.json({ quiz: result.quiz, difficulty: result.difficulty, fromTemplate: result.fromTemplate })
}
