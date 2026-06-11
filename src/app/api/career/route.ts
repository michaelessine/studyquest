// POST /api/career — persist selected career interest areas
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { interestAreas } = await req.json()
  if (!Array.isArray(interestAreas)) return NextResponse.json({ error: 'interestAreas must be an array' }, { status: 400 })

  const row = await prisma.careerPathProgress.upsert({
    where: { userId: 'default' },
    update: { interestAreas: interestAreas as Prisma.InputJsonValue },
    create: { userId: 'default', interestAreas: interestAreas as Prisma.InputJsonValue },
  })
  return NextResponse.json({ ok: true, saved: row.interestAreas })
}
