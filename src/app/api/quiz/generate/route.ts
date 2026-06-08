// POST /api/quiz/generate — generate a practice quiz for a skill node
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, subject, quizType = 'practice', questionCount } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const numQuestions = questionCount ?? (quizType === 'exam' ? 20 : 8)
  const mcCount      = quizType === 'exam' ? 13 : Math.ceil(numQuestions * 0.6)
  const saCount      = numQuestions - mcCount

  // ── Difficulty adaptation from recent quiz history ──────────────────────────
  const recent = await prisma.quizResult.findMany({
    where: { skillNodeId },
    orderBy: { takenAt: 'desc' }, take: 5,
    select: { score: true },
  })
  const recentScores = recent.map(r => r.score)
  const avg = recentScores.length ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : null
  const difficulty = avg === null ? 'Intermediate' : avg >= 85 ? 'Advanced' : avg >= 70 ? 'Intermediate' : 'Basic'
  const difficultyInstruction = avg === null
    ? 'No quiz history yet — generate intermediate (Tier 2) questions.'
    : `The user's recent quiz scores: ${recentScores.map(s => `${s}%`).join(', ')} (avg ${Math.round(avg)}%). ` +
      (avg >= 85 ? 'Generate Tier 3 (advanced/applied) questions.'
        : avg >= 70 ? 'Generate Tier 2 (intermediate) questions.'
        : 'Generate Tier 1 (basic recall) questions.') +
      ' Vary the difficulty within the tier.'

  const prompt = quizType === 'exam'
    ? `Generate a comprehensive exam for the topic "${topicName}" in ${subject}. Include ${mcCount} multiple choice and ${saCount} short answer questions spanning multiple subtopics and difficulty levels.`
    : `Generate a practice quiz for the topic "${topicName}" in ${subject}. Include ${mcCount} multiple choice and ${saCount} short answer questions.`

  const systemPrompt = `You are an expert tutor. ${prompt}
${difficultyInstruction}
Return ONLY a JSON object, no preamble:
{
  "quizType": "${quizType === 'exam' ? 'exam' : 'practice'}",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A) ...",
      "explanation": "..."
    },
    {
      "id": "q6",
      "type": "short_answer",
      "question": "...",
      "correctAnswer": "Model answer: ...",
      "explanation": "..."
    }
  ]
}
Generate ${numQuestions} questions total (${mcCount} multiple choice, ${saCount} short answer). Vary difficulty from basic recall to applied understanding.`

  let questions: unknown[]
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Create the quiz for "${topicName}".` }],
    })
    const raw  = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const json = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(json)
    questions = parsed.questions ?? []
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('No questions')
  } catch (err) {
    console.error('Quiz generation error:', err)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }

  const quiz = await prisma.quiz.create({
    data: { skillNodeId, topicName, subject, questions: questions as Prisma.InputJsonValue, quizType },
  })
  return NextResponse.json({ quiz, difficulty })
}
