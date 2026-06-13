// POST /api/nodes — create a new skill node (used by career "add to tree")
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { name, subject } = await req.json()
  if (!name || !subject) return NextResponse.json({ error: 'name and subject required' }, { status: 400 })

  const node = await prisma.skillNode.create({
    data: { name: String(name).trim(), subject: String(subject), status: 'unlocked' },
  })
  return NextResponse.json({ node })
}
