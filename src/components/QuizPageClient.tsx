'use client'
import { useState } from 'react'
import { Loader2, GraduationCap, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from './ToastProvider'

type SubjectStat = { subject: string; studied: number; batchTopics: { skillNodeId: string; topicName: string }[] }
type ExamResult = { id: string; score: number; passed: boolean; takenAt: string; topicName: string; subject: string }

type Question = {
  id: string; type: 'multiple_choice' | 'short_answer'; question: string
  options?: string[]; correctAnswer: string; explanation: string
}
type Quiz = { id: string; questions: Question[]; topicName: string; skillNodeId?: string }
type EvalResult = {
  score: number; passed: boolean; feedback: string
  questionResults: Array<{ id: string; correct: boolean; userAnswer: string; feedback: string }>
}

function gradeFromScore(score: number): string {
  if (score >= 90) return '5'
  if (score >= 80) return '4'
  if (score >= 70) return '3'
  if (score >= 60) return '2'
  if (score >= 50) return '1'
  return 'Failed'
}

interface Props { subjectStats: SubjectStat[]; recentExams: ExamResult[] }

export default function QuizPageClient({ subjectStats, recentExams }: Props) {
  const { showToast } = useToast()
  const [phase, setPhase]   = useState<'select' | 'loading' | 'taking' | 'results'>('select')
  const [quiz, setQuiz]     = useState<(Quiz & { skillNodeId: string }) | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers]   = useState<Record<string, string>>({})
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [examSubject, setExamSubject] = useState<string>('')
  const [batching, setBatching] = useState<string | null>(null)

  async function batchGenerate(subject: string, topics: { skillNodeId: string; topicName: string }[]) {
    if (topics.length === 0) { showToast('info', 'All topics already have quiz templates'); return }
    setBatching(subject)
    try {
      const res = await fetch('/api/quiz/generate-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topics }),
      })
      const data = await res.json()
      if (res.status === 429) showToast('info', data.error ?? 'Rate limited')
      else showToast('info', `Pre-generated ${data.generated ?? 0} quiz templates (1 API call)`)
    } catch { showToast('info', 'Batch generation failed') }
    finally { setBatching(null) }
  }

  async function startExam(subject: string) {
    setExamSubject(subject)
    setPhase('loading')
    try {
      const res  = await fetch('/api/quiz/exam', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      })
      const data = await res.json()
      if (!data.quiz) throw new Error(data.error || 'Failed')
      setQuiz(data.quiz)
      setCurrentQ(0); setAnswers({})
      setPhase('taking')
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Failed to generate exam')
      setPhase('select')
    }
  }

  async function submitExam() {
    if (!quiz) return
    setSubmitting(true)
    try {
      const ansArr = Object.entries(answers).map(([id, answer]) => ({ id, answer }))
      const res    = await fetch('/api/quiz/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, skillNodeId: quiz.skillNodeId, answers: ansArr }),
      })
      const data = await res.json()
      setEvalResult(data.evaluation)
      setPhase('results')
    } catch { showToast('info', 'Evaluation failed') }
    finally   { setSubmitting(false) }
  }

  // ── Taking exam ────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin text-orange-500" />
        <span className="text-sm text-gray-500">Generating 20-question {SUBJECT_LABEL[examSubject as Subject]} exam…</span>
      </div>
    )
  }

  if (phase === 'taking' && quiz) {
    const q = quiz.questions[currentQ]
    const total = quiz.questions.length
    const pct = Math.round((currentQ / total) * 100)
    const isLast = currentQ === total - 1
    return (
      <div className="card p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Question {currentQ + 1} of {total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="text-base text-gray-100 leading-snug">{q.question}</p>
        {q.type === 'multiple_choice' ? (
          <div className="space-y-2">
            {q.options?.map(opt => (
              <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm border transition-colors ${
                  answers[q.id] === opt ? 'bg-orange-900/50 border-orange-700 text-orange-200' : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
            placeholder="Write your answer…" rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-600" />
        )}
        <div className="flex gap-2">
          {currentQ > 0 && (
            <button onClick={() => setCurrentQ(c => c - 1)} className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Back</button>
          )}
          {isLast ? (
            <button onClick={submitExam} disabled={!answers[q.id] || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null} Submit Exam
            </button>
          ) : (
            <button onClick={() => setCurrentQ(c => c + 1)} disabled={!answers[q.id]}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-sm bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg">
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'results' && evalResult) {
    const grade = gradeFromScore(evalResult.score)
    return (
      <div className="card p-6 max-w-2xl mx-auto space-y-4">
        <div className={`text-center py-5 rounded-xl ${evalResult.passed ? 'bg-green-950/30 border border-green-900/40' : 'bg-gray-800/60 border border-gray-700'}`}>
          <div className="text-xs text-gray-500 mb-1">{SUBJECT_LABEL[examSubject as Subject]} Exam</div>
          <div className={`text-5xl font-black ${evalResult.passed ? 'text-green-400' : 'text-red-400'}`}>{evalResult.score}%</div>
          <div className="text-sm text-gray-400 mt-1">Grade: <span className="font-bold">{grade}</span></div>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">{evalResult.feedback}</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {evalResult.questionResults.map((qr, i) => (
            <div key={qr.id} className={`text-xs px-3 py-2 rounded border ${qr.correct ? 'border-green-900/30 bg-green-950/10' : 'border-red-900/30 bg-red-950/10'}`}>
              <div className="flex items-center gap-1.5 font-medium text-gray-300">
                {qr.correct ? <CheckCircle2 size={11} className="text-green-400 shrink-0" /> : <XCircle size={11} className="text-red-400 shrink-0" />}
                Q{i + 1}: {qr.feedback}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { setPhase('select'); setEvalResult(null); setQuiz(null) }}
          className="w-full py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">
          Back to exams
        </button>
      </div>
    )
  }

  // ── Selection screen ───────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <GraduationCap size={16} className="text-orange-400" /> Subject Exams
        </h2>
        <p className="text-xs text-gray-500 mb-4">A 20-question comprehensive exam covering your 5 most recently studied topics in a subject.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjectStats.map(s => (
            <div key={s.subject} className="card p-4 flex flex-col gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-200">{SUBJECT_LABEL[s.subject as Subject]}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.studied} topic{s.studied !== 1 ? 's' : ''} studied</div>
              </div>
              <button onClick={() => startExam(s.subject)} disabled={s.studied === 0}
                className="text-xs px-3 py-1.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                {s.studied === 0 ? 'Study a topic first' : 'Take Exam'}
              </button>
              <button onClick={() => batchGenerate(s.subject, s.batchTopics)} disabled={batching === s.subject || s.batchTopics.length === 0}
                title="Pre-generate quiz templates for up to 5 topics in a single API call"
                className="text-[11px] px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 disabled:opacity-30 text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {batching === s.subject ? <Loader2 size={11} className="animate-spin" /> : null}
                Pre-generate quizzes ({s.batchTopics.length})
              </button>
            </div>
          ))}
        </div>
      </div>

      {recentExams.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-200 mb-4">Recent Exam Results</h2>
          <div className="space-y-2">
            {recentExams.map(e => (
              <div key={e.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${e.passed ? 'bg-green-950/20 border-green-900/30' : 'bg-gray-800/60 border-gray-700'}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-200">{SUBJECT_LABEL[e.subject as Subject] ?? e.subject}</div>
                  <div className="text-xs text-gray-500">{new Date(e.takenAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold ${e.passed ? 'text-green-400' : 'text-red-400'}`}>{e.score}%</div>
                  <div className="text-[10px] text-gray-500">Grade {gradeFromScore(e.score)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
