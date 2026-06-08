// GET /api/courses   — all courses (for dropdowns etc.)
// POST /api/courses  — create a new course manually
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAndUnlockAchievements } from '@/lib/achievements'

export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, code: true, subject: true, status: true },
  })
  return NextResponse.json({ courses })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, name, subject, semester, year, status, grade } = body

  if (!name || !subject) {
    return NextResponse.json({ error: 'name and subject are required' }, { status: 400 })
  }

  const course = await prisma.course.create({
    data: {
      code:     code || null,
      name,
      subject,
      semester: semester || null,
      year:     year ? parseInt(year) : null,
      status:   status || 'active',
      grade:    grade != null ? parseFloat(grade) : null,
    },
  })

  const newAchievements = await checkAndUnlockAchievements()
  return NextResponse.json({ course, newAchievements }, { status: 201 })
}
