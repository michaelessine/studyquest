// GET/POST /api/self-improvement — read/update self-improvement goals
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const row = await prisma.selfImprovementGoals.upsert({
    where: { userId: 'default' },
    update: {},
    create: { userId: 'default' },
  })
  return NextResponse.json({ goals: row })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data: Record<string, Prisma.InputJsonValue> = {}
  for (const k of ['books', 'disciplineHabits', 'healthHabits', 'spiritualGrowth'] as const) {
    if (body[k] != null) data[k] = body[k] as Prisma.InputJsonValue
  }
  const row = await prisma.selfImprovementGoals.upsert({
    where: { userId: 'default' },
    update: data,
    create: { userId: 'default', ...data },
  })
  return NextResponse.json({ goals: row })
}
