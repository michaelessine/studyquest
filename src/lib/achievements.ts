import prisma from './prisma'
import { getStreak } from './xp'

export interface UnlockedAchievement {
  name: string
  condition: string
}

// All achievement definitions — name must match DB records (seeded or created here)
const ACHIEVEMENT_DEFS = [
  {
    name: 'First Course',
    condition: 'Add your first course',
    check: async () => (await prisma.course.count()) >= 1,
  },
  {
    name: 'Study Streak',
    condition: 'Study for 3 consecutive days',
    check: async () => (await getStreak()) >= 3,
  },
  {
    name: 'Skill Master',
    condition: 'Master 5 skill nodes',
    check: async () => (await prisma.skillNode.count({ where: { status: 'mastered' } })) >= 5,
  },
  {
    name: 'Deadline Crusher',
    condition: 'Complete 5 deadlines on time',
    check: async () => (await prisma.deadline.count({ where: { completed: true } })) >= 5,
  },
  {
    name: 'Polymath',
    condition: 'Have active courses in 3 different subjects',
    check: async () => {
      const courses = await prisma.course.findMany({
        where: { status: 'active' },
        select: { subject: true },
      })
      return new Set(courses.map(c => c.subject)).size >= 3
    },
  },
]

/**
 * Check all achievement conditions and unlock any that are newly met.
 * Returns the list of achievements that were just unlocked this call.
 */
export async function checkAndUnlockAchievements(): Promise<UnlockedAchievement[]> {
  // Load current unlock state in one query
  const existing = await prisma.achievement.findMany({ select: { name: true, unlockedAt: true } })
  const alreadyUnlocked = new Set(existing.filter(a => a.unlockedAt !== null).map(a => a.name))

  const newlyUnlocked: UnlockedAchievement[] = []

  for (const def of ACHIEVEMENT_DEFS) {
    if (alreadyUnlocked.has(def.name)) continue

    const met = await def.check()
    if (!met) continue

    // Upsert so it works whether or not the row was seeded
    await prisma.achievement.upsert({
      where: { name: def.name },
      update: { unlockedAt: new Date() },
      create: { name: def.name, condition: def.condition, unlockedAt: new Date() },
    })

    newlyUnlocked.push({ name: def.name, condition: def.condition })
  }

  return newlyUnlocked
}
