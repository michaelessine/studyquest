// GET /api/deadlines/due — count of incomplete deadlines due soon (next 7 days,
// including overdue). Powers the nav badge.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const horizon = new Date(Date.now() + 7 * 86_400_000)
  const count = await prisma.deadline.count({
    where: { completed: false, dueDate: { lte: horizon } },
  })
  return NextResponse.json({ count })
}
