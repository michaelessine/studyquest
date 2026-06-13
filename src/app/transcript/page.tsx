import prisma from '@/lib/prisma'
import Link from 'next/link'
import { GraduationCap, TrendingUp } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import { predictGrade } from '@/lib/courseGrade'

export const dynamic = 'force-dynamic'

function subj(s: string) { return SUBJECT_LABEL[s as Subject] ?? s }

export default async function TranscriptPage() {
  const [courses, nodes, exerciseSets] = await Promise.all([
    prisma.course.findMany({ orderBy: [{ year: 'desc' }, { semester: 'asc' }, { name: 'asc' }] }),
    prisma.skillNode.findMany({ where: { courseId: { not: null } }, select: { courseId: true, masteryLevel: true } }),
    prisma.exerciseSet.findMany({ where: { courseId: { not: null }, pctSolved: { not: null } }, select: { courseId: true, pctSolved: true } }),
  ])

  // Per-course mastery + performance aggregates
  const masteryByCourse = new Map<string, number[]>()
  for (const n of nodes) { if (!n.courseId) continue; (masteryByCourse.get(n.courseId) ?? masteryByCourse.set(n.courseId, []).get(n.courseId)!).push(n.masteryLevel) }
  const solvedByCourse = new Map<string, number[]>()
  for (const e of exerciseSets) { if (!e.courseId || e.pctSolved == null) continue; (solvedByCourse.get(e.courseId) ?? solvedByCourse.set(e.courseId, []).get(e.courseId)!).push(e.pctSolved) }

  const enriched = courses.map(c => {
    const ms = masteryByCourse.get(c.id) ?? []
    const avgMastery = ms.length ? Math.round((ms.reduce((a, b) => a + b, 0) / ms.length) * 100) / 100 : null
    const ps = solvedByCourse.get(c.id) ?? []
    const avgPctSolved = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null
    const prediction = predictGrade({ avgMastery, linkedCount: ms.length, avgPctSolved })
    return { ...c, avgMastery, prediction }
  })

  // GPA from graded courses (1–5 scale)
  const graded = enriched.filter(c => c.grade != null)
  const gpa = graded.length ? Math.round((graded.reduce((a, c) => a + (c.grade ?? 0), 0) / graded.length) * 100) / 100 : null

  // Group by term (year + semester)
  const termKey = (c: typeof enriched[number]) => `${c.year ?? '—'}|${c.semester ?? ''}`
  const terms = new Map<string, { year: number | null; semester: string | null; courses: typeof enriched }>()
  for (const c of enriched) {
    const k = termKey(c)
    if (!terms.has(k)) terms.set(k, { year: c.year, semester: c.semester, courses: [] })
    terms.get(k)!.courses.push(c)
  }
  const termList = Array.from(terms.values())

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><GraduationCap size={22} className="text-orange-400" /> Transcript</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your courses by term, with grades and predicted grades for what&apos;s in progress.</p>
      </div>

      {/* GPA summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-gray-500 mb-1">Overall GPA</div>
          <div className="text-3xl font-black text-orange-400">{gpa != null ? gpa : '—'}<span className="text-sm text-gray-500 font-normal"> / 5</span></div>
          <div className="text-[11px] text-gray-600 mt-1">{graded.length} graded course{graded.length === 1 ? '' : 's'}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 mb-1">Courses</div>
          <div className="text-3xl font-black text-gray-200">{courses.length}</div>
          <div className="text-[11px] text-gray-600 mt-1">{courses.filter(c => c.status === 'active').length} active</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={12} /> Projected GPA</div>
          {(() => {
            // Blend actual grades with predicted grades for ungraded courses that have a prediction
            const vals = enriched
              .map(c => c.grade != null ? c.grade : (c.prediction.available && c.prediction.grade !== 'Fail' ? c.prediction.grade : null))
              .filter((v): v is number => v != null)
            const proj = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null
            return <div className="text-3xl font-black text-green-400">{proj != null ? proj : '—'}<span className="text-sm text-gray-500 font-normal"> / 5</span></div>
          })()}
          <div className="text-[11px] text-gray-600 mt-1">grades + predictions</div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No courses yet. Add courses to build your transcript.</div>
      ) : (
        termList.map((term, i) => {
          const termGraded = term.courses.filter(c => c.grade != null)
          const termGpa = termGraded.length ? Math.round((termGraded.reduce((a, c) => a + (c.grade ?? 0), 0) / termGraded.length) * 100) / 100 : null
          return (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-200">{term.semester ? `${term.semester} ` : ''}{term.year ?? 'Unscheduled'}</h2>
                {termGpa != null && <span className="text-xs text-gray-500">Term GPA <span className="text-orange-400 font-semibold">{termGpa}</span></span>}
              </div>
              <div className="space-y-1.5">
                {term.courses.map(c => (
                  <Link key={c.id} href={`/courses/${c.id}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-200 truncate">{c.code ? `${c.code} · ` : ''}{c.name}</div>
                      <div className="text-[11px] text-gray-600">{subj(c.subject)} · {c.status}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {c.grade != null ? (
                        <div className="text-lg font-bold text-green-400">{c.grade}<span className="text-xs text-gray-600 font-normal">/5</span></div>
                      ) : c.prediction.available ? (
                        <div className="text-sm font-semibold text-orange-400">~{c.prediction.grade === 'Fail' ? 'Fail' : `${c.prediction.grade}/5`}<div className="text-[10px] text-gray-600 font-normal">predicted</div></div>
                      ) : (
                        <div className="text-xs text-gray-600">no grade</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
