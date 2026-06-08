// Skills page — server renders subject list, client renders the React Flow tree
import prisma from '@/lib/prisma'
import { SUBJECTS } from '@/lib/xp'
import SkillTreeClient from '@/components/SkillTreeClient'

export default async function SkillsPage() {
  const [nodes, deps] = await Promise.all([
    prisma.skillNode.findMany({ orderBy: { subject: 'asc' } }),
    prisma.skillDependency.findMany(),
  ])

  // Aggregate stats per subject for the legend header
  const subjectStats = SUBJECTS.map(subject => {
    const subNodes = nodes.filter(n => n.subject === subject)
    return {
      subject,
      total:    subNodes.length,
      mastered: subNodes.filter(n => n.status === 'mastered').length,
      unlocked: subNodes.filter(n => n.status === 'unlocked').length,
    }
  })

  // Pass plain objects (no Prisma proxy) to client component
  const plainNodes = nodes.map(n => ({ ...n }))
  const plainDeps  = deps.map(d => ({ ...d }))

  return (
    <div className="h-screen flex flex-col">
      {/* Header stays above the flow canvas */}
      <div className="p-5 md:p-8 border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Skill Tree</h1>
        <p className="text-sm text-gray-500 mb-2">Select a subject to explore your skill graph.</p>
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block shrink-0" />
            Locked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shrink-0" />
            Unlocked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shrink-0" />
            Mastered
          </span>
        </div>
      </div>

      {/* Full-height skill tree (React Flow needs a bounded parent) */}
      <div className="flex-1 min-h-0">
        <SkillTreeClient
          nodes={plainNodes}
          deps={plainDeps}
          subjectStats={subjectStats}
        />
      </div>
    </div>
  )
}
