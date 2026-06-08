// PATCH /api/deadlines/[id] — toggle completed or update fields
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAndUnlockAchievements } from '@/lib/achievements'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()

  const deadline = await prisma.deadline.update({
    where: { id: params.id },
    data: body,
  })

  const newAchievements = body.completed === true
    ? await checkAndUnlockAchievements()
    : []

  return NextResponse.json({ deadline, newAchievements })
}
