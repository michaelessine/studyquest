// Executes structured actions emitted by the AI chat in <actions> tags.
// Each action maps to one or more Prisma writes.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAndUnlockAchievements } from '@/lib/achievements'

type Action =
  | { type: 'markTopicDone'; topicId: string }
  | { type: 'logSession'; courseId?: string; durationMins: number; rawNote: string }
  | { type: 'addDeadline'; courseId: string; title: string; deadlineType: string; dueDate: string; xpValue: number }
  | { type: 'suggestTopics'; topicIds: string[] }

export async function POST(req: NextRequest) {
  const { actions }: { actions: Action[] } = await req.json()
  if (!Array.isArray(actions)) {
    return NextResponse.json({ error: 'actions must be an array' }, { status: 400 })
  }

  const applied: string[] = []

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'markTopicDone':
          await prisma.topic.update({
            where: { id: action.topicId },
            data: { status: 'done' },
          })
          applied.push(`Marked topic done`)
          break

        case 'logSession': {
          const xpEarned = Math.round((action.durationMins / 30) * 10)
          await prisma.studySession.create({
            data: {
              courseId:     action.courseId || null,
              durationMins: action.durationMins,
              rawNote:      action.rawNote,
              xpEarned,
              source:       'session_log',
            },
          })
          applied.push(`Logged ${action.durationMins}m session (+${xpEarned} XP)`)
          break
        }

        case 'addDeadline':
          await prisma.deadline.create({
            data: {
              courseId: action.courseId,
              title:    action.title,
              type:     action.deadlineType as 'exam' | 'assignment' | 'quiz' | 'reading',
              dueDate:  new Date(action.dueDate),
              xpValue:  action.xpValue,
            },
          })
          applied.push(`Added deadline: ${action.title}`)
          break

        case 'suggestTopics':
          // Informational only — no DB change; just acknowledge
          applied.push(`Suggested ${action.topicIds.length} topic(s)`)
          break

        default:
          break
      }
    } catch (err) {
      console.error('Action error:', action, err)
    }
  }

  const newAchievements = applied.length > 0 ? await checkAndUnlockAchievements() : []
  return NextResponse.json({ applied, newAchievements })
}
