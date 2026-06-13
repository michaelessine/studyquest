import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { HAIKU } from '@/lib/claude'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ParsedCourse = {
  courseName: string
  courseCode: string | null
  grade: number | null
  year: number | null
  semester: string | null
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  let parsed: ParsedCourse[]

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system: [{ type: 'text', text: 'Extract every course from this transcript. Return ONLY a JSON array — no preamble — where each item has: courseName, courseCode, grade (as a float, e.g. 3.5), year, semester. If a field is missing, use null.', cache_control: { type: 'ephemeral' } }] as never,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as never,
          { type: 'text', text: 'Extract all courses from this transcript as instructed.' },
        ],
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const json = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) throw new Error('Expected array')
  } catch (err) {
    console.error('Transcript parsing error:', err)
    return NextResponse.json(
      { error: 'Could not parse the transcript. Ensure the PDF is a readable academic document.' },
      { status: 422 }
    )
  }

  // Insert all extracted courses; skip any that fail (e.g. name too long or duplicate)
  const created: { id: string; name: string }[] = []
  for (const c of parsed) {
    if (!c.courseName) continue
    const subject = guessSubject(c.courseName, c.courseCode)
    try {
      const course = await prisma.course.create({
        data: {
          code:     c.courseCode ?? null,
          name:     c.courseName,
          subject,
          semester: c.semester   ?? null,
          year:     c.year       ?? null,
          grade:    c.grade      ?? null,
          status:   'completed',
        },
      })
      created.push({ id: course.id, name: course.name })
    } catch {
      // skip on conflict / constraint error
    }
  }

  return NextResponse.json({ courses: created, count: created.length })
}

function guessSubject(name: string, code: string | null): string {
  const t = `${name} ${code ?? ''}`.toLowerCase()
  if (/\b(math|calc|algebra|analysis|topolog|geometr|statistic|probab|number theory|combinat|optimiz|differential|integral|fourier|measure|stochast|numeric)\b/.test(t)) return 'Mathematics'
  if (/\b(cs|csc|cse|comput|algorithm|data struct|program|software|network|database|machine learn|artificial|cyber|web|cloud|operating system)\b/.test(t)) return 'ComputerScience'
  if (/\b(financ|invest|portfolio|asset|derivative|option|equity|risk manag|banking|capital market|accounting|bond|hedge|valuation)\b/.test(t)) return 'Finance'
  if (/\b(econ|micro|macro|gdp|trade|labour|labor|fiscal|monetary|game theory|develop|welfare)\b/.test(t)) return 'Economics'
  if (/\b(physic|quantum|thermo|electro|optic|particle|nuclear|relativit|wave|atomic|solid state|spectro|mech\b)\b/.test(t)) return 'QuantumMechanics'
  return 'Mathematics'
}
