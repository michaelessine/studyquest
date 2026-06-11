// POST /api/techniques/suggest — 3 level-appropriate study techniques for a topic.
// Default: seeded (zero API cost). Pass personalize:true to use Claude (Haiku).
import { NextRequest, NextResponse } from 'next/server'
import { getSeededSuggestions, TechniqueSuggestion } from '@/lib/techniques'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { checkMonthlyCap } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { topic, level = 0, personalize } = await req.json()
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const seeded = getSeededSuggestions(topic, level)

  // Free path (default)
  if (!personalize) {
    return NextResponse.json({ ...seeded, personalized: false })
  }

  // Optional personalized path
  const cap = await checkMonthlyCap()
  if (cap.overCap) return NextResponse.json({ ...seeded, personalized: false })

  try {
    const out = await claudeJSON<{ techniques: TechniqueSuggestion[] }>({
      system: `Suggest exactly 3 study techniques for the topic and mastery level given.
Return ONLY JSON: { "techniques": [{ "name": string, "why": string, "applicationForThisTopic": "2-3 sentences" }] }`,
      user: `Topic: "${topic}". Mastery level: ${level}/5. Prefer these techniques for this level: ${seeded.techniques.map(t => t.name).join(', ')}.`,
      model: HAIKU,
      cacheSystem: true,
      route: 'techniques/suggest',
      maxTokens: 600,
    })
    return NextResponse.json({ band: seeded.band, techniques: out.techniques ?? seeded.techniques, personalized: true })
  } catch {
    return NextResponse.json({ ...seeded, personalized: false })
  }
}
