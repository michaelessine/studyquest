import { Workflow, Search, Sigma, Bot, ClipboardCheck, AlertTriangle, ArrowUpCircle, Lightbulb } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const metadata = { title: 'Studying Workflow · StudyQuest' }

type Phase = {
  n: number
  title: string
  subtitle: string
  icon: LucideIcon
  trap: string
  upgrade: { label: string; body: string }
  blocks?: { heading: string; body: string }[]
  prompts?: string[]
}

const PHASES: Phase[] = [
  {
    n: 1,
    title: 'Information Gathering',
    subtitle: 'The “Why” over the “What”',
    icon: Search,
    trap: 'Mindlessly transcribing definitions and theorems onto paper.',
    upgrade: {
      label: 'Elaborative Interrogation',
      body: 'Stop simply copying definitions. When you read a theorem, write it down and immediately ask: “Why are all these conditions necessary?”',
    },
    blocks: [
      {
        heading: 'The “Break It” Technique',
        body: 'Try to find a counter-example if you drop one assumption. If a theorem requires a function to be continuous, draw a discontinuous function and see exactly where the theorem’s logic breaks down. This forces you to understand the boundaries of the concept — which is exactly what exams test.',
      },
    ],
  },
  {
    n: 2,
    title: 'Tackling Proofs',
    subtitle: 'The missing link',
    icon: Sigma,
    trap: 'Skipping proofs because they are dense and intimidating.',
    upgrade: {
      label: 'Deconstruction',
      body: 'In higher-level math and econ, the proof is the math. You don’t need to memorize them line-by-line, but you cannot skip them. Treat a proof like a piece of code: don’t read top-to-bottom passively — look for the “Core Trick.” Most complex proofs rely on one or two clever insights (adding and subtracting the same term, multiplying by a clever form of 1, or applying a specific lemma).',
    },
    blocks: [
      {
        heading: 'Actionable step',
        body: 'Write down the starting point, the ending point, and name the “Core Trick” in plain English. If you don’t understand the proof, this is the exact moment to use the Feynman Technique: explain the logic out loud to an empty room as if teaching a freshman.',
      },
    ],
  },
  {
    n: 3,
    title: 'The Homework',
    subtitle: 'The “Socratic AI” protocol',
    icon: Bot,
    trap: 'Using AI to bypass the productive struggle to meet tight deadlines.',
    upgrade: {
      label: 'The 15-Minute Struggle Timer',
      body: 'The connections that make you good at math are forged during the frustration of being stuck. Give a problem 15 minutes of genuine, uninterrupted effort — write down everything you know, draw diagrams, try applying different theorems. AI is great at generating answers but terrible for building your neural pathways if you let it do the heavy lifting.',
    },
    blocks: [
      {
        heading: 'Change your AI prompts',
        body: 'If the timer goes off and you’re still stuck, do not ask for the solution. Force the AI into a tutor role instead:',
      },
    ],
    prompts: [
      '“I am stuck on this economics problem. Here is my work so far. Do not give me the answer. Just tell me if my initial assumption is wrong, or give me a hint on which theorem to apply.”',
      '“What is the next logical step here? Provide only the hint, not the calculation.”',
    ],
  },
  {
    n: 4,
    title: 'Exam Preparation',
    subtitle: 'Active recall',
    icon: ClipboardCheck,
    trap: 'Re-reading notes and looking at model solutions while nodding along.',
    upgrade: {
      label: 'The Blank Sheet Method',
      body: 'Put all your notes away. On a blank sheet, write out everything you can remember about a topic — definitions, the core tricks of proofs, key formulas. Once you’re completely drained, open your notes in red pen and fill in what you missed. Those red marks are your weak spots.',
    },
    blocks: [
      {
        heading: 'Hostile Practice',
        body: '1–2 old exams are not enough. Treat old exams and unassigned textbook problems as your primary prep, and do them strictly under exam conditions — no notes, no music, no AI, and a ticking clock.',
      },
    ],
  },
]

export default function WorkflowPage() {
  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Workflow size={22} className="text-orange-400" /> Studying Workflow
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your end-to-end method for learning hard material — from first read to the exam hall.
        </p>
      </div>

      <div className="space-y-5">
        {PHASES.map(phase => {
          const Icon = phase.icon
          return (
            <div key={phase.n} className="card p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-950/40 border border-orange-800/50 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-orange-400" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">Phase {phase.n}</div>
                  <h2 className="font-semibold text-gray-100 leading-tight">{phase.title}</h2>
                  <div className="text-xs text-gray-500">{phase.subtitle}</div>
                </div>
              </div>

              {/* The trap */}
              <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2.5 mb-3">
                <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-red-400">The trap </span>
                  <span className="text-sm text-gray-300">{phase.trap}</span>
                </div>
              </div>

              {/* The upgrade */}
              <div className="flex items-start gap-2 bg-green-950/15 border border-green-900/30 rounded-lg px-3 py-2.5">
                <ArrowUpCircle size={15} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-green-400">The upgrade · {phase.upgrade.label} </span>
                  <span className="text-sm text-gray-300">{phase.upgrade.body}</span>
                </div>
              </div>

              {/* Technique blocks */}
              {phase.blocks?.map((b, i) => (
                <div key={i} className="mt-3 pl-3 border-l-2 border-gray-800">
                  <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1">
                    <Lightbulb size={13} className="text-orange-400" /> {b.heading}
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{b.body}</p>
                </div>
              ))}

              {/* Prompt examples */}
              {phase.prompts && (
                <div className="mt-3 space-y-2">
                  {phase.prompts.map((p, i) => (
                    <div key={i} className="text-sm text-orange-200/90 bg-gray-800/50 border border-gray-700/60 rounded-lg px-3 py-2 font-mono leading-relaxed">
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-600 text-center pb-2">
        First read → proofs → struggle-first homework → active-recall exam prep. Trust the friction.
      </p>
    </div>
  )
}
