import prisma from './prisma'
import { claudeJSON, HAIKU, getCachedResponse, setCachedResponse } from './claude'

export type DiagnoseSource = 'quiz' | 'exercise' | 'exam'

export interface MicroStep {
  skillNodeId: string
  topicName: string
  action: 'review' | 'study' | 'quiz'
  why: string
}
export interface Diagnosis {
  weakPrerequisites: { skillNodeId: string; topicName: string; masteryLevel: number; why: string }[]
  microPath: MicroStep[]
  reviewSuggestion: string
}

/**
 * Diagnose likely-weak prerequisites after a failed quiz / exercise / exam and
 * build an ordered micro-learning path to plug the gaps. Uses Haiku (cheap).
 */
export async function diagnoseWeakSpots(opts: {
  skillNodeId: string
  topicName: string
  score: number
  source: DiagnoseSource
  wrongAnswers?: { question: string; userAnswer: string }[]
}): Promise<Diagnosis> {
  const { skillNodeId, topicName, score, source, wrongAnswers } = opts

  // Direct prerequisites
  const directDeps = await prisma.skillDependency.findMany({
    where: { dependentId: skillNodeId },
    select: { prerequisiteId: true },
  })
  const directIds = directDeps.map(d => d.prerequisiteId)

  // Second-level prerequisites (prereqs of prereqs) — for a deeper micro-path
  const secondDeps = directIds.length
    ? await prisma.skillDependency.findMany({ where: { dependentId: { in: directIds } }, select: { prerequisiteId: true } })
    : []
  const candidateIds = Array.from(new Set([...directIds, ...secondDeps.map(d => d.prerequisiteId)]))

  const candidates = await prisma.skillNode.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, name: true, masteryLevel: true, tier: true },
  })

  // No prerequisites → it's foundational; suggest re-studying the topic itself.
  if (candidates.length === 0) {
    return {
      weakPrerequisites: [],
      microPath: [{ skillNodeId, topicName, action: 'study', why: 'Foundational topic — restudy the core material, then retry.' }],
      reviewSuggestion: `${topicName} has no prerequisites. Re-study its resources and retry the ${source}.`,
    }
  }

  const candText = candidates
    .sort((a, b) => a.tier - b.tier)
    .map(n => `- ${n.name} (id:${n.id}, mastery:${n.masteryLevel}, tier:${n.tier})`).join('\n')
  const wrongText = Array.isArray(wrongAnswers) && wrongAnswers.length
    ? wrongAnswers.slice(0, 8).map(w => `Q: ${w.question} | answered: ${w.userAnswer}`).join('\n')
    : 'Not provided'

  const system = `A student scored ${score}% on a ${source} for "${topicName}" — below passing.
Diagnose which foundational topics are likely weak and build a short ordered micro-learning path (3-5 steps, prerequisites first) to plug the gaps.
Prefer low-mastery candidates. Only use ids from the candidate list.
Return ONLY JSON:
{
  "weakPrerequisites": [{ "skillNodeId": string, "topicName": string, "masteryLevel": number, "why": "≤15 words" }],
  "microPath": [{ "skillNodeId": string, "topicName": string, "action": "review"|"study"|"quiz", "why": "≤15 words" }],
  "reviewSuggestion": "2 sentences"
}

Candidate foundational topics:
${candText}

Wrong answers / notes:
${wrongText}`

  const validIds = new Set(candidates.map(n => n.id))
  const masteryById = new Map(candidates.map(n => [n.id, n.masteryLevel]))

  // Cost saver: cache by the prerequisite mastery snapshot. Repeat failures on the
  // same topic (with unchanged foundations) reuse the diagnosis for free. The key
  // includes mastery levels, so it auto-invalidates once you strengthen a prereq.
  const snapshot = candidates.map(n => `${n.id}:${n.masteryLevel}`).sort().join(',')
  const cacheKey = { route: 'weak-spots/diagnose', skillNodeId, snapshot }
  const cached = await getCachedResponse<Diagnosis>('weak-spots/diagnose', cacheKey)
  if (cached) return cached

  try {
    const result = await claudeJSON<Diagnosis>({
      system,
      user: `Diagnose weak spots for ${topicName} and build a micro-path.`,
      model: HAIKU,
      route: 'weak-spots/diagnose',
      maxTokens: 900,
    })
    result.weakPrerequisites = (result.weakPrerequisites ?? []).filter(w => validIds.has(w.skillNodeId))
    result.microPath = (result.microPath ?? []).filter(s => validIds.has(s.skillNodeId))
    if (result.microPath.length === 0) throw new Error('empty path')
    await setCachedResponse('weak-spots/diagnose', cacheKey, result, 14 * 24 * 60 * 60 * 1000)
    return result
  } catch (err) {
    console.error('Weak-spot diagnosis error:', err)
    // Deterministic fallback: lowest-mastery candidates, tier order
    const weak = candidates
      .filter(n => n.masteryLevel < 3)
      .sort((a, b) => a.masteryLevel - b.masteryLevel || a.tier - b.tier)
      .slice(0, 5)
    return {
      weakPrerequisites: weak.map(n => ({ skillNodeId: n.id, topicName: n.name, masteryLevel: n.masteryLevel, why: 'Low-mastery prerequisite' })),
      microPath: weak.map(n => ({ skillNodeId: n.id, topicName: n.name, action: (masteryById.get(n.id) ?? 0) >= 1 ? 'review' as const : 'study' as const, why: 'Strengthen before retrying' })),
      reviewSuggestion: `Your weakest foundations for ${topicName} are listed below. Work through them in order, then retry the ${source}.`,
    }
  }
}
