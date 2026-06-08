// POST /api/textbook/generate — generate (or fetch cached) a textbook chapter
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { claudeText } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, level } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const userLevel = Math.max(0, Math.min(5, Math.round(level ?? 0)))

  // Return cached chapter if present for this (node, level)
  const cached = await prisma.textbookChapter.findUnique({
    where: { skillNodeId_userLevel: { skillNodeId, userLevel } },
  })
  if (cached) return NextResponse.json({ chapter: cached, cached: true })

  const system = `Write a textbook chapter (1500-2000 words) on "${topicName}" for a student at mastery level ${userLevel}.
At level 0-1: explain fundamentals and intuitions, lots of examples. At level 3-4: dive into proofs, derivations, edge cases. At level 5: discuss open problems and research directions.
Include: definition, motivation, key theorems/concepts, worked examples, and practice problems. Format as markdown with clear headings.
Return ONLY the markdown text, no JSON wrapper.`

  let content: string
  try {
    content = await claudeText({ system, user: `Write the chapter on ${topicName}.`, maxTokens: 4000 })
    if (!content.trim()) throw new Error('Empty content')
  } catch (err) {
    console.error('Textbook generation error:', err)
    return NextResponse.json({ error: 'Failed to generate chapter' }, { status: 500 })
  }

  const chapter = await prisma.textbookChapter.create({
    data: { skillNodeId, userLevel, content },
  })
  return NextResponse.json({ chapter, cached: false })
}
