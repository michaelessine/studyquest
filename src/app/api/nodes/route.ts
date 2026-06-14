// POST /api/nodes — create a new skill node
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { name, subject, category, tier } = await req.json()
  if (!name || !subject) return NextResponse.json({ error: 'name and subject required' }, { status: 400 })

  const node = await prisma.skillNode.create({
    data: {
      name: String(name).trim(),
      subject: String(subject),
      category: category ? String(category).trim() : 'Custom',
      tier: tier != null ? Math.max(0, Math.round(Number(tier))) : 0,
      status: 'unlocked',
      masteryLevel: 0,
      xpValue: 100,
    },
  })
  return NextResponse.json({ node })
}
