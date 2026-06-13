// /api/mistakes — the "failed problems" collection (mistake log).
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const courseId = sp.get('courseId')
  const skillNodeId = sp.get('skillNodeId')
  const resolved = sp.get('resolved')

  const items = await prisma.failedProblem.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      ...(skillNodeId ? { skillNodeId } : {}),
      ...(resolved === 'true' ? { resolved: true } : resolved === 'false' ? { resolved: false } : {}),
    },
    orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
  })

  // Resolve course + topic names
  const courseIds = Array.from(new Set(items.map(i => i.courseId).filter(Boolean))) as string[]
  const nodeIds = Array.from(new Set(items.map(i => i.skillNodeId).filter(Boolean))) as string[]
  const [courses, nodes] = await Promise.all([
    courseIds.length ? prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    nodeIds.length ? prisma.skillNode.findMany({ where: { id: { in: nodeIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ])
  const courseName = new Map(courses.map(c => [c.id, c.name]))
  const nodeName = new Map(nodes.map(n => [n.id, n.name]))

  return NextResponse.json({
    items: items.map(i => ({
      id: i.id, title: i.title, details: i.details, reason: i.reason, resolved: i.resolved,
      source: i.source, sourceRef: i.sourceRef,
      courseId: i.courseId, skillNodeId: i.skillNodeId,
      courseName: i.courseId ? courseName.get(i.courseId) ?? null : null,
      topicName: i.skillNodeId ? nodeName.get(i.skillNodeId) ?? null : null,
      createdAt: i.createdAt.toISOString(),
    })),
    openCount: items.filter(i => !i.resolved).length,
  })
}

export async function POST(req: NextRequest) {
  const { title, details, courseId, skillNodeId, source, sourceRef } = await req.json()
  if (!title || !String(title).trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const item = await prisma.failedProblem.create({
    data: {
      title: String(title).slice(0, 200),
      details: details ? String(details).slice(0, 2000) : null,
      courseId: courseId || null,
      skillNodeId: skillNodeId || null,
      source: source || 'manual',
      sourceRef: sourceRef ? String(sourceRef).slice(0, 200) : null,
    },
  })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest) {
  const { id, reason, resolved, title, details } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data: Record<string, unknown> = {}
  if (reason !== undefined) data.reason = reason ? String(reason).slice(0, 2000) : null
  if (title !== undefined && String(title).trim()) data.title = String(title).slice(0, 200)
  if (details !== undefined) data.details = details ? String(details).slice(0, 2000) : null
  if (resolved !== undefined) { data.resolved = !!resolved; data.resolvedAt = resolved ? new Date() : null }
  const item = await prisma.failedProblem.update({ where: { id }, data })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.failedProblem.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
