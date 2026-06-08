'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle, ChevronRight, RefreshCw, AlertTriangle, Gauge } from 'lucide-react'
import { useToast } from './ToastProvider'

type GapResult = {
  weakPrerequisites: { skillNodeId: string; topicName: string; masteryLevel: number; why: string }[]
  reviewSuggestion: string
}
const DIFF_BADGE: Record<string, string> = {
  Basic:        'bg-green-900/50 text-green-300 border-green-800',
  Intermediate: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
  Advanced:     'bg-red-900/50 text-red-300 border-red-800',
}

type Question = {
  id: string; type: 'multiple_choice' | 'short_answer'; question: string
  options?: string[]; correctAnswer: string; explanation: string
}
type Quiz = { id: string; questions: Question[]; topicName: string }
type QuizResult = { id: string; score: number; passed: boolean; takenAt: string; quiz: { quizType: string } }
type EvalResult = {
  score: number; passed: boolean; feedback: string
  questionResults: Array<{ id: string; correct: boolean; userAnswer: string; feedback: string }>
}

interface Props {
  skillNodeId: string; topicName: string; subject: string
  currentMastery: number
  onMasteryUpdated: (newLevel: number) => void
  onAction?: (action: 'debate' | 'teach' | 'socratic') => void
}

export default function QuizPanel({ skillNodeId, topicName, subject, onMasteryUpdated, onAction }: Props) {
  const { showToast } = useToast()
  const [phase, setPhase]         = useState<'history' | 'loading' | 'taking' | 'results'>('history')
  const [quiz, setQuiz]           = useState<Quiz | null>(null)
  const [currentQ, setCurrentQ]   = useState(0)
  const [answers, setAnswers]      = useState<Record<string, string>>({})
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [history, setHistory]      = useState<QuizResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [newMastery, setNewMastery] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [gaps, setGaps] = useState<GapResult | null>(null)

  useEffect(() => { loadHistory() }, [skillNodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadHistory() {
    try {
      const res = await fetch(`/api/quiz/results/${skillNodeId}`)
      const data = await res.json()
      setHistory(data.results ?? [])
    } catch {}
  }

  async function startQuiz(forceNew = false) {
    setPhase('loading')
    try {
      const res  = await fetch('/api/quiz/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, topicName, subject, quizType: 'practice', forceNew }),
      })
      const data = await res.json()
      if (res.status === 429) { showToast('info', data.error ?? 'Rate limited'); setPhase('history'); return }
      if (!data.quiz) throw new Error('Generation failed')
      setQuiz(data.quiz)
      setDifficulty(data.difficulty ?? null)
      setCurrentQ(0); setAnswers({})
      setPhase('taking')
    } catch {
      showToast('info', 'Failed to generate quiz'); setPhase('history')
    }
  }

  async function submitQuiz() {
    if (!quiz) return
    setSubmitting(true)
    try {
      const ansArr = Object.entries(answers).map(([id, answer]) => ({ id, answer }))
      const res    = await fetch('/api/quiz/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, skillNodeId, answers: ansArr }),
      })
      const data = await res.json()
      setEvalResult(data.evaluation)
      if (data.newMasteryLevel !== null && data.newMasteryLevel !== undefined) {
        setNewMastery(data.newMasteryLevel)
        onMasteryUpdated(data.newMasteryLevel)
        showToast('info', `Mastery updated to ${data.newMasteryLevel}★`)
      }
      setPhase('results'); loadHistory()
      // Feature 2: analyze gaps if failed
      if (data.evaluation && data.evaluation.score < 70) {
        const wrong = (data.evaluation.questionResults ?? [])
          .filter((qr: { correct: boolean }) => !qr.correct)
          .map((qr: { id: string; userAnswer: string }) => {
            const q = quiz.questions.find(qq => qq.id === qr.id)
            return { question: q?.question ?? '', userAnswer: qr.userAnswer }
          })
        fetch('/api/quiz/analyze-gaps', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillNodeId, topicName, score: data.evaluation.score, wrongAnswers: wrong }),
        }).then(r => r.json()).then(g => setGaps(g)).catch(() => {})
      }
    } catch { showToast('info', 'Evaluation failed') }
    finally   { setSubmitting(false) }
  }

  // ── History view ───────────────────────────────────────────────────────────
  if (phase === 'history') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">Quiz History</span>
          <div className="flex gap-1.5">
            <button onClick={() => startQuiz(false)}
              className="text-xs px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors">
              Practice
            </button>
            <button onClick={() => startQuiz(true)} title="Generate fresh harder questions (uses an API call)"
              className="text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors">
              Harder
            </button>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-gray-600">No quizzes taken yet for this topic.</p>
        ) : (
          history.map(r => (
            <div key={r.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${r.passed ? 'bg-green-950/20 border-green-900/30' : 'bg-gray-800/60 border-gray-700'}`}>
              <span className="text-gray-400">{new Date(r.takenAt).toLocaleDateString()}</span>
              <span className={`font-semibold ${r.passed ? 'text-green-400' : 'text-gray-500'}`}>{r.score}%</span>
              {r.passed ? <CheckCircle2 size={12} className="text-green-400" /> : <XCircle size={12} className="text-gray-600" />}
            </div>
          ))
        )}
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 size={24} className="animate-spin text-purple-500" />
        <span className="text-sm text-gray-500">Generating quiz with Claude…</span>
      </div>
    )
  }

  // ── Taking quiz ────────────────────────────────────────────────────────────
  if (phase === 'taking' && quiz) {
    const q = quiz.questions[currentQ]
    const total = quiz.questions.length
    const pct   = Math.round((currentQ / total) * 100)
    const isLast = currentQ === total - 1

    return (
      <div className="space-y-4">
        {/* Difficulty badge */}
        {difficulty && (
          <div className="flex justify-end">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${DIFF_BADGE[difficulty] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              <Gauge size={10} /> {difficulty}
            </span>
          </div>
        )}
        {/* Progress */}
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Q{currentQ + 1} / {total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <p className="text-sm text-gray-200 leading-snug">{q.question}</p>

        {q.type === 'multiple_choice' ? (
          <div className="space-y-2">
            {q.options?.map(opt => (
              <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors ${
                  answers[q.id] === opt ? 'bg-purple-900/50 border-purple-700 text-purple-200' : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
            placeholder="Write your answer…" rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-purple-600" />
        )}

        <div className="flex gap-2">
          {currentQ > 0 && (
            <button onClick={() => setCurrentQ(q => q - 1)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Back</button>
          )}
          {isLast ? (
            <button onClick={submitQuiz} disabled={!answers[q.id] || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg transition-colors">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              Submit Quiz
            </button>
          ) : (
            <button onClick={() => setCurrentQ(q => q + 1)} disabled={!answers[q.id]}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg transition-colors">
              Next <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === 'results' && evalResult) {
    const grade = evalResult.score >= 90 ? '5' : evalResult.score >= 80 ? '4' : evalResult.score >= 70 ? '3' : evalResult.score >= 60 ? '2' : evalResult.score >= 50 ? '1' : 'Fail'
    return (
      <div className="space-y-3">
        <div className={`text-center py-3 rounded-xl ${evalResult.passed ? 'bg-green-950/30 border border-green-900/40' : 'bg-gray-800/60 border border-gray-700'}`}>
          <div className={`text-3xl font-black ${evalResult.passed ? 'text-green-400' : 'text-gray-400'}`}>{evalResult.score}%</div>
          <div className="text-xs text-gray-500 mt-0.5">{evalResult.passed ? '✓ Passed' : 'Not passed'} · Grade {grade}</div>
          {newMastery !== null && <div className="text-xs text-purple-400 mt-1">Mastery → {newMastery}★</div>}
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{evalResult.feedback}</p>
        {evalResult.score < 50 && (
          <div className="text-xs text-yellow-500 bg-yellow-950/20 border border-yellow-900/30 rounded-lg px-3 py-2">
            Review recommended — consider revisiting the prerequisites.
          </div>
        )}
        {/* Feature 2: prerequisite gap suggestions */}
        {gaps && gaps.weakPrerequisites.length > 0 && (
          <div className="text-xs bg-yellow-950/20 border border-yellow-900/30 rounded-lg px-3 py-2 space-y-2">
            <div className="flex items-start gap-1.5 text-yellow-400">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>{gaps.reviewSuggestion}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gaps.weakPrerequisites.map(w => (
                <Link key={w.skillNodeId} href={`/topics?subject=${subject}`}
                  className="text-[10px] px-2 py-0.5 bg-yellow-900/40 border border-yellow-800/50 text-yellow-300 rounded hover:bg-yellow-800/50 transition-colors">
                  Review: {w.topicName}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {evalResult.questionResults.map((qr, i) => (
            <div key={qr.id} className={`text-xs px-2 py-1.5 rounded border ${qr.correct ? 'border-green-900/30 bg-green-950/10' : 'border-red-900/30 bg-red-950/10'}`}>
              <div className="flex items-center gap-1 font-medium">
                {qr.correct ? <CheckCircle2 size={10} className="text-green-400" /> : <XCircle size={10} className="text-red-400" />}
                Q{i + 1}: {qr.feedback}
              </div>
            </div>
          ))}
        </div>

        {/* Quiz results — next steps */}
        <div className="text-[10px] text-gray-500">Next: deepen your understanding</div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => onAction?.('debate')} className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded transition-colors">Debate this</button>
          <button onClick={() => onAction?.('teach')} className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded transition-colors">Teach it back</button>
          <button onClick={() => onAction?.('socratic')} className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded transition-colors">Socratic session</button>
        </div>

        <button onClick={() => { setPhase('history'); setEvalResult(null); setNewMastery(null); setGaps(null) }}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors">
          <RefreshCw size={11} /> Done
        </button>
      </div>
    )
  }

  return null
}
