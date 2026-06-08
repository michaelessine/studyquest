// POST /api/quiz/evaluate — evaluate answers, update mastery, cascade unlock
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cascadeUnlock } from '@/lib/unlock'
import { incrementMastery, getNextReviewDate, getReviewIntervalDays } from '@/lib/spacedRepetition'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { quizId, skillNodeId, answers } = await req.json()
  if (!quizId || !skillNodeId || !answers) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  const questions = quiz.questions as Array<{ id: string; type: string; question: string; options?: string[]; correctAnswer: string; explanation: string }>

  const evalPrompt = `Evaluate these quiz answers.
For multiple choice: mark correct/incorrect by comparing to correctAnswer exactly.
For short answers: assess whether the user's answer demonstrates understanding of the key concept — be generous but accurate.
Return ONLY JSON:
{
  "score": number (0-100),
  "passed": boolean (score >= 70),
  "feedback": "2-3 sentence overall feedback",
  "questionResults": [
    { "id": "q1", "correct": boolean, "userAnswer": "...", "feedback": "1 sentence" }
  ]
}

Questions and answers:
${questions.map(q => {
  const ua = (answers as Array<{id:string;answer:string}>).find(a => a.id === q.id)?.answer ?? ''
  return `Q(${q.id}) [${q.type}]: ${q.question}
Correct: ${q.correctAnswer}
User answered: ${ua}`
}).join('\n\n')}`

  let evalResult: { score: number; passed: boolean; feedback: string; questionResults: Array<{id:string;correct:boolean;userAnswer:string;feedback:string}> }
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: evalPrompt }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    evalResult = JSON.parse(raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, ''))
  } catch (err) {
    console.error('Evaluation error:', err)
    return NextResponse.json({ error: 'Failed to evaluate quiz' }, { status: 500 })
  }

  // Store result
  const result = await prisma.quizResult.create({
    data: { quizId, skillNodeId, score: evalResult.score, passed: evalResult.passed, answers },
  })

  // Update mastery level if improved
  let newMasteryLevel: number | null = null
  if (evalResult.passed) {
    const node = await prisma.skillNode.findUnique({ where: { id: skillNodeId }, select: { masteryLevel: true } })
    if (node && node.masteryLevel < 5) {
      const delta      = evalResult.score >= 90 ? 1.0 : 0.5
      const newLevel   = incrementMastery(node.masteryLevel, delta)
      const status     = newLevel >= 5 ? 'mastered' : 'in_progress'
      await prisma.skillNode.update({
        where: { id: skillNodeId },
        data: {
          masteryLevel: newLevel, status,
          masteryUpdatedAt: new Date(),
          nextReviewAt: getNextReviewDate(newLevel),
          reviewIntervalDays: getReviewIntervalDays(newLevel),
        },
      })
      newMasteryLevel = newLevel
      await cascadeUnlock()
    }
  }

  return NextResponse.json({ result, evaluation: evalResult, newMasteryLevel })
}
