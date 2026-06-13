// GET /api/export — download all personal study data as a single JSON file.
// Operational/cache tables (ResponseCache, RateLimitLog, APICall) are excluded —
// this is a backup of YOUR data, not the app's internal plumbing.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [
    courses, skillNodes, skillDependencies, topics, deadlines,
    studySessions, masteryEvents, realExams, exerciseSets, quizResults,
    learningPaths, conceptMaps, debateSessions, teachSessions, socraticSessions,
    achievements, learningAbility, selfImprovementGoals, careerPathProgress,
  ] = await Promise.all([
    prisma.course.findMany(),
    prisma.skillNode.findMany(),
    prisma.skillDependency.findMany(),
    prisma.topic.findMany(),
    prisma.deadline.findMany(),
    prisma.studySession.findMany(),
    prisma.masteryEvent.findMany(),
    prisma.realExam.findMany(),
    prisma.exerciseSet.findMany(),
    prisma.quizResult.findMany(),
    prisma.learningPath.findMany(),
    prisma.conceptMap.findMany(),
    prisma.debateSession.findMany(),
    prisma.teachSession.findMany(),
    prisma.socraticSession.findMany(),
    prisma.achievement.findMany(),
    prisma.learningAbility.findMany(),
    prisma.selfImprovementGoals.findMany(),
    prisma.careerPathProgress.findMany(),
  ])

  const payload = {
    meta: { app: 'StudyQuest', exportedAt: new Date().toISOString(), version: 1 },
    data: {
      courses, skillNodes, skillDependencies, topics, deadlines,
      studySessions, masteryEvents, realExams, exerciseSets, quizResults,
      learningPaths, conceptMaps, debateSessions, teachSessions, socraticSessions,
      achievements, learningAbility, selfImprovementGoals, careerPathProgress,
    },
    counts: {
      courses: courses.length, skillNodes: skillNodes.length, studySessions: studySessions.length,
      masteryEvents: masteryEvents.length, realExams: realExams.length,
    },
  }

  const stamp = new Date().toISOString().split('T')[0]
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="studyquest-backup-${stamp}.json"`,
    },
  })
}
