// /api/exams/upcoming — manage upcoming exams for the countdown planner
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { name, subject, examDate, skillNodeIds } = await req.json()
  if (!name || !subject || !examDate) return NextResponse.json({ error: 'name, subject and examDate required' }, { status: 400 })
  const date = new Date(examDate)
  if (isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  const exam = await prisma.upcomingExam.create({
    data: {
      name: String(name).slice(0, 200),
      subject,
      examDate: date,
      skillNodeIds: (Array.isArray(skillNodeIds) ? skillNodeIds : []) as Prisma.InputJsonValue,
    },
  })
  return NextResponse.json({ exam })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.upcomingExam.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
