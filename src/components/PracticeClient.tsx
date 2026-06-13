'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import QuizPanel from './QuizPanel'

export default function PracticeClient({ node }: { node: { id: string; name: string; subject: string; masteryLevel: number } }) {
  const router = useRouter()
  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300">
        <ArrowLeft size={15} /> Back
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><GraduationCap size={22} className="text-orange-400" /> Practice · {node.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {SUBJECT_LABEL[node.subject as Subject] ?? node.subject} · {node.masteryLevel}★ — generate a quick quiz to redo this topic.
        </p>
      </div>
      <div className="card p-5">
        <QuizPanel
          skillNodeId={node.id}
          topicName={node.name}
          subject={node.subject}
          currentMastery={node.masteryLevel}
          onMasteryUpdated={() => router.refresh()}
        />
      </div>
    </div>
  )
}
