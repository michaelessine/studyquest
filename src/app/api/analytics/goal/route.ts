import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { hours } = await req.json()
  const h = Math.max(1, Math.round(Number(hours)))
  await prisma.appSetting.upsert({
    where: { id: 'singleton' },
    update: { semesterGoalHours: h },
    create: { semesterGoalHours: h },
  })
  return NextResponse.json({ ok: true, hours: h })
}
