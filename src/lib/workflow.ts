// Shared metadata for the 4-phase Studying Workflow. Used by the topic panel,
// Quick Log, and course stats so phases stay consistent everywhere.
export const PHASES = [
  { n: 1, key: 'gather',   label: 'Information Gathering', short: 'Gather',   color: '#3b82f6', hint: 'Elaborative interrogation — ask why each condition is needed.' },
  { n: 2, key: 'proofs',   label: 'Proofs / Core Trick',  short: 'Proofs',   color: '#a855f7', hint: 'Deconstruct the proof; name the core trick.' },
  { n: 3, key: 'homework', label: 'Homework',             short: 'Homework', color: '#ea580c', hint: 'Struggle 15 min before asking AI for a hint, not the answer.' },
  { n: 4, key: 'recall',   label: 'Exam Prep · Recall',   short: 'Recall',   color: '#16a34a', hint: 'Blank-sheet method + hostile practice under exam conditions.' },
] as const

export type PhaseNum = 1 | 2 | 3 | 4
export function phaseMeta(n: number) { return PHASES.find(p => p.n === n) }
