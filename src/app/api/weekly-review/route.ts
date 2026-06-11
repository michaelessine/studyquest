// POST /api/weekly-review — send weekly review text to Claude
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTotalXP, getLevel } from '@/lib/xp'
import { claudeText, HAIKU } from '@/lib/claude'
import { CAREERS, computeCareerProgress } from '@/lib/careers'

export async function POST(req: NextRequest) {
  const { reviewText } = await req.json()
  if (!reviewText) return NextResponse.json({ error: 'reviewText required' }, { status: 400 })

  // Gather context: nodes updated in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
  const [recentNodes, allNodes, totalXP, weekEvents] = await Promise.all([
    prisma.skillNode.findMany({
      where: { masteryUpdatedAt: { gte: sevenDaysAgo } },
      select: { name: true, subject: true, masteryLevel: true },
    }),
    prisma.skillNode.findMany({
      select: { id: true, name: true, subject: true, masteryLevel: true, status: true },
    }),
    getTotalXP(),
    prisma.masteryEvent.findMany({
      where: { timestamp: { gte: sevenDaysAgo }, masteryGain: { gt: 0 } },
      select: { skillNodeId: true },
    }),
  ])

  const studiedThisWeek = recentNodes
    .map(n => `${n.name} (${n.subject}, ★${n.masteryLevel})`)
    .join(', ') || 'nothing logged yet'

  const lowMastery = allNodes
    .filter(n => n.status === 'unlocked' && n.masteryLevel < 3)
    .slice(0, 10)
    .map(n => `${n.name} (${n.subject}, ★${n.masteryLevel})`)
    .join(', ') || 'none'

  // PART 8: career alignment context
  const progress = CAREERS.map(c => computeCareerProgress(c, allNodes))
  const top3 = [...progress].sort((a, b) => b.readiness - a.readiness).slice(0, 3)
  const top3Text = top3.map(p => `${p.label}: ${p.readiness}% readiness (${p.masteredTopics.length}/${p.totalTopics} mastered)`).join('; ')

  // Which careers each studied-this-week topic advances
  const advancedIds = new Set(weekEvents.map(e => e.skillNodeId))
  const careerAdvances = progress.map(p => ({
    label: p.label,
    count: p.matched.filter(m => advancedIds.has(m.id)).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)
  const advancesText = careerAdvances.length
    ? careerAdvances.map(c => `${c.label} (+${c.count} topic${c.count !== 1 ? 's' : ''})`).join(', ')
    : 'no career-relevant topics advanced yet this week'

  const systemPrompt = `You are StudyQuest AI doing a weekly review with the student.
Level: ${getLevel(totalXP)} | Total XP: ${totalXP}
Topics studied this week: ${studiedThisWeek}
Career paths advanced this week: ${advancesText}
Top 3 career paths by readiness: ${top3Text}
Unlocked but low-mastery topics (potential gaps): ${lowMastery}

Do five things, concisely:
1. Summarize what the student accomplished this week (2-3 sentences), referencing mastery gains.
2. State which career paths their work this week advanced (use the data above).
3. Report overall progress toward their top 3 career paths.
4. Identify their biggest knowledge gap.
5. Recommend a specific focus for next week with 3 concrete topics, aligned with their top career path.
Be encouraging but honest. Keep response under 260 words.`

  // Fix 9: weekly summary is a simple task → Haiku, and logged for cost tracking
  const text = await claudeText({
    system: systemPrompt,
    user: reviewText,
    model: HAIKU,
    route: 'weekly-review',
    maxTokens: 700,
  })
  return NextResponse.json({ response: text })
}
