import prisma from '@/lib/prisma'
import { Bug } from 'lucide-react'
import MistakeList from '@/components/MistakeList'

export const dynamic = 'force-dynamic'

export default async function MistakesPage() {
  const nodes = await prisma.skillNode.findMany({
    select: { id: true, name: true, subject: true, courseId: true },
    orderBy: [{ subject: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><Bug size={22} className="text-orange-400" /> Mistake Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Every problem you got wrong, collected in one place. Add the reason you missed it, then redo it and mark it resolved.
        </p>
      </div>

      <div className="card p-5">
        <MistakeList
          topics={nodes.map(n => ({ id: n.id, name: n.name, courseId: n.courseId }))}
          heading="All failed problems"
        />
      </div>
    </div>
  )
}
