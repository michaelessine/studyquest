// /api/phase-log — repeatable studying-workflow activity per topic.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const skillNodeId = new URL(req.url).searchParams.get('skillNodeId')
  if (!skillNodeId) return NextResponse.json({ error: 'skillNodeId required' }, { status: 400 })

  const logs = await prisma.phaseLog.findMany({
    where: { skillNodeId }, orderBy: { timestamp: 'desc' },
    select: { id: true, phase: true, note: true, durationMins: true, source: true, timestamp: true },
  })
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const l of logs) counts[l.phase] = (counts[l.phase] ?? 0) + 1
  const tricks = logs.filter(l => l.phase === 2 && l.note && l.note.trim())

  return NextResponse.json({
    counts,
    total: logs.length,
    tricks: tricks.map(t => ({ id: t.id, note: t.note, timestamp: t.timestamp.toISOString() })),
    lastByPhase: Object.fromEntries([1, 2, 3, 4].map(p => {
      const last = logs.find(l => l.phase === p)
      return [p, last ? last.timestamp.toISOString() : null]
    })),
  })
}

export async function POST(req: NextRequest) {
  const { skillNodeId, phase, note, durationMins, source } = await req.json()
  const p = parseInt(phase)
  if (!skillNodeId || !(p >= 1 && p <= 4)) return NextResponse.json({ error: 'skillNodeId and phase (1-4) required' }, { status: 400 })

  const log = await prisma.phaseLog.create({
    data: {
      skillNodeId, phase: p,
      note: note ? String(note).slice(0, 500) : null,
      durationMins: durationMins != null ? Math.max(0, Math.round(durationMins)) : null,
      source: source === 'session' ? 'session' : 'panel',
    },
  })
  return NextResponse.json({ log })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.phaseLog.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
