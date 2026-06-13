// AI chat endpoint — streams Claude responses with the user's full learning
// state injected into a cached system prompt. Claude may embed <actions> JSON
// which the client sends separately to /api/actions for DB writes.
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getTotalXP, getLevel } from '@/lib/xp'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Static instructions — cached by Anthropic to avoid re-tokenising on every turn
const STATIC_INSTRUCTIONS = `You are StudyQuest AI, a friendly and knowledgeable personal learning assistant.

You help the user manage their courses, track progress, plan study sessions, and understand their subjects.

You can perform actions by including a JSON array wrapped in <actions></actions> tags AFTER your conversational response.
Available action types:
- { "type": "markTopicDone", "topicId": "cuid..." }
- { "type": "logSession", "courseId": "cuid...", "durationMins": 60, "rawNote": "What was studied" }
- { "type": "addDeadline", "courseId": "cuid...", "title": "Assignment 3", "deadlineType": "exam|assignment|quiz|reading", "dueDate": "2025-06-15", "xpValue": 150 }
- { "type": "suggestTopics", "topicIds": ["cuid..."] }

Rules:
- Be concise but warm. Bullet points over paragraphs when listing things.
- Only include <actions> tags when the user explicitly asks you to take an action (log, mark done, add, etc.).
- Always refer to courses, topics, and deadlines by their exact names from the user's data.
- Suggest what to study next based on pending topics and upcoming deadlines.
- XP = experience points; level = floor(XP/1000)+1.`

async function buildDynamicState(): Promise<string> {
  const [courses, skillNodes, deadlines, sessions, totalXP] = await Promise.all([
    prisma.course.findMany({
      where: { status: 'active' },
      include: { topics: { orderBy: { week: 'asc' } } },
    }),
    prisma.skillNode.findMany({ orderBy: { subject: 'asc' } }),
    prisma.deadline.findMany({
      where: {
        completed: false,
        dueDate: { lte: new Date(Date.now() + 14 * 86_400_000) },
      },
      include: { course: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.studySession.findMany({
      orderBy: { startTime: 'desc' },
      take: 5,
      include: { course: { select: { name: true } } },
    }),
    getTotalXP(),
  ])

  return `
=== CURRENT USER STATE (as of ${new Date().toISOString()}) ===

Level: ${getLevel(totalXP)} | Total XP: ${totalXP}

ACTIVE COURSES:
${courses.map(c => `- ${c.name} (${c.code ?? c.subject})
  Topics: ${c.topics.map(t => `${t.title} [${t.status}] (id:${t.id})`).join(', ') || 'none'}
`).join('') || 'None'}

SKILL NODES (summary):
${['Mathematics', 'ComputerScience', 'Finance', 'Economics', 'QuantumMechanics'].map(subj => {
  const sub = skillNodes.filter(n => n.subject === subj)
  const m = sub.filter(n => n.status === 'mastered').length
  const u = sub.filter(n => n.status === 'unlocked').length
  return `- ${subj}: ${m} mastered, ${u} unlocked, ${sub.length - m - u} locked`
}).join('\n')}

UPCOMING DEADLINES (next 14 days):
${deadlines.map(d => `- ${d.title} [${d.type}] — ${d.course.name} — due ${d.dueDate.toISOString().split('T')[0]} — ${d.xpValue} XP (id:${d.id})`).join('\n') || 'None'}

RECENT SESSIONS (last 5):
${sessions.map(s => `- ${s.startTime.toISOString().split('T')[0]}: ${s.durationMins}m — ${s.rawNote ?? s.note ?? ''}`).join('\n') || 'None'}

Course IDs for actions: ${courses.map(c => `${c.name}=${c.id}`).join(', ')}
=== END STATE ===`
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  // Build the live state portion (not cached — changes with every request)
  const dynamicState = await buildDynamicState()

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      // Static portion: cached by Anthropic for 5 minutes to save tokens
      {
        type: 'text',
        text: STATIC_INSTRUCTIONS,
        cache_control: { type: 'ephemeral' },
      },
      // Dynamic portion: user's live DB state (changes per request, not cached)
      {
        type: 'text',
        text: dynamicState,
      },
    ],
    messages,
  })

  // Stream response as Server-Sent Events
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            )
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
