// GET /api/mistakes/count — number of unresolved failed problems (for the nav badge)
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const count = await prisma.failedProblem.count({ where: { resolved: false } })
  return NextResponse.json({ count })
}
