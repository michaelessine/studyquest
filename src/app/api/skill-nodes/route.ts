// GET /api/skill-nodes — minimal list for pickers (id, name, subject, masteryLevel)
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const nodes = await prisma.skillNode.findMany({
    select: { id: true, name: true, subject: true, masteryLevel: true },
    orderBy: [{ subject: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ nodes })
}
