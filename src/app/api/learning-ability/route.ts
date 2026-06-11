// GET/POST /api/learning-ability — read/update the user's learning-ability scores
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const row = await prisma.learningAbility.upsert({
    where: { userId: 'default' },
    update: {},
    create: { userId: 'default' },
  })
  return NextResponse.json({ ability: row })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data: Record<string, number> = {}
  for (const k of ['neuroplasticityScore', 'focusScore', 'recoveryScore', 'mentalHealthScore', 'stressLevel'] as const) {
    if (body[k] != null) data[k] = Math.max(1, Math.min(10, Math.round(body[k])))
  }
  const row = await prisma.learningAbility.upsert({
    where: { userId: 'default' },
    update: data,
    create: { userId: 'default', ...data },
  })
  return NextResponse.json({ ability: row })
}
