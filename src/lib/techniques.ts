// PART 10 — study techniques mapped to mastery level. Seeded (zero API cost).

export interface TechniqueSuggestion {
  name: string
  why: string                    // why it fits this level
  applicationForThisTopic: string // how to apply to the specific topic
}

type Def = { name: string; how: (topic: string) => string }

const T: Record<string, Def> = {
  Elaboration:          { name: 'Elaboration',          how: t => `Connect ${t} to things you already know. Ask "why" and "how" for each idea and re-explain it in your own words.` },
  Visualization:        { name: 'Visualization',        how: t => `Draw diagrams or mental images of ${t}. Sketch how the pieces relate before memorizing details.` },
  Chunking:             { name: 'Chunking',             how: t => `Break ${t} into small, meaningful chunks. Master one chunk before combining them into the whole.` },
  'Active Recall':      { name: 'Active Recall',        how: t => `After reading ${t}, close your notes and write down everything you remember. Then quiz yourself on the gaps.` },
  'Feynman Technique':  { name: 'Feynman Technique',    how: t => `Explain ${t} in plain language as if teaching a beginner. Wherever you get stuck shows exactly what to review.` },
  'Concept Mapping':    { name: 'Concept Mapping',      how: t => `Map ${t}'s key ideas as nodes and draw the relationships between them to see the big picture.` },
  Interleaving:         { name: 'Interleaving',         how: t => `Mix ${t} problems with related topics in one session instead of blocking, to strengthen discrimination.` },
  'Spaced Repetition':  { name: 'Spaced Repetition',    how: t => `Review ${t} at increasing intervals (1, 3, 7, 14 days). StudyQuest schedules this automatically from your star reviews.` },
  'Problem Solving':    { name: 'Problem Solving',      how: t => `Work through varied practice problems on ${t}, deliberately spending more time on the ones you find hardest.` },
  'Teaching Mode':      { name: 'Teaching Mode',        how: t => `Use Teach mode to explain ${t} in depth — articulating it out loud exposes hidden gaps and cements understanding.` },
  Debate:               { name: 'Debate',               how: t => `Use Debate mode to defend a claim about ${t} against counterarguments and sharpen your reasoning under pressure.` },
  'Research Papers':    { name: 'Research Papers',      how: t => `Read 1-2 papers on ${t} (via the Research tool) to link the fundamentals to how the topic is used in current work.` },
  'Peer Teaching':      { name: 'Peer Teaching',        how: t => `Teach ${t} to a peer or study group; fielding their questions is the strongest test of real mastery.` },
  'Writing Papers':     { name: 'Writing Papers',       how: t => `Write a short synthesis or essay on ${t} to organize and deepen expert-level understanding.` },
  'Socratic Method':    { name: 'Socratic Method',      how: t => `Use the Socratic tutor on ${t} to probe your assumptions and push to the edges of your understanding.` },
}

// Level bands → 3 techniques + a band-level rationale
const BANDS = [
  { max: 1, label: 'learning fundamentals', why: 'you are building first intuitions and need to encode the basics deeply', techs: ['Elaboration', 'Visualization', 'Chunking'] },
  { max: 2, label: 'building understanding', why: 'you have the basics and need to reinforce and connect them', techs: ['Active Recall', 'Feynman Technique', 'Concept Mapping'] },
  { max: 3, label: 'deepening',             why: 'you understand the core and need to apply and retain it', techs: ['Interleaving', 'Spaced Repetition', 'Problem Solving'] },
  { max: 4, label: 'approaching mastery',   why: 'you are strong and need to stress-test and articulate your knowledge', techs: ['Teaching Mode', 'Debate', 'Research Papers'] },
  { max: 5.01, label: 'expertise',          why: 'you are near the top and refine understanding by producing and defending knowledge', techs: ['Peer Teaching', 'Writing Papers', 'Socratic Method'] },
]

function bandFor(level: number) {
  return BANDS.find(b => level < b.max) ?? BANDS[BANDS.length - 1]
}

/** Seeded suggestions — no API call. */
export function getSeededSuggestions(topic: string, level: number): { band: string; techniques: TechniqueSuggestion[] } {
  const band = bandFor(level)
  const lvl = Math.round(level * 2) / 2
  const techniques = band.techs.map(key => {
    const def = T[key]
    return {
      name: def.name,
      why: `At mastery level ${lvl} you're ${band.label}, so ${band.why}.`,
      applicationForThisTopic: def.how(topic),
    }
  })
  return { band: band.label, techniques }
}
