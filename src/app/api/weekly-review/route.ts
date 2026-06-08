// POST /api/weekly-review — send weekly review text to Claude
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTotalXP, getLevel } from '@/lib/xp'
import { claudeText, HAIKU } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { reviewText } = await req.json()
  if (!reviewText) return NextResponse.json({ error: 'reviewText required' }, { status: 400 })

  // Gather context: nodes updated in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
  const [recentNodes, allNodes, totalXP] = await Promise.all([
    prisma.skillNode.findMany({
      where: { masteryUpdatedAt: { gte: sevenDaysAgo } },
      select: { name: true, subject: true, masteryLevel: true },
    }),
    prisma.skillNode.findMany({
      where: { status: 'unlocked', masteryLevel: { lt: 3 } },
      select: { name: true, subject: true, masteryLevel: true },
      take: 10,
    }),
    getTotalXP(),
  ])

  const studiedThisWeek = recentNodes
    .map(n => `${n.name} (${n.subject}, ★${n.masteryLevel})`)
    .join(', ') || 'nothing logged yet'

  const lowMastery = allNodes
    .map(n => `${n.name} (${n.subject}, ★${n.masteryLevel})`)
    .join(', ') || 'none'

  const systemPrompt = `You are StudyQuest AI doing a weekly review with the student.
Level: ${getLevel(totalXP)} | Total XP: ${totalXP}
Topics studied this week (updated in last 7 days): ${studiedThisWeek}
Unlocked but low-mastery topics (potential gaps): ${lowMastery}

Do three things:
1. Summarize what the student accomplished this week in 2-3 sentences.
2. Identify their biggest knowledge gap based on unlocked but low-mastery topics.
3. Suggest a specific focus for next week with 3 concrete topics to prioritize.
Be encouraging but honest. Keep response under 200 words.`

  // Fix 9: weekly summary is a simple task → Haiku, and logged for cost tracking
  const text = await claudeText({
    system: systemPrompt,
    user: reviewText,
    model: HAIKU,
    route: 'weekly-review',
    maxTokens: 512,
  })
  return NextResponse.json({ response: text })
}
