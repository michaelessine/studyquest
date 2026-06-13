import prisma from '@/lib/prisma'
import LibraryClient from '@/components/LibraryClient'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const sessions = await prisma.studySession.findMany({
    where: { OR: [{ note: { not: null } }, { sourceUrl: { not: null } }] },
    orderBy: { startTime: 'desc' },
    include: { skillNode: { select: { id: true, name: true, subject: true } } },
  })

  const entries = sessions
    .filter(s => (s.note && s.note.trim()) || (s.sourceUrl && s.sourceUrl.trim()))
    .map(s => ({
      id: s.id,
      topicId: s.skillNode?.id ?? null,
      topicName: s.skillNode?.name ?? 'General',
      subject: s.skillNode?.subject ?? '',
      note: s.note?.trim() || null,
      sourceUrl: s.sourceUrl?.trim() || null,
      date: s.startTime.toISOString(),
      durationMins: s.durationMins,
    }))

  return <LibraryClient entries={entries} />
}
