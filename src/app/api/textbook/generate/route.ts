// POST /api/textbook/generate — generate (or fetch cached) a textbook chapter
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { claudeText, HAIKU, SONNET } from '@/lib/claude'
import { checkRateLimit, checkMonthlyCap } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, level } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const userLevel = Math.max(0, Math.min(5, Math.round(level ?? 0)))

  // Return cached chapter if present for this (node, level) — no rate limit hit
  const cached = await prisma.textbookChapter.findUnique({
    where: { skillNodeId_userLevel: { skillNodeId, userLevel } },
  })
  if (cached) return NextResponse.json({ chapter: cached, cached: true })

  // Fix 9: rate limit + monthly cap before generating a new chapter
  const cap = await checkMonthlyCap()
  if (cap.overCap) return NextResponse.json({ error: 'Monthly budget reached. Chapter generation paused until next month.', overCap: true }, { status: 429 })
  const rl = await checkRateLimit('textbook/generate')
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached (3/day).', resetAt: rl.resetAt }, { status: 429 })

  // Cost saver: foundational chapters (level 0-2) use Haiku (3× cheaper); advanced
  // chapters (3-5, proofs/research) use Sonnet. Target length trimmed to ~1200-1500 words.
  const useSonnet = userLevel >= 3
  const system = `Write a concise textbook chapter (1200-1500 words) on "${topicName}" for a student at mastery level ${userLevel}.
At level 0-2: fundamentals, intuitions, worked examples. At level 3-4: proofs, derivations, edge cases. At level 5: open problems and research directions.
Include: definition, motivation, key concepts, 1-2 worked examples, and 2-3 practice problems. Markdown with clear headings. Be efficient — no filler.
Return ONLY the markdown text.`

  let content: string
  try {
    content = await claudeText({
      system, user: `Write the chapter on ${topicName}.`,
      model: useSonnet ? SONNET : HAIKU,
      route: 'textbook/generate',
      maxTokens: 2800,   // ~1500 words
    })
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
