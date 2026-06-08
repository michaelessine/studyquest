// POST /api/research/fetch-papers — Claude-sourced papers, cached 6 months
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { claudeJSON } from '@/lib/claude'

type Paper = { title: string; url: string; authors: string; year: string; summary: string }

function sourceOf(url: string): string {
  if (/arxiv\.org/i.test(url)) return 'arxiv'
  if (/scholar\.google/i.test(url)) return 'scholar'
  return 'other'
}

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Return cached if not expired
  const cached = await prisma.researchPaper.findMany({
    where: { skillNodeId, expiresAt: { gt: new Date() } },
    orderBy: { fetchedAt: 'desc' },
  })
  if (cached.length > 0) {
    return NextResponse.json({ papers: cached, cached: true })
  }

  const system = `Find 5 real research papers on "${topicName}" that are publicly available. Prefer arxiv.org URLs.
Return ONLY JSON: { "papers": [{ "title": string, "url": string (real arxiv or scholar url), "authors": string, "year": string, "summary": string (2 sentences) }] }`

  let papers: Paper[]
  try {
    const result = await claudeJSON<{ papers: Paper[] }>({ system, user: `Find papers on ${topicName}.`, maxTokens: 2000 })
    papers = result.papers ?? []
    if (papers.length === 0) throw new Error('No papers')
  } catch (err) {
    console.error('Paper fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 })
  }

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 6)

  const created = await Promise.all(papers.map(p =>
    prisma.researchPaper.create({
      data: {
        skillNodeId, title: p.title, url: p.url, authors: p.authors ?? '', year: p.year ?? '',
        summary: p.summary, source: sourceOf(p.url), expiresAt,
      },
    })
  ))

  return NextResponse.json({ papers: created, cached: false })
}
