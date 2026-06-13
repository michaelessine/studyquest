// Builds a full JSON backup of personal study data. Shared by the manual
// export endpoint and the scheduled email-backup cron.
import prisma from './prisma'

export async function buildBackup() {
  const [
    courses, skillNodes, skillDependencies, topics, deadlines,
    studySessions, masteryEvents, realExams, exerciseSets, quizResults,
    learningPaths, conceptMaps, debateSessions, teachSessions, socraticSessions,
    achievements, learningAbility, selfImprovementGoals, careerPathProgress,
    phaseLogs, failedProblems, upcomingExams,
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
    prisma.phaseLog.findMany(),
    prisma.failedProblem.findMany(),
    prisma.upcomingExam.findMany(),
  ])

  return {
    meta: { app: 'StudyQuest', exportedAt: new Date().toISOString(), version: 2 },
    data: {
      courses, skillNodes, skillDependencies, topics, deadlines,
      studySessions, masteryEvents, realExams, exerciseSets, quizResults,
      learningPaths, conceptMaps, debateSessions, teachSessions, socraticSessions,
      achievements, learningAbility, selfImprovementGoals, careerPathProgress,
      phaseLogs, failedProblems, upcomingExams,
    },
    counts: {
      courses: courses.length, skillNodes: skillNodes.length, studySessions: studySessions.length,
      masteryEvents: masteryEvents.length, realExams: realExams.length,
      phaseLogs: phaseLogs.length, failedProblems: failedProblems.length,
    },
  }
}
