// POST /api/quiz/exam — generate a 20-question subject exam covering 5 most-studied topics
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateQuiz } from '@/lib/quizGen'

export async function POST(req: NextRequest) {
  try {
    const { subject } = await req.json()
    if (!subject) return NextResponse.json({ error: 'subject required' }, { status: 400 })

    // Pick the 5 most recently studied topics in this subject
    const recentNodes = await prisma.skillNode.findMany({
      where: { subject, masteryLevel: { gt: 0 } },
      orderBy: { masteryUpdatedAt: 'desc' },
      take: 5,
      select: { id: true, name: true },
    })
    if (recentNodes.length === 0) {
      return NextResponse.json({ error: 'No studied topics in this subject yet' }, { status: 400 })
    }

    const primaryNode = recentNodes[0]
    const allTopicNames = recentNodes.map(n => n.name).join(', ')

    // Generate directly (no internal HTTP hop — that broke on Vercel).
    const result = await generateQuiz({
      skillNodeId: primaryNode.id,
      topicName: allTopicNames,
      subject,
      quizType: 'exam',
    })
    if (!result.ok) {
      const { error, status, overCap, resetAt } = result
      return NextResponse.json({ error, ...(overCap ? { overCap } : {}), ...(resetAt ? { resetAt } : {}) }, { status })
    }
    return NextResponse.json({ quiz: result.quiz, difficulty: result.difficulty })
  } catch (err) {
    console.error('Exam generation error:', err)
    return NextResponse.json({ error: 'Failed to generate exam' }, { status: 500 })
  }
}
