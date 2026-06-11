import Link from 'next/link'
import PomodoroTimer from '@/components/PomodoroTimer'

const TECHNIQUES = [
  { name: 'Active Recall',           difficulty: 'Easy',   bestFor: 'Any subject',        description: 'Test yourself from memory instead of re-reading. Close the book and write down everything you know about a topic.' },
  { name: 'Spaced Repetition',       difficulty: 'Easy',   bestFor: 'Memorisation',       description: 'Review material at increasing intervals (1→3→7→14→30 days). StudyQuest\'s star rating system implements this automatically.' },
  { name: 'Feynman Technique',       difficulty: 'Medium', bestFor: 'Deep understanding', description: 'Explain a concept as if teaching a 12-year-old. Where you stumble reveals the gaps — go back and fill them.' },
  { name: 'Interleaving',            difficulty: 'Medium', bestFor: 'Problem solving',    description: 'Mix different topics or problem types in a single session instead of blocking one topic at a time.' },
  { name: 'Pomodoro',                difficulty: 'Easy',   bestFor: 'Focus & stamina',    description: 'Work for 25 focused minutes, then take a 5-minute break. Repeat 4 times, then take a 20-minute break.' },
  { name: 'Mind Mapping',            difficulty: 'Easy',   bestFor: 'Conceptual topics',  description: 'Draw a central concept and branch out to related ideas. Visually represents relationships between ideas.' },
  { name: 'Elaborative Interrogation', difficulty: 'Medium', bestFor: 'Science & Math',   description: 'Ask "why?" and "how?" about each fact you learn. Generate explanations for why facts are true.' },
  { name: 'Retrieval Practice',      difficulty: 'Easy',   bestFor: 'Exams',              description: 'Use past papers, flashcards, or practice problems to retrieve information. More effective than re-reading.' },
  { name: 'Distributed Practice',    difficulty: 'Easy',   bestFor: 'Long-term retention', description: 'Spread study over multiple sessions instead of cramming. A little every day beats a lot the night before.' },
]

const DIFF_COLOR: Record<string, string> = {
  Easy:   'bg-green-900/50 text-green-300 border-green-800',
  Medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
  Hard:   'bg-red-900/50 text-red-300 border-red-800',
}

export default function TechniquesPage() {
  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Study Techniques</h1>
        <p className="text-sm text-gray-500 mt-0.5">Evidence-based methods to learn faster and retain longer.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Technique cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {TECHNIQUES.map(t => (
            <div key={t.name} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-100 text-sm">{t.name}</h3>
                <span className={`badge border shrink-0 text-[10px] ${DIFF_COLOR[t.difficulty]}`}>{t.difficulty}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed flex-1">{t.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600">Best for: <span className="text-gray-400">{t.bestFor}</span></span>
                <Link
                  href={`/chat?prefill=${encodeURIComponent(`How do I apply the ${t.name} technique to my current studies?`)}`}
                  className="text-[10px] px-2.5 py-1 bg-orange-900/40 border border-orange-800/50 text-orange-300 hover:bg-orange-800/50 rounded transition-colors"
                >
                  How to apply →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Pomodoro timer */}
        <div className="space-y-4">
          <PomodoroTimer />
          <div className="card p-4 text-xs text-gray-500 space-y-2">
            <p className="font-semibold text-gray-400">The Pomodoro Method</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Choose a single task to work on</li>
              <li>Start the 25-minute timer</li>
              <li>Work with full focus until the timer rings</li>
              <li>Take a 5-minute break</li>
              <li>Every 4 pomodoros, take a 20-min break</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
