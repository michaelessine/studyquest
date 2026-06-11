import prisma from '@/lib/prisma'
import { CAREERS, computeCareerProgress } from '@/lib/careers'
import CareerClient from '@/components/CareerClient'

export const dynamic = 'force-dynamic'

export default async function CareerPage() {
  const [nodes, saved] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, masteryLevel: true, status: true } }),
    prisma.careerPathProgress.findUnique({ where: { userId: 'default' } }),
  ])

  const progress = CAREERS.map(c => computeCareerProgress(c, nodes))
  const initialSelected = (saved?.interestAreas as string[]) ?? []

  return <CareerClient progress={progress} initialSelected={initialSelected} />
}
