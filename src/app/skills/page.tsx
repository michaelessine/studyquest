import prisma from '@/lib/prisma'
import { SUBJECTS } from '@/lib/xp'
import SkillTreeClient from '@/components/SkillTreeClient'

export const dynamic = 'force-dynamic'

export default async function SkillsPage() {
  const [nodes, deps] = await Promise.all([
    prisma.skillNode.findMany({ orderBy: { subject: 'asc' } }),
    prisma.skillDependency.findMany(),
  ])

  const subjectStats = SUBJECTS.map(subject => {
    const sub = nodes.filter(n => n.subject === subject)
    return {
      subject,
      total:    sub.length,
      mastered: sub.filter(n => n.status === 'mastered').length,
      unlocked: sub.filter(n => n.status === 'unlocked' || n.status === 'in_progress').length,
    }
  })

  const plainNodes = nodes.map(n => ({
    id: n.id, name: n.name, subject: n.subject, status: n.status,
    masteryLevel: n.masteryLevel, tier: n.tier, category: n.category,
    xpValue: n.xpValue, courseId: n.courseId,
    nextReviewAt: n.nextReviewAt?.toISOString() ?? null,
  }))
  const plainDeps = deps.map(d => ({ ...d }))

  return (
    <div className="h-screen flex flex-col">
      <div className="p-5 md:p-8 border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Skill Tree</h1>
        <p className="text-sm text-gray-500 mb-2">Click any node to open its details and rate your mastery.</p>
      </div>
      <div className="flex-1 min-h-0">
        <SkillTreeClient nodes={plainNodes} deps={plainDeps} subjectStats={subjectStats} />
      </div>
    </div>
  )
}
