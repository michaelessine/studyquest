// Pure course-grade prediction (no AI). Blends average mastery of the course's
// linked topics with exercise-set performance. Grade scale: 1–5 (5 = excellent).

export type GradePrediction = {
  available: boolean
  score: number            // 0–100 predicted
  grade: number | 'Fail'   // 1–5 band
  label: string            // e.g. "Likely 4 / 5"
  confidence: 'low' | 'medium' | 'high'
  basis: string            // short explanation
}

function band(score: number): number | 'Fail' {
  if (score >= 90) return 5
  if (score >= 80) return 4
  if (score >= 70) return 3
  if (score >= 60) return 2
  if (score >= 50) return 1
  return 'Fail'
}

export function predictGrade(opts: {
  avgMastery: number | null   // 0–5
  linkedCount: number
  avgPctSolved: number | null // 0–100
}): GradePrediction {
  const { avgMastery, linkedCount, avgPctSolved } = opts
  if (avgMastery == null || linkedCount === 0) {
    return { available: false, score: 0, grade: 'Fail', label: 'Link topics to predict', confidence: 'low', basis: 'No topics linked to this course yet.' }
  }

  const masteryScore = (avgMastery / 5) * 100
  const score = avgPctSolved != null
    ? Math.round(0.65 * masteryScore + 0.35 * avgPctSolved)
    : Math.round(masteryScore)

  // Confidence grows with sample size and the presence of real performance data.
  let confidence: GradePrediction['confidence'] = 'low'
  if (linkedCount >= 6 && avgPctSolved != null) confidence = 'high'
  else if (linkedCount >= 3 || avgPctSolved != null) confidence = 'medium'

  const g = band(score)
  const basis = avgPctSolved != null
    ? `From ${linkedCount} linked topic${linkedCount === 1 ? '' : 's'} (avg ${avgMastery}★) + ${avgPctSolved}% exercise performance.`
    : `From ${linkedCount} linked topic${linkedCount === 1 ? '' : 's'} (avg ${avgMastery}★). Tag exercise sets to this course to sharpen it.`

  return { available: true, score, grade: g, label: g === 'Fail' ? 'At risk of failing' : `Likely ${g} / 5`, confidence, basis }
}
