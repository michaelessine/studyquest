import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PracticeClient from '@/components/PracticeClient'

export const dynamic = 'force-dynamic'

export default async function PracticePage({ params }: { params: { id: string } }) {
  const node = await prisma.skillNode.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, subject: true, masteryLevel: true },
  })
  if (!node) notFound()
  return <PracticeClient node={node} />
}
