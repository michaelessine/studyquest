// POST /api/costs/cap — update the monthly spend cap
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { monthlyCapUsd } = await req.json()
  const cap = Math.max(0, Number(monthlyCapUsd) || 0)
  const setting = await prisma.appSetting.upsert({
    where: { id: 'singleton' },
    update: { monthlyCapUsd: cap },
    create: { id: 'singleton', monthlyCapUsd: cap },
  })
  return NextResponse.json({ setting })
}
